import { describe, expect, it } from 'vitest'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import {
  collectProjectScopeSleepableWorktrees,
  type ProjectSleepScope
} from './project-scope-sleep-targets'

function group(id: string, parentGroupId: string | null, executionHostId?: string): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1,
    executionHostId
  }
}

function repo(id: string, projectGroupId: string, executionHostId?: ExecutionHostId): Repo {
  return {
    id,
    path: `/${id}`,
    displayName: id,
    badgeColor: '#111',
    addedAt: 1,
    projectGroupId,
    executionHostId
  }
}

const localRepo = repo('repo-a', 'parent')
const runtimeRepo = repo('repo-r', 'parent', 'runtime:env-1')

const state: Parameters<typeof collectProjectScopeSleepableWorktrees>[0] = {
  projectGroups: [
    group('parent', null),
    group('child', 'parent'),
    group('other', null),
    group('parent', null, 'runtime:env-1')
  ],
  repos: [localRepo, repo('repo-b', 'child'), repo('repo-c', 'other'), runtimeRepo],
  worktreesByRepo: {
    'repo-a': [
      makeWorktree({ id: 'a-live', repoId: 'repo-a' }),
      makeWorktree({ id: 'a-idle', repoId: 'repo-a' }),
      makeWorktree({ id: 'a-deleting', repoId: 'repo-a' })
    ],
    'repo-b': [makeWorktree({ id: 'b-browser', repoId: 'repo-b' })],
    'repo-c': [makeWorktree({ id: 'c-live', repoId: 'repo-c' })],
    'repo-r': [makeWorktree({ id: 'r-live', repoId: 'repo-r', hostId: 'runtime:env-1' })]
  },
  folderWorkspaces: [makeFolderWorkspace({ id: 'notes', projectGroupId: 'child' })],
  deleteStateByWorktreeId: {
    'a-deleting': { isDeleting: true, error: null, canForceDelete: false, forceDeleteReason: null }
  },
  tabsByWorktree: {
    'a-live': [{ id: 'tab-a' }],
    'a-idle': [{ id: 'tab-idle' }],
    'a-deleting': [{ id: 'tab-del' }],
    'c-live': [{ id: 'tab-c' }],
    'r-live': [{ id: 'tab-r' }]
  },
  ptyIdsByTabId: {
    'tab-a': ['pty-a'],
    'tab-del': ['pty-d'],
    'tab-c': ['pty-c'],
    'tab-r': ['pty-r']
  },
  browserTabsByWorktree: {
    'b-browser': [{ id: 'browser-b' }],
    'folder:notes': [{ id: 'browser-f' }]
  },
  unifiedTabsByWorktree: {},
  agentStatusByPaneKey: new Map(),
  structuredChatSleptAtByPaneKey: {}
}

function sleepableIds(scope: ProjectSleepScope): string[] {
  return collectProjectScopeSleepableWorktrees(state, scope).map((item) => item.id)
}

describe('collectProjectScopeSleepableWorktrees', () => {
  it('takes active workspaces of nested groups and their folders, on the group owner host only', () => {
    expect(sleepableIds({ kind: 'project-group', groupId: 'parent', hostId: 'local' })).toEqual([
      'a-live',
      'b-browser',
      'folder:notes'
    ])
    expect(
      sleepableIds({ kind: 'project-group', groupId: 'parent', hostId: 'runtime:env-1' })
    ).toEqual(['r-live'])
  })

  it('takes every listed host copy of a project', () => {
    expect(sleepableIds({ kind: 'project', repos: [localRepo] })).toEqual(['a-live'])
    expect(sleepableIds({ kind: 'project', repos: [localRepo, runtimeRepo] })).toEqual([
      'a-live',
      'r-live'
    ])
  })
})
