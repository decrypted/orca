import { ipcMain } from 'electron'
import type {
  OrcadManagedConversionResult,
  OrcadManagedPendingMigrationRow
} from '../../../../shared/remote-runtime/orcad-lifecycle/orcad-managed-runtime'
import { listPendingManagedOrcadMigrations } from '../../../managed-server/lifecycle/orcad-managed-migration-status'
import { convertSshTargetToManagedOrcad } from '../../../managed-server/lifecycle/orcad-runtime-conversion'
import { conversionCollaborators } from '../../../managed-server/lifecycle/orcad-runtime-conversion-wiring'
import { requiredString } from './orcad-runtime-lifecycle-handlers'
import { asUserHostAction } from '../../ssh/remote-host-auto-connect-hold'

export function registerOrcadRuntimeConversionHandlers(getUserDataPath: () => string): void {
  ipcMain.handle(
    'runtimeEnvironments:convertSshHostToManagedOrcad',
    (
      _event,
      args: { sshTargetId: string; name: string }
    ): Promise<OrcadManagedConversionResult> => {
      const sshTargetId = requiredString(args?.sshTargetId, 'SSH target')
      const name = requiredString(args?.name, 'Server name')
      // The window also keeps the release of the direct session from holding the host mid-move.
      return asUserHostAction(sshTargetId, () =>
        convertSshTargetToManagedOrcad(getUserDataPath(), {
          sshTargetId,
          name,
          ...conversionCollaborators()
        })
      )
    }
  )
  ipcMain.handle(
    'runtimeEnvironments:listPendingOrcadMigrations',
    (): OrcadManagedPendingMigrationRow[] => listPendingManagedOrcadMigrations(getUserDataPath())
  )
}
