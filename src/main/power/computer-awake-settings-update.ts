import type { GlobalSettings } from '../../shared/settings/global-settings-types'
import { readComputerAwakeSelection } from '../../shared/app-lifecycle/computer-awake-mode'
import {
  COMPUTER_AWAKE_POWER_SETTING_KEYS,
  readComputerAwakePowerPolicy
} from '../../shared/app-lifecycle/computer-awake-power-policy'
import type { AgentAwakeService } from './agent-awake-service'

// Lives here, not in settings.ts: that handler sits at the max-lines limit upstream.
export function applyComputerAwakeSettingsUpdate(
  service: AgentAwakeService | undefined,
  changed: Partial<GlobalSettings>,
  settings: GlobalSettings
): void {
  if (!service) {
    return
  }
  if ('computerAwakeMode' in changed || 'keepComputerAwakeWhileAgentsRun' in changed) {
    const computerAwake = readComputerAwakeSelection(settings)
    service.setMode(computerAwake.mode, computerAwake.timer)
  }
  if (COMPUTER_AWAKE_POWER_SETTING_KEYS.some((key) => key in changed)) {
    service.setPowerPolicy(readComputerAwakePowerPolicy(settings))
  }
}
