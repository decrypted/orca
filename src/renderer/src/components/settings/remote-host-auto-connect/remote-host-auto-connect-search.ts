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
      'Let Orca connect to SSH hosts, and the Orca servers on them, on its own: at launch and in the background. When off, it connects a host only when you do. Servers paired directly, without an SSH host, are not affected.'
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
