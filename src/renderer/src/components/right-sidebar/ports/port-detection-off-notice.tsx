import React from 'react'
import { Plug } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { TurnOnPortDetectionButton } from '../../ports/TurnOnPortDetectionButton'

export function PortDetectionOffNotice(): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center text-muted-foreground">
      <Plug size={32} className="mb-3 opacity-50" />
      <p className="text-sm">
        {t('auto.components.right.sidebar.PortsPanel.detectionOff', 'Port detection is off')}
      </p>
      <TurnOnPortDetectionButton className="mt-3" />
    </div>
  )
}
