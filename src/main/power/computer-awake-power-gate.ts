import {
  readComputerAwakePowerPolicy,
  resolveComputerAwakePause,
  type ComputerAwakePause,
  type ComputerAwakePowerPolicy,
  type PowerSupplyState
} from '../../shared/app-lifecycle/computer-awake-power-policy'
import type { PowerSupplyReader } from './power-supply-reader'

const POWER_SUPPLY_POLL_MS = 60_000
// A machine that reported no battery rarely grows one; keep checking, just rarely.
const NO_BATTERY_POLL_MS = 15 * 60_000

// Overloads, so Electron's per-event powerMonitor signatures are assignable.
export type PowerSourceEvents = {
  on(event: 'on-ac', listener: () => void): unknown
  on(event: 'on-battery', listener: () => void): unknown
  on(event: 'resume', listener: () => void): unknown
  off(event: 'on-ac', listener: () => void): unknown
  off(event: 'on-battery', listener: () => void): unknown
  off(event: 'resume', listener: () => void): unknown
}

type Logger = Pick<Console, 'warn'>

/** Watches the power supply only while an awake block is wanted, and says when to release it. */
export class ComputerAwakePowerGate {
  private policy: ComputerAwakePowerPolicy = readComputerAwakePowerPolicy(null)
  private supply: PowerSupplyState | null = null
  private pause: ComputerAwakePause | null = null
  private watching = false
  private readGeneration = 0
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private readonly unsubscribeEvents: (() => void) | null

  constructor(
    private readonly read: PowerSupplyReader,
    private readonly onChange: () => void,
    private readonly logger: Logger,
    events: PowerSourceEvents | null
  ) {
    if (events) {
      const onPowerSourceChange = (): void => this.readNow()
      // Linux emits only resume, so polling covers unplugging there.
      events.on('on-ac', onPowerSourceChange)
      events.on('on-battery', onPowerSourceChange)
      events.on('resume', onPowerSourceChange)
      this.unsubscribeEvents = () => {
        events.off('on-ac', onPowerSourceChange)
        events.off('on-battery', onPowerSourceChange)
        events.off('resume', onPowerSourceChange)
      }
    } else {
      this.unsubscribeEvents = null
    }
  }

  getPolicy(): ComputerAwakePowerPolicy {
    return this.policy
  }

  setPolicy(policy: ComputerAwakePowerPolicy): void {
    this.policy = policy
  }

  getPause(): ComputerAwakePause | null {
    return this.pause
  }

  /** Why a wanted block must be released right now, or null to hold it. */
  evaluate(wanted: boolean): ComputerAwakePause | null {
    this.setWatching(wanted)
    this.pause = wanted ? resolveComputerAwakePause(this.policy, this.supply, this.pause) : null
    return this.pause
  }

  dispose(): void {
    this.setWatching(false)
    this.unsubscribeEvents?.()
  }

  private setWatching(watching: boolean): void {
    if (this.watching === watching) {
      return
    }
    this.watching = watching
    if (watching) {
      this.readNow()
      return
    }
    this.readGeneration += 1
    this.clearPollTimer()
  }

  private readNow(): void {
    if (!this.watching) {
      return
    }
    this.clearPollTimer()
    const generation = ++this.readGeneration
    void this.read()
      .catch((error: unknown) => {
        this.logger.warn('[agent-awake] failed to read the power supply', { error })
        return null
      })
      .then((supply) => {
        if (generation !== this.readGeneration) {
          return
        }
        const changed =
          supply?.onBattery !== this.supply?.onBattery ||
          supply?.batteryPercent !== this.supply?.batteryPercent
        this.supply = supply
        this.pollTimer = setTimeout(
          () => this.readNow(),
          supply ? POWER_SUPPLY_POLL_MS : NO_BATTERY_POLL_MS
        )
        this.pollTimer.unref?.()
        if (changed) {
          this.onChange()
        }
      })
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }
}
