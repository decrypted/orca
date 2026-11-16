import type { SettingsSearchEntry } from '../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'

export const getRemoteHostAutoConnectSearchEntry = createLocalizedCatalog(
  (): SettingsSearchEntry => ({
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
  })
)
