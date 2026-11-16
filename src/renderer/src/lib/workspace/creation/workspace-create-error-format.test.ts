import { describe, expect, it } from 'vitest'
import {
  formatWorkspaceCreateError,
  getWorkspaceCreateErrorNotice
} from './workspace-create-error-format'

describe('getWorkspaceCreateErrorNotice', () => {
  it('keeps the next step for a repo without a base branch', () => {
    const error = new Error(
      "Error invoking remote method 'worktrees:create': Error: could not resolve a default base ref"
    )

    expect(getWorkspaceCreateErrorNotice(formatWorkspaceCreateError(error))).toEqual({
      title: 'No base branch found',
      description:
        'Create an initial commit (for example on main), or select an existing branch in Create From, then try again.'
    })
  })

  it('shows other errors as-is', () => {
    expect(getWorkspaceCreateErrorNotice(formatWorkspaceCreateError(new Error('boom')))).toEqual({
      title: 'boom'
    })
  })
})
