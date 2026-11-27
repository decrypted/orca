import {
  readComputerAwakePowerPolicy,
  resolveComputerAwakePause,
  type ComputerAwakePause,
  type ComputerAwakePowerPolicy,
  type PowerSupplyState
} from '../../shared/app-lifecycle/computer-awake-power-policy'
import type { PowerSupplyReader } from './power-supply-reader'

const POWER_SUPPLY_POLL_MS = 60_000
const MAX_BATTERY_LEVEL_POLL_MS = 10 * 60_000
const FAILED_READ_RETRY_MS = 5_000

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
  private readAt: number | null = null
  // A power event or policy change since the last read means it no longer describes the machine.
  private stale = true
  private reading = false
  // Unknown is not "no battery": keep the last decision and keep retrying, since Linux has no
  // AC events and a stopped poll would never notice unplugging.
  private failedReads = 0
  private failedAt = 0
  private rereadQueued = false
  // Until the first answer arrives a block is not taken, so a launch on battery never spawns one.
  private settled = false
  private hasBattery: boolean | null = null
  private pause: ComputerAwakePause | null = null
  private watching = false
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private readonly unsubscribeEvents: (() => void) | null

  constructor(
    private readonly reader: PowerSupplyReader,
    private readonly onChange: () => void,
    private readonly logger: Logger,
    events: PowerSourceEvents | null,
    private readonly now: () => number
  ) {
    if (events) {
      const onPowerSource = (): void => this.markStale()
      const onResume = (): void => {
        this.reader.invalidate?.()
        this.markStale()
      }
      events.on('on-ac', onPowerSource)
      events.on('on-battery', onPowerSource)
      events.on('resume', onResume)
      this.unsubscribeEvents = () => {
        events.off('on-ac', onPowerSource)
        events.off('on-battery', onPowerSource)
        events.off('resume', onResume)
      }
    } else {
      this.unsubscribeEvents = null
    }
  }

  getPolicy(): ComputerAwakePowerPolicy {
    return this.policy
  }

  hasPolicy(policy: ComputerAwakePowerPolicy): boolean {
    return (
      policy.onlyWhilePluggedIn === this.policy.onlyWhilePluggedIn &&
      policy.batteryFloorPercent === this.policy.batteryFloorPercent &&
      policy.lidCloseSleeps === this.policy.lidCloseSleeps
    )
  }

  setPolicy(policy: ComputerAwakePowerPolicy): void {
    const levelNeedChanged = policy.onlyWhilePluggedIn !== this.policy.onlyWhilePluggedIn
    this.policy = policy
    if (levelNeedChanged) {
      this.markStale()
    } else {
      this.scheduleNextRead()
    }
  }

  getPause(): ComputerAwakePause | null {
    return this.pause
  }

  isAwaitingFirstAnswer(): boolean {
    return !this.settled
  }

  /** Null until known; only a reader that polls can tell a missing battery apart. */
  getHasBattery(): boolean | null {
    return this.hasBattery
  }

  /** One read so settings can hide battery options before any block was wanted. */
  primeBatteryAnswer(): void {
    if (!this.settled && !this.reading && this.reader.needsPolling) {
      this.readNow()
    }
  }

  /** Why a wanted block must be released right now, or null to hold it. */
  evaluate(wanted: boolean): ComputerAwakePause | null {
    this.setWatching(wanted)
    if (wanted) {
      this.applySyncAnswer()
    }
    this.pause = wanted ? this.resolvePause() : null
    return this.pause
  }

  // A missed on-ac/on-battery event must not keep a block on battery, and the OS answer is cheap.
  private applySyncAnswer(): void {
    const onBattery = this.reader.readOnBatteryNow?.()
    if (onBattery === undefined) {
      return
    }
    this.settled = true
    if (this.supply?.onBattery === onBattery) {
      return
    }
    const changed = this.supply !== null
    this.supply = { onBattery, batteryPercent: null }
    if (changed) {
      this.markStale()
    }
  }

  dispose(): void {
    this.setWatching(false)
    this.unsubscribeEvents?.()
  }

  private resolvePause(): ComputerAwakePause | null {
    return resolveComputerAwakePause(this.policy, this.supply, this.pause)
  }

  private setWatching(watching: boolean): void {
    if (this.watching === watching) {
      return
    }
    this.watching = watching
    if (!watching) {
      this.clearPollTimer()
    } else if (this.isReadingCurrent()) {
      this.scheduleNextRead()
    } else {
      this.readNow()
    }
  }

  private markStale(): void {
    this.stale = true
    if (this.watching) {
      this.readNow()
    }
  }

  /** Null when nothing can change without a power event: no battery, or a platform with events. */
  private pollDelay(): number | null {
    const supply = this.supply
    if (!supply) {
      return null
    }
    const levelMatters =
      !this.policy.onlyWhilePluggedIn && supply.onBattery && supply.batteryPercent !== null
    if (levelMatters && this.resolvePause() !== 'low-battery') {
      // The charge falls about a point a minute at most, so a wide margin can wait longer.
      const margin = (supply.batteryPercent ?? 0) - this.policy.batteryFloorPercent
      return Math.min(Math.max(margin * 60_000, POWER_SUPPLY_POLL_MS), MAX_BATTERY_LEVEL_POLL_MS)
    }
    return this.reader.needsPolling ? POWER_SUPPLY_POLL_MS : null
  }

  private isReadingCurrent(): boolean {
    if (this.stale || this.readAt === null) {
      return false
    }
    const delay = this.pollDelay()
    return delay === null || this.now() - this.readAt < delay
  }

  private readNow(): void {
    if (this.reading) {
      this.rereadQueued = true
      return
    }
    this.reading = true
    this.clearPollTimer()
    void this.reader.read(!this.policy.onlyWhilePluggedIn).then(
      (supply) => this.finishRead(supply),
      (error: unknown) => {
        if (this.failedReads === 0) {
          this.logger.warn('[agent-awake] failed to read the power supply', { error })
        }
        this.finishRead(undefined)
      }
    )
  }

  /** `undefined` is a failed read: the previous supply and decision stand. */
  private finishRead(supply: PowerSupplyState | null | undefined): void {
    this.reading = false
    if (this.rereadQueued) {
      this.rereadQueued = false
      this.readNow()
      return
    }
    const firstAnswer = !this.settled
    this.settled = true
    if (supply === undefined) {
      this.failedReads += 1
      this.failedAt = this.now()
      this.stale = true
      this.scheduleNextRead()
      if (firstAnswer && this.watching) {
        this.onChange()
      }
      return
    }
    this.failedReads = 0
    this.supply = supply
    this.readAt = this.now()
    this.stale = false
    const hasBattery = this.reader.needsPolling ? supply !== null : null
    const batteryChanged = hasBattery !== this.hasBattery
    this.hasBattery = hasBattery
    if (!this.watching) {
      if (batteryChanged) {
        this.onChange()
      }
      return
    }
    this.scheduleNextRead()
    if (firstAnswer || batteryChanged || this.resolvePause() !== this.pause) {
      this.onChange()
    }
  }

  private scheduleNextRead(): void {
    this.clearPollTimer()
    if (!this.watching || this.reading) {
      return
    }
    const nextReadAt = this.nextReadAt()
    if (nextReadAt === null) {
      return
    }
    this.pollTimer = setTimeout(
      () => {
        this.pollTimer = null
        this.readNow()
      },
      Math.max(0, nextReadAt - this.now())
    )
    this.pollTimer.unref?.()
  }

  private nextReadAt(): number | null {
    if (this.failedReads > 0) {
      return this.failedAt + (this.failedReads === 1 ? FAILED_READ_RETRY_MS : POWER_SUPPLY_POLL_MS)
    }
    const delay = this.pollDelay()
    return delay === null || this.readAt === null ? null : this.readAt + delay
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }
}
