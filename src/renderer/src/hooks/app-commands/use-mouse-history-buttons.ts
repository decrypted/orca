import { useEffect } from 'react'
import { runBuiltInOrReplacement } from '@/lib/plugins/commands/plugin-command-replacements'
import { hasVisibleOverlay } from '@/lib/overlay-interaction/visible-overlay'
import { selectWorktreeCreationSurfaceShown } from '@/lib/workspace/creation/worktree-creation-surface'
import { canNavigateWorktreeHistory } from '../../app-shell/chrome/titlebar-worktree-history-controls'
import { useAppStore } from '../../store/index'

function sideButtonAction(
  button: number
): 'worktree.history.back' | 'worktree.history.forward' | null {
  return button === 3 ? 'worktree.history.back' : button === 4 ? 'worktree.history.forward' : null
}

/** Mouse back/forward buttons step workspace history, like the titlebar arrows. */
export function useMouseHistoryButtons(): void {
  useEffect(() => {
    // Why defaultPrevented: a streamed browser page claims the press for its own history.
    const claim = (event: MouseEvent): ReturnType<typeof sideButtonAction> => {
      const action = event.defaultPrevented ? null : sideButtonAction(event.button)
      if (action) {
        // Why: in the paired web client the outer browser would otherwise leave Orca.
        event.preventDefault()
      }
      return action
    }
    const onMouseUp = (event: MouseEvent): void => {
      const action = claim(event)
      const state = useAppStore.getState()
      if (
        !action ||
        !canNavigateWorktreeHistory(state) ||
        selectWorktreeCreationSurfaceShown(state) ||
        hasVisibleOverlay()
      ) {
        return
      }
      runBuiltInOrReplacement(action, () =>
        action === 'worktree.history.back' ? state.goBackWorktree() : state.goForwardWorktree()
      )
    }
    window.addEventListener('mousedown', claim)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousedown', claim)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])
}
