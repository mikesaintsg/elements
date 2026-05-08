// ============================================================================
// Event Name Registry (TS mirror)
//
// Namespaced event names emitted by future framework composables and
// component bindings. Pattern enforced project-wide:
//
//     elements:{source}:{verb}
//
//   - First segment is always `elements` (the framework namespace).
//   - Second segment is an HTML element name (button, dialog, popover, …)
//     or a composed-component name (modal, card, …).
//   - Third segment is a single spelled-out lifecycle verb drawn from a
//     fixed vocabulary so the same word means the same thing across the
//     framework.
//
// Lifecycle verb vocabulary (one word, one meaning):
//   open / close       visible-state transitions (popover, dialog, drawer)
//   show / hide        generic display transitions (alert, toast)
//   start / stop       long-running operations (loading, polling)
//   pause / resume     suspendable operations
//   abort              cancel with signal
//   destroy            tear down and release
//   select / deselect  selection toggles
//   focus / blur       focus transitions (when not using native events)
//
// Initial scope ships no events — composables come later. The convention is
// locked in now so future additions slot in cleanly.
// ============================================================================

export const events = {
	/* populated as components/surfaces gain composables, e.g.,
	   popover: { open: 'elements:popover:open', close: 'elements:popover:close' },
	   modal:   { open: 'elements:modal:open',   close: 'elements:modal:close' }, */
} as const

// Walks the (currently empty) events tree to derive a string-literal union of
// every event name. Once events are populated, EventName narrows automatically.
export type EventName = typeof events extends Record<string, Record<string, infer V>>
	? V
	: never
