import { getAppEnvironment } from '../../../shared/app-lifecycle/app-environment'
import { listEnvironments } from '../../../shared/remote-runtime/host-store/runtime-environment-store'
import { getRuntimeSshAccess } from '../../../shared/remote-runtime/host-catalog/runtime-environments'
import {
  isRemoteHostAutoConnectEnabled,
  REMOTE_HOST_AUTO_CONNECT_OFF_REASON,
  type RemoteHostAutoConnectSettings
} from '../../../shared/remote-runtime/ssh/remote-host-auto-connect-settings'
import type { SshConnectionStatus, SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import type { Store } from '../../persistence/loading-store/store'
import {
  holdSshTargetForAutoConnectOff,
  isSshUserDisconnected,
  liftSshAutoConnectOffHolds
} from '../../ssh/connection/ssh-user-disconnect'
import {
  getSshTargetRegistryStore,
  listRegisteredSshTargets
} from '../../ssh/targets/ssh-target-registry'
import { isRuntimeOwnedSshTarget } from '../../ssh/targets/ssh-target-runtime-ownership'
import {
  clearRuntimeEnvironmentManualDisconnect,
  isRuntimeEnvironmentManuallyDisconnected,
  runtimeEnvironmentManualDisconnectReason
} from '../runtime-environments/connectivity/runtime-environment-manual-disconnect'
import { quitTeardownStartGate } from '../../startup/quit/quit-teardown-start-gate'
import { isUserConnectInFlight } from './ssh-connect-attempt-registry'
import {
  disconnectRuntimeEnvironmentForUser,
  liftSshHostUserDisconnect,
  resumeRuntimeEnvironmentStatus,
  serversOfHeldTargets
} from './ssh-host-user-disconnect'
import { disconnectRegisteredSshTarget } from './ssh-session-teardown'
import { clearSshCredentialDeclined } from '../../ssh/authentication/ssh-credential-decline'
import { connectionManager } from './ssh-ipc-context'

// An open session stays: holding it would refuse its every later use.
const SESSION_BY_STATUS: Record<SshConnectionStatus, boolean> = {
  disconnected: false,
  connecting: false,
  'auth-failed': false,
  'deploying-relay': true,
  connected: true,
  reconnecting: true,
  'reconnection-failed': false,
  error: false
}

const SESSION_ENDED_BY_STATUS: Record<SshConnectionStatus, boolean> = {
  disconnected: true,
  connecting: false,
  'auth-failed': true,
  'deploying-relay': false,
  connected: false,
  reconnecting: false,
  'reconnection-failed': true,
  error: true
}

let autoConnect = true
let stopFollowing: (() => void) | undefined
let applying: Promise<void> = Promise.resolve()
/** Hosts a user action is connecting outside `connectTarget`, such as a server's Connect. */
const userConnectingHosts = new Map<string, number>()

export function isRemoteHostAutoConnectOn(): boolean {
  return autoConnect
}

/** The launch hold applied the starting value; this applies later changes. */
export function followRemoteHostAutoConnectSetting(store: {
  getSettings: () => RemoteHostAutoConnectSettings
  onSettingsChanged?: Store['onSettingsChanged']
}): void {
  autoConnect = isRemoteHostAutoConnectEnabled(store.getSettings())
  stopFollowing?.()
  stopFollowing = store.onSettingsChanged?.((updates, settings) => {
    const next = isRemoteHostAutoConnectEnabled(settings)
    if (!('remoteHostAutoConnectEnabled' in updates) || next === autoConnect) {
      return
    }
    autoConnect = next
    applying = applying
      .then(() =>
        next ? liftAutoConnectOffHolds() : holdIdleRemoteHosts(listRegisteredSshTargets())
      )
      .catch((error) =>
        console.warn('[ssh] Applying the remote host auto-connect setting failed:', error)
      )
  })
}

export async function asUserConnect<T>(
  targetId: string | undefined,
  connect: () => Promise<T>
): Promise<T> {
  if (!targetId) {
    return connect()
  }
  userConnectingHosts.set(targetId, (userConnectingHosts.get(targetId) ?? 0) + 1)
  try {
    return await connect()
  } finally {
    const remaining = (userConnectingHosts.get(targetId) ?? 1) - 1
    if (remaining > 0) {
      userConnectingHosts.set(targetId, remaining)
    } else {
      userConnectingHosts.delete(targetId)
      // Errors inside the window were skipped, so a failed user connect is held here instead.
      await holdHostIfIdle(targetId)
    }
  }
}

/** A user's own action on an SSH host that dials it itself is a Connect of that host. */
export async function asUserHostAction<T>(targetId: string, action: () => Promise<T>): Promise<T> {
  let lifted: string[] = []
  try {
    return await asUserConnect(targetId, async () => {
      clearSshCredentialDeclined(targetId)
      lifted = await liftSshHostUserDisconnect(targetId)
      return action()
    })
  } finally {
    // After the window closes, so a host held again keeps its servers held.
    await resumeRuntimeEnvironmentStatus(lifted).catch((error) =>
      console.warn('[ssh] Resuming servers after a host action failed:', error)
    )
  }
}

async function holdHostIfIdle(targetId: string): Promise<void> {
  const target = autoConnect ? undefined : getSshTargetRegistryStore()?.getTarget(targetId)
  if (target) {
    await holdIdleRemoteHosts([target]).catch((error) =>
      console.warn('[ssh] Holding a host after a user action failed:', error)
    )
  }
}

function isUserConnecting(targetId: string): boolean {
  return isUserConnectInFlight(targetId) || userConnectingHosts.has(targetId)
}

/** A connect lifts the hold for good, so hold again once its session ends after any redial ladder. */
export function holdRemoteHostWhoseSessionEnded(
  targetId: string,
  status: SshConnectionStatus
): void {
  // An already held host returns here, so the close below cannot re-enter.
  if (
    autoConnect ||
    !SESSION_ENDED_BY_STATUS[status] ||
    isSshUserDisconnected(targetId) ||
    quitTeardownStartGate.hasStarted()
  ) {
    return
  }
  // A dial replacing an old session closes it first; that dial's own outcome decides.
  if (status === 'disconnected' && connectionManager?.isDialing(targetId)) {
    return
  }
  const target = getSshTargetRegistryStore()?.getTarget(targetId)
  if (target) {
    void holdIdleRemoteHosts([target]).catch((error) =>
      console.warn('[ssh] Holding a host after its session ended failed:', error)
    )
  }
}

/** While automatic connects are off, hold hosts with no session as if the user had disconnected them. */
export async function holdIdleRemoteHosts(targets: readonly SshTarget[]): Promise<void> {
  if (autoConnect) {
    return
  }
  const reasons = new Map<string, string>()
  for (const target of targets) {
    const status = connectionManager?.getState(target.id)?.status
    if (
      isRuntimeOwnedSshTarget(target) ||
      isUserConnecting(target.id) ||
      (status && SESSION_BY_STATUS[status]) ||
      !holdSshTargetForAutoConnectOff(target.id)
    ) {
      continue
    }
    reasons.set(target.id, REMOTE_HOST_AUTO_CONNECT_OFF_REASON)
    // The same teardown as a Disconnect; its own close finds the host held and does not re-enter.
    void disconnectRegisteredSshTarget(target.id).catch(() => {})
  }
  const userDataPath = getAppEnvironment().getPath('userData')
  const servers = await serversOfHeldTargets(reasons, userDataPath)
  if (servers.length === 0) {
    return
  }
  // Import lazily because runtime-environments wires handlers and imports this SSH layer.
  const { invalidateRuntimeEnvironmentTransport: invalidateTransport } =
    await import('../runtime-environments/runtime-environments')
  for (const { environmentId, reason } of servers) {
    await disconnectRuntimeEnvironmentForUser(
      environmentId,
      { userDataPath, invalidateTransport },
      reason
    )
  }
}

async function liftAutoConnectOffHolds(): Promise<void> {
  liftSshAutoConnectOffHolds()
  const lifted: string[] = []
  for (const environment of await listEnvironments(getAppEnvironment().getPath('userData'))) {
    const targetId = getRuntimeSshAccess(environment)?.sshTargetId
    // The reason tells this setting's holds apart from the user's own Disconnects.
    if (
      isRuntimeEnvironmentManuallyDisconnected(environment.id) &&
      runtimeEnvironmentManualDisconnectReason(environment.id) ===
        REMOTE_HOST_AUTO_CONNECT_OFF_REASON &&
      !(targetId && isSshUserDisconnected(targetId))
    ) {
      clearRuntimeEnvironmentManualDisconnect(environment.id)
      lifted.push(environment.id)
    }
  }
  await resumeRuntimeEnvironmentStatus(lifted)
}

export function resetRemoteHostAutoConnectForTests(): void {
  stopFollowing?.()
  stopFollowing = undefined
  autoConnect = true
  applying = Promise.resolve()
  userConnectingHosts.clear()
}
