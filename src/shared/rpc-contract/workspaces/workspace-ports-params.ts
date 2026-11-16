import { z } from 'zod'
import {
  OptionalBoolean,
  OptionalString,
  requiredNumber,
  requiredString
} from '../rpc-param-primitives'

export const WorkspacePortScanParams = z.object({
  repoId: OptionalString
})

export const WorkspacePortKillParams = z.object({
  repoId: OptionalString,
  pid: requiredNumber('Missing process id'),
  port: requiredNumber('Missing port')
})

export const WorkspacePortProbePageParams = z.object({
  host: requiredString('Missing host'),
  port: requiredNumber('Missing port'),
  protocol: z.enum(['http', 'https'])
})

export const WorkspacePortScanHostParams = z.object({
  worktree: requiredString('Missing worktree selector'),
  /** Set by `orca ports`: an explicit request runs even when background detection is off. */
  ignorePortDetectionSetting: OptionalBoolean
})

export const WorkspacePortKillHostParams = z.object({
  worktree: requiredString('Missing worktree selector'),
  executionHostId: requiredString('Missing execution host'),
  pid: requiredNumber('Missing process id'),
  port: requiredNumber('Missing port')
})
