// ============================================================================
//  guides/showcase.md ↔ app/browser/{types,router}.ts
//
//  The showcase guide documents the canonical sidebar-group order
//  (`ROUTE_GROUPS`). Two parity directions:
//
//    1. ROUTE_GROUPS ↔ DOC. Every entry in `ROUTE_GROUPS`
//       (app/browser/types.ts) is documented as a backticked row in the
//       showcase.md "Route groups" table, and every documented group is
//       a real `ROUTE_GROUPS` entry. Order matters — the array IS the
//       declared sidebar order; the doc table mirrors it.
//
//    2. ROUTER ⊆ ROUTE_GROUPS. Every `group: '…'` literal assigned in
//       app/browser/router.ts is a member of `ROUTE_GROUPS`. (TypeScript
//       enforces this at compile time via the `RouteGroup` type; this
//       test is the node-env backstop + catches a drifted doc.)
//
//  Pure node — sources read as text (the app files import from `vue`,
//  so importing them in the node-env guides project would need Vue
//  resolution; parsing the source is the same idiom the other guide
//  tests use for `.scss` / `.ts` introspection).
// ============================================================================

import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const typesSource = readFileSync(resolvePath(WORKSPACE_ROOT, 'app/browser/types.ts'), 'utf8')
const routerSource = readFileSync(resolvePath(WORKSPACE_ROOT, 'app/browser/router.ts'), 'utf8')
const showcaseDoc = readGuide('showcase')

// ── Extract ROUTE_GROUPS from app/browser/types.ts ──────────────────────────

/** Pull the string-literal entries out of the `ROUTE_GROUPS` array. */
function routeGroupsFromSource(source: string): readonly string[] {
	const block = source.match(/export const ROUTE_GROUPS = \[([\s\S]*?)\] as const/)
	if (!block || !block[1]) throw new Error('ROUTE_GROUPS array not found in app/browser/types.ts')
	const out: string[] = []
	const regex = /'([^']+)'/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(block[1])) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// Group names in the showcase.md "Route groups" table appear as the
// FIRST cell of each row, backtick-quoted: `| \`Getting started\` | … |`.
// The em-dash variants (`Elements — Interactive`) carry a real U+2014.
function documentedGroups(doc: string): readonly string[] {
	const out: string[] = []
	const regex = /^\|\s*`([^`]+)`\s*\|/gm
	let match: RegExpExecArray | null
	while ((match = regex.exec(doc)) !== null) {
		const name = match[1]?.trim()
		// Only the route-group rows look like a group name; the other
		// backticked first-cells in showcase.md tables are file paths
		// (`app/browser/index.html`) or contain a slash. Group names are
		// plain words / em-dash compounds, never a path.
		if (name && !name.includes('/') && !name.includes('.')) out.push(name)
	}
	return out
}

const ROUTE_GROUPS = routeGroupsFromSource(typesSource)
const DOC_GROUPS = documentedGroups(showcaseDoc)

// ── 1. ROUTE_GROUPS ↔ doc parity ────────────────────────────────────────────

describe('showcase — ROUTE_GROUPS is documented in showcase.md', () => {
	it('has at least the 9 known groups', () => {
		expect(ROUTE_GROUPS.length).toBeGreaterThanOrEqual(9)
	})

	for (const group of ROUTE_GROUPS) {
		// On failure: `${group}` is in `app/browser/types.ts § ROUTE_GROUPS`
		// but not documented as a backticked row in the showcase.md
		// "Route groups" table. Add the row (or fix the doc).
		it(`ROUTE_GROUPS["${group}"] appears in guides/showcase.md`, () => {
			expect(DOC_GROUPS).toContain(group)
		})
	}
})

describe('showcase — every documented route group is a real ROUTE_GROUPS entry', () => {
	const known = new Set(ROUTE_GROUPS)
	for (const group of DOC_GROUPS) {
		// On failure: `guides/showcase.md` documents the route group
		// `${group}` but it's not in `ROUTE_GROUPS`. Either it's a stale
		// doc entry, or `types.ts` is missing the group.
		it(`"${group}" (documented) exists in ROUTE_GROUPS`, () => {
			expect(known.has(group)).toBe(true)
		})
	}
})

// ── 2. router.ts groups ⊆ ROUTE_GROUPS ──────────────────────────────────────

describe('showcase — every router.ts route group is a ROUTE_GROUPS member', () => {
	const known = new Set(ROUTE_GROUPS)
	const used = new Set<string>()
	const regex = /\bgroup:\s*'([^']+)'/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(routerSource)) !== null) {
		if (match[1]) used.add(match[1])
	}

	it('discovers at least one route group assignment', () => {
		expect(used.size).toBeGreaterThan(0)
	})

	for (const group of used) {
		// On failure: a `Route` in app/browser/router.ts is assigned
		// `group: '${group}'` which is NOT in `ROUTE_GROUPS`. The
		// `RouteGroup` type should already reject this at compile time —
		// if this test fails, either the type was widened or the source
		// regex caught a false positive.
		it(`router group "${group}" is in ROUTE_GROUPS`, () => {
			expect(known.has(group)).toBe(true)
		})
	}

	it('every ROUTE_GROUPS member is used by at least one route', () => {
		const orphans = ROUTE_GROUPS.filter((g) => !used.has(g))
		expect(orphans).toEqual([])
	})
})
