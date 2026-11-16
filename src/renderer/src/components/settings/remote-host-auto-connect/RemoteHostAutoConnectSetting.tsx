import type React from 'react'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { isRemoteHostAutoConnectEnabled } from '../../../../../shared/remote-runtime/ssh/remote-host-auto-connect-settings'
import { useAppStore } from '../../../store/index'
import { matchesSettingsSearch } from '../search/settings-search'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { getRemoteHostAutoConnectSearchEntry } from './remote-host-auto-connect-search'

type RemoteHostAutoConnectSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  id: string
  forceVisible?: boolean
}

export function RemoteHostAutoConnectSetting({
  settings,
  updateSettings,
  id,
  forceVisible
}: RemoteHostAutoConnectSettingProps): React.JSX.Element {
  const entry = getRemoteHostAutoConnectSearchEntry()
  const enabled = isRemoteHostAutoConnectEnabled(settings)
  return (
    <SearchableSetting
      title={entry.title}
      description={entry.description}
      keywords={entry.keywords}
      id={id}
      forceVisible={forceVisible}
    >
      <SettingsSwitchRow
        label={entry.title}
        description={entry.description}
        checked={enabled}
        onChange={() => updateSettings({ remoteHostAutoConnectEnabled: !enabled })}
      />
    </SearchableSetting>
  )
}

/** The same setting as a card of its own, for panes that have no group to hold it. */
export function RemoteHostAutoConnectGroup(
  props: Omit<RemoteHostAutoConnectSettingProps, 'forceVisible'>
): React.JSX.Element | null {
  const query = useAppStore((state) => state.settingsSearchQuery)
  if (!matchesSettingsSearch(query, getRemoteHostAutoConnectSearchEntry())) {
    return null
  }
  return (
    <SettingsGroup>
      <RemoteHostAutoConnectSetting {...props} forceVisible />
    </SettingsGroup>
  )
}
