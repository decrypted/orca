import type { SettingsSearchEntry } from '../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'

export const getReduceMotionEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate('settings.appearance.reduceMotion.title', 'Reduce motion'),
    description: translate(
      'settings.appearance.reduceMotion.description',
      "Stop animations and transitions in Orca's interface, such as the spinner on working agents. Browser pages, plugin views and notebook outputs keep following your OS setting."
    ),
    keywords: [
      ...translateSearchKeyword('settings.appearance.reduceMotion.keywords.motion', 'motion'),
      ...translateSearchKeyword('settings.appearance.reduceMotion.keywords.animation', 'animation'),
      ...translateSearchKeyword('settings.appearance.reduceMotion.keywords.spinner', 'spinner'),
      ...translateSearchKeyword(
        'settings.appearance.reduceMotion.keywords.accessibility',
        'accessibility'
      ),
      ...translateSearchKeyword(
        'settings.appearance.reduceMotion.keywords.performance',
        'performance'
      ),
      ...translateSearchKeyword('settings.appearance.reduceMotion.keywords.cpu', 'cpu')
    ]
  }
])
