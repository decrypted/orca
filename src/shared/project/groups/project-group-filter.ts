import type { Repo } from '../../repository/repo-types'
import type { ProjectGroup } from './project-group-types'

/** Stands for projects outside any listed group in the hidden-group list. */
export const UNGROUPED_PROJECT_GROUP_FILTER_ID = 'project-group-filter:ungrouped'

/** The sidebar's project-group view filter, resolved against the groups listed now. */
export type ProjectGroupFilter = {
  /** A listed group, or Ungrouped, is hidden; ids of deleted groups never count. */
  readonly active: boolean
  /** The group or one of its ancestors is hidden. */
  isGroupHidden: (groupId: string) => boolean
  isRepoHidden: (repo: Pick<Repo, 'projectGroupId'>) => boolean
}

export const NO_PROJECT_GROUP_FILTER: ProjectGroupFilter = {
  active: false,
  isGroupHidden: () => false,
  isRepoHidden: () => false
}

type GroupLink = Pick<ProjectGroup, 'id' | 'parentGroupId'>

// Hidden ids (not shown ids) keep groups created later visible, and a deleted group's id inert.
export function resolveProjectGroupFilter(
  projectGroups: readonly GroupLink[],
  hiddenProjectGroupIds: readonly string[]
): ProjectGroupFilter {
  if (hiddenProjectGroupIds.length === 0) {
    return NO_PROJECT_GROUP_FILTER
  }
  const hidden = new Set(hiddenProjectGroupIds)
  const parentById = new Map<string, string | null>()
  for (const group of projectGroups) {
    parentById.set(group.id, group.parentGroupId)
  }
  const hiddenGroupIds = new Set<string>()
  for (const groupId of parentById.keys()) {
    const visited = new Set<string>()
    let current: string | null | undefined = groupId
    // A missing parent makes the group a root, as the sidebar tree does.
    while (current && parentById.has(current) && !visited.has(current)) {
      if (hidden.has(current)) {
        hiddenGroupIds.add(groupId)
        break
      }
      visited.add(current)
      current = parentById.get(current)
    }
  }
  const ungroupedHidden = hidden.has(UNGROUPED_PROJECT_GROUP_FILTER_ID)
  if (hiddenGroupIds.size === 0 && !ungroupedHidden) {
    return NO_PROJECT_GROUP_FILTER
  }
  return {
    active: true,
    isGroupHidden: (groupId) => hiddenGroupIds.has(groupId),
    // A membership naming an unlisted group renders at the root, so Ungrouped governs it.
    isRepoHidden: (repo) =>
      repo.projectGroupId && parentById.has(repo.projectGroupId)
        ? hiddenGroupIds.has(repo.projectGroupId)
        : ungroupedHidden
  }
}

/** The hidden ids without whatever hides `repo`, or null when nothing hides it. */
export function revealRepoInProjectGroupFilter(
  projectGroups: readonly GroupLink[],
  hiddenProjectGroupIds: readonly string[],
  repo: Pick<Repo, 'projectGroupId'>
): string[] | null {
  if (!resolveProjectGroupFilter(projectGroups, hiddenProjectGroupIds).isRepoHidden(repo)) {
    return null
  }
  const parentById = new Map(projectGroups.map((group) => [group.id, group.parentGroupId]))
  const lifted = new Set<string>()
  let current: string | null | undefined = repo.projectGroupId
  if (!current || !parentById.has(current)) {
    lifted.add(UNGROUPED_PROJECT_GROUP_FILTER_ID)
  }
  while (current && parentById.has(current) && !lifted.has(current)) {
    lifted.add(current)
    current = parentById.get(current)
  }
  return hiddenProjectGroupIds.filter((id) => !lifted.has(id))
}

export function toggleHiddenProjectGroupId(
  hiddenProjectGroupIds: readonly string[],
  id: string
): string[] {
  return hiddenProjectGroupIds.includes(id)
    ? hiddenProjectGroupIds.filter((hiddenId) => hiddenId !== id)
    : [...hiddenProjectGroupIds, id]
}

/** The row check selectVisibleSidebarWorktrees takes; undefined while nothing is hidden. */
export function projectGroupRowHider(
  filter: ProjectGroupFilter,
  repoOf: (repoId: string) => Pick<Repo, 'projectGroupId'> | undefined
): ((row: { repoId: string }) => boolean) | undefined {
  if (!filter.active) {
    return undefined
  }
  return (row) => {
    const repo = repoOf(row.repoId)
    return repo !== undefined && filter.isRepoHidden(repo)
  }
}
