import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentAwakeService } from './agent-awake-service'
import { createLinuxPowerSupplyReader, type PowerSupplyReader } from './power-supply-reader'
import type { PowerSupplyState } from '../../shared/app-lifecycle/computer-awake-power-policy'

vi.mock('electron', () => ({
  powerMonitor: { on: vi.fn(), off: vi.fn() },
  powerSaveBlocker: { start: vi.fn(), stop: vi.fn(), isStarted: vi.fn() }
}))

const HOUR_MS = 60 * 60 * 1000

function createAssertion() {
  return { start: vi.fn(), stop: vi.fn(), dispose: vi.fn() }
}

function createService(
  clock: { now: number },
  supply: { current: PowerSupplyState | null } = { current: null },
  reader: PowerSupplyReader = { needsPolling: false, read: async () => supply.current }
) {
  const resumeListeners = new Set<() => void>()
  const onTimerExpired = vi.fn()
  let blocking = false
  const blocker = {
    start: vi.fn(() => {
      blocking = true
      return 1
    }),
    stop: vi.fn(() => {
      blocking = false
    }),
    isStarted: vi.fn(() => blocking)
  }
  const service = new AgentAwakeService({
    blocker,
    powerSupplyReader: reader,
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
  return { service, onTimerExpired, emitResume, isBlocking: () => blocking }
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
    expect(service.getStatus().mode).toBe('on')

    clock.now = 3 * HOUR_MS
    vi.advanceTimersByTime(3 * HOUR_MS)

    expect(service.getStatus().mode).toBe('auto')
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

    expect(service.getStatus().mode).toBe('off')
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

describe('AgentAwakeService on battery', () => {
  it('releases the block on battery and takes it again on AC', async () => {
    const supply: { current: PowerSupplyState | null } = {
      current: { onBattery: true, batteryPercent: 80 }
    }
    const { service, emitResume, isBlocking } = createService({ now: 0 }, supply)
    service.setPowerPolicy({
      onlyWhilePluggedIn: true,
      batteryFloorPercent: 50,
      lidCloseSleeps: true
    })
    service.setMode('on')

    await vi.waitFor(() =>
      expect(service.getStatus()).toMatchObject({ mode: 'on', active: false, paused: 'battery' })
    )
    expect(isBlocking()).toBe(false)

    supply.current = { onBattery: false, batteryPercent: 80 }
    emitResume()

    await vi.waitFor(() => expect(service.getStatus()).toMatchObject({ mode: 'on', active: true }))
    expect(isBlocking()).toBe(true)
    service.dispose()
  })

  it('keeps the block on battery above the floor and releases it below', async () => {
    const supply: { current: PowerSupplyState | null } = {
      current: { onBattery: true, batteryPercent: 60 }
    }
    const { service, emitResume, isBlocking } = createService({ now: 0 }, supply)
    service.setPowerPolicy({
      onlyWhilePluggedIn: false,
      batteryFloorPercent: 50,
      lidCloseSleeps: true
    })
    service.setMode('on')
    await vi.waitFor(() => expect(isBlocking()).toBe(true))

    supply.current = { onBattery: true, batteryPercent: 49 }
    emitResume()

    await vi.waitFor(() =>
      expect(service.getStatus()).toMatchObject({
        mode: 'on',
        active: false,
        paused: 'low-battery'
      })
    )
    expect(isBlocking()).toBe(false)
    service.dispose()
  })
})

describe('AgentAwakeService with a failing power supply read', () => {
  it('keeps polling after a failed read and releases the block once on battery', async () => {
    vi.useFakeTimers()
    const read = vi
      .fn<PowerSupplyReader['read']>()
      .mockRejectedValueOnce(new Error('EIO'))
      .mockResolvedValue({ onBattery: true, batteryPercent: 80 })
    const { service, isBlocking } = createService({ now: 0 }, undefined, {
      needsPolling: true,
      read
    })
    service.setMode('on')
    await vi.waitFor(() => expect(isBlocking()).toBe(true))

    await vi.advanceTimersByTimeAsync(60_000)

    expect(service.getStatus()).toMatchObject({ mode: 'on', active: false, paused: 'battery' })
    expect(isBlocking()).toBe(false)
    service.dispose()
  })
})

describe('readLinuxPowerSupply', () => {
  const roots: string[] = []
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  async function supplyDir(entries: Record<string, Record<string, string>>): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'orca-power-supply-'))
    roots.push(root)
    for (const [name, values] of Object.entries(entries)) {
      await mkdir(join(root, name))
      for (const [key, value] of Object.entries(values)) {
        await writeFile(join(root, name, key), `${value}\n`)
      }
    }
    return root
  }

  it('reads an unplugged laptop and ignores peripheral batteries', async () => {
    const root = await supplyDir({
      AC: { type: 'Mains', online: '0' },
      BAT0: { type: 'Battery', capacity: '42', status: 'Discharging' },
      hid_mouse: { type: 'Battery', scope: 'Device', capacity: '5', status: 'Discharging' }
    })
    await expect(createLinuxPowerSupplyReader(root).read(true)).resolves.toEqual({
      onBattery: true,
      batteryPercent: 42
    })
  })

  it('ignores a peripheral USB supply without an online file', async () => {
    const root = await supplyDir({
      AC: { type: 'Mains', online: '0' },
      BAT0: { type: 'Battery', capacity: '42', status: 'Discharging' },
      apple_mfi_fastcharge: { type: 'USB', scope: 'Device' }
    })
    await expect(createLinuxPowerSupplyReader(root).read(true)).resolves.toEqual({
      onBattery: true,
      batteryPercent: 42
    })
  })

  it('reports no battery on a desktop', async () => {
    const root = await supplyDir({ AC: { type: 'Mains', online: '1' } })
    await expect(createLinuxPowerSupplyReader(root).read(true)).resolves.toBeNull()
  })
})
