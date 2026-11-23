import { describe, expect, it } from 'vitest'
import {
  holdSshTargetForAutoConnectOff,
  isSshUserDisconnected,
  liftSshAutoConnectOffHolds,
  recordSshUserDisconnected
} from './ssh-user-disconnect'

describe('turning automatic connects back on', () => {
  it('lifts only the holds the setting made, never a Disconnect by the user', () => {
    recordSshUserDisconnected('disconnected-before')
    holdSshTargetForAutoConnectOff('disconnected-before')
    holdSshTargetForAutoConnectOff('disconnected-after')
    recordSshUserDisconnected('disconnected-after')
    holdSshTargetForAutoConnectOff('idle')

    liftSshAutoConnectOffHolds()

    expect(isSshUserDisconnected('disconnected-before')).toBe(true)
    expect(isSshUserDisconnected('disconnected-after')).toBe(true)
    expect(isSshUserDisconnected('idle')).toBe(false)
  })
})
