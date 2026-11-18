import React, { useMemo, useState } from 'react'
import { useAppStore } from '@/store/index'
import { useRuntimeEnvironmentCapability } from '@/runtime/rpc/compatibility/use-runtime-environment-capability'
import { NETWORK_PORT_FORWARD_RUNTIME_CAPABILITY } from '../../../../../shared/remote-runtime/protocol/workspace-ports-runtime-capabilities'
import { PortDetectionOffNotice } from './port-detection-off-notice'
import { portForwardOwnerKey, type PortForwardOwner } from './port-forward-owner'
import { SshForwardedPortsSection } from './ssh-forwarded-ports-section'
import { SshPortForwardDialog, type PortForwardDialogState } from './ssh-port-forward-dialog'

/** While detection is off only an endpoint workspace's forwards (SSH tunnel or paired server) stay manageable. */
export function PortDetectionOffPanel({
  sshForwardTargetId,
  forwardEnvironmentId
}: {
  sshForwardTargetId: string | null
  forwardEnvironmentId: string | null
}): React.JSX.Element {
  const [forwardDialog, setForwardDialog] = useState<PortForwardDialogState>({ mode: 'closed' })
  const owner = useMemo<PortForwardOwner | null>(
    () =>
      sshForwardTargetId
        ? { kind: 'ssh', targetId: sshForwardTargetId }
        : forwardEnvironmentId
          ? { kind: 'runtime', environmentId: forwardEnvironmentId }
          : null,
    [forwardEnvironmentId, sshForwardTargetId]
  )
  const hasForwards = useAppStore(
    (s) =>
      owner !== null && (s.portForwardsByConnection[portForwardOwnerKey(owner)]?.length ?? 0) > 0
  )
  // Same rules as the detection-on panel: older servers and web clients can't add a server forward.
  const serverForwards = useRuntimeEnvironmentCapability(
    window.api.runtimeEnvironments.portForwards ? forwardEnvironmentId : null,
    NETWORK_PORT_FORWARD_RUNTIME_CAPABILITY
  )
  const sshConnected = useAppStore(
    (s) =>
      sshForwardTargetId !== null &&
      s.sshConnectionStates.get(sshForwardTargetId)?.status === 'connected'
  )
  const canAdd = owner?.kind === 'ssh' ? sshConnected : serverForwards
  const showForwarded = owner !== null && (owner.kind === 'ssh' || serverForwards || hasForwards)
  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-sleek">
      {owner && showForwarded ? (
        <SshForwardedPortsSection owner={owner} canAdd={canAdd} onOpenDialog={setForwardDialog} />
      ) : null}
      <PortDetectionOffNotice />
      <SshPortForwardDialog
        state={forwardDialog}
        onClose={() => setForwardDialog({ mode: 'closed' })}
      />
    </div>
  )
}
