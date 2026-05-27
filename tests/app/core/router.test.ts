// ============================================================================
//  app/browser/router.ts — the showcase index, in true parity with the
//  framework it documents.
//
//  The showcase IS the framework's living documentation + smoke test, so
//  its route table must stay in lock-step with three surfaces:
//
//    1. ROUTE_GROUPS (app/browser/types.ts) — every route sits in a real
//       group; every group is populated.
//    2. src/browser/composables/ — every `use*` composable the framework
//       ships is demoed by a `use-*` route, and every `use-*` route maps
//       to real composable(s). Bidirectional.
//    3. guides/ + src/styles/ — the group→guide topology guides exist;
//       every composable is documented in guides/composables.md; every
//       chrome-bearing src/styles/composables/_{name}.scss partial has a
//       demo route.
//
//  Pure node (app:core): `router.ts` imports every `.vue` page, so it's
//  read as TEXT (the idiom tests/guides/showcase.test.ts established);
//  `ROUTE_GROUPS` imports cleanly (types.ts is type-only at runtime bar
//  the const itself).
// ============================================================================

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ROUTE_GROUPS } from '../../../app/browser/types.js'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const routerSource = readFileSync(resolve(ROOT, 'app/browser/router.ts'), 'utf8')

// ── Parse the route table out of router.ts ──────────────────────────────────
//
// Every route is `const NAME: Route = { id: '…', title: '…', group: '…',
// page: … }` (id → title → group order is invariant in the file). The
// non-greedy spans tolerate the multi-line declarations the formatter
// produces.

interface ParsedRoute {
	readonly id: string
	readonly title: string
	readonly group: string
}

function parseRoutes(source: string): readonly ParsedRoute[] {
	const regex = /\bid:\s*'([^']+)'[\s\S]*?\btitle:\s*'([^']+)'[\s\S]*?\bgroup:\s*'([^']+)'/g
	const out: ParsedRoute[] = []
	let match: RegExpExecArray | null
	while ((match = regex.exec(source)) !== null) {
		if (match[1] && match[2] && match[3]) {
			out.push({ id: match[1], title: match[2], group: match[3] })
		}
	}
	return out
}

const routes = parseRoutes(routerSource)

// Route id `use-foo` → composable `useFoo`; the two compound demos fan
// out to the pair they showcase. `use-drag` demos BOTH useDrag and
// useDrop in one page (the framework's drag composable layer is named
// `_drag.scss`, matching the source side and the route id; the page
// component (`UseDragDropPage`) still combines drag + drop because the
// two are inherently paired).
const COMPOUND: Readonly<Record<string, readonly string[]>> = {
	'use-drag': ['useDrag', 'useDrop'],
	'use-theme-button': ['useTheme', 'useButton'],
}

function composablesForRoute(id: string): readonly string[] {
	if (id in COMPOUND) return COMPOUND[id] ?? []
	const segment = id.startsWith('use-') ? id.slice(4) : ''
	if (segment === '' || segment.includes('-')) return []
	return [`use${segment[0]?.toUpperCase()}${segment.slice(1)}`]
}

const frameworkComposables = readdirSync(resolve(ROOT, 'src/browser/composables'))
	.filter((f) => f.startsWith('use') && f.endsWith('.ts'))
	.map((f) => f.replace(/\.ts$/, ''))

// ── 1. Structural invariants ────────────────────────────────────────────────

describe('router — every route is well-formed', () => {
	it('parsed at least the known route count', () => {
		expect(routes.length).toBeGreaterThanOrEqual(40)
	})

	it('route ids are unique + kebab-case', () => {
		const ids = routes.map((r) => r.id)
		expect(new Set(ids).size).toBe(ids.length)
		for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
	})

	it('route titles are unique', () => {
		const titles = routes.map((r) => r.title)
		expect(new Set(titles).size).toBe(titles.length)
	})

	it('every route group is a real ROUTE_GROUPS member', () => {
		const known: ReadonlySet<string> = new Set(ROUTE_GROUPS)
		for (const r of routes) expect(known.has(r.group)).toBe(true)
	})

	it('every ROUTE_GROUPS member is populated by ≥1 route', () => {
		const used = new Set(routes.map((r) => r.group))
		for (const group of ROUTE_GROUPS) expect(used.has(group)).toBe(true)
	})

	it('`Getting started` holds exactly the home route', () => {
		const gettingStarted = routes.filter((r) => r.group === 'Getting started')
		expect(gettingStarted.map((r) => r.id)).toEqual(['home'])
	})
})

// ── 2. router ↔ src/browser/composables (bidirectional) ─────────────────────

describe('router — composable coverage parity with src/browser', () => {
	const known: ReadonlySet<string> = new Set(frameworkComposables)
	const useRoutes = routes.filter((r) => r.id.startsWith('use-'))

	it('discovers the framework composable surface', () => {
		expect(frameworkComposables.length).toBeGreaterThanOrEqual(20)
	})

	for (const route of routes.filter((r) => r.id.startsWith('use-'))) {
		// On failure: `use-…` route maps to a composable that doesn't exist
		// in src/browser/composables/ — fix the route id or the mapping.
		it(`route "${route.id}" maps to real composable(s)`, () => {
			const mapped = composablesForRoute(route.id)
			expect(mapped.length).toBeGreaterThan(0)
			for (const name of mapped) expect(known.has(name)).toBe(true)
		})
	}

	it('every framework composable is demoed by some use-* route', () => {
		const demoed = new Set(useRoutes.flatMap((r) => composablesForRoute(r.id)))
		const undemoed = frameworkComposables.filter((c) => !demoed.has(c))
		expect(undemoed).toEqual([])
	})
})

// ── 3. router ↔ guides ──────────────────────────────────────────────────────

describe('router — guide topology parity', () => {
	// The ROUTE_GROUPS doc-comment maps the nine groups onto these guides.
	for (const guide of [
		'tokens',
		'modifiers',
		'elements',
		'components',
		'surfaces',
		'composables',
	]) {
		it(`guides/${guide}.md (a ROUTE_GROUPS-topology guide) exists`, () => {
			expect(existsSync(resolve(ROOT, `guides/${guide}.md`))).toBe(true)
		})
	}

	it('every framework composable is documented in guides/composables.md', () => {
		const doc = readFileSync(resolve(ROOT, 'guides/composables.md'), 'utf8')
		const undocumented = frameworkComposables.filter((c) => !doc.includes(c))
		expect(undocumented).toEqual([])
	})
})

// ── 4. router ↔ src/styles (chrome-bearing composables are demoed) ──────────

describe('router — every styled composable has a demo route', () => {
	const styleComposables = readdirSync(resolve(ROOT, 'src/styles/composables'))
		.filter((f) => f.startsWith('_') && f.endsWith('.scss'))
		.map((f) => f.replace(/^_/, '').replace(/\.scss$/, ''))
	const routeIds: ReadonlySet<string> = new Set(routes.map((r) => r.id))

	it('discovers the chrome-bearing composable partials', () => {
		expect(styleComposables.length).toBeGreaterThan(0)
	})

	for (const name of styleComposables) {
		// On failure: src/styles/composables/_${name}.scss paints chrome
		// for a composable the showcase never demos — add a `use-${name}`
		// route so the styled surface is visually smoke-tested.
		it(`src/styles/composables/_${name}.scss is demoed by use-${name}`, () => {
			expect(routeIds.has(`use-${name}`)).toBe(true)
		})
	}
})
