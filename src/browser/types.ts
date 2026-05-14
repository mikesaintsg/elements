// ============================================================================
//  Browser-side type definitions shared across composables / factories.
//
//  Two flavours of declaration land in this file:
//    1. Cross-cutting primitives — `Side`, `Placement`, `DropPosition`,
//       `FormFieldElement`, `TableCell`, … the small scalar / structural
//       types that more than one composable depends on. They live here
//       so `helpers.ts` and any composable can import from a single
//       module without circular imports.
//    2. Per-composable option / return / event-map / detail interfaces.
//       Each `use*` / `create*` declares its own `Use{Name}Options`,
//       `Use{Name}Return`, `Create{Name}Options`, `Create{Name}Instance`,
//       and `Use{Name}EventMap` here so consumers (and the tokens.ts /
//       events.ts parity tests) have a single canonical surface.
//
//  Composable-specific blocks are added when each composable lands. The
//  current file ships only the cross-cutting primitives — composable
//  blocks are filled in turn-by-turn.
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// Theme primitives
// ─────────────────────────────────────────────────────────────────────────

/** Theme color mode currently rendered. Written to `<html data-theme="…">`
 *  ONLY when the user has pinned an explicit choice — when the user is on
 *  `'system'` the attribute is removed and CSS handles the OS-follow via
 *  `@media (prefers-color-scheme: dark)`. */
export type ThemeMode = 'light' | 'dark'

/**
 * User-facing theme setting. `'system'` is the default and defers entirely
 * to the OS `prefers-color-scheme` media query at the CSS layer — the
 * composable removes `<html data-theme="…">` so the framework stylesheet
 * owns the flip. `'light'` and `'dark'` are explicit pins that write the
 * attribute and override the media query.
 */
export type ThemeSetting = ThemeMode | 'system'

export interface ThemeChangeDetail {
	/** Resolved mode (`'light' | 'dark'`) currently rendered. */
	readonly mode: ThemeMode
	/** Raw user setting (`'light' | 'dark' | 'system'`) before resolution. */
	readonly setting: ThemeSetting
}

// ─────────────────────────────────────────────────────────────────────────
// Popover placement primitives
// ─────────────────────────────────────────────────────────────────────────

/** Logical popover side. `start` / `end` are inline-axis. */
export type Side = 'top' | 'end' | 'bottom' | 'start'
/** Optional alignment along the popover's flat edge against the anchor. */
export type Alignment = 'start' | 'end'
/** Combined placement — bare side, or side-aligned corner. */
export type Placement = Side | `${Side}-${Alignment}`
/** Popover positioning strategy. `absolute` participates in layout flow;
 *  `fixed` floats above stacking contexts. */
export type Strategy = 'absolute' | 'fixed'
/** Discriminator across popover-derived widgets. Drives chrome class names
 *  (`popover` for rich content, `tooltip` for inline labels). */
export type PopoverKind = 'popover' | 'tooltip'
/** Trigger interaction that opens the popover. */
export type PopoverTrigger = 'hover' | 'focus' | 'click'

export interface PopoverPlaceDetail {
	readonly placement: Placement
}

// ─────────────────────────────────────────────────────────────────────────
// Drag / drop primitives
// ─────────────────────────────────────────────────────────────────────────

/** Insertion position relative to the item currently under the drag cursor. */
export type DropPosition = 'before' | 'after' | 'into'

/** Detail for `elements:drag:tap` — single click on a row. */
export interface DragTapDetail {
	readonly index: number
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:start` — native drag has begun. */
export interface DragStartDetail {
	readonly indices: ReadonlySet<number>
	readonly pointer: PointerEvent
}

/** Detail for `elements:drag:over` — native drag hovering a candidate target. */
export interface DragOverDetail {
	readonly index: number
	readonly position: DropPosition
	readonly target: HTMLElement
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:drop` — native drop over a target. */
export interface DragDropDetail {
	readonly index: number | null
	readonly position: DropPosition | null
	readonly target: HTMLElement | null
	readonly pointer: PointerEvent
	readonly types: readonly string[]
}

/** Detail for `elements:drag:end` — drag terminated for any reason. */
export interface DragEndDetail {
	readonly cancelled: boolean
	readonly pointer: PointerEvent | null
}

/** Detail for `elements:drag:reorder` — successful in-list reorder. */
export interface DragReorderDetail {
	readonly fromIndices: readonly number[]
	readonly toIndex: number
	readonly items: readonly unknown[]
}

// ─────────────────────────────────────────────────────────────────────────
// Misc cross-cutting details
// ─────────────────────────────────────────────────────────────────────────

export interface ButtonToggleDetail {
	readonly active: boolean
}

/** Slide direction for carousel transitions. `'left'` = forwards (next),
 *  `'right'` = backwards (prev). LTR-physical naming because the
 *  transition classes use the same axis. */
export type CarouselDirection = 'left' | 'right'

export interface CarouselSlideDetail {
	readonly direction: CarouselDirection
	readonly from: number
	readonly to: number
}

export interface NavActivateDetail {
	readonly id: string
}

// ─────────────────────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────────────────────

/** Native form-associated control element. */
export type FormFieldElement =
	| HTMLButtonElement
	| HTMLFieldSetElement
	| HTMLInputElement
	| HTMLObjectElement
	| HTMLOutputElement
	| HTMLSelectElement
	| HTMLTextAreaElement

/**
 * One `FormData` entry. Multi-value fields (checkbox groups, multi-selects,
 * `<input type="file" multiple>`) appear once per value, so the same `name`
 * may repeat across the array — duplicates are preserved on purpose.
 */
export interface FormEntry {
	readonly name: string
	readonly value: FormDataEntryValue
}

export interface FormError {
	readonly name: string
	readonly message: string
	readonly validity: ValidityState
}

export interface FormInputDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormChangeDetail {
	readonly field: string | null
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormSubmitDetail {
	readonly data: readonly FormEntry[]
	readonly valid: boolean
}

export interface FormValidateDetail {
	readonly errors: readonly FormError[]
	readonly valid: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Table primitives
// ─────────────────────────────────────────────────────────────────────────

/** Acceptable cell input. `Node` is appended as a child; everything else
 *  becomes the cell's text content. */
export type TableInput = string | number | boolean | null | undefined | Node
/** Cell value as read back from a row. Always serialized to string. */
export type TableValue = string
/** A row's cells as an immutable array of values. */
export type TableRow = readonly TableValue[]
/** A row's cells as input values. */
export type TableInputRow = readonly TableInput[]

/** Body-cell coordinate inside a table. Both axes are 0-based. */
export interface TableCell {
	readonly row: number
	readonly column: number
}

/** Closed range of body-row indices. Both bounds inclusive. */
export interface TableRange {
	readonly from: number
	readonly to: number
}

/** Selection / focus / sort target. Either a sentinel, single row,
 *  cell coordinate, or row range. */
export type TableTarget = 'all' | number | TableCell | TableRange

/** Direction for a sorted column. `'none'` is the unsorted state. */
export type TableSortDirection = 'asc' | 'desc' | 'none'

/** Single entry in the active sort list (in priority order). */
export interface TableSortEntry {
	readonly key: string
	readonly direction: Exclude<TableSortDirection, 'none'>
}

/** Selection scope strategy applied by select-all operations. */
export type TableStrategy = 'single' | 'page' | 'all'

/** Arrow-key navigation direction inside a grid. */
export type TableDirection = 'up' | 'down' | 'left' | 'right'

/** Logical sub-region of a `<table>` that an action targets. */
export type TablePart =
	| 'caption'
	| 'headers'
	| 'rows'
	| 'cells'
	| 'footer'
	| 'selection'
	| 'expansion'
	| 'sort'
	| 'resize'
	| 'focus'

/** Mutation verb a table action expresses. */
export type TableAction =
	| 'set'
	| 'append'
	| 'prepend'
	| 'insert'
	| 'update'
	| 'remove'
	| 'move'
	| 'swap'
	| 'clear'
	| 'refresh'

// ─────────────────────────────────────────────────────────────────────────
// Per-composable option / return / instance blocks. Order alphabetical.
// ─────────────────────────────────────────────────────────────────────────

import type { ComputedRef, Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePointer
// ─────────────────────────────────────────────────────────────────────────

export interface UsePointerEventMap {
	readonly start: (event: PointerEvent) => void
	readonly move: (event: PointerEvent) => void
	readonly end: (event: PointerEvent) => void
}

export interface CreatePointerOptions {
	/** Cursor applied to `document.body` for the duration of the drag. */
	readonly cursor?: string
	/** Pure decision callback — return `false` to reject a `pointerdown`. */
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface CreatePointerInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UsePointerOptions {
	readonly cursor?: string
	readonly accept?: (event: PointerEvent) => boolean
	readonly on?: Partial<UsePointerEventMap>
}

export interface UsePointerReturn {
	readonly dragging: Readonly<Ref<boolean>>
	/** Programmatically cancel an in-progress drag and restore body styles. */
	readonly clear: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTheme
// ─────────────────────────────────────────────────────────────────────────

export interface UseThemeEventMap {
	/** `event.detail` is `ThemeChangeDetail`. */
	readonly change: (event: CustomEvent) => void
}

export interface CreateThemeOptions {
	/**
	 * Initial setting when nothing is stored. Defaults to `'system'` —
	 * `<html>` carries no `data-theme` attribute and the stylesheet's
	 * `@media (prefers-color-scheme: dark)` rule handles the OS-follow on
	 * its own. Pick `'light'` or `'dark'` for an explicit pin.
	 */
	readonly initial?: ThemeSetting
	/** Persistence. Defaults to `localStorage` under the framework's
	 *  `STORAGE_KEY_THEME`. `false` disables it; an object with `key`
	 *  overrides the storage key. */
	readonly storage?: false | { readonly key?: string }
	readonly on?: Partial<UseThemeEventMap>
}

export interface CreateThemeInstance {
	/** User's raw choice (`'light' | 'dark' | 'system'`). Use this for
	 *  tri-state UI surfaces (segmented button, dropdown). */
	readonly setting: Readonly<Ref<ThemeSetting>>
	/** Resolved mode (`'light' | 'dark'`) currently rendered. Tracks
	 *  `setting` when explicit; mirrors `prefers-color-scheme` when
	 *  `setting === 'system'`. Use this for binary UI affordances (sun /
	 *  moon icon swap). */
	readonly mode: Readonly<Ref<ThemeMode>>
	/** Pick light, dark, or system. No-op when the value matches the
	 *  current setting. */
	readonly set: (next: ThemeSetting) => void
	/** Binary flip between explicit light and dark — anchors the choice
	 *  away from `'system'`. Call `set('system')` to opt back into OS
	 *  follow. */
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseThemeOptions extends CreateThemeOptions {}

export interface UseThemeReturn {
	readonly setting: Readonly<Ref<ThemeSetting>>
	readonly mode: Readonly<Ref<ThemeMode>>
	readonly set: (next: ThemeSetting) => void
	readonly toggle: () => void
}

// `ComputedRef` is re-exported here so per-composable blocks below can use
// it without each one re-importing from 'vue'. The first import must stay
// in alphabetical order with `Ref`.
export type { ComputedRef, Ref }

import type { CSSProperties } from 'vue'

// ─────────────────────────────────────────────────────────────────────────
// usePopover
// ─────────────────────────────────────────────────────────────────────────

export interface UsePopoverEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired after placement is refreshed. `event.detail` is `PopoverPlaceDetail`. */
	readonly place: (event: CustomEvent) => void
}

export interface CreatePopoverElements {
	/** Reference (anchor) element. */
	readonly anchor: HTMLElement
	/** Floating panel element (must be in the DOM, ideally teleported to body). */
	readonly panel: HTMLElement
	/** Optional arrow inside the panel. */
	readonly arrow?: HTMLElement | null
}

export interface CreatePopoverOptions {
	/** Placement for the floating panel. `false` keeps native visibility
	 *  without applying any placement attributes. */
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface CreatePopoverInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UsePopoverOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly trigger?: {
		readonly hover?: boolean
		readonly focus?: boolean
		readonly click?: boolean
	}
	readonly delay?: {
		readonly show?: number
		readonly hide?: number
	}
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
	}
	readonly on?: Partial<UsePopoverEventMap>
}

export interface UsePopoverReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly styles: ComputedRef<{ readonly panel: CSSProperties; readonly arrow: CSSProperties }>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDialog (← useModal). Bound to the native `<dialog>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDialogEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	/** Fired when a dismiss attempt is blocked by `dismiss.backdrop: 'static'`. */
	readonly prevent: (event: CustomEvent) => void
}

export interface CreateDialogOptions {
	/** `false` calls `dialog.show()` (non-modal). Default `true`. */
	readonly modal?: boolean
	readonly dismiss?: {
		/** `true` dismiss on `::backdrop` click. `'static'` fires `prevent`. */
		readonly backdrop?: boolean | 'static'
		readonly escape?: boolean
	}
	readonly scroll?: {
		/** Lock body scroll when `modal: false` (modal dialogs already lock natively). */
		readonly lock?: boolean
	}
	readonly on?: Partial<UseDialogEventMap>
}

export interface CreateDialogInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDialogOptions extends CreateDialogOptions {}

export interface UseDialogReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDetails (← useCollapse). Bound to the native `<details>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseDetailsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateDetailsOptions {
	/** Open on mount. Default `false`. */
	readonly initial?: boolean
	/** Optional accordion container — opening one panel closes its open siblings. */
	readonly accordion?: HTMLElement | null
	readonly on?: Partial<UseDetailsEventMap>
}

export interface CreateDetailsInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseDetailsOptions {
	readonly initial?: boolean
	readonly accordion?: Ref<HTMLElement | null>
	readonly on?: Partial<UseDetailsEventMap>
}

export interface UseDetailsReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAside (← useOffcanvas). Bound to the native `<aside>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAsideEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateAsideOptions {
	/**
	 * Initial popover mode. `'auto'` (default) opts into native
	 * light-dismiss (Escape + outside-click). `'manual'` opts out — the
	 * panel only closes via a programmatic `hide()` or an inner
	 * `popovertargetaction="hide"` button. `false` leaves whatever the
	 * author put on the element (use when the markup already declares
	 * `popover="manual"` and you don't want the composable to overwrite).
	 */
	readonly popover?: 'auto' | 'manual' | false
	readonly on?: Partial<UseAsideEventMap>
}

export interface CreateAsideInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseAsideOptions extends CreateAsideOptions {}

export interface UseAsideReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTooltip
// ─────────────────────────────────────────────────────────────────────────

export interface UseTooltipEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly place: (event: CustomEvent) => void
}

export interface CreateTooltipElements {
	readonly anchor: HTMLElement
	readonly panel: HTMLElement
	readonly arrow?: HTMLElement | null
}

export interface CreateTooltipOptions {
	readonly placement?: false | Placement
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface CreateTooltipInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: false | Placement }) => void
	readonly destroy: () => void
}

export interface UseTooltipOptions {
	readonly anchor: Ref<HTMLElement | null>
	readonly panel: Ref<HTMLElement | null>
	readonly arrow?: Ref<HTMLElement | null>
	readonly placement?: false | Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly delay?: { readonly show?: number; readonly hide?: number }
	readonly dismiss?: { readonly escape?: boolean }
	readonly on?: Partial<UseTooltipEventMap>
}

export interface UseTooltipReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly placement: Readonly<Ref<Placement>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useMenu (← useDropdown). Bound to the native `<menu>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseMenuEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateMenuElements {
	readonly toggle: HTMLElement
	readonly menu: HTMLMenuElement
}

export interface CreateMenuOptions {
	readonly placement?: Placement
	readonly strategy?: Strategy
	readonly offset?: number
	/** Min item-rows the requested side must hold before the menu commits.
	 *  `0` opts out — surplus rows scroll inside the panel. Default 5. */
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface CreateMenuInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: (options?: { readonly placement?: Placement }) => void
	readonly destroy: () => void
}

export interface UseMenuOptions {
	readonly placement?: Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseMenuEventMap>
}

export interface UseMenuReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly update: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useSelect. Bound to the native `<menu>` listbox; layers WAI-ARIA
// listbox + optional combobox semantics on top of `useMenu`.
// ─────────────────────────────────────────────────────────────────────────

/** Payload of the `elements:select:select` event. Fired on every value
 *  commit; carries both the single-select scalar (`value`) and the
 *  multi-select snapshot (`values`) so listeners pick whichever shape
 *  fits their model. */
export interface SelectSelectDetail {
	readonly value: string | null
	readonly values: readonly string[]
}

/** Payload of the `elements:select:input` event. Fired on every
 *  combobox-input keystroke after the filter has settled; carries the
 *  current query string. */
export interface SelectInputDetail {
	readonly query: string
}

export interface UseSelectEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly select: (event: CustomEvent<SelectSelectDetail>) => void
	readonly clear: (event: CustomEvent) => void
	readonly input: (event: CustomEvent<SelectInputDetail>) => void
}

/** Element refs the factory takes. `toggle` is the trigger button (or
 *  the wrapping <select> mirror element); `menu` is the listbox panel.
 *  `native` is the optional <select> (or <input>) the factory mirrors
 *  values into for form-data participation. `input` promotes the
 *  toggle to a combobox — typing filters options. */
export interface CreateSelectElements {
	readonly toggle: HTMLElement
	readonly menu: HTMLMenuElement
	readonly native?: HTMLSelectElement | HTMLInputElement | null
	readonly input?: HTMLInputElement | null
}

export interface CreateSelectOptions {
	/** Multi-select mode. Mutually exclusive with `autocomplete`. */
	readonly multiple?: boolean
	/** Combobox autocomplete mode. Requires `input` in the elements. */
	readonly autocomplete?: boolean
	/** Initial value — a scalar (single-select), an array (multi-select),
	 *  or undefined for empty initial state. */
	readonly value?: string | readonly string[]
	readonly placement?: Placement
	readonly strategy?: Strategy
	readonly offset?: number
	/** Min item-rows the requested side must hold before the menu commits.
	 *  `0` opts out — surplus rows scroll inside the panel. Default 5. */
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		/** Single-select defaults to `true` (dismiss on commit); multi-
		 *  select defaults to `false` so callers can build up a selection
		 *  without reopening the panel. */
		readonly inside?: boolean
	}
	readonly on?: Partial<UseSelectEventMap>
}

export interface CreateSelectInstance {
	readonly visible: Readonly<Ref<boolean>>
	/** Single-select scalar. Tracks the first entry of `values` in multi-
	 *  select mode (always `null` when the selection is empty). */
	readonly value: Readonly<Ref<string | null>>
	/** Multi-select snapshot. Always the canonical source of truth — the
	 *  scalar `value` is derived. */
	readonly values: Readonly<Ref<readonly string[]>>
	/** Combobox-mode query string. Empty in non-autocomplete mode. */
	readonly query: Readonly<Ref<string>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	/** Commit a value. Single-select replaces; multi-select toggles
	 *  membership. Fires `elements:select:select`. */
	readonly select: (next: string) => void
	/** Empty the selection. Fires `elements:select:clear`. */
	readonly clear: () => void
	readonly update: (options?: { readonly placement?: Placement }) => void
	readonly destroy: () => void
}

export interface UseSelectOptions {
	readonly menu: Ref<HTMLMenuElement | null>
	readonly native?: Ref<HTMLSelectElement | HTMLInputElement | null>
	readonly input?: Ref<HTMLInputElement | null>
	readonly multiple?: boolean
	readonly autocomplete?: boolean
	readonly value?: string | readonly string[]
	readonly placement?: Placement | Ref<Placement>
	readonly strategy?: Strategy
	readonly offset?: number
	readonly flip?: number
	readonly dismiss?: {
		readonly outside?: boolean
		readonly escape?: boolean
		readonly inside?: boolean
	}
	readonly on?: Partial<UseSelectEventMap>
}

export interface UseSelectReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly value: Readonly<Ref<string | null>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly query: Readonly<Ref<string>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly select: (next: string) => void
	readonly clear: () => void
	readonly update: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useToast. Bound to the native `<output>` element.
// ─────────────────────────────────────────────────────────────────────────

export interface UseToastEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateToastOptions {
	/** `false` keeps the toast sticky. Object enables auto-hide with optional delay. */
	readonly autohide?: false | { readonly delay?: number }
	/**
	 * Swipe-to-dismiss gesture. `false` disables; object enables with optional
	 * threshold override (CSS pixels, default 80 — distance the pointer must
	 * travel along the inline axis before release commits to dismiss). The
	 * gesture is bidirectional horizontal (swipe left OR right), composes
	 * with the deck `transform: translateY()` via the standalone `translate`
	 * property, and dispatches the cancellable `elements:toast:hide` event
	 * on commit so consumers can veto. Pointer-down on the trailing
	 * `<button>` dismiss is ignored so button clicks survive.
	 */
	readonly swipe?: false | { readonly threshold?: number }
	readonly on?: Partial<UseToastEventMap>
}

export interface CreateToastInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseToastOptions extends CreateToastOptions {}

export interface UseToastReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrag
// ─────────────────────────────────────────────────────────────────────────

export interface UseDragEventMap {
	readonly tap: (event: CustomEvent) => void
	readonly start: (event: CustomEvent) => void
	readonly over: (event: CustomEvent) => void
	readonly drop: (event: CustomEvent) => void
	readonly end: (event: CustomEvent) => void
	readonly reorder: (event: CustomEvent) => void
}

/** Mutable list accessor used by the factory in place of a Vue ref. */
export interface CreateDragList<T> {
	readonly read: () => T[]
	readonly splice: (start: number, deleteCount: number, ...items: T[]) => T[]
}

export interface CreateDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: CreateDragList<T>
	readonly items?: () => readonly T[]
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface CreateDragInstance {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseDragOptions<T = unknown> {
	readonly source?: boolean
	readonly target?: boolean
	readonly list?: Ref<T[]>
	readonly items?: Ref<readonly T[]>
	readonly axis?: 'vertical' | 'horizontal'
	readonly auto?: boolean
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly select?: boolean
	readonly types?: readonly string[]
	readonly resolve?: {
		readonly zone?: (row: HTMLElement, event: DragEvent) => DropPosition | null
		readonly indices?: (startIndex: number) => ReadonlySet<number>
	}
	readonly on?: Partial<UseDragEventMap>
}

export interface UseDragReturn {
	readonly dragging: Readonly<Ref<boolean>>
	readonly indices: Readonly<Ref<ReadonlySet<number>>>
	readonly selected: Readonly<Ref<ReadonlySet<number>>>
	readonly target: Readonly<Ref<number | null>>
	readonly position: Readonly<Ref<DropPosition | null>>
	readonly select: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly tap: (index: number, event?: MouseEvent | KeyboardEvent | PointerEvent) => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useDrop
// ─────────────────────────────────────────────────────────────────────────

export interface UseDropEventMap {
	readonly dragenter: (event: DragEvent) => void
	readonly dragover: (event: DragEvent) => void
	readonly dragleave: (event: DragEvent) => void
	readonly drop: (event: DragEvent) => void
}

export interface CreateDropOptions {
	readonly effect?: {
		readonly allowed?: DataTransfer['effectAllowed']
		readonly drop?: DataTransfer['dropEffect']
	}
	readonly accept?: readonly string[]
	readonly on?: Partial<UseDropEventMap>
}

export interface CreateDropInstance {
	readonly over: Readonly<Ref<boolean>>
	readonly destroy: () => void
}

export interface UseDropOptions extends CreateDropOptions {}

export interface UseDropReturn {
	readonly over: Readonly<Ref<boolean>>
}

// ─────────────────────────────────────────────────────────────────────────
// useFocus (extracted from mailbox's useModal focus-trap loop)
// ─────────────────────────────────────────────────────────────────────────

export interface CreateFocusOptions {
	/** Element (or selector function) to focus on activate. Defaults to the
	 *  first focusable descendant. */
	readonly initial?: HTMLElement | ((host: HTMLElement) => HTMLElement | null)
	/** Restore focus to the previously-focused element on deactivate.
	 *  Default `true`. */
	readonly restore?: boolean
}

export interface CreateFocusInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
	readonly destroy: () => void
}

export interface UseFocusOptions extends CreateFocusOptions {}

export interface UseFocusReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly activate: () => void
	readonly deactivate: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useButton. Bound to native `<button>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseButtonEventMap {
	/** Fired after toggle. `event.detail` is `ButtonToggleDetail`. */
	readonly toggle: (event: CustomEvent) => void
}

export interface CreateButtonOptions {
	readonly on?: Partial<UseButtonEventMap>
}

export interface CreateButtonInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseButtonOptions extends CreateButtonOptions {}

export interface UseButtonReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useAlert. Bound to any element carrying `[role="alert"]` / `[role="status"]`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseAlertEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
}

export interface CreateAlertOptions {
	/**
	 * Initial visibility. Defaults to `true` so alerts render visible
	 * out of the box (`<aside role="alert">` is meaningless if hidden).
	 * Pass `false` to mount in the dismissed state — useful when the
	 * alert is going to be triggered by an upstream event.
	 */
	readonly initial?: boolean
	readonly on?: Partial<UseAlertEventMap>
}

export interface CreateAlertInstance {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export type UseAlertOptions = CreateAlertOptions

export interface UseAlertReturn {
	readonly visible: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTabs (← useTab). Operates on one tab/pane pair within a tablist group.
// ─────────────────────────────────────────────────────────────────────────

export interface UseTabsEventMap {
	readonly show: (event: CustomEvent) => void
	readonly open: (event: CustomEvent) => void
	readonly hide: (event: CustomEvent) => void
	readonly close: (event: CustomEvent) => void
	readonly deactivate: (event: CustomEvent) => void
}

export interface CreateTabsElements {
	readonly trigger: HTMLElement
	readonly pane: HTMLElement
	readonly group: HTMLElement
}

export interface CreateTabsOptions {
	readonly on?: Partial<UseTabsEventMap>
	/**
	 * Force this tab to be the initially active one. When `true` the trigger
	 * is seeded with `aria-selected="true"` and its pane's `[hidden]`
	 * attribute is removed before the first paint, so consumers don't have
	 * to pre-author the markup. Defaults to reading
	 * `aria-selected="true"` from the trigger.
	 */
	readonly initial?: boolean
}

export interface CreateTabsInstance {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
	readonly destroy: () => void
}

export interface UseTabsOptions {
	readonly pane: Ref<HTMLElement | null>
	readonly group: Ref<HTMLElement | null>
	readonly on?: Partial<UseTabsEventMap>
	/**
	 * Force this tab to be active on first mount. Equivalent to pre-authoring
	 * `aria-selected="true"` on the trigger before the composable runs.
	 */
	readonly initial?: boolean
}

export interface UseTabsReturn {
	readonly active: Readonly<Ref<boolean>>
	readonly show: () => void
	readonly hide: () => void
	readonly toggle: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useNav (← useScrollSpy). Bound to native `<nav>`.
// ─────────────────────────────────────────────────────────────────────────

export interface UseNavEventMap {
	/** `event.detail` is `NavActivateDetail`. */
	readonly activate: (event: CustomEvent) => void
}

export interface CreateNavElements {
	readonly container: HTMLElement
	readonly nav?: HTMLElement | null
}

export interface CreateNavOptions {
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface CreateNavInstance {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
	readonly destroy: () => void
}

export interface UseNavOptions {
	readonly nav?: Ref<HTMLElement | null>
	readonly intersection?: {
		readonly offset?: number
		readonly margin?: string
		readonly threshold?: number | readonly number[]
	}
	readonly on?: Partial<UseNavEventMap>
}

export interface UseNavReturn {
	readonly active: Readonly<Ref<string | null>>
	readonly refresh: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useCarousel
// ─────────────────────────────────────────────────────────────────────────

export interface UseCarouselEventMap {
	readonly slide: (event: CustomEvent) => void
	readonly change: (event: CustomEvent) => void
	readonly pause: (event: CustomEvent) => void
	readonly resume: (event: CustomEvent) => void
}

export interface CreateCarouselOptions {
	readonly autoplay?: {
		readonly interval?: number
		readonly pause?: 'hover' | false
		readonly ride?: 'mount' | 'interaction' | false
	}
	readonly keyboard?: boolean
	readonly wrap?: boolean
	readonly touch?: boolean
	readonly on?: Partial<UseCarouselEventMap>
}

export interface CreateCarouselInstance {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
	readonly destroy: () => void
}

export interface UseCarouselOptions extends CreateCarouselOptions {}

export interface UseCarouselReturn {
	readonly index: Readonly<Ref<number>>
	readonly cycling: Readonly<Ref<boolean>>
	readonly next: () => void
	readonly prev: () => void
	readonly to: (index: number) => void
	readonly start: () => void
	readonly stop: () => void
	readonly pause: () => void
	readonly resume: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useForm. Bound to native `<form>`.
// ─────────────────────────────────────────────────────────────────────────

export interface FormDataDetail {
	readonly formData: FormData
}
export interface FormInvalidDetail {
	readonly field: string | null
	readonly message: string
	readonly validity: ValidityState | null
}
export interface FormResetDetail {
	readonly data: readonly FormEntry[]
}

export interface FormEventMap {
	readonly change: (event: CustomEvent) => void
	readonly formdata: (event: CustomEvent) => void
	readonly input: (event: CustomEvent) => void
	readonly invalid: (event: CustomEvent) => void
	readonly reset: (event: CustomEvent) => void
	readonly submit: (event: CustomEvent) => void
	readonly validate: (event: CustomEvent) => void
}

export interface CreateFormOptions {
	readonly submit?: { readonly invalid?: boolean }
	readonly validate?: {
		readonly input?: boolean
		readonly mount?: boolean
		readonly submit?: boolean
	}
	readonly on?: Partial<FormEventMap>
}

export interface FormFieldsInterface {
	readonly items: Readonly<Ref<readonly FormFieldElement[]>>
	readonly names: Readonly<Ref<readonly string[]>>
	readonly field: (name: string) => FormFieldElement | null
	readonly fields: (name?: string) => readonly FormFieldElement[]
	readonly has: (name: string) => boolean
	readonly focus: (name: string) => boolean
	readonly enable: (name: string) => void
	readonly disable: (name: string) => void
}

export interface FormValidityInterface {
	readonly errors: Readonly<Ref<readonly FormError[]>>
	readonly field: (name: string) => ValidityState | null
	readonly message: (name: string) => string | null
	readonly mark: (name: string, message: string) => boolean
	readonly clear: (name?: string) => void
}

export interface CreateFormInstance {
	readonly element: HTMLFormElement
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseFormOptions extends CreateFormOptions {}

export interface UseFormReturn {
	readonly element: Readonly<Ref<HTMLFormElement | null>>
	readonly data: Readonly<Ref<readonly FormEntry[]>>
	readonly dirty: Readonly<Ref<boolean>>
	readonly touched: Readonly<Ref<ReadonlySet<string>>>
	readonly valid: Readonly<Ref<boolean>>
	readonly validated: Readonly<Ref<boolean>>
	readonly fields: FormFieldsInterface
	readonly validity: FormValidityInterface
	readonly refresh: () => void
	readonly check: () => boolean
	readonly report: () => boolean
	readonly submit: () => void
	readonly reset: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

// ─────────────────────────────────────────────────────────────────────────
// useTable
// ─────────────────────────────────────────────────────────────────────────

/** Per-column schema entry — drives sortable / filterable behavior. */
export interface TableColumn {
	readonly key: string
	readonly title?: string
	readonly sortable?: boolean
	readonly filterable?: boolean
	/** Custom sort comparator. Receives cell `textContent` from two rows. */
	readonly sort?: (a: string, b: string) => number
	/** Custom filter predicate. */
	readonly filter?: (value: string, query: string) => boolean
}

export interface TableChangeDetail {
	readonly part: TablePart
	readonly action: TableAction
}

export interface TableSelectDetail {
	readonly ids: ReadonlySet<string>
}

export interface TablePaginateDetail {
	readonly page: number
	readonly offset: number
	readonly size: number
}

export interface TableFocusDetail {
	readonly cell: TableCell | null
}

export interface TableSortDetail {
	readonly columns: readonly TableSortEntry[]
}

export interface TableExpansionDetail {
	readonly id: string
}

export interface TableEventMap {
	readonly change: (event: CustomEvent) => void
	readonly focus: (event: CustomEvent) => void
	readonly select: (event: CustomEvent) => void
	readonly sort: (event: CustomEvent) => void
	readonly expand: (event: CustomEvent) => void
	readonly collapse: (event: CustomEvent) => void
	readonly paginate: (event: CustomEvent) => void
}

export interface CreateTableOptions {
	readonly caption?: string
	readonly footer?: TableInputRow
	readonly focus?: {
		readonly keyboard?: boolean
		readonly wrap?: boolean
	}
	readonly headers?: TableInputRow
	readonly id?: () => string
	readonly on?: Partial<TableEventMap>
	readonly rows?: readonly TableInputRow[]
	/** Per-column schema — drives sort/filter and column key discovery. */
	readonly columns?: readonly TableColumn[]
	/** Property name read from row data for stable identity (written as `data-id`). */
	readonly value?: string
	/** 1-based index of the first visible row in the full dataset (drives `aria-rowindex`). */
	readonly offset?: number | Ref<number>
	/** Total row count written as `aria-rowcount` on the `<table>` element. */
	readonly total?: number | Ref<number>
	readonly pagination?: {
		/**
		 * Rows per page — drives `pagination.page` / `pagination.count`
		 * derivations. When omitted the body row count at the time of access
		 * is used (the rendered page IS the page).
		 */
		readonly size?: number | Ref<number>
	}
	readonly sort?: {
		/** Allow multi-column sort. Default `false`. */
		readonly multiple?: boolean
		/** Prevent clearing sort (cycles asc→desc→asc). Default `false`. */
		readonly mandate?: boolean
		/** Direction on first click. Default `'asc'`. */
		readonly order?: 'asc' | 'desc'
		/**
		 * Reorder `<tbody>` rows in place when sort state changes.
		 * Default `true`. Set `false` for server-paged datasets where
		 * the consumer refetches in response to the
		 * `elements:table:sort` event.
		 */
		readonly auto?: boolean
	}
	readonly expansion?: {
		/** Allow multiple rows expanded simultaneously. Default `true`. */
		readonly multiple?: boolean
		/** Row ids to expand at construction (stale ids silently ignored). */
		readonly initial?: readonly string[]
		/**
		 * Wire row-click → expansion toggle.
		 *  - `true` / `'row'` (default): clicking anywhere on an expandable
		 *    row (one with a sibling `<tr data-table-expansion>`) toggles.
		 *    Interactive descendants (`a, button, input, textarea, select,
		 *    label, [data-no-select]`) are skipped so row-internal action
		 *    chrome survives.
		 *  - `'caret'`: only descendants of `[data-table-expansion-trigger]`
		 *    toggle. Use when the rest of the row should read as plain
		 *    content (e.g. a leading-cell caret button).
		 *  - `false`: no built-in handler; consumers drive
		 *    `expansion.toggle(id)` themselves.
		 */
		readonly click?: boolean | 'row' | 'caret'
	}
	readonly selection?: {
		/** Scope for select-all operations. Default `'page'`. */
		readonly strategy?: TableStrategy
		/** Predicate — return `false` to prevent a row from being selected. */
		readonly selectable?: (row: HTMLTableRowElement) => boolean
		/**
		 * When `true` (default), `createTable` listens for clicks on body rows
		 * and applies the canonical desktop selection model:
		 *  - plain click replaces the selection with that row
		 *  - Ctrl / ⌘ click toggles that row in or out of the selection
		 *  - Shift click extends from the anchor to the clicked row
		 *  - clicking outside the table with an active selection clears it
		 *
		 * Clicks whose target is interactive (`input`, `button`, `a`, `select`,
		 * `textarea`, `label`, or any descendant of `[data-no-select]`) are
		 * skipped so checkboxes / row actions still work.
		 *
		 * Set to `false` when driving selection entirely from custom UI.
		 */
		readonly click?: boolean
	}
	/** Column resize configuration. Absent = no resize handles. */
	readonly resize?: {
		/** Minimum column width in pixels. Default `40`. */
		readonly min?: number
		/** Maximum column width in pixels. Default `Infinity`. */
		readonly max?: number
	}
}

export interface CreateTableInstance {
	readonly element: HTMLTableElement
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	/** Column schema (structural, not reactive). */
	readonly columns: readonly TableColumn[]
	/** Reactive total ref — reflects `options.total`. */
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}

export interface UseTableOptions extends CreateTableOptions {}

export interface TableCaptionInterface {
	readonly value: Readonly<Ref<string | null>>
	readonly caption: () => HTMLTableCaptionElement | null
	readonly set: (value: string) => void
	readonly clear: () => void
}

export interface TableHeadersInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly headers: () => readonly HTMLTableCellElement[]
	readonly header: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableRowsInterface {
	readonly count: Readonly<Ref<number>>
	readonly ids: Readonly<Ref<readonly string[]>>
	readonly rows: () => readonly HTMLTableRowElement[]
	readonly row: (index: number) => HTMLTableRowElement | null
	readonly id: (index: number) => string | null
	readonly has: (index: number) => boolean
	readonly append: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly prepend: (values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly insert: (index: number, values: TableInputRow, id?: string) => HTMLTableRowElement | null
	readonly update: (index: number, values: TableInputRow) => boolean
	readonly remove: (index: number) => TableRow | null
	readonly move: (from: number, to: number) => boolean
	readonly swap: (first: number, second: number) => boolean
	readonly clear: () => void
}

export interface TableCellsInterface {
	readonly cell: (cell: TableCell) => HTMLTableCellElement | null
	readonly read: (cell: TableCell) => string | null
	readonly update: (cell: TableCell, value: TableInput) => boolean
	readonly clear: (cell: TableCell) => boolean
}

export interface TableFooterInterface {
	readonly count: Readonly<Ref<number>>
	readonly values: Readonly<Ref<readonly string[]>>
	readonly footers: () => readonly HTMLTableCellElement[]
	readonly footer: (index: number) => HTMLTableCellElement | null
	readonly set: (values: TableInputRow) => void
	readonly append: (value: TableInput) => void
	readonly insert: (index: number, value: TableInput) => void
	readonly update: (index: number, value: TableInput) => boolean
	readonly remove: (index: number) => string | null
	readonly clear: () => void
}

export interface TableSortManagerInterface {
	/** Active sort entries in priority order. */
	readonly columns: Readonly<Ref<readonly TableSortEntry[]>>
	/** Toggle sort direction for a column key. */
	readonly toggle: (key: string) => void
	/** Sort direction for a column key. */
	readonly direction: (key: string) => TableSortDirection
	/** Sort priority (0-based) for a column key in multi-sort; `-1` if unsorted. */
	readonly priority: (key: string) => number
	/** Clear all sort state. */
	readonly clear: () => void
}

export interface TableSelectionManagerInterface {
	/** Currently selected row ids. */
	readonly ids: ReadonlySet<string>
	/** Whether all selectable rows in strategy scope are selected. */
	readonly all: Readonly<Ref<boolean>>
	/** Whether some but not all selectable rows in strategy scope are selected. */
	readonly mixed: Readonly<Ref<boolean>>
	/** Active strategy (read from options). */
	readonly strategy: TableStrategy
	readonly select: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly clear: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/** Whether a row can be selected (based on `selection.selectable` option). */
	readonly selectable: (row: HTMLTableRowElement) => boolean
}

export interface TableExpansionManagerInterface {
	/** Currently expanded row ids (`shallowReactive` Set — reactive in templates). */
	readonly expanded: ReadonlySet<string>
	readonly expand: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly collapse: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	readonly toggle: {
		(): void
		(id: string): void
		(ids: string[]): void
	}
	/**
	 * Replace the entire expanded set atomically (for state restoration).
	 *
	 * @remarks Stale ids (no matching body row) are silently ignored.
	 * Respects `expansion.multiple: false` — only first id is kept when false.
	 */
	readonly set: (ids: readonly string[]) => void
}

export interface TablePaginationInterface {
	/** Rows per page — caller-supplied or rendered body row count. */
	readonly size: Readonly<Ref<number>>
	/** 1-based current page number (1 when offset and size are 0). */
	readonly page: Readonly<Ref<number>>
	/** Total page count (1 minimum, even for empty datasets). */
	readonly count: Readonly<Ref<number>>
	/**
	 * Emit an `elements:table:paginate` event with the requested page (clamped
	 * to `[1, count]`) and the corresponding 1-based offset. Caller listens
	 * to apply the navigation — the factory does not mutate caller-owned
	 * `offset` or `data`.
	 */
	readonly to: (page: number) => void
	/** Sugar for `to(page + 1)`. */
	readonly next: () => void
	/** Sugar for `to(page - 1)`. */
	readonly prev: () => void
}

export interface TableResizeManagerInterface {
	/** True while a column resize drag is active. */
	readonly active: Readonly<Ref<boolean>>
	/** Current width of column at `index` (reads `offsetWidth`). */
	readonly width: (index: number) => number
	/** Programmatically set a column width in pixels. */
	readonly set: (index: number, width: number) => void
	/** Reset all columns to natural (content-driven) widths. */
	readonly clear: () => void
}

export interface TableFocusInterface {
	readonly cell: Readonly<Ref<TableCell | null>>
	readonly focus: (cell: TableCell) => boolean
	readonly move: (direction: TableDirection) => boolean
	readonly clear: () => void
}

export interface UseTableReturn {
	readonly element: Readonly<Ref<HTMLTableElement | null>>
	readonly ready: Readonly<Ref<boolean>>
	readonly data: Readonly<Ref<readonly TableRow[]>>
	readonly caption: TableCaptionInterface
	readonly headers: TableHeadersInterface
	readonly rows: TableRowsInterface
	readonly cells: TableCellsInterface
	readonly footer: TableFooterInterface
	readonly sort: TableSortManagerInterface
	readonly expansion: TableExpansionManagerInterface
	readonly selection: TableSelectionManagerInterface
	readonly resize: TableResizeManagerInterface | null
	readonly focus: TableFocusInterface
	readonly pagination: TablePaginationInterface
	readonly columns: readonly TableColumn[]
	readonly total: Readonly<Ref<number>>
	readonly refresh: () => void
	readonly clear: () => void
	readonly destroy: () => void
}
