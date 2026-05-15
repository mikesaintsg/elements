import type { Component } from 'vue'

/**
 * Canonical sidebar-group order. Mirrors the framework topology:
 *
 *   1. `Getting started`              — Home (showcase entry point).
 *   2. `Foundations`                  — `tokens.md` + `modifiers.md`. Token
 *                                       palette, theme flip, modifier
 *                                       cascade, placement vocabulary.
 *   3. `Elements — Interactive`       — `elements.md` ✅ cascade interactive
 *                                       members (focus / hover / state
 *                                       chrome). Action surfaces.
 *   4. `Elements — Content`           — `elements.md` ✅ cascade content
 *                                       members (typography, sectioning,
 *                                       embedded media).
 *   5. `Components`                   — `components.md` shipped catalog
 *                                       (element compositions + class-root
 *                                       primitives).
 *   6. `Surfaces`                     — `surfaces.md` shipped surfaces
 *                                       (popover panels, form surfaces,
 *                                       scroll + view-transition).
 *   7. `Composables — Element-bound`  — `composables.md` bucket 1: one
 *                                       composable per tag.
 *   8. `Composables — Attribute-bound`— bucket 2: composables that wrap
 *                                       attribute APIs (`usePopover`,
 *                                       `useTooltip`).
 *   9. `Composables — Primitives`     — bucket 3: reusable behaviour
 *                                       building blocks (`useFocus`,
 *                                       `useDrag` + `useDrop`,
 *                                       `usePointer`, `useTheme`).
 *
 * The array IS the declared display order. `App.vue`'s `grouped` computed
 * iterates `ROUTE_GROUPS` so routes can be declared in any order inside
 * `router.ts` and the sidebar still renders in canonical order.
 */
export const ROUTE_GROUPS = [
	'Getting started',
	'Foundations',
	'Elements — Interactive',
	'Elements — Content',
	'Components',
	'Surfaces',
	'Composables — Element-bound',
	'Composables — Attribute-bound',
	'Composables — Primitives',
] as const

export type RouteGroup = (typeof ROUTE_GROUPS)[number]

export interface Route {
	readonly id: string
	readonly title: string
	readonly group: RouteGroup
	readonly page: Component
}

export interface RouteLocation {
	readonly id: string
	readonly section: string | null
}

export interface Group {
	readonly group: RouteGroup
	readonly entries: readonly Route[]
}

export interface Section {
	readonly id: string
	readonly label: string
	readonly level: number
}

/**
 * Motion-timing presets surfaced by the Tokens page easing previewer.
 * Mirrored by `timingFunctionFor` in `helpers.ts`.
 */
export type MotionTiming = 'iOS' | 'ease' | 'linear' | 'snappy'

// ── TablesPage demo-row shapes ───────────────────────────────────────────
//
// `Member` and `BasicRow` were structurally identical (same six fields) —
// merged into one `TablesMember`. The basic-table demo uses the first
// four rows; the expansion demo uses all five.

export interface TablesMember {
	readonly id: string
	readonly name: string
	readonly role: string
	readonly team: string
	readonly commits: number
	readonly last: string
}

export interface TablesOrder {
	readonly id: string
	readonly customer: string
	readonly status: string
	readonly total: string
	readonly variant: 'success' | 'information' | 'warning' | 'danger'
	readonly address: string
	readonly contact: string
	readonly notes: string
}

export interface TablesThemeToken {
	readonly id: string
	readonly token: string
	readonly light: string
	readonly dark: string
	readonly notes: string
}

export interface TablesLog {
	readonly id: string
	readonly time: string
	readonly level: string
	readonly source: string
	readonly message: string
	readonly context: string
}

export interface TablesAudit {
	readonly id: string
	readonly when: string
	readonly who: string
	readonly what: string
	readonly diff: string
}

export interface TablesReleaseStep {
	readonly id: string
	readonly step: string
	readonly status: string
	readonly owner: string
	readonly notes: string
}

// ── UseTablePage demo shapes ─────────────────────────────────────────────

export interface TableIssue {
	readonly id: string
	readonly title: string
	readonly status: 'open' | 'in-progress' | 'resolved'
	readonly priority: 'low' | 'medium' | 'high' | 'critical'
	readonly assignee: string
	readonly updated: string
	readonly detail: string
}

// Inline-editing demo mutates `stock` / `bucket`, so these stay writable.
export interface TableEditRow {
	id: string
	sku: string
	name: string
	stock: number
	bucket: 'in' | 'low' | 'out'
}

// ── TokensPage demo shapes ───────────────────────────────────────────────

export interface TokenIcon {
	readonly token: string
	readonly label: string
}

export interface TokenZIndex {
	readonly token: string
	readonly value: string
	readonly role: string
}
