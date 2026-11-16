import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentAwakeService } from './agent-awake-service'

vi.mock('electron', () => ({
  powerMonitor: { on: vi.fn(), off: vi.fn() },
  powerSaveBlocker: { start: vi.fn(), stop: vi.fn(), isStarted: vi.fn() }
}))

const HOUR_MS = 60 * 60 * 1000

function createAssertion() {
  return { start: vi.fn(), stop: vi.fn(), dispose: vi.fn() }
}

function createService(clock: { now: number }) {
  const resumeListeners = new Set<() => void>()
  const onTimerExpired = vi.fn()
  const service = new AgentAwakeService({
    blocker: { start: vi.fn(() => 1), stop: vi.fn(), isStarted: vi.fn(() => true) },
    linuxAssertion: createAssertion(),
    macosAssertion: createAssertion(),
    logger: { debug: vi.fn(), warn: vi.fn() },
    now: () => clock.now,
    onTimerExpired,
    platform: 'linux',
    powerMonitor: {
      on: (_event, listener) => resumeListeners.add(listener),
      off: (_event, listener) => resumeListeners.delete(listener)
    }
  })
  const emitResume = () => resumeListeners.forEach((listener) => listener())
  return { service, onTimerExpired, emitResume }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('AgentAwakeService timed On', () => {
  it('returns to the previous mode when the timer runs out', () => {
    vi.useFakeTimers()
    const clock = { now: 0 }
    const { service, onTimerExpired } = createService(clock)
    service.setMode('on', { until: 3 * HOUR_MS, resumeMode: 'auto', hours: 3 })
    expect(service.getStatus()).toEqual({ mode: 'on', active: true })

    clock.now = 3 * HOUR_MS
    vi.advanceTimersByTime(3 * HOUR_MS)

    expect(service.getStatus()).toEqual({ mode: 'auto', active: false })
    expect(onTimerExpired).toHaveBeenCalledWith('auto')
    service.dispose()
  })

  it('expires on resume when the deadline passed during sleep', () => {
    vi.useFakeTimers()
    const clock = { now: 0 }
    const { service, onTimerExpired, emitResume } = createService(clock)
    service.setMode('on', { until: HOUR_MS, resumeMode: 'off', hours: 1 })

    clock.now = 2 * HOUR_MS
    emitResume()

    expect(service.getStatus()).toEqual({ mode: 'off', active: false })
    expect(onTimerExpired).toHaveBeenCalledWith('off')
    service.dispose()
  })

  it('expires a timer whose deadline passed while the app was closed', () => {
    const { service, onTimerExpired } = createService({ now: 10 * HOUR_MS })
    service.setMode('on', { until: HOUR_MS, resumeMode: 'auto', hours: 1 })

    expect(service.getStatus().mode).toBe('auto')
    expect(onTimerExpired).toHaveBeenCalledWith('auto')
    service.dispose()
  })
})
