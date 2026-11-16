import type {
  ComputerAwakeMode,
  ComputerAwakeTimer
} from '../../shared/app-lifecycle/computer-awake-mode'

const MAX_TIMEOUT_MS = 2 ** 31 - 1

export class ComputerAwakeTimerLease {
  private timer: ComputerAwakeTimer | null = null
  private timeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly now: () => number,
    private readonly onDue: () => void
  ) {}

  get(): ComputerAwakeTimer | null {
    return this.timer
  }

  set(timer: ComputerAwakeTimer | null): void {
    this.timer = timer
    this.reschedule()
  }

  /** Clears a timer whose deadline has passed and returns the mode it hands back to. */
  takeExpired(): ComputerAwakeMode | null {
    if (!this.timer || this.now() < this.timer.until) {
      return null
    }
    const { resumeMode } = this.timer
    this.set(null)
    return resumeMode
  }

  // Timers can stall while the system sleeps, so resume reschedules from the wall clock.
  reschedule(): void {
    this.clearTimeout()
    const delay = this.timer ? this.timer.until - this.now() : 0
    if (delay <= 0) {
      return
    }
    this.timeout = setTimeout(
      () => {
        this.timeout = null
        this.onDue()
        this.reschedule()
      },
      Math.min(delay, MAX_TIMEOUT_MS)
    )
    this.timeout.unref?.()
  }

  dispose(): void {
    this.clearTimeout()
  }

  private clearTimeout(): void {
    if (this.timeout !== null) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}
