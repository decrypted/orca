import { useMemo } from 'react'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { SidebarWorktreeFilters } from './use-filters'
import type { ProjectGroupFilter } from '../../../../../../shared/project/groups/project-group-filter'
import { filterFolderWorkspacesFromOtherDevices } from '../../../../../../shared/workspace-view/workspace-creator-visibility'
import {
  filterFolderWorkspacesForVisibleHosts,
  filterProjectGroupsForVisibleHosts,
  getVisibleSidebarHostIdSet
} from '../../../../../../shared/sidebar-list/hosts/host-filtering'

// Apply host/device and project-group scope consistently to repos, project groups and folder workspaces.
export function useSidebarHostVisibleScope(args: {
  filterState: SidebarWorktreeFilters['filterState']
  defaultHostId: ExecutionHostId
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
  folderWorkspaces: readonly FolderWorkspace[]
  pairedDeviceIdsByEnvironment: Parameters<typeof filterFolderWorkspacesFromOtherDevices>[1]
  projectGroupFilter: ProjectGroupFilter
}) {
  const { filterState, defaultHostId, repos, projectGroups, folderWorkspaces, projectGroupFilter } =
    args
  const { visibleWorkspaceHostIds, workspaceHostScope, hideWorkspacesFromOtherDevices } =
    filterState
  const visibleHostIdSet = useMemo(
    () => getVisibleSidebarHostIdSet(visibleWorkspaceHostIds, workspaceHostScope),
    [visibleWorkspaceHostIds, workspaceHostScope]
  )
  const visibleReposForRows = useMemo(() => {
    if (!visibleHostIdSet && !projectGroupFilter.active) {
      return repos
    }
    return repos.filter((repo) => {
      if (projectGroupFilter.isRepoHidden(repo)) {
        return false
      }
      if (!visibleHostIdSet) {
        return true
      }
      const hostId =
        repo.connectionId || repo.executionHostId ? getRepoExecutionHostId(repo) : defaultHostId
      return visibleHostIdSet.has(hostId)
    })
  }, [defaultHostId, projectGroupFilter, repos, visibleHostIdSet])
  const visibleProjectGroupsForRows = useMemo(() => {
    const hostVisibleGroups = filterProjectGroupsForVisibleHosts(
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    )
    return projectGroupFilter.active
      ? hostVisibleGroups.filter((group) => !projectGroupFilter.isGroupHidden(group.id))
      : hostVisibleGroups
  }, [defaultHostId, projectGroupFilter, projectGroups, visibleHostIdSet])
  const visibleFolderWorkspacesForRows = useMemo(() => {
    const hostVisibleWorkspaces = filterFolderWorkspacesForVisibleHosts(
      folderWorkspaces,
      projectGroups,
      visibleHostIdSet,
      defaultHostId
    )
    const groupVisibleWorkspaces = projectGroupFilter.active
      ? hostVisibleWorkspaces.filter(
          (folderWorkspace) => !projectGroupFilter.isGroupHidden(folderWorkspace.projectGroupId)
        )
      : hostVisibleWorkspaces
    if (!hideWorkspacesFromOtherDevices) {
      return groupVisibleWorkspaces
    }
    return filterFolderWorkspacesFromOtherDevices(
      groupVisibleWorkspaces,
      args.pairedDeviceIdsByEnvironment
    )
  }, [
    args.pairedDeviceIdsByEnvironment,
    defaultHostId,
    folderWorkspaces,
    hideWorkspacesFromOtherDevices,
    projectGroupFilter,
    projectGroups,
    visibleHostIdSet
  ])

  return { visibleReposForRows, visibleProjectGroupsForRows, visibleFolderWorkspacesForRows }
}
