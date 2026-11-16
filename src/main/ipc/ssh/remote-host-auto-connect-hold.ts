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
import { listRegisteredSshTargets } from '../../ssh/targets/ssh-target-registry'
import { isRuntimeOwnedSshTarget } from '../../ssh/targets/ssh-target-runtime-ownership'
import {
  clearRuntimeEnvironmentManualDisconnect,
  isRuntimeEnvironmentManuallyDisconnected,
  runtimeEnvironmentManualDisconnectReason
} from '../runtime-environments/connectivity/runtime-environment-manual-disconnect'
import { connectInFlight } from './ssh-connect-attempt-registry'
import {
  disconnectRuntimeEnvironmentForUser,
  resumeRuntimeEnvironmentStatus,
  serversOfHeldTargets
} from './ssh-host-user-disconnect'
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

let autoConnect = true
let stopFollowing: (() => void) | undefined
let applying: Promise<void> = Promise.resolve()

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
      connectInFlight.has(target.id) ||
      (status && SESSION_BY_STATUS[status]) ||
      !holdSshTargetForAutoConnectOff(target.id)
    ) {
      continue
    }
    reasons.set(target.id, REMOTE_HOST_AUTO_CONNECT_OFF_REASON)
    if (status) {
      // Close a failed or background-dialing session so the host shows disconnected, like a held one.
      void connectionManager?.disconnect(target.id).catch(() => {})
    }
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
}
