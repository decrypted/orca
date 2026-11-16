import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import {
  COMPUTER_AWAKE_BATTERY_FLOOR_CHOICES,
  COMPUTER_AWAKE_BATTERY_RESUME_MARGIN_PERCENT,
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

type AgentAwakeBatterySettingsProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function AgentAwakeBatterySettings({
  settings,
  updateSettings
}: AgentAwakeBatterySettingsProps): React.JSX.Element {
  const t = useTranslate()
  const userAgent = navigator.userAgent
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
  // Windows exposes no cheap charge level, and only Linux lets Orca hold a closed lid awake.
  const showFloor = !policy.onlyWhilePluggedIn && !userAgent.includes('Windows')
  const showLid = !userAgent.includes('Windows') && !userAgent.includes('Mac')

  return (
    <SettingsGroupNestedRows>
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
      {showFloor ? (
        <SettingsRow
          label={floorLabel}
          description={t(
            'auto.components.settings.AgentAwakeBatterySettings.floorDescription',
            'Below this charge the computer sleeps normally; keeping awake resumes when it is plugged in or charged {{margin}} points above it.',
            { margin: COMPUTER_AWAKE_BATTERY_RESUME_MARGIN_PERCENT }
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
      {showLid ? (
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
