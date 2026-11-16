import { ipcMain } from 'electron'
import type { OrcadManagedRuntimeStatus } from '../../../../shared/remote-runtime/orcad-lifecycle/orcad-managed-runtime'
import { createManagedOrcadEnvironment } from '../../../managed-server/lifecycle/orcad-runtime-deployment'
import { getManagedOrcadRuntimeStatus } from '../../../managed-server/lifecycle/orcad-runtime-status'
import { asUserHostAction } from '../../ssh/remote-host-auto-connect-hold'

export function registerOrcadRuntimeLifecycleHandlers(options: {
  getUserDataPath: () => string
}): void {
  ipcMain.handle(
    'runtimeEnvironments:deployOrcad',
    async (_event, args: { name: string; sshTargetId: string; force?: boolean }) => {
      const sshTargetId = requiredString(args?.sshTargetId, 'SSH target')
      const name = requiredString(args?.name, 'Server name')
      return asUserHostAction(sshTargetId, () =>
        createManagedOrcadEnvironment(options.getUserDataPath(), {
          name,
          sshTargetId,
          force: args?.force === true
        })
      )
    }
  )
  ipcMain.handle(
    'runtimeEnvironments:getOrcadStatus',
    (_event, args: { selector: string }): Promise<OrcadManagedRuntimeStatus> =>
      getManagedOrcadRuntimeStatus(
        options.getUserDataPath(),
        requiredString(args?.selector, 'Server')
      )
  )
}

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`)
  }
  return value.trim()
}
