export type PortDetectionSettings = {
  /** Background listening-port scans on every execution host; absent means on. */
  portDetectionEnabled?: boolean
}

export function isPortDetectionEnabled(
  settings: PortDetectionSettings | null | undefined
): boolean {
  return settings?.portDetectionEnabled !== false
}
