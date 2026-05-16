// ============================================================================
//  app/browser/pages/*.vue — structural uniformity + page↔route↔test parity.
//
//  The pages-suite analogue of tests/guides/README.test.ts, run in the
//  BROWSER project (app:browser) — the same way tests/src/browser /
//  tests/src/styles parity-test against the real Vite graph WITHOUT a
//  node server:
//
//    • component surface   — imported from the `app/browser` barrel
//                            (`export { default as TokensPage } …`), so
//                            the route table + every page resolve as real
//                            modules (the Vue SFC compiler is active here).
//    • raw `.vue` source   — `import.meta.glob('…/*.vue', { query:'?raw' })`
//                            (identical idiom to the `*.scss?raw` globs in
//                            tests/src/browser/tokens.test.ts) for the
//                            structural-skeleton checks.
//    • per-page test files — `import.meta.glob('./pages/*.test.ts')` keys
//                            (the browser-safe `readdirSync` equivalent)
//                            for the total bijection.
//
//  Contract (guides/showcase.md §Contract): UNIFORMITY, SKELETON, total
//  BIJECTION (page ↔ route ↔ barrel export ↔ test), INLINE-STYLE,
//  NAMESPACE. A clean bijection with NO special-case exceptions — the
//  exact bar README.test.ts holds.
// ============================================================================

import { describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import * as barrel from '../../../app/browser/index.js'
import { routes } from '../../../app/browser'
import { INTRO_ID_EXCEPTIONS, PAGE_H1_DEMO, REMOVED_FRAMEWORK_MODIFIERS } from './pages/_contract'
import { classNameIsSanctioned, componentNamespacesFromPaths } from '../../setup'

// ── Raw page sources (browser ?raw glob — no node:fs) ───────────────────────

const rawSources = import.meta.glob('../../../app/browser/pages/*.vue', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function baseName(path: string): string {
	return path.match(/([^/\\]+)\.vue$/)?.[1] ?? ''
}

const pages: Record<string, string> = {}
for (const [path, source] of Object.entries(rawSources)) pages[baseName(path)] = source
const pageNames = Object.keys(pages).sort()

// ── Per-page test files (browser-safe directory listing) ────────────────────

const testModules = import.meta.glob('./pages/*.test.ts')
const testFiles: ReadonlySet<string> = new Set(
	Object.keys(testModules).map((p) => p.match(/([^/\\]+)\.test\.ts$/)?.[1] ?? ''),
)

// ── Route table + barrel page exports (real modules, no regex parse) ────────

interface RouteLike {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: Component
}
const routeTable = routes as readonly RouteLike[]

// Every `*Page` named export the barrel surfaces → component identity map.
const nameByComponent = new Map<unknown, string>()
for (const [key, value] of Object.entries(barrel)) {
	if (key.endsWith('Page')) nameByComponent.set(value, key)
}
const barrelPageNames: ReadonlySet<string> = new Set(nameByComponent.values())

function routePageName(route: RouteLike): string {
	return nameByComponent.get(route.page) ?? '(unexported component)'
}
const routeByPage = new Map<string, RouteLike>(routeTable.map((r) => [routePageName(r), r]))

// ── Tiny .vue text helpers (pure string ops) ────────────────────────────────

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
}
const scriptBlock = (s: string): string =>
	s.match(/<script\b[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
const templateBlock = (s: string): string => s.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
const jsdocFirstLine = (script: string): string =>
	(script.match(/\/\*\*\s*\r?\n\s*\*\s*([^\r\n]*)/)?.[1] ?? '').trim()
function firstH1Text(markup: string): string | null {
	const m = markup.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)
	return m
		? decodeEntities((m[1] ?? '').replace(/<[^>]+>/g, ''))
				.replace(/\s+/g, ' ')
				.trim()
		: null
}
const topLevelSectionTags = (template: string): readonly string[] =>
	[...template.matchAll(/\n\t<section\b[^>]*>/g)].map((m) => m[0])

function nonNamespacedSelectors(css: string): readonly string[] {
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
	const out: string[] = []
	for (const m of stripped.matchAll(/([^{}]+)\{/g)) {
		const selectorList = (m[1] ?? '').trim().replace(/\s+/g, ' ')
		if (selectorList === '' || selectorList.startsWith('@')) continue
		for (const sel of selectorList.split(',')) {
			const s = sel.trim()
			if (!/\.[A-Za-z_-]/.test(s)) continue
			if (!/\.showcase-/.test(s)) out.push(s)
		}
	}
	return out
}

const SIZE_OFFSET_PROP =
	/^(?:inline-size|block-size|width|height|(?:min|max)-(?:inline-size|block-size|width|height)|flex-basis|aspect-ratio|(?:margin|padding|inset)(?:-(?:inline|block))?(?:-(?:start|end))?|top|right|bottom|left|gap|row-gap|column-gap|translate)$/
const OFF_SCALE_VALUE =
	/\d(?:ch|r?em|px|%|vw|vh|dvh|svh|vmin|vmax|fr|deg)|(?:calc|clamp|min|max|var)\(/

function declExempt(decl: string): boolean {
	if (/var\(\s*--(?:set|color)-/.test(decl)) return true
	const [rawProp, ...rest] = decl.split(':')
	const prop = (rawProp ?? '').trim().toLowerCase()
	if (/^--(?:set|color|showcase)-/.test(prop)) return true
	return SIZE_OFFSET_PROP.test(prop) && OFF_SCALE_VALUE.test(rest.join(':'))
}

/**
 * Split a `style="…"` value into declarations on top-level `;` only —
 * a `;` inside `url(...)` / `calc(...)` or a quoted string (e.g. a
 * `data:image/svg+xml;utf8,…` URI) is NOT a declaration separator.
 */
function splitDeclarations(value: string): string[] {
	const out: string[] = []
	let depth = 0
	let quote = ''
	let start = 0
	for (let i = 0; i < value.length; i += 1) {
		const ch = value[i]
		if (quote) {
			if (ch === quote) quote = ''
		} else if (ch === '"' || ch === "'") quote = ch
		else if (ch === '(') depth += 1
		else if (ch === ')') depth = Math.max(0, depth - 1)
		else if (ch === ';' && depth === 0) {
			out.push(value.slice(start, i).trim())
			start = i + 1
		}
	}
	out.push(value.slice(start).trim())
	return out.filter(Boolean)
}

// Real element start-tags only. A `style="…"` is an applied inline
// style ONLY when it is an attribute on an actual `<tag …>` start tag —
// NOT `style="…"` text inside an escaped `<pre><code>` snippet
// (`&lt;td style="…"&gt;`) or a prose placeholder (`<code>style="…"</code>`).
// Escaped snippet text uses `&lt;`/`&gt;`, so it never matches `<tag>`.
const START_TAG = /<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/g
const TAG_STYLE_ATTR = /(?:^|[^:\w-])style="([^"]*)"/

function inlineStyleViolations(name: string): readonly string[] {
	const out: string[] = []
	for (const tag of templateBlock(pages[name] ?? '').match(START_TAG) ?? []) {
		const value = tag.match(TAG_STYLE_ATTR)?.[1]?.trim()
		if (value === undefined) continue
		const decls = splitDeclarations(value)
		if (decls.length > 0 && decls.every(declExempt)) continue
		out.push(`style="${value}"`)
	}
	return out
}

// ── 1. UNIFORMITY ───────────────────────────────────────────────────────────

describe('pages — every page ships one `<script lang="ts" setup>` + one `<template>`', () => {
	for (const name of pageNames) {
		// On failure: `app/browser/pages/${name}.vue` must contain exactly
		// one `<script lang="ts" setup>` and one `<template>` block.
		it(`${name}.vue — exactly one setup script + one template`, () => {
			const src = pages[name] ?? ''
			expect((src.match(/<script\b[^>]*\bsetup\b/g) ?? []).length).toBe(1)
			expect((src.match(/<template>/g) ?? []).length).toBe(1)
			expect(/<script lang="ts" setup>/.test(src)).toBe(true)
		})
	}
})

describe('pages — every script opens with a `{Page} — …` JSDoc', () => {
	for (const name of pageNames) {
		// On failure: the first JSDoc content line in
		// `app/browser/pages/${name}.vue` is not `${name} — {summary}`.
		// Open `/**` flush to column 0; start the first `* ` line with
		// `${name} — `.
		it(`${name}.vue — JSDoc first line is "${name} — …"`, () => {
			expect(jsdocFirstLine(scriptBlock(pages[name] ?? ''))).toMatch(new RegExp(`^${name} — \\S`))
		})
	}
})

// ── 2. SKELETON ─────────────────────────────────────────────────────────────

describe('pages — template opens with the intro `<section>` skeleton', () => {
	for (const name of pageNames) {
		const route = routeByPage.get(name)
		it(`${name}.vue — first element is <section id="…-intro"> with one <hgroup><h1><p>`, () => {
			// On failure: the `<template>`'s first element child is not
			// `<section id="{routeId}-intro">` containing exactly one
			// `<hgroup>` with one `<h1>` and ≥1 `<p>`.
			expect(route, `${name}.vue has no router.ts route`).toBeDefined()
			const tpl = templateBlock(pages[name] ?? '').replace(/<!--[\s\S]*?-->/g, '')
			expect(tpl.match(/<([a-zA-Z][\w-]*)\b[^>]*>/)?.[1], `${name}.vue opens with`).toBe('section')
			const introId = tpl.match(/^\s*<section\s+id="([^"]+)"/)?.[1] ?? ''
			const expectedIntroId = INTRO_ID_EXCEPTIONS.has(name) ? introId : `${route?.id}-intro`
			expect(introId, `${name}.vue intro id`).toBe(expectedIntroId)
			const introInner = tpl.slice(0, tpl.indexOf('</section>'))
			expect((introInner.match(/<hgroup\b/g) ?? []).length, 'one <hgroup>').toBe(1)
			expect((introInner.match(/<h1\b/g) ?? []).length, 'one intro <h1>').toBe(1)
			expect((introInner.match(/<p\b/g) ?? []).length, '≥1 intro <p>').toBeGreaterThan(0)
		})
	}
})

describe('pages — intro `<h1>` text equals the route title', () => {
	for (const name of pageNames) {
		const route = routeByPage.get(name)
		// On failure: the intro `<h1>` text (entity-decoded) ≠ the route
		// `title`. The page hero and the sidebar label must agree.
		it(`${name}.vue — <h1> === route title "${route?.title}"`, () => {
			expect(route).toBeDefined()
			expect(firstH1Text(templateBlock(pages[name] ?? ''))).toBe(route?.title)
		})
	}
})

describe('pages — exactly one page-level `<h1>` (PAGE_H1_DEMO may render demo H1s)', () => {
	for (const name of pageNames) {
		// On failure: >1 `<h1>` but the page is not in PAGE_H1_DEMO
		// (tests/app/browser/pages/_contract.ts). Allow-list it there with
		// a one-line rationale — never a blanket skip.
		it(`${name}.vue — H1 count`, () => {
			const count = (templateBlock(pages[name] ?? '').match(/<h1\b/g) ?? []).length
			const demo = PAGE_H1_DEMO.has(name)
			expect(
				demo ? count >= 1 : count === 1,
				`${name}.vue has ${count} <h1> — expected ${demo ? '≥1 (PAGE_H1_DEMO)' : 'exactly 1 (the intro)'}`,
			).toBe(true)
		})
	}
})

describe('pages — every `<section>` carries a unique id (the TOC contract)', () => {
	for (const name of pageNames) {
		// On failure: a top-level `<section>` has no `id`, or two share one.
		// `App.vue` builds the right-rail TOC from `section[id]`.
		it(`${name}.vue — top-level section ids present + unique`, () => {
			const ids = topLevelSectionTags(templateBlock(pages[name] ?? '')).map(
				(t) => t.match(/\bid="([^"]+)"/)?.[1] ?? '',
			)
			expect(
				ids.filter((x) => x === ''),
				`${name}.vue has an id-less <section>`,
			).toEqual([])
			expect(new Set(ids).size, `${name}.vue duplicate section ids`).toBe(ids.length)
		})
	}
})

// ── 3. BIJECTION — page ↔ route ↔ barrel export ↔ test, total ───────────────

describe('pages — every page is a named export of the app/browser barrel', () => {
	for (const name of pageNames) {
		// On failure: `app/browser/pages/${name}.vue` is not surfaced as
		// `export { default as ${name} } from './pages/${name}.vue'` in
		// `app/browser/index.ts`. The barrel is the single public surface.
		it(`${name}.vue → barrel exports ${name}`, () => {
			expect(barrelPageNames.has(name)).toBe(true)
			expect((barrel as Record<string, unknown>)[name]).toBeDefined()
		})
	}
})

describe('pages — every page maps to exactly one route', () => {
	for (const name of pageNames) {
		// On failure: `${name}.vue` is referenced by ≠1 `router.ts` route.
		it(`${name}.vue → one route`, () => {
			expect(routeTable.filter((r) => routePageName(r) === name)).toHaveLength(1)
		})
	}
})

describe('pages — every route resolves to a real, barrel-exported page', () => {
	for (const route of routeTable) {
		// On failure: route "${route.id}"'s `page` component is not one of
		// the barrel's `*Page` exports / has no `.vue` source.
		it(`route "${route.id}" → a real page`, () => {
			const name = routePageName(route)
			expect(pageNames).toContain(name)
			expect(barrelPageNames.has(name)).toBe(true)
		})
	}
})

describe('pages — every page has a dedicated test driver', () => {
	for (const name of pageNames) {
		// On failure: `${name}.vue` has no
		// `tests/app/browser/pages/${name}.test.ts`. Phase 2 fills the
		// bespoke body; the file must exist now (total bijection).
		it(`${name}.vue → tests/app/browser/pages/${name}.test.ts exists`, () => {
			expect(testFiles.has(name)).toBe(true)
		})
	}
})

describe('pages — every per-page test maps to a real page + route', () => {
	for (const name of testFiles) {
		// On failure: `tests/app/browser/pages/${name}.test.ts` exists but
		// the page or its route is missing. The bijection is total.
		it(`pages/${name}.test.ts → page + route exist`, () => {
			expect(pageNames).toContain(name)
			expect(routeByPage.has(name)).toBe(true)
		})
	}
})

describe('pages — counts are equal (total bijection)', () => {
	it('pages === routes === barrel exports === per-page tests', () => {
		expect(pageNames.length).toBe(routeTable.length)
		expect(barrelPageNames.size).toBe(pageNames.length)
		expect(testFiles.size).toBe(pageNames.length)
	})
})

// ── 4. INLINE-STYLE — only the showcase.md §2 exemptions ────────────────────

describe('pages — no inline `style="…"` beyond the showcase.md §2 exemptions', () => {
	for (const name of pageNames) {
		// On failure: the listed `style="…"` are neither a token demo nor
		// an off-scale dimensional one-off (showcase.md §Contract 2).
		// Promote to a framework element + modifier, a Tailwind utility,
		// or a `.showcase-*` class.
		it(`${name}.vue — inline styles are exempt-only`, () => {
			expect(inlineStyleViolations(name)).toEqual([])
		})
	}
})

// ── 5. NAMESPACE — every authored class starts `.showcase-` ─────────────────

const showcaseCss = import.meta.glob('../../../app/browser/styles/showcase.css', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

describe('pages — showcase.css authors only `.showcase-` classes', () => {
	// On failure: a class-bearing selector in `styles/showcase.css` has no
	// `.showcase-` class (showcase.md §Contract 4).
	it('styles/showcase.css — all class selectors namespaced', () => {
		const css = Object.values(showcaseCss)[0] ?? ''
		expect(nonNamespacedSelectors(css)).toEqual([])
	})
})

describe('pages — page `<style>` blocks author only `.showcase-` classes', () => {
	for (const name of pageNames) {
		// On failure: a `<style>` block in `${name}.vue` has a class-bearing
		// selector with no `.showcase-` class. Page-authored CSS is
		// showcase-only — namespace it (showcase.md §4) or move to
		// showcase.css.
		it(`${name}.vue — scoped styles namespaced`, () => {
			const styles = [...(pages[name] ?? '').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
				.map((m) => m[1] ?? '')
				.join('\n')
			expect(nonNamespacedSelectors(styles)).toEqual([])
		})
	}
})

// ── 6. SINGLE-WORD MODIFIERS — showcase enforcement ─────────────────────────
//
// guides/modifiers.md §Anti-rules: framework modifier classes are a single
// word. The framework side is policed by tests/{guides,src/styles}; here we
// stop the SHOWCASE from (a) applying a renamed/removed modifier name, or
// (b) applying a current framework class that isn't single-word/sanctioned.
// Tailwind utilities + `.showcase-` classes are NOT framework classes, so
// they never enter the framework-class set — no Tailwind parser needed.

const frameworkScss = import.meta.glob('../../../src/styles/**/*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const FW_CLASS_RE = /(?:^|[\s,&:>~+(])\.([a-z][a-zA-Z0-9_-]*)\b/gm
const frameworkClasses = new Set<string>()
for (const source of Object.values(frameworkScss)) {
	const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
	for (const m of stripped.matchAll(FW_CLASS_RE)) if (m[1]) frameworkClasses.add(m[1])
}
const fwComponentNames = componentNamespacesFromPaths(Object.keys(frameworkScss))

/** Tokens from every `class="…"` / `:class="…"` attribute on a page. */
function classAttrTokens(template: string): readonly string[] {
	const out: string[] = []
	for (const m of template.matchAll(/:?class="([^"]*)"/g)) {
		for (const tok of (m[1] ?? '').split(/[\s'"`{}:?]+/)) {
			if (/^[a-z][a-zA-Z0-9_-]*$/.test(tok)) out.push(tok)
		}
	}
	return out
}

describe('pages — no page applies a removed framework modifier name', () => {
	for (const name of pageNames) {
		// On failure: `${name}.vue` still applies a framework modifier class
		// that was renamed for the single-word convention — switch to the
		// replacement (see REMOVED_FRAMEWORK_MODIFIERS in
		// tests/app/browser/pages/_contract.ts; guides/modifiers.md
		// §Anti-rules).
		it(`${name}.vue — no renamed/removed modifier classes`, () => {
			const used = new Set(classAttrTokens(templateBlock(pages[name] ?? '')))
			const offenders = [...REMOVED_FRAMEWORK_MODIFIERS]
				.filter(([old]) => used.has(old))
				.map(([old, now]) => `${old} → use .${now}`)
			expect(offenders).toEqual([])
		})
	}
})

describe('pages — framework classes the showcase applies are single-word/sanctioned', () => {
	it('discovers the framework class surface', () => {
		expect(frameworkClasses.size).toBeGreaterThan(0)
		expect(fwComponentNames.size).toBeGreaterThan(0)
	})

	for (const name of pageNames) {
		// On failure: `${name}.vue` applies a multi-word class that IS a
		// framework class but is not single-word/sanctioned (placement
		// corner / component-namespaced / showcase-). Tailwind + showcase-
		// tokens are ignored (not framework classes). guides/modifiers.md
		// §Anti-rules.
		it(`${name}.vue — applied framework modifiers comply`, () => {
			const offenders = classAttrTokens(templateBlock(pages[name] ?? ''))
				.filter((t) => t.includes('-') && frameworkClasses.has(t))
				.filter((t) => !classNameIsSanctioned(t, fwComponentNames))
			expect([...new Set(offenders)]).toEqual([])
		})
	}
})
