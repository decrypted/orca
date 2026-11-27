import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { powerMonitor } from 'electron'
import { runProcess } from '@orca/process-host'
import type { PowerSupplyState } from '../../shared/app-lifecycle/computer-awake-power-policy'

export type PowerSupplyReader = {
  /** Linux reports no AC/battery events, so only there must a reader be polled to see unplugging;
   *  only that reader also tells whether a battery exists (null from read). */
  needsPolling: boolean
  /** A synchronous AC/battery answer where the OS has one, checked on every decision. */
  readOnBatteryNow?: () => boolean
  /** Resolves null only when no system battery was positively found and rejects when the
   *  answer is unknown; the charge level is read only on request. */
  read: (needLevel: boolean) => Promise<PowerSupplyState | null>
  /** Drops cached device knowledge, e.g. after resume when docks may have changed. */
  invalidate?: () => void
}

const LINUX_POWER_SUPPLY_ROOT = '/sys/class/power_supply'
const PMSET_TIMEOUT_MS = 5_000

export function createPowerSupplyReader(
  platform: NodeJS.Platform = process.platform
): PowerSupplyReader {
  if (platform === 'linux') {
    return createLinuxPowerSupplyReader(LINUX_POWER_SUPPLY_ROOT)
  }
  if (platform === 'darwin') {
    return { needsPolling: false, readOnBatteryNow: isOnBatteryPower, read: readMacosPowerSupply }
  }
  // Windows has no cheap charge-level source, so only the on-battery pause applies there.
  return {
    needsPolling: false,
    readOnBatteryNow: isOnBatteryPower,
    read: async () => ({ onBattery: isOnBatteryPower(), batteryPercent: null })
  }
}

type SupplyKind = 'external' | 'battery' | 'other'

export function createLinuxPowerSupplyReader(root: string): PowerSupplyReader {
  // Supply types never change, so each name is classified once instead of on every read.
  const kinds = new Map<string, SupplyKind>()

  // Rejects so a vanished or unreadable supply makes the whole answer unknown, never "no battery".
  const readValue = async (name: string, key: string): Promise<string> => {
    try {
      return (await readFile(join(root, name, key), 'utf8')).trim()
    } catch (error) {
      kinds.delete(name)
      throw error
    }
  }

  const readOptionalValue = (name: string, key: string): Promise<string | null> =>
    readFile(join(root, name, key), 'utf8').then(
      (value) => value.trim(),
      () => null
    )

  const classify = async (name: string): Promise<SupplyKind> => {
    const type = await readValue(name, 'type')
    // Scope "Device" marks a peripheral's own supply (mouse battery, an attached phone's USB
    // charger), which neither powers the machine nor says whether it is plugged in.
    if ((await readOptionalValue(name, 'scope')) === 'Device') {
      return 'other'
    }
    if (type === 'Mains' || type.startsWith('USB')) {
      return 'external'
    }
    return type === 'Battery' ? 'battery' : 'other'
  }

  const readAll = async (names: string[], key: string): Promise<string[]> => {
    const values: string[] = []
    for (const name of names) {
      values.push(await readValue(name, key))
    }
    return values
  }

  const readNumber = async (name: string, key: string): Promise<number> => {
    const value = await readOptionalValue(name, key)
    return value === null ? Number.NaN : Number(value)
  }

  // Several batteries charge unevenly, so weigh each by its size where the kernel reports it.
  const readChargePercent = async (batteries: string[]): Promise<number | null> => {
    if (batteries.length > 1) {
      for (const [nowKey, fullKey] of [
        ['energy_now', 'energy_full'],
        ['charge_now', 'charge_full']
      ]) {
        let now = 0
        let full = 0
        for (const name of batteries) {
          now += await readNumber(name, nowKey)
          full += await readNumber(name, fullKey)
        }
        if (Number.isFinite(now) && Number.isFinite(full) && full > 0) {
          return Math.round((now / full) * 100)
        }
      }
    }
    const levels = (await readAll(batteries, 'capacity')).map(Number).filter(Number.isFinite)
    return levels.length > 0
      ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
      : null
  }

  return {
    needsPolling: true,
    invalidate: () => kinds.clear(),
    read: async (needLevel) => {
      let names: string[]
      try {
        names = await readdir(root)
      } catch (error) {
        // No power_supply class at all (VMs, containers) is a positive "no battery".
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return null
        }
        throw error
      }
      for (const name of kinds.keys()) {
        if (!names.includes(name)) {
          kinds.delete(name)
        }
      }
      for (const name of names) {
        if (!kinds.has(name)) {
          kinds.set(name, await classify(name))
        }
      }
      const ofKind = (kind: SupplyKind) => names.filter((name) => kinds.get(name) === kind)
      const batteries = ofKind('battery')
      if (batteries.length === 0) {
        return null
      }
      const external = ofKind('external')
      let onBattery = true
      if (external.length === 0) {
        onBattery = (await readAll(batteries, 'status')).includes('Discharging')
      } else {
        for (const name of external) {
          if ((await readOptionalValue(name, 'online')) === '1') {
            onBattery = false
            break
          }
        }
      }
      if (!needLevel || !onBattery) {
        return { onBattery, batteryPercent: null }
      }
      return { onBattery, batteryPercent: await readChargePercent(batteries) }
    }
  }
}

async function readMacosPowerSupply(needLevel: boolean): Promise<PowerSupplyState | null> {
  const onBattery = isOnBatteryPower()
  if (!onBattery || !needLevel) {
    return { onBattery, batteryPercent: null }
  }
  try {
    const result = await runProcess({
      program: '/usr/bin/pmset',
      args: ['-g', 'batt'],
      timeoutMs: PMSET_TIMEOUT_MS
    })
    const battery =
      result.code === 0 && !result.timedOut
        ? /InternalBattery[^\n]*?(\d{1,3})%/.exec(result.stdout)
        : null
    if (battery) {
      return { onBattery, batteryPercent: Number(battery[1]) }
    }
  } catch {
    // Fall through to the on-battery answer without a charge level.
  }
  return { onBattery, batteryPercent: null }
}

export function isOnBatteryPower(): boolean {
  try {
    return powerMonitor.isOnBatteryPower()
  } catch {
    // An unavailable power API is not evidence of battery use.
    return false
  }
}
