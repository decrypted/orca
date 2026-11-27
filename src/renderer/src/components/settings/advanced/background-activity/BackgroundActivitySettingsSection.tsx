import type React from 'react'
import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import { isPortDetectionEnabled } from '../../../../../../shared/workspace/ports/port-detection-settings'
import { useAppStore } from '../../../../store/index'
import { matchesSettingsSearch } from '../../search/settings-search'
import { SearchableSetting } from '../../section-layout/SearchableSetting'
import { SettingsGroup } from '../../section-layout/SettingsGroup'
import { SettingsSwitchRow } from '../../form-controls/SettingsFormControls'
import {
  getBackgroundActivityGroupSearchEntry,
  getBackgroundActivitySearchEntries,
  getBackgroundActivitySearchEntry
} from './background-activity-search'

export function BackgroundActivitySettingsSection({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element | null {
  const query = useAppStore((state) => state.settingsSearchQuery)
  if (!matchesSettingsSearch(query, getBackgroundActivitySearchEntries())) {
    return null
  }
  const group = getBackgroundActivityGroupSearchEntry()
  // A search for the group itself lists every row in it.
  const groupMatches = matchesSettingsSearch(query, group)
  const portDetection = getBackgroundActivitySearchEntry().portDetection
  const portDetectionEnabled = isPortDetectionEnabled(settings)
  return (
    <SettingsGroup title={group.title} description={group.description}>
      <SearchableSetting
        title={portDetection.title}
        description={portDetection.description}
        keywords={portDetection.keywords}
        id="background-activity-port-detection"
        forceVisible={groupMatches}
      >
        <SettingsSwitchRow
          label={portDetection.title}
          description={portDetection.description}
          checked={portDetectionEnabled}
          onChange={() => updateSettings({ portDetectionEnabled: !portDetectionEnabled })}
        />
      </SearchableSetting>
    </SettingsGroup>
  )
}
