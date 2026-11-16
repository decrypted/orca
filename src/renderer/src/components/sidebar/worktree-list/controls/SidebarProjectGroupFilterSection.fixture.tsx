import { defineFixture } from '../../../../component-fixtures/component-fixture'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { SidebarProjectGroupFilterSection } from './SidebarProjectGroupFilterSection'

function group(
  id: string,
  name: string,
  tabOrder: number,
  parentGroupId: string | null = null
): ProjectGroup {
  return {
    id,
    name,
    parentPath: null,
    parentGroupId,
    createdFrom: 'manual',
    tabOrder,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}

const projectGroups = [
  group('acme', 'Acme Corp', 0),
  group('acme-infra', 'Infrastructure', 0, 'acme'),
  group('globex', 'Globex', 1),
  group('oss', 'Open source', 2)
]

const render = (): React.JSX.Element => (
  <div className="flex h-72 items-start bg-background p-2">
    <DropdownMenu defaultOpen modal={false}>
      <DropdownMenuTrigger>Workspace options</DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <SidebarProjectGroupFilterSection />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)

const openSubmenu = (frame: HTMLElement): void => {
  const trigger = frame.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="dropdown-menu-sub-trigger"]'
  )
  trigger?.focus()
  trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
}

export const allGroups = defineFixture({
  width: 600,
  store: { projectGroups, hiddenProjectGroupIds: [] },
  render,
  interact: openSubmenu
})

// Hiding Acme also hides its nested group; Ungrouped is hidden too.
export const filtered = defineFixture({
  width: 600,
  store: {
    projectGroups,
    hiddenProjectGroupIds: ['acme', 'project-group-filter:ungrouped', 'deleted-group']
  },
  render,
  interact: openSubmenu
})
