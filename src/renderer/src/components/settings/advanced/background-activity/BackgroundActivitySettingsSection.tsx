import type React from 'react'
import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import { isPortDetectionEnabled } from '../../../../../../shared/workspace/ports/port-detection-settings'
import { isRemoteHostAutoConnectEnabled } from '../../../../../../shared/remote-runtime/ssh/remote-host-auto-connect-settings'
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
  const { portDetection, remoteHostAutoConnect } = getBackgroundActivitySearchEntry()
  const portDetectionEnabled = isPortDetectionEnabled(settings)
  const remoteHostAutoConnectEnabled = isRemoteHostAutoConnectEnabled(settings)
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
      <SearchableSetting
        title={remoteHostAutoConnect.title}
        description={remoteHostAutoConnect.description}
        keywords={remoteHostAutoConnect.keywords}
        id="background-activity-remote-host-auto-connect"
        forceVisible={groupMatches}
      >
        <SettingsSwitchRow
          label={remoteHostAutoConnect.title}
          description={remoteHostAutoConnect.description}
          checked={remoteHostAutoConnectEnabled}
          onChange={() =>
            updateSettings({ remoteHostAutoConnectEnabled: !remoteHostAutoConnectEnabled })
          }
        />
      </SearchableSetting>
    </SettingsGroup>
  )
}
