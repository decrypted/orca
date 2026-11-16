import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import type { ReduceMotionPreference } from '../../../../../shared/accessibility/reduce-motion-settings'
import type { SettingsSearchEntry } from '../search/settings-search'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsRow, SettingsSegmentedControl } from '../form-controls/SettingsFormControls'
import { useTranslate } from '@/i18n/use-translate'

export function ReduceMotionSetting({
  entry,
  preference,
  updateSettings
}: {
  entry: SettingsSearchEntry | undefined
  preference: ReduceMotionPreference
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const t = useTranslate()
  const title = t('settings.appearance.reduceMotion.title', 'Reduce motion')
  return (
    <SearchableSetting
      title={title}
      description={entry?.description}
      keywords={entry?.keywords ?? ['motion', 'animation']}
    >
      <SettingsRow
        label={title}
        description={entry?.description}
        control={
          <SettingsSegmentedControl
            size="sm"
            ariaLabel={title}
            value={preference}
            onChange={(reduceMotion) => updateSettings({ reduceMotion })}
            options={[
              {
                value: 'system',
                label: t('settings.appearance.reduceMotion.system', 'Follow system')
              },
              { value: 'always', label: t('settings.appearance.reduceMotion.always', 'Always') }
            ]}
          />
        }
      />
    </SearchableSetting>
  )
}
