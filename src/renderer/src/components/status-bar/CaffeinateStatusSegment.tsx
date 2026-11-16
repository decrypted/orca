import { useEffect, useState } from 'react'
import { Coffee } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store/index'
import { isPairedWebClientWindow } from '@/app-shell/chrome/desktop-window-chrome'
import { translate } from '@/i18n/i18n'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { formatMinutesDuration } from '@/i18n/ui-intl-formatters'
import {
  AGENT_AWAKE_SETTING_ID,
  formatAgentAwakeBatteryPercent,
  getAgentAwakeLidNote,
  getAgentAwakeModeLabel,
  getAgentAwakeTimerLabel,
  getAgentAwakeTitle
} from '../settings/agents/behavior/agent-awake-copy'
import {
  COMPUTER_AWAKE_TIMER_HOURS,
  computerAwakeSettingsForMode,
  computerAwakeSettingsForTimer,
  normalizeComputerAwakeMode,
  readComputerAwakeSelection,
  startComputerAwakeTimer,
  type ComputerAwakeStatus
} from '../../../../shared/app-lifecycle/computer-awake-mode'
import {
  readComputerAwakePowerPolicy,
  type ComputerAwakePause
} from '../../../../shared/app-lifecycle/computer-awake-power-policy'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './composition/status-bar-context-menu-policy'

const INACTIVE_STATUS: ComputerAwakeStatus = {
  mode: 'off',
  active: false
}

function activityLabel(
  active: boolean,
  paused: ComputerAwakePause | undefined,
  batteryFloorPercent: number,
  t: Translate = translate
): string {
  if (paused === 'battery') {
    return t(
      'auto.components.status.bar.CaffeinateStatusSegment.pausedOnBattery',
      'Paused on battery'
    )
  }
  if (paused === 'low-battery') {
    return t(
      'auto.components.status.bar.CaffeinateStatusSegment.pausedLowBattery',
      'Paused below {{percent}}',
      { percent: formatAgentAwakeBatteryPercent(batteryFloorPercent) }
    )
  }
  return active
    ? t('auto.components.status.bar.CaffeinateStatusSegment.active', 'Active')
    : t('auto.components.status.bar.CaffeinateStatusSegment.inactive', 'Inactive')
}

export function CaffeinateStatusSegment(): React.JSX.Element | null {
  const t = useTranslate()
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const selection = readComputerAwakeSelection(settings)
  const configuredMode = selection.mode
  const timer = selection.timer
  const powerPolicy = readComputerAwakePowerPolicy(settings)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  const [serviceStatus, setServiceStatus] = useState<ComputerAwakeStatus>(INACTIVE_STATUS)

  useEffect(() => {
    let mounted = true
    const unsubscribe = window.api.agentAwake.onChanged((status) => {
      if (mounted) {
        setServiceStatus(status)
      }
    })
    void window.api.agentAwake
      .getStatus()
      .then((status) => {
        if (mounted) {
          setServiceStatus(status)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  if (isPairedWebClientWindow()) {
    return null
  }

  const mode = serviceStatus.mode === configuredMode ? serviceStatus.mode : configuredMode
  const serviceAgrees = serviceStatus.mode === configuredMode
  const active = serviceAgrees ? serviceStatus.active : configuredMode === 'on'
  const paused = serviceAgrees ? serviceStatus.paused : undefined
  const title = getAgentAwakeTitle(t)
  const modeLabel = timer ? getAgentAwakeTimerLabel(timer, t) : getAgentAwakeModeLabel(mode, t)
  const statusText = `${modeLabel} · ${activityLabel(active, paused, powerPolicy.batteryFloorPercent, t)}`
  const ariaLabel = t(
    'auto.components.status.bar.CaffeinateStatusSegment.ariaLabel',
    '{{title}}, {{status}}',
    { title, status: statusText }
  )

  const setMode = (nextMode: string): void => {
    void updateSettings(computerAwakeSettingsForMode(normalizeComputerAwakeMode(nextMode)))
  }

  const startTimer = (hours: number): void => {
    void updateSettings(
      computerAwakeSettingsForTimer(startComputerAwakeTimer(selection, hours, Date.now()))
    )
  }

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              aria-label={ariaLabel}
            >
              <Coffee className={`size-3 ${active ? 'text-foreground' : ''}`} />
              <span className="text-[11px] font-medium">{modeLabel}</span>
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${
                  active ? 'bg-foreground' : 'bg-muted-foreground/40'
                }`}
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {ariaLabel}. {getAgentAwakeLidNote(undefined, t, powerPolicy.lidCloseSleeps)}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
        side="top"
        align="end"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="font-normal text-muted-foreground">{statusText}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={timer ? '' : mode} onValueChange={setMode}>
          <DropdownMenuRadioItem value="on" className="py-1.5">
            <span className="flex flex-col">
              <span>{getAgentAwakeModeLabel('on', t)}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t(
                  'auto.components.status.bar.CaffeinateStatusSegment.onDescription',
                  'Keep this computer awake continuously'
                )}
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="auto" className="py-1.5">
            <span className="flex flex-col">
              <span>{getAgentAwakeModeLabel('auto', t)}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t(
                  'auto.components.status.bar.CaffeinateStatusSegment.autoDescription',
                  'Stay awake while an agent is working'
                )}
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="off" className="py-1.5">
            <span className="flex flex-col">
              <span>{getAgentAwakeModeLabel('off', t)}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t(
                  'auto.components.status.bar.CaffeinateStatusSegment.offDescription',
                  'Allow normal system sleep behavior'
                )}
              </span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          {t('auto.components.status.bar.CaffeinateStatusSegment.timerHeading', 'Keep awake for')}
        </DropdownMenuLabel>
        {/* onSelect, not onValueChange, so picking the running duration restarts it. */}
        <DropdownMenuRadioGroup value={timer ? String(timer.hours) : ''}>
          {COMPUTER_AWAKE_TIMER_HOURS.map((hours) => (
            <DropdownMenuRadioItem
              key={hours}
              value={String(hours)}
              onSelect={() => startTimer(hours)}
            >
              {formatMinutesDuration(hours * 60)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={powerPolicy.onlyWhilePluggedIn}
          onCheckedChange={(checked) =>
            void updateSettings({ computerAwakeOnlyWhilePluggedIn: checked === true })
          }
        >
          {t(
            'auto.components.settings.AgentAwakeBatterySettings.onlyWhilePluggedIn',
            'Only while plugged in'
          )}
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem
          onSelect={() => {
            openSettingsTarget({ pane: 'agents', repoId: null, sectionId: AGENT_AWAKE_SETTING_ID })
            openSettingsPage()
          }}
        >
          {t(
            'auto.components.status.bar.CaffeinateStatusSegment.batterySettings',
            'Battery and lid settings…'
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
