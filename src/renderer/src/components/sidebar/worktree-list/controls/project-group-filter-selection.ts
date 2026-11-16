import type { AppState } from '@/store/types'
import {
  resolveProjectGroupFilter,
  revealRepoInProjectGroupFilter,
  type ProjectGroupFilter
} from '../../../../../../shared/project/groups/project-group-filter'
import type { Repo } from '../../../../../../shared/repository/repo-types'

type ProjectGroupFilterInputs = Pick<AppState, 'projectGroups' | 'hiddenProjectGroupIds'>

let lastProjectGroups: AppState['projectGroups'] | null = null
let lastHiddenIds: AppState['hiddenProjectGroupIds'] | null = null
let lastFilter: ProjectGroupFilter | null = null

/** Stable across renders while both store arrays keep their identity, so it can be a selector. */
export function selectProjectGroupFilter(state: ProjectGroupFilterInputs): ProjectGroupFilter {
  if (
    lastFilter &&
    lastProjectGroups === state.projectGroups &&
    lastHiddenIds === state.hiddenProjectGroupIds
  ) {
    return lastFilter
  }
  lastProjectGroups = state.projectGroups
  lastHiddenIds = state.hiddenProjectGroupIds
  lastFilter = resolveProjectGroupFilter(state.projectGroups, state.hiddenProjectGroupIds)
  return lastFilter
}

export type ProjectGroupFilterRevealState = ProjectGroupFilterInputs &
  Pick<AppState, 'setHiddenProjectGroupIds'>

/** Opening or adding a project or folder in a hidden group shows that group again, as the project filter does. */
export function revealInSidebarProjectGroupFilter(
  state: ProjectGroupFilterRevealState,
  member: Pick<Repo, 'projectGroupId'> | undefined
): void {
  if (!member || state.hiddenProjectGroupIds.length === 0) {
    return
  }
  const next = revealRepoInProjectGroupFilter(
    state.projectGroups,
    state.hiddenProjectGroupIds,
    member
  )
  if (next) {
    state.setHiddenProjectGroupIds(next)
  }
}
