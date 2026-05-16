// ============================================================================
// Tailwind interop — two layers of integration with Tailwind v4:
//
//   1. UTILITIES COMPOSE — modifier classes and Tailwind utilities cohabit
//      cleanly when applied to the same element. A Tailwind utility (later
//      cascade layer) should be able to override a framework modifier when
//      they target the same property.
//
//   2. NO SILENT CASCADE COLLISIONS — every framework SCSS partial is
//      scanned for class selectors; none may share a name with a
//      Tailwind v4 bare-name utility. (The framework lives in
//      `@layer components` / `elements`; Tailwind in `@layer utilities`,
//      the last layer in our merged order. A name collision means the
//      framework rule loses every cascade fight, silently.) The Tailwind
//      bare-name catalog lives in `tests/setupStyles.ts` next to the
//      runtime helpers.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	TAILWIND_SINGLE_TOKEN_UTILITIES,
	classNameIsSanctioned,
	componentNamespacesFromPaths,
} from '../../setup.ts'
import { pixels, render, style } from '../../setupStyles.ts'

// ----------------------------------------------------------------------------
// Glob every framework SCSS partial as a raw string at build time. Vite's
// `?raw` query returns the file contents; `eager: true` resolves the imports
// synchronously so the scan runs at module-eval time.
// ----------------------------------------------------------------------------
const scssSources = import.meta.glob('../../../src/styles/**/*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

// ----------------------------------------------------------------------------
// Extract every class-token introduced as a SELECTOR (not consumed via
// utility composition). We're after patterns like:
//
//   .foo { ... }
//   .foo, .bar { ... }
//   &.foo { ... }
//   element.foo { ... }
//
// Comments are stripped first (so `// .form-group` in prose doesn't count);
// then a regex finds class tokens that appear at the START of a selector
// segment.
// ----------------------------------------------------------------------------
function extractFrameworkModifiers(scss: string): Set<string> {
	const stripped = scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
	const found = new Set<string>()
	const re = /(?:^|[\s,&:>~+(])\.([a-z][a-zA-Z0-9_-]*)\b/gm
	for (const match of stripped.matchAll(re)) {
		found.add(match[1])
	}
	return found
}

// Build the global "every class token the framework introduces" map once,
// keyed by class name → list of files that declare it.
const frameworkModifiers: Map<string, string[]> = (() => {
	const out = new Map<string, string[]>()
	for (const [path, source] of Object.entries(scssSources)) {
		for (const token of extractFrameworkModifiers(source)) {
			const list = out.get(token) ?? []
			list.push(path)
			out.set(token, list)
		}
	}
	return out
})()

const tailwindBareUtilities = new Set(TAILWIND_SINGLE_TOKEN_UTILITIES)

describe('Tailwind v4 utilities compose with framework modifiers', () => {
	it('a Tailwind margin utility (.m-4) applies on top of .primary', () => {
		const btn = render('button', 'primary m-4')
		// .m-4 → margin: calc(var(--spacing) * 4) = 1rem ≈ 16px
		expect(pixels(btn, 'margin-top')).toBeGreaterThan(0)
		expect(pixels(btn, 'margin-left')).toBeGreaterThan(0)
	})

	it('a Tailwind shadow utility (.shadow-lg) applies on top of .primary', () => {
		const btn = render('button', 'primary shadow-lg')
		const shadow = style(btn, 'box-shadow')
		expect(shadow).not.toBe('none')
		expect(shadow.length).toBeGreaterThan(0)
	})

	it('a Tailwind background utility wins over a variant background', () => {
		// Tailwind utilities live in @layer utilities (highest); variants in
		// @layer modifiers. A Tailwind .bg-red-500 should beat .primary.
		const variantOnly = render('button', 'primary')
		const overridden = render('button', 'primary bg-red-500')
		const variantBg = style(variantOnly, 'background-color')
		const overriddenBg = style(overridden, 'background-color')
		// Tailwind v4 emits colors in oklch() so a numeric channel comparison
		// is brittle; assert simply that the utility produced a different
		// computed background-color than the bare variant.
		expect(overriddenBg).not.toBe(variantBg)
		expect(overriddenBg.length).toBeGreaterThan(0)
	})
})

describe('Tailwind v4 utility ↔ framework modifier conflicts', () => {
	it('no framework modifier shares a name with a Tailwind bare-name utility', () => {
		const conflicts: Array<{ modifier: string; files: string[] }> = []
		for (const [modifier, files] of frameworkModifiers) {
			if (tailwindBareUtilities.has(modifier)) {
				conflicts.push({ modifier, files })
			}
		}

		// Throw a descriptive error so the failure points at exactly which
		// modifier collides and where it's declared (a plain
		// `expect(conflicts).toEqual([])` produces an unhelpful diff).
		if (conflicts.length > 0) {
			const detail = conflicts
				.map((c) => `  .${c.modifier} declared in ${c.files.join(', ')}`)
				.join('\n')
			throw new Error(
				`Found ${conflicts.length} framework modifier(s) colliding with Tailwind utilities:\n${detail}`,
			)
		}
		expect(conflicts).toEqual([])
	})

	it('the Tailwind catalog contains the well-known bare utilities we expect', () => {
		// Spot-check that the catalog hasn't been accidentally emptied. If
		// these specific utilities ever leave Tailwind, this test (and the
		// whole conflict surface) needs revisiting.
		const mustContain = ['inline', 'block', 'flex', 'grid', 'hidden', 'container', 'rounded']
		for (const name of mustContain) {
			expect(tailwindBareUtilities.has(name)).toBe(true)
		}
	})

	it('the framework SCSS scan finds at least the canonical modifier set', () => {
		// Sanity check: if the scanner regressed and returns an empty set,
		// the conflict assertion above would pass vacuously. Verify the scan
		// picks up known framework modifiers. These are all BARE-name
		// dimension modifiers (`.primary` / `.small` / …) — the only kind
		// the Tailwind-conflict scan targets. Element-LOCAL modifiers
		// (`form.row`, `button.dropdown`, `details.flush`) are element-
		// scoped compounds by charter, deliberately NOT bare names, so they
		// don't appear here and can't collide with a Tailwind bare utility
		// (this is why `.row` is absent: it is now the element-scoped
		// `form.row` in modifiers/_local.scss, not a bare `.row`).
		const mustFind = ['primary', 'small', 'large', 'subtle', 'filled', 'disabled']
		for (const name of mustFind) {
			expect(frameworkModifiers.has(name)).toBe(true)
		}
	})
})

// ============================================================================
//  Single-word-modifier convention (guides/modifiers.md §Anti-rules)
// ============================================================================

describe('single-word modifiers — framework class names are one word', () => {
	const componentNames = componentNamespacesFromPaths(Object.keys(scssSources))

	it('discovers the component/composable namespaces', () => {
		// Vacuous-pass guard: the exemption set must be non-empty.
		expect(componentNames.size).toBeGreaterThan(0)
		expect(componentNames.has('select')).toBe(true)
		expect(componentNames.has('carousel')).toBe(true)
	})

	const multiWord = [...frameworkModifiers.keys()].filter((c) => c.includes('-')).sort()

	for (const cls of multiWord) {
		// On failure: `.${cls}` is a multi-word framework class with no
		// sanctioned exception (placement corner / component-namespaced /
		// showcase- / allow-list). Rename it to a single word, or — if it
		// is a composable's structural part — confirm it is prefixed by a
		// real components|composables partial basename. See
		// guides/modifiers.md §Anti-rules. Declared in:
		// ${(frameworkModifiers.get(cls) ?? []).join(', ')}
		it(`.${cls} is single-word or a sanctioned exception`, () => {
			expect(classNameIsSanctioned(cls, componentNames)).toBe(true)
		})
	}
})
