import React from 'react'
import { useAppStore } from '@/store/index'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'

export function TurnOnPortDetectionButton({
  className
}: {
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => void updateSettings({ portDetectionEnabled: true })}
    >
      {t('auto.components.right.sidebar.PortsPanel.turnOnDetection', 'Turn on port detection')}
    </Button>
  )
}
