import type { SettingsSearchEntry } from '../../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../../search/settings-search-keywords'
import { getRemoteHostAutoConnectSearchEntry } from '../../remote-host-auto-connect/remote-host-auto-connect-search'

export const getBackgroundActivitySearchEntry = createLocalizedCatalog(
  () =>
    ({
      portDetection: {
        title: translate('settings.backgroundActivity.portDetection.title', 'Detect ports'),
        description: translate(
          'settings.backgroundActivity.portDetection.description',
          'Show which ports your workspaces listen on, locally and on remote hosts. When off, Orca stops checking which ports listen on this computer, also for connected clients, and hides the Ports status bar item.'
        ),
        keywords: [
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.ports',
            'ports'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.scan',
            'scan'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.localhost',
            'localhost'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.server',
            'server'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.polling',
            'polling'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.background',
            'background'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.portDetection.keywords.remote',
            'remote'
          )
        ]
      },
      remoteHostAutoConnect: getRemoteHostAutoConnectSearchEntry()
    }) satisfies Record<string, SettingsSearchEntry>
)

export const getBackgroundActivityGroupSearchEntry = createLocalizedCatalog(
  (): SettingsSearchEntry => ({
    title: translate('settings.backgroundActivity.title', 'Background activity'),
    description: translate(
      'settings.backgroundActivity.description',
      'Checks Orca runs on its own while you work.'
    )
  })
)

export const getBackgroundActivitySearchEntries = createLocalizedCatalog(
  (): SettingsSearchEntry[] => [
    getBackgroundActivityGroupSearchEntry(),
    ...Object.values(getBackgroundActivitySearchEntry())
  ]
)
