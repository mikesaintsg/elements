// ============================================================================
//  app/browser/pages/*.vue — structural uniformity + page↔route↔test parity.
//
//  The pages-suite analogue of tests/guides/README.test.ts: this single
//  meta-driver enforces the uniform `.vue` skeleton across all 43 pages
//  and a TOTAL page↔route↔test bijection — a clean bijection with NO
//  special-case exceptions (the exact bar README.test.ts holds). The
//  declared allow-list maps (PAGE_H1_DEMO / PAGE_EXEMPTIONS / …) live in
//  ./pages/_contract.ts — they are parity-scoping data, never bijection
//  holes.
//
//  Five contract surfaces (plans/phase-1.md §Contract §1–§8):
//
//    1. UNIFORMITY  — one `<script lang="ts" setup>` + one `<template>`;
//                     the script opens with a JSDoc whose first content
//                     line is `{Pascal}Page — {summary}`.
//    2. SKELETON    — the template's first element is
//                     `<section id="{routeId}-intro">` carrying exactly one
//                     `<hgroup><h1>…</h1><p>…</p></hgroup>`; the intro
//                     `<h1>` text equals the route title; exactly one
//                     page-level `<h1>` (PAGE_H1_DEMO pages may render
//                     demo H1s); every `<section>` has a unique id.
//    3. BIJECTION   — every `pages/{X}Page.vue` ↔ exactly one `router.ts`
//                     route ↔ exactly `tests/app/core/pages/{X}Page.test.ts`.
//                     All three directions, no skips, counts equal.
//    4. INLINE-STYLE— no literal `style="…"` in a page except the
//                     showcase.md §2 exemptions (single dimensional
//                     one-off OR a framework-token demo).
//    5. NAMESPACE   — every class authored in `styles/showcase.css` and in
//                     any page `<style>` block starts with `.showcase-`.
//
//  Pure node — `node:fs` reads via tests/setupServer.ts; router.ts is
//  read as TEXT (it imports 43 `.vue`, the idiom router.test.ts uses).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllPages, WORKSPACE_ROOT } from '../../setupServer'
import { INTRO_ID_EXCEPTIONS, PAGE_H1_DEMO } from './pages/_contract'

const pages = readAllPages()
const pageNames = Object.keys(pages).sort()

const routerSource = readFileSync(resolve(WORKSPACE_ROOT, 'app/browser/router.ts'), 'utf8')
const TESTS_PAGES_DIR = resolve(WORKSPACE_ROOT, 'tests/app/core/pages')

// ── Parse the route table out of router.ts ──────────────────────────────────
//
// `import {Var} from './pages/{Page}.vue'` builds Var→Page; each route is
// `const NAME: Route = { id: '…', title: '…', group: '…', page: {Var} }`.

interface ParsedRoute {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: string // page basename, e.g. 'TokensPage'
}

const importMap: ReadonlyMap<string, string> = new Map(
	[...routerSource.matchAll(/import\s+(\w+)\s+from\s+'\.\/pages\/(\w+)\.vue'/g)].map((m) => [
		m[1] as string,
		m[2] as string,
	]),
)

const routes: readonly ParsedRoute[] = [
	...routerSource.matchAll(
		/\bid:\s*'([^']+)'[\s\S]*?\btitle:\s*'([^']+)'[\s\S]*?\bgroup:\s*'([^']+)'[\s\S]*?\bpage:\s*(\w+)/g,
	),
].map((m) => ({
	id: m[1] as string,
	title: m[2] as string,
	group: m[3] as string,
	page: importMap.get(m[4] as string) ?? `?${m[4]}`,
}))

const routeByPage: ReadonlyMap<string, ParsedRoute> = new Map(routes.map((r) => [r.page, r]))

const testFiles: ReadonlySet<string> = new Set(
	(existsSync(TESTS_PAGES_DIR) ? readdirSync(TESTS_PAGES_DIR) : [])
		.filter((f) => f.endsWith('.test.ts'))
		.map((f) => f.replace(/\.test\.ts$/, '')),
)

// ── Tiny .vue parser helpers (text-only, no compiler) ───────────────────────

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
}

function scriptBlock(source: string): string {
	return source.match(/<script\b[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
}

function templateBlock(source: string): string {
	return source.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
}

/** First JSDoc content line, comment punctuation stripped. */
function jsdocFirstLine(script: string): string {
	const block = script.match(/\/\*\*\s*\r?\n\s*\*\s*([^\r\n]*)/)
	return (block?.[1] ?? '').trim()
}

/** Inner text of the first `<h1>` in a markup fragment, decoded + collapsed. */
function firstH1Text(markup: string): string | null {
	const m = markup.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)
	if (!m) return null
	return decodeEntities((m[1] ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

/**
 * Top-level `<section>` open tags only. The pages are tab-formatted, so a
 * direct child of the `<template>` root sits at exactly one leading tab;
 * nested demo sections (a page that *demonstrates* `<section>`) are deeper
 * and are example markup, not page chrome — Contract §5 scopes the
 * unique-id rule to top-level sections.
 */
const topLevelSectionTags = (template: string): readonly string[] =>
	[...template.matchAll(/\n\t<section\b[^>]*>/g)].map((m) => m[0])

/**
 * Class tokens authored by a stylesheet that are NOT `.showcase-`-namespaced.
 * Strips CSS comments, then inspects only SELECTOR text (before each `{`):
 * a selector is a violation when it carries a class token but no
 * `.showcase-` class. Element / attribute / pseudo selectors and framework
 * classes *referenced* under a `.showcase-` scope are fine — only an
 * AUTHORED non-showcase class subject trips it (showcase.md §Contract 4).
 */
function nonNamespacedSelectors(css: string): readonly string[] {
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
	const out: string[] = []
	for (const m of stripped.matchAll(/([^{}]+)\{/g)) {
		const selectorList = (m[1] ?? '').trim().replace(/\s+/g, ' ')
		if (selectorList === '' || selectorList.startsWith('@')) continue
		for (const sel of selectorList.split(',')) {
			const s = sel.trim()
			if (!/\.[A-Za-z_-]/.test(s)) continue // no class token → element/attr/pseudo rule
			if (!/\.showcase-/.test(s)) out.push(s)
		}
	}
	return out
}

// ── 1. UNIFORMITY ───────────────────────────────────────────────────────────

describe('pages — every page ships one `<script lang="ts" setup>` + one `<template>`', () => {
	for (const name of pageNames) {
		// On failure: `app/browser/pages/${name}.vue` must contain exactly one
		// `<script lang="ts" setup>` block and exactly one `<template>` block.
		// The uniform skeleton (the `.vue` analogue of the guide
		// `# Title → > blockquote → ## sections` shape) requires both,
		// exactly once.
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
		// Mirror the guide convention: a scanning agent lands on the file
		// and the first line of the doc names the page. Open the block with
		// `/**` flush to column 0 (no leading space) and start the first
		// `* ` line with `${name} — `.
		it(`${name}.vue — JSDoc first line is "${name} — …"`, () => {
			expect(jsdocFirstLine(scriptBlock(pages[name] ?? ''))).toMatch(
				new RegExp(`^${name} — \\S`),
			)
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
			// `<hgroup>` with one `<h1>` and at least one `<p>`. This is the
			// page analogue of the guide `# Title → > blockquote` opener and
			// drives the right-rail TOC + deep-link anchor.
			expect(route, `${name}.vue has no router.ts route`).toBeDefined()
			const tpl = templateBlock(pages[name] ?? '').replace(/<!--[\s\S]*?-->/g, '')
			const firstTag = tpl.match(/<([a-zA-Z][\w-]*)\b[^>]*>/)
			expect(firstTag?.[1], `${name}.vue template must open with <section>`).toBe('section')
			const introId = tpl.match(/^\s*<section\s+id="([^"]+)"/)?.[1] ?? ''
			// INTRO_ID_EXCEPTIONS is empty by design (the convention is
			// total); an exempt page would compare its id to itself.
			const expectedIntroId = INTRO_ID_EXCEPTIONS.has(name)
				? introId
				: `${route?.id}-intro`
			expect(introId, `${name}.vue intro id`).toBe(expectedIntroId)
			const introInner = tpl.slice(0, tpl.indexOf('</section>'))
			expect((introInner.match(/<hgroup\b/g) ?? []).length, 'one <hgroup>').toBe(1)
			expect((introInner.match(/<h1\b/g) ?? []).length, 'one intro <h1>').toBe(1)
			expect((introInner.match(/<p\b/g) ?? []).length, 'at least one intro <p>').toBeGreaterThan(
				0,
			)
		})
	}
})

describe('pages — intro `<h1>` text equals the route title', () => {
	for (const name of pageNames) {
		const route = routeByPage.get(name)
		// On failure: the intro `<h1>` text (HTML-entity-decoded) does not
		// equal the `router.ts` route `title`. The page hero and the sidebar
		// label must agree — the showcase is the framework's mirror, so a
		// drifting title is a documentation bug. Fix the `<h1>` or the route
		// title so they match exactly.
		it(`${name}.vue — <h1> === route title "${route?.title}"`, () => {
			expect(route).toBeDefined()
			expect(firstH1Text(templateBlock(pages[name] ?? ''))).toBe(route?.title)
		})
	}
})

describe('pages — exactly one page-level `<h1>` (PAGE_H1_DEMO may render demo H1s)', () => {
	for (const name of pageNames) {
		// On failure: the template carries more than one `<h1>` but the page
		// is not in PAGE_H1_DEMO (tests/app/core/pages/_contract.ts). A page
		// has one page-level H1 (the intro). A page that genuinely
		// demonstrates the `<h1>` element (HeadingsPage) is allow-listed
		// there — add it to PAGE_H1_DEMO with a one-line rationale, never a
		// blanket skip.
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
		// On failure: a `<section>` in the template has no `id`, or two
		// sections share an id. `App.vue` builds the right-rail TOC from
		// `section[id]`; a missing/duplicate id breaks deep-linking.
		it(`${name}.vue — section ids present + unique`, () => {
			const tags = topLevelSectionTags(templateBlock(pages[name] ?? ''))
			const ids = tags.map((t) => t.match(/\bid="([^"]+)"/)?.[1] ?? '')
			expect(ids.filter((x) => x === ''), `${name}.vue has an id-less <section>`).toEqual([])
			expect(new Set(ids).size, `${name}.vue has duplicate section ids`).toBe(ids.length)
		})
	}
})

// ── 3. BIJECTION — page ↔ route ↔ test, total, no skips ─────────────────────

describe('pages — every page maps to exactly one route', () => {
	for (const name of pageNames) {
		// On failure: `app/browser/pages/${name}.vue` is not referenced by
		// exactly one `router.ts` route. Every page is reachable by exactly
		// one route — add/fix the route or remove the orphan page.
		it(`${name}.vue → one router.ts route`, () => {
			expect(routes.filter((r) => r.page === name)).toHaveLength(1)
		})
	}
})

describe('pages — every route resolves to a real page file', () => {
	for (const route of routes) {
		// On failure: `router.ts` route "${route.id}" points at a page file
		// that does not exist under `app/browser/pages/`.
		it(`route "${route.id}" → ${route.page}.vue exists`, () => {
			expect(pageNames).toContain(route.page)
		})
	}
})

describe('pages — every page has a dedicated test driver', () => {
	for (const name of pageNames) {
		// On failure: `app/browser/pages/${name}.vue` has no
		// `tests/app/core/pages/${name}.test.ts`. Every page is parity-tested
		// (Phase 2 fills the bespoke body); scaffold the missing driver.
		it(`${name}.vue → tests/app/core/pages/${name}.test.ts exists`, () => {
			expect(testFiles.has(name)).toBe(true)
		})
	}
})

describe('pages — every per-page test maps to a real page + route', () => {
	for (const name of testFiles) {
		// On failure: `tests/app/core/pages/${name}.test.ts` exists but the
		// page or its route is missing. The bijection is total — no skips.
		it(`tests/app/core/pages/${name}.test.ts → page + route exist`, () => {
			expect(pageNames).toContain(name)
			expect(routeByPage.has(name)).toBe(true)
		})
	}
})

describe('pages — counts are equal (total bijection)', () => {
	it('pages === routes === per-page tests', () => {
		expect(pageNames.length).toBe(routes.length)
		expect(testFiles.size).toBe(pageNames.length)
	})
})

// ── 4. INLINE-STYLE — only the showcase.md §2 exemptions ────────────────────
//
// A literal `style="…"` attribute is a violation UNLESS it is one of the
// two exemptions in guides/showcase.md §Contract 2: a SINGLE dimensional
// one-off (`style="width: 18ch"`) OR a framework-token demo (a single
// declaration referencing `var(--set-…)` / `var(--color-…)`). Reactive
// `:style` bindings are not literal `style=` and never match.

const LITERAL_STYLE = /(^|[^:\w])style="([^"]*)"/g
const SIZE_OFFSET_PROP =
	/^(?:inline-size|block-size|width|height|(?:min|max)-(?:inline-size|block-size|width|height)|flex-basis|aspect-ratio|(?:margin|padding|inset)(?:-(?:inline|block))?(?:-(?:start|end))?|top|right|bottom|left|gap|row-gap|column-gap|translate)$/
// An off-Tailwind-scale measurement: a digit followed by a CSS unit, or a
// math / var() function. Bare `0` and unitless values are on Tailwind's
// scale and do NOT earn the dimensional escape hatch (so a chrome reset
// like `padding: 0` is still a violation).
const OFF_SCALE_VALUE = /\d(?:ch|r?em|px|%|vw|vh|dvh|svh|vmin|vmax|fr|deg)|(?:calc|clamp|min|max|var)\(/

/** A declaration is exempt per showcase.md §Contract 2 when it is:
 *  - a framework-token reference demo (`… var(--set-…)` / `var(--color-…)`);
 *  - a custom-property ASSIGNMENT into the `--set-*` / `--color-*`
 *    (token-override demo) or `--showcase-*` (the blessed per-instance
 *    tuning of a `.showcase-*` component, e.g. `--showcase-tile-grid-min`)
 *    namespace;
 *  - an off-scale dimensional one-off (`width: 18ch`). */
function declExempt(decl: string): boolean {
	if (/var\(\s*--(?:set|color)-/.test(decl)) return true
	const [rawProp, ...rest] = decl.split(':')
	const prop = (rawProp ?? '').trim().toLowerCase()
	if (/^--(?:set|color|showcase)-/.test(prop)) return true
	return SIZE_OFFSET_PROP.test(prop) && OFF_SCALE_VALUE.test(rest.join(':'))
}

function inlineStyleViolations(name: string): readonly string[] {
	const out: string[] = []
	for (const m of templateBlock(pages[name] ?? '').matchAll(LITERAL_STYLE)) {
		const value = (m[2] ?? '').trim()
		const decls = value
			.split(';')
			.map((d) => d.trim())
			.filter(Boolean)
		// Exempt only when EVERY declaration is individually a token demo
		// or a dimensional one-off — one layout/chrome decl taints the lot.
		if (decls.length > 0 && decls.every(declExempt)) continue
		out.push(`style="${value}"`)
	}
	return out
}

describe('pages — no inline `style="…"` beyond the showcase.md §2 exemptions', () => {
	for (const name of pageNames) {
		// On failure: the listed `style="…"` attributes are neither a single
		// dimensional one-off nor a framework-token demo (showcase.md
		// §Contract 2). Promote layout/chrome to a framework element +
		// modifier, a Tailwind utility, or a `.showcase-*` class; keep only
		// the two sanctioned escape hatches.
		it(`${name}.vue — inline styles are exempt-only`, () => {
			expect(inlineStyleViolations(name)).toEqual([])
		})
	}
})

// ── 5. NAMESPACE — every authored class starts `.showcase-` ─────────────────

const SHOWCASE_CSS = resolve(WORKSPACE_ROOT, 'app/browser/styles/showcase.css')

describe('pages — showcase.css authors only `.showcase-` classes', () => {
	// On failure: a class-bearing selector in
	// `app/browser/styles/showcase.css` has no `.showcase-` class
	// (showcase.md §Contract 4). The namespace marks the showcase boundary
	// — rename the authored class. (Framework classes referenced under a
	// `.showcase-` scope are fine; comments + declarations are ignored.)
	it('styles/showcase.css — all class selectors namespaced', () => {
		const css = existsSync(SHOWCASE_CSS) ? readFileSync(SHOWCASE_CSS, 'utf8') : ''
		expect(nonNamespacedSelectors(css)).toEqual([])
	})
})

describe('pages — page `<style>` blocks author only `.showcase-` classes', () => {
	for (const name of pageNames) {
		// On failure: a `<style>` block in `app/browser/pages/${name}.vue`
		// has a class-bearing selector with no `.showcase-` class.
		// Page-authored CSS is showcase-only by definition — namespace it
		// (showcase.md §4) or move it to `showcase.css`.
		it(`${name}.vue — scoped styles namespaced`, () => {
			const styles = [...(pages[name] ?? '').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
				.map((m) => m[1] ?? '')
				.join('\n')
			expect(nonNamespacedSelectors(styles)).toEqual([])
		})
	}
})
