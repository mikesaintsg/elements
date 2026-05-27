// ============================================================================
// Event Name Registry (TS mirror)
//
// Namespaced event names emitted by framework composables and component
// bindings. Pattern enforced project-wide:
//
//     elements:{source}:{verb}
//
//   - First segment is always `elements` (the framework namespace).
//   - Second segment is an HTML element name (button, dialog, popover, …)
//     or a composable noun (drag, theme, pointer, combo, tree).
//   - Third segment is a single spelled-out lifecycle verb drawn from a
//     fixed vocabulary so the same word means the same thing across the
//     framework.
//
// Lifecycle verb vocabulary (one word, one meaning):
//   show / hide        cancellable pre-transition (call event.preventDefault())
//   open / close       post-transition notification (after the show/hide pipeline)
//   start / stop       long-running operations (loading, polling)
//   pause / resume     suspendable operations (carousel, polling)
//   abort              cancel with signal
//   destroy            tear down and release
//   select / deselect  selection toggles (combo, select, table, tree)
//   activate           focus / scroll-target advancement (nav, table, scrollspy)
//   focus / blur       focus transitions (when not using native events)
//   change / input     reactive data changes (form, combo)
//   slide / place      positional / animated transitions (carousel, popover)
//   toggle             two-state flip without separate show/hide pair (button)
//
// The constants in `constants.ts` (`*_EVENTS` maps) are the authority; this
// file mirrors them into a nested object plus a derived string-literal
// union so consumers can write
//
//     element.addEventListener(events.dialog.open, handler)
//
// and get type-checked event names alongside any `on*` props.
// ============================================================================

import {
	ALERT_EVENTS,
	ASIDE_EVENTS,
	BUTTON_EVENTS,
	CAROUSEL_EVENTS,
	COMBO_EVENTS,
	DETAILS_EVENTS,
	DIALOG_EVENTS,
	DRAG_EVENTS,
	DROP_EVENTS,
	FOCUS_EVENTS,
	FORM_EVENTS,
	MENU_EVENTS,
	NAV_EVENTS,
	POINTER_EVENTS,
	POPOVER_EVENTS,
	SELECT_EVENTS,
	TABLE_EVENTS,
	TABS_EVENTS,
	THEME_EVENTS,
	TOAST_EVENTS,
	TOOLTIP_EVENTS,
	TREE_EVENTS,
} from './constants.js'

export const events = {
	alert: ALERT_EVENTS,
	aside: ASIDE_EVENTS,
	button: BUTTON_EVENTS,
	carousel: CAROUSEL_EVENTS,
	combo: COMBO_EVENTS,
	details: DETAILS_EVENTS,
	dialog: DIALOG_EVENTS,
	drag: DRAG_EVENTS,
	drop: DROP_EVENTS,
	focus: FOCUS_EVENTS,
	form: FORM_EVENTS,
	menu: MENU_EVENTS,
	nav: NAV_EVENTS,
	pointer: POINTER_EVENTS,
	popover: POPOVER_EVENTS,
	select: SELECT_EVENTS,
	table: TABLE_EVENTS,
	tabs: TABS_EVENTS,
	theme: THEME_EVENTS,
	toast: TOAST_EVENTS,
	tooltip: TOOLTIP_EVENTS,
	tree: TREE_EVENTS,
} as const

/** Source key (second segment) of any event name. */
export type EventSource = keyof typeof events

/** Every event name as a string-literal union. */
export type EventName = {
	[K in EventSource]: (typeof events)[K][keyof (typeof events)[K]]
}[EventSource]
