import type { GlobalSettings } from '../settings/global-settings-types'
import type { ComputerAwakePause } from './computer-awake-power-policy'

export const COMPUTER_AWAKE_MODES = ['on', 'off', 'auto'] as const

export type ComputerAwakeMode = (typeof COMPUTER_AWAKE_MODES)[number]

export const COMPUTER_AWAKE_TIMER_HOURS = [1, 3, 6, 8, 10] as const

/** A timed On: stays 'on' until `until` (epoch ms), then returns to `resumeMode`. */
export type ComputerAwakeTimer = {
  until: number
  resumeMode: ComputerAwakeMode
  hours: number
}

export type ComputerAwakeStatus = {
  mode: ComputerAwakeMode
  active: boolean
  /** Set while a wanted block is released to save the battery. */
  paused?: ComputerAwakePause
  /** Null until known; settings hide battery options when false. */
  hasBattery?: boolean | null
  /** Linux with systemd-inhibit; the lid option means nothing elsewhere. */
  lidInhibitAvailable?: boolean
}

export type ComputerAwakeSelection = {
  mode: ComputerAwakeMode
  timer: ComputerAwakeTimer | null
}

type ComputerAwakeSettings = Pick<
  GlobalSettings,
  'keepComputerAwakeWhileAgentsRun' | 'computerAwakeMode' | 'computerAwakeTimer'
>

function isComputerAwakeMode(mode: unknown): mode is ComputerAwakeMode {
  return COMPUTER_AWAKE_MODES.some((candidate) => candidate === mode)
}

export function normalizeComputerAwakeMode(
  mode: unknown,
  legacyAutoEnabled?: boolean
): ComputerAwakeMode {
  const explicitMode = isComputerAwakeMode(mode) ? mode : null
  if (!explicitMode) {
    return legacyAutoEnabled === true ? 'auto' : 'off'
  }
  if (typeof legacyAutoEnabled === 'boolean' && legacyAutoEnabled !== (explicitMode !== 'off')) {
    // Older builds can only change the legacy boolean, so disagreement means it was written later.
    return legacyAutoEnabled ? 'auto' : 'off'
  }
  return explicitMode
}

/** A timer only applies to On; under any other mode it is ignored, and main clears it at startup.
 *  Limit: an older build that switches Off and back to On before this build starts revives it. */
export function normalizeComputerAwakeTimer(
  mode: ComputerAwakeMode,
  timer: unknown
): ComputerAwakeTimer | null {
  if (mode !== 'on' || typeof timer !== 'object' || timer === null) {
    return null
  }
  const until = 'until' in timer ? timer.until : undefined
  const resumeMode = 'resumeMode' in timer ? timer.resumeMode : undefined
  const hours = 'hours' in timer ? timer.hours : undefined
  if (typeof until !== 'number' || !Number.isFinite(until)) {
    return null
  }
  return {
    until,
    resumeMode: isComputerAwakeMode(resumeMode) ? resumeMode : 'off',
    hours: typeof hours === 'number' && Number.isFinite(hours) ? hours : 0
  }
}

export function readComputerAwakeSelection(
  settings: Partial<ComputerAwakeSettings> | null | undefined
): ComputerAwakeSelection {
  const mode = normalizeComputerAwakeMode(
    settings?.computerAwakeMode,
    settings?.keepComputerAwakeWhileAgentsRun
  )
  return { mode, timer: normalizeComputerAwakeTimer(mode, settings?.computerAwakeTimer) }
}

export function startComputerAwakeTimer(
  current: ComputerAwakeSelection,
  hours: number,
  now: number
): ComputerAwakeTimer {
  return {
    until: now + hours * 60 * 60 * 1000,
    // Switching durations keeps the mode from before the first timer; a timer on top of a
    // permanent On would otherwise do nothing, so it ends in Off.
    resumeMode: current.timer?.resumeMode ?? (current.mode === 'on' ? 'off' : current.mode),
    hours
  }
}

export function computerAwakeSettingsForMode(
  mode: ComputerAwakeMode
): Required<ComputerAwakeSettings> {
  return {
    computerAwakeMode: mode,
    // Older Orca versions approximate On with their supported Auto behavior.
    keepComputerAwakeWhileAgentsRun: mode !== 'off',
    computerAwakeTimer: null
  }
}

export function computerAwakeSettingsForTimer(
  timer: ComputerAwakeTimer
): Required<ComputerAwakeSettings> {
  return { ...computerAwakeSettingsForMode('on'), computerAwakeTimer: timer }
}

export function computerAwakeSettingsForSelection(
  selection: ComputerAwakeSelection
): Required<ComputerAwakeSettings> {
  return selection.timer
    ? computerAwakeSettingsForTimer(selection.timer)
    : computerAwakeSettingsForMode(selection.mode)
}
