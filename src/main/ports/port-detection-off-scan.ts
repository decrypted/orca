import type { WorkspacePortScanResult } from '../../shared/workspace/ports/workspace-ports'
import {
  isPortDetectionEnabled,
  type PortDetectionSettings
} from '../../shared/workspace/ports/port-detection-settings'
import { makeUnavailableWorkspacePortScan } from './local-workspace-port-scan-state'

// Why English: runtime RPC must stay Electron-free, and main-process i18n loads through Electron.
export const PORT_DETECTION_OFF_REASON = 'Port detection is off on this computer.'

/** Scans asked for by any client (web, other desktops, this window) follow this computer's setting. */
export function portDetectionOffScan(
  settings: PortDetectionSettings
): WorkspacePortScanResult | null {
  return isPortDetectionEnabled(settings)
    ? null
    : makeUnavailableWorkspacePortScan(PORT_DETECTION_OFF_REASON)
}
