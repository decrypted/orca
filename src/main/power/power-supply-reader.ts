import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { powerMonitor } from 'electron'
import { runProcess } from '@orca/process-host'
import type { PowerSupplyState } from '../../shared/app-lifecycle/computer-awake-power-policy'

/** Resolves null when no system battery is found. */
export type PowerSupplyReader = () => Promise<PowerSupplyState | null>

const LINUX_POWER_SUPPLY_ROOT = '/sys/class/power_supply'
const PMSET_TIMEOUT_MS = 5_000

export function createPowerSupplyReader(
  platform: NodeJS.Platform = process.platform
): PowerSupplyReader {
  if (platform === 'linux') {
    return () => readLinuxPowerSupply(LINUX_POWER_SUPPLY_ROOT)
  }
  if (platform === 'darwin') {
    return readMacosPowerSupply
  }
  // Windows has no cheap charge-level source, so only the on-battery pause applies there.
  return async () => ({ onBattery: isOnBatteryPower(), batteryPercent: null })
}

async function readSupplyValue(root: string, name: string, key: string): Promise<string | null> {
  try {
    return (await readFile(join(root, name, key), 'utf8')).trim()
  } catch {
    return null
  }
}

export async function readLinuxPowerSupply(root: string): Promise<PowerSupplyState | null> {
  let names: string[]
  try {
    names = await readdir(root)
  } catch {
    return null
  }
  let sawExternalSupply = false
  let externalSupplyOnline = false
  const batteries: { capacity: number; status: string | null }[] = []
  for (const name of names) {
    const type = await readSupplyValue(root, name, 'type')
    if (type === 'Battery') {
      // Mice and headsets report scope "Device"; only the system battery powers the machine.
      if ((await readSupplyValue(root, name, 'scope')) === 'Device') {
        continue
      }
      batteries.push({
        capacity: Number(await readSupplyValue(root, name, 'capacity')),
        status: await readSupplyValue(root, name, 'status')
      })
    } else if (type === 'Mains' || type?.startsWith('USB')) {
      sawExternalSupply = true
      externalSupplyOnline ||= (await readSupplyValue(root, name, 'online')) === '1'
    }
  }
  if (batteries.length === 0) {
    return null
  }
  const levels = batteries.map((battery) => battery.capacity).filter(Number.isFinite)
  return {
    onBattery: sawExternalSupply
      ? !externalSupplyOnline
      : batteries.some((battery) => battery.status === 'Discharging'),
    batteryPercent:
      levels.length > 0
        ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
        : null
  }
}

async function readMacosPowerSupply(): Promise<PowerSupplyState | null> {
  try {
    const result = await runProcess({
      program: '/usr/bin/pmset',
      args: ['-g', 'batt'],
      timeoutMs: PMSET_TIMEOUT_MS
    })
    if (result.code === 0 && !result.timedOut) {
      return parsePmsetBattery(result.stdout)
    }
  } catch {
    // Fall through to Electron's AC/battery answer without a charge level.
  }
  return { onBattery: isOnBatteryPower(), batteryPercent: null }
}

function parsePmsetBattery(stdout: string): PowerSupplyState | null {
  const battery = /InternalBattery[^\n]*?(\d{1,3})%/.exec(stdout)
  if (!battery) {
    return null
  }
  return {
    onBattery: stdout.includes("'Battery Power'"),
    batteryPercent: Number(battery[1])
  }
}

export function isOnBatteryPower(): boolean {
  try {
    return powerMonitor.isOnBatteryPower()
  } catch {
    // An unavailable power API is not evidence of battery use.
    return false
  }
}
