export type RemoteHostAutoConnectSettings = {
  /** Connects to SSH hosts, and the servers reached through them, that no user action asked for; absent means on. */
  remoteHostAutoConnectEnabled?: boolean
}

export function isRemoteHostAutoConnectEnabled(
  settings: RemoteHostAutoConnectSettings | null | undefined
): boolean {
  return settings?.remoteHostAutoConnectEnabled !== false
}

export const REMOTE_HOST_AUTO_CONNECT_OFF_REASON =
  'Connecting to remote hosts automatically is off. Connect to resume.'
