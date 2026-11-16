import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { isDefaultBranchWorkspace } from '../../../../../../shared/worktree/visibility/workspace-kinds'
import {
  revealRepoInProjectFilter,
  type ProjectFilterRevealState
} from '../../worktree-list/controls/project-filter-reveal'
import {
  revealInSidebarProjectGroupFilter,
  type ProjectGroupFilterRevealState
} from '../../worktree-list/controls/project-group-filter-selection'

type SidebarFilterRevealState = ProjectFilterRevealState & ProjectGroupFilterRevealState

export type AddRepoSkipFinalizationState = SidebarFilterRevealState & {
  activeRepoId: string | null
  showActiveOnly: boolean
  hideDefaultBranchWorkspace: boolean
  showSleepingWorkspaces: boolean
  alwaysShowDefaultBranchWorkspace: boolean
  repos: readonly Pick<Repo, 'id' | 'kind' | 'projectGroupId'>[]
  worktreesByRepo: Record<string, Worktree[]>
  setActiveRepo: (repoId: string | null) => void
  setShowActiveOnly: (value: boolean) => void
  setHideDefaultBranchWorkspace: (value: boolean) => void
  setAlwaysShowDefaultBranchWorkspace: (value: boolean) => void
}

export function finalizeImportedRepoAfterSkip(
  state: AddRepoSkipFinalizationState,
  importedRepoId: string
): void {
  const importedWorktrees = (state.worktreesByRepo[importedRepoId] ?? []).filter(
    (worktree) => !worktree.isArchived
  )
  const importedRepo = state.repos.find((repo) => repo.id === importedRepoId)

  // Skip avoids workspace creation/activation; it must still reveal the imported project through sidebar filters.
  if (state.activeRepoId !== importedRepoId) {
    state.setActiveRepo(importedRepoId)
  }
  revealRepoInProjectFilter(state, importedRepoId)
  revealInSidebarProjectGroupFilter(state, importedRepo)
  if (state.showActiveOnly) {
    state.setShowActiveOnly(false)
  }
  if (
    importedWorktrees.length > 0 &&
    state.hideDefaultBranchWorkspace &&
    importedWorktrees.every((worktree) => isDefaultBranchWorkspace(worktree, importedRepo))
  ) {
    state.setHideDefaultBranchWorkspace(false)
  }
  // New imports have no live PTYs; Hide sleeping must not conceal the project on arrival.
  if (
    importedWorktrees.length > 0 &&
    state.alwaysShowDefaultBranchWorkspace === false &&
    !state.showSleepingWorkspaces &&
    importedWorktrees.every((worktree) => worktree.isMainWorktree)
  ) {
    state.setAlwaysShowDefaultBranchWorkspace(true)
  }
}
