import type { AppState } from '@/store/types'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getFolderWorkspaceWorktree } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import { getFolderWorkspaceHostId } from '../../../../../../shared/folder-workspaces/folder-workspace-host-id'
import {
  worktreeHostMatchOptions,
  worktreeMatchesHost
} from '@/store/slices/worktrees/listing/worktree-host-ownership'
import { selectProjectGroupRemovalTargets } from '@/store/project-groups/project-group-removal-targets'
import { catalogOwnsHost } from '@/store/project-groups/project-group-owner-routing'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import type { WorktreeDeleteState } from '@/store/slices/worktrees/teardown/worktree-delete-state-types'
import { getDeleteStateForWorktreeHost } from '../deletion/worktree-delete-state-host-match'
import {
  hasSleepableWorkspaceActivity,
  type WorkspaceActivityMaps
} from '../context-menu/workspace-lineage-menu-actions'

export type ProjectSleepScope =
  | { kind: 'project'; repos: readonly Repo[] }
  | { kind: 'project-group'; groupId: string; hostId?: ExecutionHostId }

type ProjectSleepState = Pick<
  AppState,
  'repos' | 'worktreesByRepo' | 'projectGroups' | 'folderWorkspaces'
> &
  WorkspaceActivityMaps & {
    deleteStateByWorktreeId: Readonly<Record<string, WorktreeDeleteState | undefined>>
  }

function projectHostWorktrees(
  state: ProjectSleepState,
  repoId: string,
  hostId: ExecutionHostId
): Worktree[] {
  const options = worktreeHostMatchOptions(state, repoId, hostId)
  return (selectWorktreesByRepo(state)[repoId] ?? []).filter((worktree) =>
    worktreeMatchesHost(worktree, hostId, options)
  )
}

// Why the delete owner's scope: group ids repeat across hosts, so only that host's subtree belongs to this header.
function projectGroupWorktrees(
  state: ProjectSleepState,
  groupId: string,
  hostId: ExecutionHostId | undefined
): Worktree[] {
  const targets = selectProjectGroupRemovalTargets(
    state.projectGroups,
    state.repos,
    groupId,
    hostId
  )
  const ownsRowHost = (rowHostId: string): boolean =>
    hostId ? catalogOwnsHost(hostId, rowHostId) : true
  return [
    ...targets.projects.flatMap((project) =>
      projectHostWorktrees(state, project.id, project.hostId)
    ),
    ...selectFolderWorkspaces(state)
      .filter(
        (workspace) =>
          targets.deletedGroupIds.has(workspace.projectGroupId) &&
          ownsRowHost(getFolderWorkspaceHostId(workspace, state.projectGroups))
      )
      .map((workspace) => getFolderWorkspaceWorktree(workspace))
  ]
}

/** What multi-select Sleep would act on if every workspace under this header were selected. */
export function collectProjectScopeSleepableWorktrees(
  state: ProjectSleepState,
  scope: ProjectSleepScope
): Worktree[] {
  const worktrees =
    scope.kind === 'project'
      ? scope.repos.flatMap((repo) =>
          projectHostWorktrees(state, repo.id, getRepoExecutionHostId(repo))
        )
      : projectGroupWorktrees(state, scope.groupId, scope.hostId)
  return worktrees.filter(
    (worktree) =>
      hasSleepableWorkspaceActivity(worktree.id, state) &&
      !getDeleteStateForWorktreeHost(worktree, state.deleteStateByWorktreeId)?.isDeleting
  )
}
