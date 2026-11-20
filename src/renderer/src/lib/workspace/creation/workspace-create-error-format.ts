import { translate } from '@/i18n/i18n'
export type WorkspaceCreateErrorDisplay = {
  title: string
  message: string
  help?: string
}

const MISSING_BASE_REF_ANCHOR = 'could not resolve a default base ref'

export function formatWorkspaceCreateError(error: unknown): WorkspaceCreateErrorDisplay {
  const message =
    error instanceof Error
      ? error.message
      : translate('components.toastFallbacks.worktreeCreateFailed', 'Failed to create worktree.')

  if (message.toLowerCase().includes(MISSING_BASE_REF_ANCHOR)) {
    return {
      title: translate('auto.lib.workspace.create.error.format.64555d0014', 'No base branch found'),
      message: translate(
        'auto.lib.workspace.create.error.format.37cf0bc991',
        'Orca could not resolve a usable base ref for this workspace.'
      ),
      help: translate(
        'components.toastFallbacks.missingBaseBranchHelp',
        'Create an initial commit (for example on main), or select an existing branch in Create From, then try again.'
      )
    }
  }

  return {
    title: message,
    message
  }
}

/** Toast and creation-panel payload; keeps the help with the title because it names the user's next step. */
export type WorkspaceCreateErrorNotice = {
  title: string
  description?: string
}

export function getWorkspaceCreateErrorNotice(
  error: WorkspaceCreateErrorDisplay
): WorkspaceCreateErrorNotice {
  return error.help ? { title: error.title, description: error.help } : { title: error.message }
}
