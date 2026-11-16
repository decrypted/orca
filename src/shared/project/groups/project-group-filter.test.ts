import { describe, expect, it } from 'vitest'
import {
  resolveProjectGroupFilter,
  revealRepoInProjectGroupFilter,
  UNGROUPED_PROJECT_GROUP_FILTER_ID
} from './project-group-filter'

const groups = [
  { id: 'client-a', parentGroupId: null },
  { id: 'client-a-infra', parentGroupId: 'client-a' },
  { id: 'client-b', parentGroupId: null }
]

describe('resolveProjectGroupFilter', () => {
  it('hides a hidden parent group with its nested groups and their projects', () => {
    const filter = resolveProjectGroupFilter(groups, ['client-a'])

    expect(filter.active).toBe(true)
    expect(filter.isGroupHidden('client-a-infra')).toBe(true)
    expect(filter.isGroupHidden('client-b')).toBe(false)
    expect(filter.isRepoHidden({ projectGroupId: 'client-a-infra' })).toBe(true)
    expect(filter.isRepoHidden({ projectGroupId: 'client-b' })).toBe(false)
    expect(filter.isRepoHidden({ projectGroupId: null })).toBe(false)
  })

  it('treats projects of an unlisted group as ungrouped', () => {
    const filter = resolveProjectGroupFilter(groups, [UNGROUPED_PROJECT_GROUP_FILTER_ID])

    expect(filter.isRepoHidden({ projectGroupId: null })).toBe(true)
    expect(filter.isRepoHidden({ projectGroupId: 'deleted-group' })).toBe(true)
    expect(filter.isRepoHidden({ projectGroupId: 'client-b' })).toBe(false)
  })

  it('ignores the ids of deleted groups', () => {
    const filter = resolveProjectGroupFilter(groups, ['deleted-group'])

    expect(filter.active).toBe(false)
    expect(filter.isRepoHidden({ projectGroupId: 'client-a' })).toBe(false)
  })
})

describe('revealRepoInProjectGroupFilter', () => {
  it('lifts the hidden ancestor that hides a nested project and keeps other hidden groups', () => {
    expect(
      revealRepoInProjectGroupFilter(groups, ['client-a', 'client-b'], {
        projectGroupId: 'client-a-infra'
      })
    ).toEqual(['client-b'])
  })

  it('leaves an already visible project untouched', () => {
    expect(
      revealRepoInProjectGroupFilter(groups, ['client-b'], { projectGroupId: 'client-a' })
    ).toBeNull()
  })
})
