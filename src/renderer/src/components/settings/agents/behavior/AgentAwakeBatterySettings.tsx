import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import {
  COMPUTER_AWAKE_BATTERY_FLOOR_CHOICES,
  readComputerAwakePowerPolicy
} from '../../../../../../shared/app-lifecycle/computer-awake-power-policy'
import {
  SettingsRow,
  SettingsSegmentedControl,
  SettingsSwitchRow
} from '../../form-controls/SettingsFormControls'
import { SettingsGroupNestedRows } from '../../section-layout/SettingsGroup'
import { useTranslate } from '../../../../i18n/use-translate'
import { formatAgentAwakeBatteryPercent } from './agent-awake-copy'
import {
  getComputerAwakePowerControls,
  useComputerAwakeStatus
} from '../../../status-bar/use-computer-awake-status'

type AgentAwakeBatterySettingsProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function AgentAwakeBatterySettings({
  settings,
  updateSettings
}: AgentAwakeBatterySettingsProps): React.JSX.Element | null {
  const t = useTranslate()
  const controls = getComputerAwakePowerControls(useComputerAwakeStatus())
  const isWindows = navigator.userAgent.includes('Windows')
  const policy = readComputerAwakePowerPolicy(settings)
  const onlyWhilePluggedInLabel = t(
    'auto.components.settings.AgentAwakeBatterySettings.onlyWhilePluggedIn',
    'Only while plugged in'
  )
  const floorLabel = t(
    'auto.components.settings.AgentAwakeBatterySettings.floorLabel',
    'On battery, pause below'
  )
  const lidLabel = t(
    'auto.components.settings.AgentAwakeBatterySettings.lidLabel',
    'Closing the lid puts the computer to sleep'
  )
  if (!controls.battery && !controls.lid) {
    return null
  }
  const showFloor = controls.battery && !policy.onlyWhilePluggedIn

  return (
    <SettingsGroupNestedRows>
      {controls.battery ? (
        <SettingsSwitchRow
          label={onlyWhilePluggedInLabel}
          description={t(
            'auto.components.settings.AgentAwakeBatterySettings.onlyWhilePluggedInDescription',
            'On battery power the computer sleeps normally; keeping awake resumes when it is plugged in again.'
          )}
          checked={policy.onlyWhilePluggedIn}
          onChange={() =>
            updateSettings({ computerAwakeOnlyWhilePluggedIn: !policy.onlyWhilePluggedIn })
          }
        />
      ) : null}
      {showFloor && isWindows ? (
        <p data-settings-row="" className="py-3 text-xs text-muted-foreground">
          {t(
            'auto.components.settings.AgentAwakeBatterySettings.windowsNoFloor',
            'Windows gives Orca no charge level, so on battery the computer stays awake with no charge limit.'
          )}
        </p>
      ) : null}
      {showFloor && !isWindows ? (
        <SettingsRow
          label={floorLabel}
          description={t(
            'auto.components.settings.AgentAwakeBatterySettings.floorDescription',
            'Below this charge the computer sleeps normally until it is plugged in again.'
          )}
          control={
            <SettingsSegmentedControl
              value={policy.batteryFloorPercent}
              onChange={(percent) => updateSettings({ computerAwakeBatteryFloorPercent: percent })}
              ariaLabel={floorLabel}
              size="sm"
              options={COMPUTER_AWAKE_BATTERY_FLOOR_CHOICES.map((percent) => ({
                value: percent,
                label: formatAgentAwakeBatteryPercent(percent)
              }))}
            />
          }
        />
      ) : null}
      {controls.lid ? (
        <SettingsSwitchRow
          label={lidLabel}
          description={t(
            'auto.components.settings.AgentAwakeBatterySettings.lidDescription',
            'Off asks this device to stay awake with the lid closed, subject to its power policy.'
          )}
          checked={policy.lidCloseSleeps}
          onChange={() => updateSettings({ computerAwakeLidCloseSleeps: !policy.lidCloseSleeps })}
        />
      ) : null}
    </SettingsGroupNestedRows>
  )
}
