import type { JSX } from 'react'
import { Moon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { sleepWorkspacesCountLabel } from '../context-menu/workspace-batch-action-labels'
import {
  collectProjectScopeSleepableWorktrees,
  type ProjectSleepScope
} from './project-scope-sleep-targets'
import { sleepWorktreesConfirmingTwins } from './sleep-twin-confirmation'

/** Mount only inside open menu content: the count subscription must not outlive the menu. */
export function ProjectScopeSleepMenuItem({ scope }: { scope: ProjectSleepScope }): JSX.Element {
  const t = useTranslate()
  const sleepableCount = useAppStore(
    (state) => collectProjectScopeSleepableWorktrees(state, scope).length
  )
  return (
    <DropdownMenuItem
      disabled={sleepableCount === 0}
      onSelect={() => {
        const state = useAppStore.getState()
        sleepWorktreesConfirmingTwins(collectProjectScopeSleepableWorktrees(state, scope), {
          getState: useAppStore.getState,
          openModal: state.openModal
        })
      }}
    >
      <Moon className="size-3.5" />
      {sleepWorkspacesCountLabel(sleepableCount, t)}
    </DropdownMenuItem>
  )
}
