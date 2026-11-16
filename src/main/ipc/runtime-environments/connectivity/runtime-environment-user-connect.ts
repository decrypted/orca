import {
  getRuntimeSshAccess,
  type KnownRuntimeEnvironment
} from '../../../../shared/remote-runtime/host-catalog/runtime-environments'
import type { RuntimeRpcResponse } from '../../../../shared/remote-runtime/rpc/runtime-rpc-envelope'
import type { RuntimeStatus } from '../../../../shared/remote-runtime/session-graph/runtime-session-contracts'
import { clearSshCredentialDeclinedForEnvironment } from '../../../ssh/authentication/ssh-credential-decline'
import { asUserConnect } from '../../ssh/remote-host-auto-connect-hold'
import { liftSshUserDisconnectForEnvironment } from '../../ssh/ssh-host-user-disconnect'
import { noteRuntimeEnvironmentConnectRequested } from '../pairing/runtime-environment-pairing-refusal-registry'
import { getRuntimeEnvironmentStatus } from '../status/runtime-environment-status-probe'
import { connectThroughOwningService } from './runtime-environment-host-service-ops'
import { clearRuntimeEnvironmentManualDisconnect } from './runtime-environment-manual-disconnect'

/** A server's Connect lifts every hold on it and on the SSH host it is reached through, then dials. */
export function connectRuntimeEnvironmentForUser(
  userDataPath: string,
  environment: KnownRuntimeEnvironment,
  timeoutMs?: number
): Promise<RuntimeRpcResponse<RuntimeStatus>> {
  return asUserConnect(getRuntimeSshAccess(environment)?.sshTargetId, async () => {
    clearRuntimeEnvironmentManualDisconnect(environment.id)
    noteRuntimeEnvironmentConnectRequested(environment.id)
    clearSshCredentialDeclinedForEnvironment(environment)
    await liftSshUserDisconnectForEnvironment(environment)
    await connectThroughOwningService(environment)
    return getRuntimeEnvironmentStatus(userDataPath, environment.id, timeoutMs, {
      reconnect: true
    })
  })
}
