import React, { useMemo } from 'react'
import { Folder, FolderOpen } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import {
  toggleHiddenProjectGroupId,
  UNGROUPED_PROJECT_GROUP_FILTER_ID
} from '../../../../../../shared/project/groups/project-group-filter'
import { walkProjectGroupTree } from '../../../../../../shared/sidebar-list/sections/project-group-tree'
import { selectProjectGroupFilter } from './project-group-filter-selection'

type GroupRow = { group: ProjectGroup; depth: number }

const NO_PROJECT_ENTRIES: readonly [string, never][] = []
const NO_FOLDER_COUNTS: ReadonlyMap<string, number> = new Map()
const DEPTH_INDENT_PX = 12

/** The groups in sidebar order and nesting, so the picker reads like the list it filters. */
function useProjectGroupRows(): GroupRow[] {
  const projectGroups = useAppStore((s) => s.projectGroups)
  const projectOrderBy = useAppStore((s) => s.projectOrderBy)
  return useMemo(() => {
    const rows: GroupRow[] = []
    walkProjectGroupTree(
      {
        entries: NO_PROJECT_ENTRIES,
        projectGroups,
        folderCountByGroupId: NO_FOLDER_COUNTS,
        projectOrderBy,
        repoOrder: undefined
      },
      {
        group: (group, depth) => {
          rows.push({ group, depth })
          return true
        },
        projects: () => {}
      }
    )
    return rows
  }, [projectGroups, projectOrderBy])
}

export function SidebarProjectGroupFilterSection({
  preserveWorkspaceBoardOpen = false
}: {
  preserveWorkspaceBoardOpen?: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const rows = useProjectGroupRows()
  const filter = useAppStore(selectProjectGroupFilter)
  const hiddenIds = useAppStore((s) => s.hiddenProjectGroupIds)
  const setHiddenIds = useAppStore((s) => s.setHiddenProjectGroupIds)

  if (rows.length === 0) {
    return null
  }

  const ungroupedLabel = t(
    'auto.components.sidebar.SidebarProjectGroupFilterSection.ungrouped',
    'Ungrouped'
  )
  const ungroupedShown = !hiddenIds.includes(UNGROUPED_PROJECT_GROUP_FILTER_ID)
  const shownLabels = rows
    .filter(({ group }) => !filter.isGroupHidden(group.id))
    .map(({ group }) => group.name)
  if (ungroupedShown) {
    shownLabels.push(ungroupedLabel)
  }
  const total = rows.length + 1
  const visibilityLabel = !filter.active
    ? t('auto.components.sidebar.SidebarProjectGroupFilterSection.allGroups', 'All groups')
    : shownLabels.length === 1
      ? shownLabels[0]
      : t(
          'auto.components.sidebar.SidebarProjectGroupFilterSection.shownOfTotal',
          '{{shown}} of {{total}}',
          { shown: shownLabels.length, total }
        )

  const toggle = (id: string): void => setHiddenIds(toggleHiddenProjectGroupId(hiddenIds, id))

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="flex flex-1 items-center justify-between gap-3">
          <span>
            {t(
              'auto.components.sidebar.SidebarProjectGroupFilterSection.projectGroups',
              'Project groups'
            )}
          </span>
          <span className="min-w-0 truncate text-2xs font-medium text-muted-foreground">
            {visibilityLabel}
          </span>
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className="w-60"
        data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
      >
        <DropdownMenuCheckboxItem
          checked={!filter.active}
          onCheckedChange={() => {
            if (hiddenIds.length > 0) {
              setHiddenIds([])
            }
          }}
          onSelect={(e) => e.preventDefault()}
        >
          {t('auto.components.sidebar.SidebarProjectGroupFilterSection.showAll', 'Show all')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto scrollbar-sleek">
          {rows.map(({ group, depth }) => {
            const hidden = filter.isGroupHidden(group.id)
            // A group under a hidden parent is hidden by the parent; untick the parent to change it.
            const hiddenByAncestor = hidden && !hiddenIds.includes(group.id)
            return (
              <DropdownMenuCheckboxItem
                key={group.id}
                checked={!hidden}
                disabled={hiddenByAncestor}
                onCheckedChange={() => toggle(group.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <span
                  className="flex min-w-0 items-center gap-1.5"
                  style={{ marginInlineStart: depth * DEPTH_INDENT_PX }}
                >
                  <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{group.name}</span>
                </span>
              </DropdownMenuCheckboxItem>
            )
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={ungroupedShown}
          onCheckedChange={() => toggle(UNGROUPED_PROJECT_GROUP_FILTER_ID)}
          onSelect={(e) => e.preventDefault()}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{ungroupedLabel}</span>
          </span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
