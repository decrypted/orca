import type { GlobalSettings } from '../global-settings-types'

export const COMPUTER_AWAKE_BATTERY_FLOOR_CHOICES = [20, 30, 50, 70] as const

export const DEFAULT_COMPUTER_AWAKE_BATTERY_FLOOR_PERCENT = 50

// Resuming a few points above the floor keeps a charge hovering at it from flapping the block.
export const COMPUTER_AWAKE_BATTERY_RESUME_MARGIN_PERCENT = 5

type ComputerAwakePowerSettings = Pick<
  GlobalSettings,
  | 'computerAwakeOnlyWhilePluggedIn'
  | 'computerAwakeBatteryFloorPercent'
  | 'computerAwakeLidCloseSleeps'
>

export const DEFAULT_COMPUTER_AWAKE_POWER_SETTINGS = {
  computerAwakeOnlyWhilePluggedIn: true,
  computerAwakeBatteryFloorPercent: DEFAULT_COMPUTER_AWAKE_BATTERY_FLOOR_PERCENT,
  computerAwakeLidCloseSleeps: true
} satisfies Required<ComputerAwakePowerSettings>

export const COMPUTER_AWAKE_POWER_SETTING_KEYS = Object.keys(
  DEFAULT_COMPUTER_AWAKE_POWER_SETTINGS
) as (keyof ComputerAwakePowerSettings)[]

export type ComputerAwakePowerPolicy = {
  onlyWhilePluggedIn: boolean
  batteryFloorPercent: number
  lidCloseSleeps: boolean
}

/** Why a wanted awake block is released: on battery at all, or on battery below the floor. */
export type ComputerAwakePause = 'battery' | 'low-battery'

export type PowerSupplyState = {
  onBattery: boolean
  batteryPercent: number | null
}

export function readComputerAwakePowerPolicy(
  settings: Partial<ComputerAwakePowerSettings> | null | undefined
): ComputerAwakePowerPolicy {
  const floor = settings?.computerAwakeBatteryFloorPercent
  return {
    onlyWhilePluggedIn: settings?.computerAwakeOnlyWhilePluggedIn !== false,
    batteryFloorPercent:
      typeof floor === 'number' && Number.isFinite(floor) && floor > 0 && floor < 100
        ? Math.round(floor)
        : DEFAULT_COMPUTER_AWAKE_BATTERY_FLOOR_PERCENT,
    lidCloseSleeps: settings?.computerAwakeLidCloseSleeps !== false
  }
}

/** A null supply means no battery was found, which never pauses (desktops behave as before). */
export function resolveComputerAwakePause(
  policy: ComputerAwakePowerPolicy,
  supply: PowerSupplyState | null,
  previous: ComputerAwakePause | null
): ComputerAwakePause | null {
  if (!supply?.onBattery) {
    return null
  }
  if (policy.onlyWhilePluggedIn) {
    return 'battery'
  }
  if (supply.batteryPercent === null) {
    return null
  }
  const resumeAt =
    previous === 'low-battery'
      ? policy.batteryFloorPercent + COMPUTER_AWAKE_BATTERY_RESUME_MARGIN_PERCENT
      : policy.batteryFloorPercent
  return supply.batteryPercent < resumeAt ? 'low-battery' : null
}
