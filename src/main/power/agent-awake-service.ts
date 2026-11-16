import { powerMonitor, powerSaveBlocker } from 'electron'
import {
  normalizeComputerAwakeMode,
  type ComputerAwakeMode,
  type ComputerAwakeStatus,
  type ComputerAwakeTimer
} from '../../shared/app-lifecycle/computer-awake-mode'
import { LinuxLidSleepAssertion } from './linux-lid-sleep-assertion'
import { MacosSystemSleepAssertion } from './macos-system-sleep-assertion'
import { AgentAwakeStatusLease, type AgentAwakeStatus } from './agent-awake-status-lease'
import { ComputerAwakeTimerLease } from './computer-awake-timer-lease'
import { ComputerAwakePowerGate } from './computer-awake-power-gate'
import { createPowerSupplyReader, type PowerSupplyReader } from './power-supply-reader'
import type { ComputerAwakePowerPolicy } from '../../shared/app-lifecycle/computer-awake-power-policy'

type PowerSaveBlocker = {
  start: (type: 'prevent-app-suspension' | 'prevent-display-sleep') => number
  stop: (id: number) => void
  isStarted: (id: number) => boolean
}

type PlatformAwakeAssertion = {
  start: (reason: string) => boolean | void
  stop: (reason: string) => void
  dispose: () => void
}

type PowerMonitorEventSource = {
  on: (event: 'resume' | 'on-ac' | 'on-battery', listener: () => void) => void
  off: (event: 'resume' | 'on-ac' | 'on-battery', listener: () => void) => void
}

type Logger = Pick<Console, 'debug' | 'warn'>

type AgentAwakeServiceOptions = {
  blocker?: PowerSaveBlocker
  linuxAssertion?: PlatformAwakeAssertion
  logger?: Logger
  macosAssertion?: PlatformAwakeAssertion
  now?: () => number
  /** Persists the mode a timed On returned to, so every window and the next launch agree. */
  onTimerExpired?: (resumeMode: ComputerAwakeMode) => void
  platform?: NodeJS.Platform
  powerMonitor?: PowerMonitorEventSource | null
  readPowerSupply?: PowerSupplyReader
}

export class AgentAwakeService {
  private mode: ComputerAwakeMode = 'off'
  private readonly onTimerExpired: ((resumeMode: ComputerAwakeMode) => void) | null
  private blockerId: number | null = null
  private readonly statusListeners = new Set<(status: ComputerAwakeStatus) => void>()
  private lastPublishedStatus: ComputerAwakeStatus | null = null
  private readonly blocker: PowerSaveBlocker
  private readonly linuxAssertion: PlatformAwakeAssertion
  private readonly logger: Logger
  private readonly macosAssertion: PlatformAwakeAssertion
  private readonly platform: NodeJS.Platform
  private readonly now: () => number
  private readonly statusLease: AgentAwakeStatusLease
  private readonly timerLease: ComputerAwakeTimerLease
  private readonly powerGate: ComputerAwakePowerGate
  private readonly unsubscribeResume: (() => void) | null

  constructor(options: AgentAwakeServiceOptions = {}) {
    this.blocker = options.blocker ?? powerSaveBlocker
    this.logger = options.logger ?? console
    this.now = options.now ?? Date.now
    this.onTimerExpired = options.onTimerExpired ?? null
    this.statusLease = new AgentAwakeStatusLease(this.now, () => this.refresh('stale-expiry'))
    this.timerLease = new ComputerAwakeTimerLease(this.now, () => this.refresh('timer-expiry'))
    // Preventing Windows lid sleep requires changing the user’s global power plan.
    this.linuxAssertion =
      options.linuxAssertion ??
      new LinuxLidSleepAssertion({
        blocksLidSwitch: () => !this.powerGate.getPolicy().lidCloseSleeps,
        logger: this.logger,
        now: this.now,
        onUnexpectedFailure: (reason) => this.refresh(reason)
      })
    this.macosAssertion =
      options.macosAssertion ??
      new MacosSystemSleepAssertion({
        logger: this.logger,
        now: this.now,
        onUnexpectedFailure: (reason) => this.refresh(reason)
      })
    this.platform = options.platform ?? process.platform
    const resumeSource = options.powerMonitor === undefined ? powerMonitor : options.powerMonitor
    this.powerGate = new ComputerAwakePowerGate(
      options.readPowerSupply ?? createPowerSupplyReader(this.platform),
      () => this.refresh('power-supply-change'),
      this.logger,
      resumeSource
    )
    if (resumeSource) {
      const onResume = () => {
        this.refresh('power-resume')
        this.timerLease.reschedule()
      }
      resumeSource.on('resume', onResume)
      this.unsubscribeResume = () => resumeSource.off('resume', onResume)
    } else {
      this.unsubscribeResume = null
    }
  }

  setEnabled(enabled: boolean): void {
    this.setMode(enabled ? 'auto' : 'off')
  }

  setMode(mode: ComputerAwakeMode, timer: ComputerAwakeTimer | null = null): void {
    const normalized = normalizeComputerAwakeMode(mode)
    const nextTimer = normalized === 'on' ? timer : null
    const currentTimer = this.timerLease.get()
    if (
      this.mode === normalized &&
      currentTimer?.until === nextTimer?.until &&
      currentTimer?.resumeMode === nextTimer?.resumeMode
    ) {
      return
    }
    this.mode = normalized
    this.timerLease.set(nextTimer)
    this.refresh('settings-change')
  }

  setPowerPolicy(policy: ComputerAwakePowerPolicy): void {
    if (policy.lidCloseSleeps !== this.powerGate.getPolicy().lidCloseSleeps) {
      // A held inhibitor keeps the lock it was spawned with; the next start takes the new one.
      this.runAssertion('stop Linux lid sleep assertion', () => this.linuxAssertion.stop('lid'))
    }
    this.powerGate.setPolicy(policy)
    this.refresh('power-policy-change')
  }

  setStatuses(statuses: AgentAwakeStatus[]): void {
    this.statusLease.replace(statuses)
    this.refresh('status-change')
  }

  updateStatus(paneKey: string, status?: AgentAwakeStatus): void {
    this.statusLease.remove(paneKey)
    if (status) {
      this.statusLease.renew(status)
    }
    this.refresh('status-change')
  }

  /** Renew one accepted observation without rescanning every active agent. */
  observeStatusFreshness(status: AgentAwakeStatus): void {
    if (!this.statusLease.renew(status)) {
      return
    }
    if (this.mode === 'auto' && this.lastPublishedStatus?.active !== true) {
      this.applyAwakeDecision('status-freshness', 1)
    }
  }

  getStatus(): ComputerAwakeStatus {
    const wanted = this.isBlockWanted(this.getEligibleRunningStatusCount())
    const paused = wanted ? this.powerGate.getPause() : null
    return { mode: this.mode, active: wanted && !paused, ...(paused ? { paused } : {}) }
  }

  /** Agents this runtime has seen working recently, independent of the awake setting. */
  getWorkingAgentCount(): number {
    return this.getEligibleRunningStatusCount()
  }

  subscribe(listener: (status: ComputerAwakeStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  dispose(): void {
    this.timerLease.dispose()
    this.powerGate.dispose()
    this.statusLease.dispose()
    this.unsubscribeResume?.()
    this.stopBlocker('dispose')
    this.macosAssertion.dispose()
    this.linuxAssertion.dispose()
  }

  private refresh(reason: string): void {
    const resumeMode = this.timerLease.takeExpired()
    if (resumeMode) {
      this.mode = resumeMode
      this.onTimerExpired?.(resumeMode)
    }
    const runningStatusCount = this.getEligibleRunningStatusCount()
    this.applyAwakeDecision(reason, runningStatusCount)
  }

  private isBlockWanted(runningStatusCount: number): boolean {
    return this.mode === 'on' || (this.mode === 'auto' && runningStatusCount > 0)
  }

  private applyAwakeDecision(reason: string, runningStatusCount: number): void {
    const paused = this.powerGate.evaluate(this.isBlockWanted(runningStatusCount))
    const shouldBlock = this.isBlockWanted(runningStatusCount) && !paused
    if (shouldBlock) {
      const macosAssertionActive = this.runAssertion('start macOS system sleep assertion', () =>
        this.macosAssertion.start(reason)
      )
      if (this.platform !== 'darwin' || !macosAssertionActive) {
        this.startBlocker(reason, runningStatusCount)
      } else {
        this.stopBlocker('macos-assertion-active', runningStatusCount)
      }
      this.runAssertion('start Linux lid sleep assertion', () => this.linuxAssertion.start(reason))
    } else {
      this.stopBlocker(paused ? `paused-${paused}` : reason, runningStatusCount)
      this.runAssertion('stop macOS system sleep assertion', () => this.macosAssertion.stop(reason))
      this.runAssertion('stop Linux lid sleep assertion', () => this.linuxAssertion.stop(reason))
    }
    this.publishStatus({ mode: this.mode, active: shouldBlock, ...(paused ? { paused } : {}) })
  }

  private publishStatus(status: ComputerAwakeStatus): void {
    const last = this.lastPublishedStatus
    if (
      last?.mode === status.mode &&
      last.active === status.active &&
      last.paused === status.paused
    ) {
      return
    }
    this.lastPublishedStatus = status
    for (const listener of this.statusListeners) {
      listener(status)
    }
  }

  private getEligibleRunningStatusCount(): number {
    return this.statusLease.countEligible()
  }

  private startBlocker(reason: string, runningStatusCount: number): void {
    if (this.blockerId !== null) {
      if (this.reconcileBlocker('start-reconcile')) {
        return
      }
    }
    try {
      const id = this.blocker.start('prevent-display-sleep')
      this.blockerId = id
      this.reconcileBlocker('post-start')
    } catch (err) {
      this.logger.warn('[agent-awake] failed to start blocker', {
        reason,
        mode: this.mode,
        runningStatusCount,
        error: err
      })
    }
  }

  private runAssertion(action: string, run: () => boolean | void): boolean {
    try {
      return run() !== false
    } catch (err) {
      this.logger.warn(`[agent-awake] failed to ${action}`, { mode: this.mode, error: err })
      return false
    }
  }

  private stopBlocker(reason: string, runningStatusCount = 0): void {
    if (this.blockerId === null) {
      return
    }
    const id = this.blockerId
    try {
      this.blocker.stop(id)
    } catch (err) {
      this.logger.warn('[agent-awake] failed to stop blocker', {
        reason,
        mode: this.mode,
        runningStatusCount,
        blockerId: id,
        error: err
      })
    }
    this.reconcileBlocker('post-stop')
  }

  private reconcileBlocker(reason: string): boolean {
    if (this.blockerId === null) {
      return false
    }
    const id = this.blockerId
    try {
      const isStarted = this.blocker.isStarted(id)
      if (!isStarted) {
        this.blockerId = null
      }
      return isStarted
    } catch (err) {
      this.logger.warn('[agent-awake] failed to reconcile blocker', {
        reason,
        blockerId: id,
        error: err
      })
      return true
    }
  }
}
