import { defineFixture } from '../../component-fixtures/component-fixture'
import type { PendingWorktreeCreation } from '@/lib/workspace/creation/pending-worktree-creation'
import WorktreeCreationPanel from './WorktreeCreationPanel'

function failed(patch: Pick<PendingWorktreeCreation, 'error' | 'errorHelp'>) {
  const entry: PendingWorktreeCreation = {
    creationId: 'fixture',
    phase: 'creating',
    status: 'error',
    startedAt: 0,
    indeterminate: false,
    loaderVisible: true,
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the panel reads only name and displayName from the request.
    request: { name: 'fix-login' } as PendingWorktreeCreation['request'],
    ...patch
  }
  return defineFixture({
    width: 760,
    store: { pendingWorktreeCreations: { fixture: entry } },
    render: () => (
      <div className="relative h-32">
        <WorktreeCreationPanel creationId="fixture" />
      </div>
    )
  })
}

export const missingBaseBranch = failed({
  error: 'No base branch found',
  errorHelp:
    'Create an initial commit (for example on main), or select an existing branch in Create From, then try again.'
})

export const genericFailure = failed({ error: "fatal: couldn't find remote ref feature/missing" })
