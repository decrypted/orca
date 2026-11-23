import type { ComputerAwakeMode } from '../../shared/app-lifecycle/computer-awake-mode'
import type { PowerSupplyReader } from './power-supply-reader'

export type PowerSaveBlocker = {
  start: (type: 'prevent-app-suspension' | 'prevent-display-sleep') => number
  stop: (id: number) => void
  isStarted: (id: number) => boolean
}

export type PlatformAwakeAssertion = {
  start: (reason: string) => boolean | void
  stop: (reason: string) => void
  dispose: () => void
  isAvailable?: () => boolean
}

export type PowerMonitorEventSource = {
  on: (event: 'resume' | 'on-ac' | 'on-battery', listener: () => void) => void
  off: (event: 'resume' | 'on-ac' | 'on-battery', listener: () => void) => void
}

export type AgentAwakeLogger = Pick<Console, 'debug' | 'warn'>

export type AgentAwakeServiceOptions = {
  blocker?: PowerSaveBlocker
  linuxAssertion?: PlatformAwakeAssertion
  logger?: AgentAwakeLogger
  macosAssertion?: PlatformAwakeAssertion
  now?: () => number
  /** Persists the mode a timed On returned to, so every window and the next launch agree. */
  onTimerExpired?: (resumeMode: ComputerAwakeMode) => void
  platform?: NodeJS.Platform
  powerMonitor?: PowerMonitorEventSource | null
  powerSupplyReader?: PowerSupplyReader
}
