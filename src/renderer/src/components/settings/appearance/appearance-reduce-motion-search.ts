import type { SettingsSearchEntry } from '../search/settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../search/settings-search-keywords'

export const getReduceMotionEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate('settings.appearance.reduceMotion.title', 'Reduce motion'),
    description: translate(
      'settings.appearance.reduceMotion.description',
      'Turn off animations and transitions, such as the spinner on working agents. Follow system uses the reduced motion setting of your OS.'
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
