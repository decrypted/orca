import { useEffect, useState } from 'react'
import type { ComputerAwakeStatus } from '../../../../shared/app-lifecycle/computer-awake-mode'

const INACTIVE_STATUS: ComputerAwakeStatus = {
  mode: 'off',
  active: false
}

/** The main process's live awake decision, which settings alone cannot tell (paused, battery). */
export function useComputerAwakeStatus(): ComputerAwakeStatus {
  const [status, setStatus] = useState<ComputerAwakeStatus>(INACTIVE_STATUS)

  useEffect(() => {
    let mounted = true
    const unsubscribe = window.api.agentAwake.onChanged((next) => {
      if (mounted) {
        setStatus(next)
      }
    })
    void window.api.agentAwake
      .getStatus()
      .then((next) => {
        if (mounted) {
          setStatus(next)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return status
}

/** Hides options that cannot act here: battery ones without a battery, the lid one off Linux. */
export function getComputerAwakePowerControls(status: ComputerAwakeStatus): {
  battery: boolean
  lid: boolean
} {
  const battery = status.hasBattery !== false
  return { battery, lid: battery && status.lidInhibitAvailable === true }
}
