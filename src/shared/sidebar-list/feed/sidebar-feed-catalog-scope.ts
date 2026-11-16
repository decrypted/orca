import type { ExecutionHostId, ExecutionHostScope } from '../../execution-host'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import type { ProjectGroupFilter } from '../../project/groups/project-group-filter'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import type { Repo } from '../../repository/repo-types'
import { filterFolderWorkspacesFromOtherDevices } from '../../workspace-view/workspace-creator-visibility'
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  filterReposForVisibleHosts,
  getVisibleSidebarHostIdSet
} from '../hosts/host-filtering'

export type SidebarFeedCatalogScope = {
  visibleRepos: readonly Repo[]
  visibleFolderWorkspaces: readonly FolderWorkspace[]
  visibleProjectGroups: readonly ProjectGroup[]
}

/** The catalog rows a feed reader lists under the view's host, other-client and project-group scope. */
export function scopeSidebarFeedCatalog(args: {
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
  folderWorkspaces: readonly FolderWorkspace[]
  visibleWorkspaceHostIds: readonly ExecutionHostId[] | null
  workspaceHostScope: ExecutionHostScope
  defaultHostId: ExecutionHostId
  hideWorkspacesFromOtherDevices: boolean
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
  projectGroupFilter: ProjectGroupFilter
}): SidebarFeedCatalogScope {
  const { repos, projectGroups, defaultHostId, projectGroupFilter } = args
  const visibleHostIdSet = getVisibleSidebarHostIdSet(
    args.visibleWorkspaceHostIds,
    args.workspaceHostScope
  )
  const hostVisibleFolderWorkspaces = filterFolderWorkspacesForVisibleHosts(
    args.folderWorkspaces,
    projectGroups,
    visibleHostIdSet,
    defaultHostId
  ).filter((folderWorkspace) => !projectGroupFilter.isGroupHidden(folderWorkspace.projectGroupId))
  return {
    visibleRepos: filterReposForVisibleHosts(repos, visibleHostIdSet, defaultHostId).filter(
      (repo) => !projectGroupFilter.isRepoHidden(repo)
    ),
    visibleFolderWorkspaces: args.hideWorkspacesFromOtherDevices
      ? filterFolderWorkspacesFromOtherDevices(
          hostVisibleFolderWorkspaces,
          args.pairedDeviceIdsByEnvironment
        )
      : hostVisibleFolderWorkspaces,
    visibleProjectGroups: filterProjectGroupsForVisibleHosts(
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    ).filter((group) => !projectGroupFilter.isGroupHidden(group.id))
  }
}
