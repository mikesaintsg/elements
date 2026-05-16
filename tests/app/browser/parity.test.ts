// ============================================================================
//  app/browser/pages/*.vue ↔ src/browser ↔ src/styles ↔ guides — the
//  single consolidated Phase-2 parity driver (the fused
//  {elements,composables,showcase}.test.ts analogue, scaled to 43 pages).
//
//  ONE file, three describe regions — they share the same scaffolding
//  (barrel `routes` / src registries, the `?raw` globs,
//  `PAGE_SURFACE_BUNDLES`, the resolve-through-bundles helper), so three
//  files would triplicate it:
//
//    1. pages ↔ src/browser   every elements.ts key demoed in page
//                             markup; every factory ↔ a Use*Page FILE;
//                             every COMPONENT/SURFACE/COMPOSABLE_CONTRACTS
//                             key exercised; no orphan page. Bidirectional.
//    2. pages ↔ src/styles    every chrome-bearing components/ + surfaces/
//                             + composables/ partial resolves to a page
//                             that demonstrates it.
//    3. pages ↔ guides        the page-file↔guide edges the route-level
//                             tests/app/core/router.test.ts can't see
//                             (documented-but-removed composable; every
//                             Use*Page's composable is guide-documented).
//
//  Browser project (app:browser): src registries via `@elements/browser`,
//  the route table + page components via the `app/browser` barrel, raw
//  source via `import.meta.glob('…',{query:'?raw'})` — the server-less
//  idiom tests/src/browser uses. Deliberately does NOT duplicate
//  router.test.ts (route↔composable, route-group↔guide) — this is the
//  page-FILE layer.
// ============================================================================

import { describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import {
	COMPONENT_CONTRACTS,
	COMPOSABLE_CONTRACTS,
	SURFACE_CONTRACTS,
	elements,
} from '@elements/browser'
import * as barrel from '../../../app/browser/index.js'
import { routes } from '../../../app/browser'
import { PAGE_EXEMPTIONS, PAGE_SURFACE_BUNDLES } from './pages/_contract'

// ── Raw source globs (browser ?raw — no node fs) ────────────────────────────

const baseName = (p: string): string => p.match(/([^/\\]+)\.[a-z]+$/)?.[1] ?? ''

const pageSources: Record<string, string> = {}
for (const [path, src] of Object.entries(
	import.meta.glob('../../../app/browser/pages/*.vue', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>,
))
	pageSources[baseName(path)] = src
const pageNames = Object.keys(pageSources).sort()

const factoryNames = Object.keys(import.meta.glob('../../../src/browser/factories/create*.ts')).map(
	(p) => baseName(p).replace(/^create/, ''),
)

const stylePartials = (folder: string): readonly string[] =>
	Object.keys(import.meta.glob('../../../src/styles/*/_*.scss'))
		.filter((p) => p.includes(`/styles/${folder}/`))
		.map((p) => baseName(p).replace(/^_/, ''))

const composablesGuide =
	Object.values(
		import.meta.glob('../../../guides/composables.md', {
			query: '?raw',
			import: 'default',
			eager: true,
		}) as Record<string, string>,
	)[0] ?? ''

// ── Barrel: routes + page-component identity ────────────────────────────────

interface RouteLike {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: Component
}
const routeTable = routes as readonly RouteLike[]

const nameByComponent = new Map<unknown, string>()
for (const [key, value] of Object.entries(barrel)) {
	if (key.endsWith('Page')) nameByComponent.set(value, key)
}
const barrelPageNames: ReadonlySet<string> = new Set(nameByComponent.values())
const routePageName = (r: RouteLike): string => nameByComponent.get(r.page) ?? '(unexported)'
const groupByPage = new Map<string, string>(routeTable.map((r) => [routePageName(r), r.group]))

// ── Resolve-through-bundles ─────────────────────────────────────────────────
//
// PAGE_SURFACE_BUNDLES is the source of truth for "one page covers many".
// Everything else resolves by markup presence (the guide-suite idiom:
// elements.test.ts checks a `<tag>` MENTION — decidable, not flaky).

const pageOfArtifact = new Map<string, string>()
for (const [page, arts] of Object.entries(PAGE_SURFACE_BUNDLES))
	for (const a of arts) pageOfArtifact.set(a, page)
const bundledArtifacts: ReadonlySet<string> = new Set(pageOfArtifact.keys())

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const nonExemptPages = pageNames.filter((n) => !PAGE_EXEMPTIONS.has(n))

/** A tag is demonstrated if a bundle owns it or some page uses it in markup. */
function tagDemonstrated(tag: string): boolean {
	if (bundledArtifacts.has(tag)) return true
	const re = new RegExp(`<${tag.replace(/[-]/g, '\\-')}[\\s/>]`)
	return nonExemptPages.some((n) => re.test(pageSources[n] ?? ''))
}

/** A composable is demonstrated if a Use*Page imports it or a bundle owns it. */
function composableDemonstrated(use: string): boolean {
	if (bundledArtifacts.has(use)) return true
	const re = new RegExp(`\\b${use}\\b`)
	return pageNames.some((n) => re.test(pageSources[n] ?? ''))
}

// Attribute-rooted contracts: the rendered usage is an ATTRIBUTE, not a
// `<tag>` or `class=` (e.g. `[role='group']` / `[role='toolbar']`), so the
// tag/class predicates can't see them. One entry today.
const ATTR_ROOTED: Readonly<Record<string, RegExp>> = {
	'role-group': /role="(?:group|toolbar)"/,
}
function attrRootedDemonstrated(key: string): boolean {
	const re = ATTR_ROOTED[key]
	return re !== undefined && nonExemptPages.some((n) => re.test(pageSources[n] ?? ''))
}

// ════════════════════════════════════════════════════════════════════════════
//  1. pages ↔ src/browser
// ════════════════════════════════════════════════════════════════════════════

describe('parity — pages ↔ src/browser', () => {
	it('discovers the registries (vacuous-pass guard)', () => {
		expect(Object.keys(elements).length).toBeGreaterThan(0)
		expect(Object.keys(COMPONENT_CONTRACTS).length).toBeGreaterThan(0)
		expect(Object.keys(SURFACE_CONTRACTS).length).toBeGreaterThan(0)
		expect(Object.keys(COMPOSABLE_CONTRACTS).length).toBeGreaterThan(0)
		expect(factoryNames.length).toBeGreaterThanOrEqual(20)
	})

	// §1 — every substantive elements.ts key is demonstrated in page markup.
	for (const tag of Object.keys(elements)) {
		// On failure: `elements.${tag}` ships but no showcase page uses
		// `<${tag}>` in markup (directly or via a PAGE_SURFACE_BUNDLES
		// owner). Add the demo or the bundle entry.
		it(`element <${tag}> is demonstrated on some page`, () => {
			expect(tagDemonstrated(tag)).toBe(true)
		})
	}

	// §2 — every factory ↔ a Use*Page FILE (router.test does route↔
	// composable; THIS is the page-file edge it never checks).
	for (const name of factoryNames) {
		// On failure: `src/browser/factories/create${name}.ts` has no
		// `Use${cap}Page` barrel export and `use${name}` is not in any
		// PAGE_SURFACE_BUNDLES entry (the useTheme/useButton/useDrag/
		// useDrop bundle cases).
		it(`factory create${name} → a Use*Page (or bundle)`, () => {
			const direct = barrelPageNames.has(`Use${cap(name)}Page`)
			const bundled = bundledArtifacts.has(`use${cap(name)}`)
			expect(direct || bundled).toBe(true)
		})
	}

	// §2 reverse — every Use*Page maps to ≥1 real factory (or bundle).
	for (const page of barrelPageNames) {
		if (!page.startsWith('Use')) continue
		// On failure: `${page}` is a barrel page export with no matching
		// `create*.ts` factory and no PAGE_SURFACE_BUNDLES mapping.
		it(`${page} → a real factory`, () => {
			const stem = page.replace(/^Use/, '').replace(/Page$/, '')
			const direct = factoryNames.some((f) => cap(f) === stem)
			const bundled = (PAGE_SURFACE_BUNDLES[page]?.length ?? 0) > 0
			expect(direct || bundled).toBe(true)
		})
	}

	// §3 — every COMPONENT / SURFACE / COMPOSABLE contract is exercised.
	for (const key of Object.keys(COMPONENT_CONTRACTS)) {
		// On failure: `COMPONENT_CONTRACTS.${key}` chrome is shipped but no
		// page uses `<${key}>` / `class="${key}"` / a bundle owns it.
		it(`COMPONENT_CONTRACTS.${key} is exercised`, () => {
			const tagged = tagDemonstrated(key)
			const classed = nonExemptPages.some((n) =>
				new RegExp(`class="[^"]*\\b${key.replace(/-/g, '\\-')}\\b`).test(pageSources[n] ?? ''),
			)
			expect(tagged || classed || bundledArtifacts.has(key) || attrRootedDemonstrated(key)).toBe(
				true,
			)
		})
	}
	for (const key of Object.keys(SURFACE_CONTRACTS)) {
		// On failure: `SURFACE_CONTRACTS.${key}` surface has no demoing
		// page (resolve via PAGE_SURFACE_BUNDLES — surfaces bundle into
		// PopoverSurfaces / FormSurfaces / ScrollAndTransition).
		it(`SURFACE_CONTRACTS.${key} is exercised`, () => {
			expect(bundledArtifacts.has(key) || tagDemonstrated(key)).toBe(true)
		})
	}
	for (const key of Object.keys(COMPOSABLE_CONTRACTS)) {
		// On failure: `COMPOSABLE_CONTRACTS.${key}` has no
		// `Use${cap}Page` demonstrating its composable.
		it(`COMPOSABLE_CONTRACTS.${key} → Use${cap(key)}Page`, () => {
			expect(
				barrelPageNames.has(`Use${cap(key)}Page`) || composableDemonstrated(`use${cap(key)}`),
			).toBe(true)
		})
	}

	// §4 — no orphan page: every non-exempt page resolves to ≥1 artifact.
	for (const page of nonExemptPages) {
		// On failure: `${page}.vue` demonstrates no elements.ts tag, no
		// contract key, and no composable — it's an orphan. Either it
		// demos something (fix the markup) or it belongs in
		// PAGE_EXEMPTIONS with a one-line rationale.
		it(`${page} resolves to ≥1 registry artifact`, () => {
			const src = pageSources[page] ?? ''
			const usesElement = Object.keys(elements).some((t) =>
				new RegExp(`<${t.replace(/-/g, '\\-')}[\\s/>]`).test(src),
			)
			const usesComposable = /\buse[A-Z]\w+\(/.test(src)
			const bundleOwner = page in PAGE_SURFACE_BUNDLES
			expect(usesElement || usesComposable || bundleOwner).toBe(true)
		})
	}
})

// ════════════════════════════════════════════════════════════════════════════
//  2. pages ↔ src/styles  (chrome-bearing partials are demonstrated)
// ════════════════════════════════════════════════════════════════════════════

describe('parity — pages ↔ src/styles', () => {
	it('discovers the chrome partials', () => {
		expect(stylePartials('components').length).toBeGreaterThan(0)
		expect(stylePartials('surfaces').length).toBeGreaterThan(0)
		expect(stylePartials('composables').length).toBeGreaterThan(0)
	})

	// components/ + surfaces/ partials → a demoing page, resolved through
	// the contract registries / bundles (not raw filenames).
	for (const folder of ['components', 'surfaces'] as const) {
		for (const partial of stylePartials(folder)) {
			// On failure: `src/styles/${folder}/_${partial}.scss` paints
			// chrome no page demonstrates. Add the demo or a
			// PAGE_SURFACE_BUNDLES entry.
			it(`src/styles/${folder}/_${partial}.scss is demonstrated`, () => {
				const tagged = tagDemonstrated(partial)
				const classed = nonExemptPages.some((n) =>
					new RegExp(`class="[^"]*\\b${partial.replace(/-/g, '\\-')}\\b`).test(
						pageSources[n] ?? '',
					),
				)
				expect(
					tagged || classed || bundledArtifacts.has(partial) || attrRootedDemonstrated(partial),
				).toBe(true)
			})
		}
	}

	// composables/ ships chrome for only a 6-partial subset (behaviour-
	// only composables ship NO chrome — useFocus/usePointer/etc.). Each
	// chrome partial maps to its Use*Page (router.test does the route
	// edge; this does the page-file edge).
	for (const partial of stylePartials('composables')) {
		// On failure: `src/styles/composables/_${partial}.scss` chrome
		// has no `Use${cap}Page`.
		it(`src/styles/composables/_${partial}.scss → Use${cap(partial)}Page`, () => {
			expect(
				barrelPageNames.has(`Use${cap(partial)}Page`) ||
					composableDemonstrated(`use${cap(partial)}`),
			).toBe(true)
		})
	}
})

// ════════════════════════════════════════════════════════════════════════════
//  3. pages ↔ guides  (the page-file↔guide edges router.test.ts misses)
// ════════════════════════════════════════════════════════════════════════════

describe('parity — pages ↔ guides', () => {
	it('loaded composables.md', () => {
		expect(composablesGuide.length).toBeGreaterThan(100)
	})

	// Inverse of router.test.ts's coverage check: every `use{Name}`
	// NAMED in composables.md must resolve to a real
	// `src/browser/composables/use{Name}.ts` (a documented-but-removed
	// composable — the audit's class of bug — slips past the existing
	// guide parity, which only checks the forward direction).
	// Scope to the STRUCTURED per-composable reference rows
	// (`| \`useName\` | … |`) — NOT free prose, which mentions
	// non-composables like `useReducedMotion` ("deliberately not shipped")
	// or `useCapture` (the DOM addEventListener option).
	const documentedUses = [
		...new Set([...composablesGuide.matchAll(/^\|\s*`use([A-Z]\w+)`/gm)].map((m) => m[1])),
	]
	const realComposables = new Set(factoryNames.map(cap))
	for (const name of documentedUses) {
		// On failure: `guides/composables.md` documents `use${name}` but
		// `src/browser/factories/create${name}.ts` does not exist —
		// either the composable was removed (strike the guide) or the
		// name drifted.
		it(`composables.md use${name} → a real factory`, () => {
			expect(realComposables.has(name ?? '')).toBe(true)
		})
	}

	// Every Use*Page's composable must be guide-documented (page-file
	// anchored — router.test anchors off the route literal).
	for (const page of barrelPageNames) {
		if (!page.startsWith('Use')) continue
		const stem = page.replace(/^Use/, '').replace(/Page$/, '')
		// On failure: `${page}.vue` exists but `use${stem}` is not
		// mentioned anywhere in `guides/composables.md` — the showcase
		// demos a composable the guide never documents.
		it(`${page} → use${stem} documented in composables.md`, () => {
			const bundle = PAGE_SURFACE_BUNDLES[page]
			const names = bundle?.length ? bundle : [`use${stem}`]
			expect(names.some((n) => composablesGuide.includes(n))).toBe(true)
		})
	}

	// Page-file ↔ ROUTE_GROUPS topology (every non-exempt page sits in a
	// real group — bijection is pages.test.ts's job; this asserts the
	// group is a known one, page-file anchored).
	for (const page of nonExemptPages) {
		it(`${page} belongs to a known route group`, () => {
			expect(typeof groupByPage.get(page)).toBe('string')
		})
	}
})
