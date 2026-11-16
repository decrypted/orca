import type { SettingsSearchEntry } from '../../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../../search/settings-search-keywords'

export const getBackgroundActivitySearchEntry = createLocalizedCatalog(
  () =>
    ({
      portDetection: {
        title: translate('settings.backgroundActivity.portDetection.title', 'Detect ports'),
        description: translate(
          'settings.backgroundActivity.portDetection.description',
          'Check which ports your workspaces listen on, locally and on remote hosts. When off, Orca runs no port scans and hides the Ports status bar item.'
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
      remoteHostAutoConnect: {
        title: translate(
          'settings.backgroundActivity.remoteHostAutoConnect.title',
          'Connect to remote hosts automatically'
        ),
        description: translate(
          'settings.backgroundActivity.remoteHostAutoConnect.description',
          'Reconnect SSH hosts and the Orca servers on them at launch, and keep trying to reach them in the background. When off, Orca connects to a host only once you connect it yourself.'
        ),
        keywords: [
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.ssh',
            'ssh'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.remote',
            'remote'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.reconnect',
            'reconnect'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.launch',
            'launch'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.startup',
            'startup'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.server',
            'server'
          ),
          ...translateSearchKeyword(
            'settings.backgroundActivity.remoteHostAutoConnect.keywords.background',
            'background'
          )
        ]
      }
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
