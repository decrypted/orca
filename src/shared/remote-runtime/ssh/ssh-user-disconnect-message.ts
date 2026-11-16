import { REMOTE_HOST_AUTO_CONNECT_OFF_REASON } from './remote-host-auto-connect-settings'

const SSH_USER_DISCONNECTED_SUFFIX = 'was disconnected. Connect to use it again.'

export function formatSshUserDisconnectedMessage(label: string): string {
  return `${label} ${SSH_USER_DISCONNECTED_SUFFIX}`
}

export function formatSshAutoConnectOffMessage(label: string): string {
  return `${label}: ${REMOTE_HOST_AUTO_CONNECT_OFF_REASON}`
}

/** IPC drops Error.code, so renderers recognize the held-disconnected refusal by its message. */
export function isSshUserDisconnectedMessage(message: string): boolean {
  return (
    message.endsWith(SSH_USER_DISCONNECTED_SUFFIX) ||
    message.endsWith(REMOTE_HOST_AUTO_CONNECT_OFF_REASON)
  )
}
