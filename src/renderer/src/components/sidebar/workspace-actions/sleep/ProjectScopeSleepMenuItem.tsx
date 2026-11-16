import type { JSX } from 'react'
import { Moon } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { sleepWorkspacesCountLabel } from '../context-menu/workspace-batch-action-labels'
import {
  collectProjectScopeSleepableWorktrees,
  type ProjectSleepScope
} from './project-scope-sleep-targets'
import { sleepWorktreesConfirmingTwins } from './sleep-twin-confirmation'

/** Mount only inside open menu content: the count subscription must not outlive the menu. */
export function ProjectScopeSleepMenuItem({
  scope,
  leadingSeparator = false
}: {
  scope: ProjectSleepScope
  // Why owned here: a hidden entry must not leave its separator doubled against the next one.
  leadingSeparator?: boolean
}): JSX.Element | null {
  const t = useTranslate()
  const sleepableCount = useAppStore(
    (state) => collectProjectScopeSleepableWorktrees(state, scope).length
  )
  if (sleepableCount === 0) {
    return null
  }
  return (
    <>
      {leadingSeparator ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem
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
    </>
  )
}
