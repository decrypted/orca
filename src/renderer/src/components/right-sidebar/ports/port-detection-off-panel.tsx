import React, { useState } from 'react'
import { PortDetectionOffNotice } from './port-detection-off-notice'
import { SshForwardedPortsSection } from './ssh-forwarded-ports-section'
import { SshPortForwardDialog, type PortForwardDialogState } from './ssh-port-forward-dialog'

/** While detection is off only an endpoint workspace's SSH forwards stay manageable. */
export function PortDetectionOffPanel({
  forwardTargetId
}: {
  forwardTargetId: string | null
}): React.JSX.Element {
  const [forwardDialog, setForwardDialog] = useState<PortForwardDialogState>({ mode: 'closed' })
  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-sleek">
      {forwardTargetId ? (
        <SshForwardedPortsSection connectionId={forwardTargetId} onOpenDialog={setForwardDialog} />
      ) : null}
      <PortDetectionOffNotice />
      <SshPortForwardDialog
        state={forwardDialog}
        activeConnectionId={forwardTargetId}
        onClose={() => setForwardDialog({ mode: 'closed' })}
      />
    </div>
  )
}
