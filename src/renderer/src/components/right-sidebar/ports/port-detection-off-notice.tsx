import React from 'react'
import { Plug } from 'lucide-react'
import { useAppStore } from '@/store/index'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'

export function PortDetectionOffNotice(): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center text-muted-foreground">
      <Plug size={32} className="mb-3 opacity-50" />
      <p className="text-sm">
        {t('auto.components.right.sidebar.PortsPanel.detectionOff', 'Port detection is off')}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => void updateSettings({ portDetectionEnabled: true })}
      >
        {t('auto.components.right.sidebar.PortsPanel.turnOnDetection', 'Turn on port detection')}
      </Button>
    </div>
  )
}
