import { One, type Href } from 'one'
/**
 * @agent-rule
 * the app's tab set, declared once. the native tab layout, the web MobileTabBar,
 * and desktop navigation all render this array, so a tab cannot exist in one
 * surface and be missing from another. adding a tab is one entry here plus its
 * app/home/(tabs)/<name>/ folder with its own _layout.tsx.
 */
import { Home } from '~/interface/icons/lucide/Home'
import { User } from '~/interface/icons/lucide/User'
import { APP_TODAY_HREF, APP_HISTORY_HREF, APP_COURSES_HREF } from './routes'
import type { Icon, SfSymbolName } from 'takeout-ui/icons/types'
import type { ComponentProps } from 'react'

export type ComposeIconName = ComponentProps<typeof One.Android.Icon>['name']

export type AppTab = {
  // must equal the route node name: a folder directly under (tabs)/ with its
  // own _layout.tsx. a bare (tabs)/<name>/index.tsx resolves to route node
  // `<name>/index` and will not match.
  name: string
  label: string
  href: Href
  // web and desktop chrome render this icon.
  icon: Icon
  // native chrome renders these symbols. without sfSymbolFocused the base
  // symbol is used in both states.
  sfSymbol: SfSymbolName
  sfSymbolFocused?: SfSymbolName
  materialSymbol: ComposeIconName
}

export const APP_TABS = [
  {
    name: 'today',
    label: 'Today',
    href: APP_TODAY_HREF,
    icon: Home,
    sfSymbol: 'calendar',
    materialSymbol: 'today',
  },
  {
    name: 'history',
    label: 'History',
    href: APP_HISTORY_HREF,
    icon: User,
    sfSymbol: 'clock',
    materialSymbol: 'history',
  },
  {
    name: 'courses',
    label: 'Courses',
    href: APP_COURSES_HREF,
    icon: Home,
    sfSymbol: 'book',
    materialSymbol: 'book',
  },
] as const satisfies readonly AppTab[]

export const INITIAL_TAB_NAME = APP_TABS[0].name
