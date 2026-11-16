import {
  formatSshAutoConnectOffMessage,
  formatSshUserDisconnectedMessage
} from '../../../shared/remote-runtime/ssh/ssh-user-disconnect-message'
import {
  getRuntimeSshAccess,
  type KnownRuntimeEnvironment
} from '../../../shared/remote-runtime/host-catalog/runtime-environments'

/** Session-only disconnect blocks every background dial until explicit connect; restart clears both SSH and managed-server disconnects together. */
const userDisconnectedTargets = new Set<string>()
/** How many times the user has disconnected each target; explicit connects do not reset it. */
const userDisconnectCounts = new Map<string, number>()
/** Holds the auto-connect setting made, not the user; turning it back on lifts only these. */
const autoConnectOffTargets = new Set<string>()

export function recordSshUserDisconnected(targetId: string): void {
  autoConnectOffTargets.delete(targetId)
  userDisconnectedTargets.add(targetId)
  userDisconnectCounts.set(targetId, (userDisconnectCounts.get(targetId) ?? 0) + 1)
}

/** Work started before a Disconnect compares this count rather than the hold, which a connect in
 *  between may already have lifted. */
export function sshUserDisconnectCount(targetId: string): number {
  return userDisconnectCounts.get(targetId) ?? 0
}

export function isSshUserDisconnected(targetId: string): boolean {
  return userDisconnectedTargets.has(targetId)
}

/** Holds a host the user has not connected like a Disconnect; false when it was already held. */
export function holdSshTargetForAutoConnectOff(targetId: string): boolean {
  if (userDisconnectedTargets.has(targetId)) {
    return false
  }
  userDisconnectedTargets.add(targetId)
  autoConnectOffTargets.add(targetId)
  return true
}

export function liftSshAutoConnectOffHolds(): void {
  autoConnectOffTargets.forEach((targetId) => userDisconnectedTargets.delete(targetId))
  autoConnectOffTargets.clear()
}

/** Only an explicit user connect may lift it. */
export function clearSshUserDisconnected(targetId: string): void {
  userDisconnectedTargets.delete(targetId)
  autoConnectOffTargets.delete(targetId)
}

/** An explicit connect to a server reached over SSH is a connect of that SSH host too. */
export function clearSshUserDisconnectedForEnvironment(
  environment: Pick<KnownRuntimeEnvironment, 'orcadDeployment' | 'sshAccess'>
): void {
  const targetId = getRuntimeSshAccess(environment)?.sshTargetId
  if (targetId) {
    clearSshUserDisconnected(targetId)
  }
}

/** Not an auth or transient failure: callers neither ask for a sign-in nor retry it. */
export function createSshUserDisconnectedError(label: string, targetId?: string): Error {
  const message =
    targetId !== undefined && autoConnectOffTargets.has(targetId)
      ? formatSshAutoConnectOffMessage(label)
      : formatSshUserDisconnectedMessage(label)
  return Object.assign(new Error(message), { code: 'ssh_user_disconnected' })
}

export function isSshUserDisconnectedError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ssh_user_disconnected'
}
