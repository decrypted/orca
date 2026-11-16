import type { GlobalSettings } from '../../../../../../shared/global-settings-types'
import { isPortDetectionEnabled } from '../../../../../../shared/workspace/ports/port-detection-settings'
import { useTranslate } from '@/i18n/use-translate'
import { SearchableSetting } from '../../section-layout/SearchableSetting'
import { SettingsSwitchRow } from '../../form-controls/SettingsFormControls'

type BrowserLocalhostWorktreeLabelsSettingProps = {
  settings: Pick<GlobalSettings, 'localhostWorktreeLabelsEnabled' | 'portDetectionEnabled'>
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function BrowserLocalhostWorktreeLabelsSetting({
  settings,
  updateSettings
}: BrowserLocalhostWorktreeLabelsSettingProps): React.JSX.Element {
  const t = useTranslate()
  const title = t(
    'auto.components.settings.BrowserLocalhostWorktreeLabelsSetting.1af20fbf51',
    'Localhost worktree labels'
  )
  const description = t(
    'auto.components.settings.BrowserLocalhostWorktreeLabelsSetting.1db3c8b983',
    'Open workspace ports as worktree-specific Orca localhost URLs so browser tabs are easier to tell apart.'
  )
  // Why: labels attach only to detected ports, so the switch does nothing while detection is off.
  const portDetectionEnabled = isPortDetectionEnabled(settings)

  return (
    <SearchableSetting
      title={title}
      description={description}
      keywords={['browser', 'localhost', 'ports', 'worktree', 'tabs', 'favicon', 'labels']}
    >
      <SettingsSwitchRow
        label={title}
        description={
          portDetectionEnabled
            ? description
            : t(
                'auto.components.settings.BrowserLocalhostWorktreeLabelsSetting.needsPortDetection',
                'Needs port detection, which is off in Advanced.'
              )
        }
        disabled={!portDetectionEnabled}
        checked={settings.localhostWorktreeLabelsEnabled === true}
        onChange={() =>
          updateSettings({
            localhostWorktreeLabelsEnabled: settings.localhostWorktreeLabelsEnabled !== true
          })
        }
      />
    </SearchableSetting>
  )
}
