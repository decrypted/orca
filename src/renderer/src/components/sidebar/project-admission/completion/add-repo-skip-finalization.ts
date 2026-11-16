import type { Repo } from '../../../../../../shared/repository/repo-types'
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
  repos: readonly Pick<Repo, 'id' | 'projectGroupId'>[]
  setActiveRepo: (repoId: string | null) => void
  setShowActiveOnly: (value: boolean) => void
}

export function finalizeImportedRepoAfterSkip(
  state: AddRepoSkipFinalizationState,
  importedRepoId: string
): void {
  // Skip avoids workspace creation/activation; it must still reveal the imported project through sidebar filters.
  if (state.activeRepoId !== importedRepoId) {
    state.setActiveRepo(importedRepoId)
  }
  revealRepoInProjectFilter(state, importedRepoId)
  revealInSidebarProjectGroupFilter(
    state,
    state.repos.find((repo) => repo.id === importedRepoId)
  )
  if (state.showActiveOnly) {
    state.setShowActiveOnly(false)
  }
}
