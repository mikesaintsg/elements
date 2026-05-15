// ============================================================================
// Token surface — TS shape + bidirectional CSS parity.
//
// Three layers of contract:
//   1. Shape — every leaf is a `--*` string; framework-authored tokens use
//      the `--set-*` namespace; the button group declares the expected slots.
//   2. TS → CSS — every leaf in the `tokens` object resolves at runtime
//      (on :root, on a button, or on a modifier-classed element).
//   3. SCSS → TS — every `--set-*` declaration in _tokens.scss + _button.scss
//      and every `--color-{variant}` in _theme.scss's @theme block appears
//      as a leaf in `tokens`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { tokens } from '@elements/browser'
import { leaves, tagFromPath } from '../../setup.ts'
import { render, rootToken, token } from '../../setupStyles.ts'

import tokensScss from '../../../src/styles/_tokens.scss?raw'
import themeScss from '../../../src/styles/_theme.scss?raw'

const elementSources = import.meta.glob('../../../src/styles/elements/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const componentSources = import.meta.glob('../../../src/styles/components/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const composableSources = import.meta.glob('../../../src/styles/composables/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const surfaceSources = import.meta.glob('../../../src/styles/surfaces/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const VARIANTS = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

const TS_LEAVES = leaves(tokens)
const TS_SET = new Set(TS_LEAVES)

// Pull `--name:` declarations out of CSS/SCSS source. The regex matches an
// open declaration at line start (allowing leading whitespace) and captures
// the property name.
const DECL_REGEX = /^\s*(--[a-z][a-z0-9-]*)\s*:/gim

function declarationsIn(source: string): readonly string[] {
	const out: string[] = []
	let match
	while ((match = DECL_REGEX.exec(source)) !== null) {
		if (match[1]) out.push(match[1])
	}
	return out
}

// {tag → source} for every element / component partial that declares its
// element-scoped tokens. Both elements/_X.scss (bare-tag baseline) and
// components/_X.scss (bare-tag-as-component, e.g. <article> as card) target
// the same selector — `X { ... }` — so they share the same parity check.
// When both layers declare tokens for the same tag, sources are concatenated.
const SUBSTANTIVE_PARTIALS: ReadonlyMap<string, string> = (() => {
	const map = new Map<string, string>()
	const collect = (sources: Record<string, string>) => {
		for (const [path, source] of Object.entries(sources)) {
			const tag = tagFromPath(path)
			if (tag.includes('-')) continue
			if (new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`, 'i').test(source)) {
				const existing = map.get(tag)
				map.set(tag, existing ? `${existing}\n${source}` : source)
			}
		}
	}
	collect(elementSources)
	collect(componentSources)
	collect(composableSources)
	return map
})()

// {surface → source} for every surfaces/_{name}.scss partial that declares
// `--set-{name}-*` tokens. Mirrors the element-partial scan above.
const SURFACE_PARTIALS: ReadonlyMap<string, string> = (() => {
	const map = new Map<string, string>()
	for (const [path, source] of Object.entries(surfaceSources)) {
		const name = tagFromPath(path)
		if (new RegExp(`--set-${name}-[a-z0-9-]+\\s*:`, 'i').test(source)) {
			map.set(name, source)
		}
	}
	return map
})()

// ─────────────────────────────────────────────────────────────────────────────
//  Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('tokens — shape', () => {
	it('exposes every semantic variant under tokens.color', () => {
		for (const name of VARIANTS) {
			expect(tokens.color[name as keyof typeof tokens.color]).toBe(`--color-${name}`)
		}
	})

	it('every leaf is a CSS custom property string', () => {
		for (const leaf of TS_LEAVES) {
			expect(leaf.startsWith('--')).toBe(true)
		}
	})

	it('framework-authored tokens use the --set- namespace', () => {
		for (const leaf of TS_LEAVES) {
			if (leaf.startsWith('--color-')) continue // semantic variants
			expect(leaf.startsWith('--set-')).toBe(true)
		}
	})

	it('button group declares the disabled and focus state slots', () => {
		// hover/active are implemented inline via color-mix() without dedicated
		// element-scoped tokens, so they don't appear under tokens.button.
		expect(tokens.button.disabled).toBeDefined()
		expect(tokens.button.focus).toBeDefined()
	})
})

// ─────────────────────────────────────────────────────────────────────────────
//  TS → CSS — every TS leaf resolves at runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('TS → CSS: every TS leaf resolves at runtime', () => {
	// Modifier-context tokens only resolve on elements wearing a modifier class.
	const MODIFIER_CLASS_BY_GROUP: Record<string, string> = {
		variant: 'primary',
		size: 'small',
		style: 'filled',
	}

	const elementTags = Array.from(SUBSTANTIVE_PARTIALS.keys())
	const elementPrefixes = new Set(elementTags.map((t) => `--set-${t}-`))

	const globalLeaves = TS_LEAVES.filter((leaf) => {
		for (const prefix of elementPrefixes) if (leaf.startsWith(prefix)) return false
		if (leaf.startsWith('--set-variant-')) return false
		if (leaf.startsWith('--set-size-')) return false
		return !leaf.startsWith('--set-style-')
	})

	it.each(globalLeaves)('%s resolves on :root', (name) => {
		expect(rootToken(name)).not.toBe('')
	})

	// Class-based component partials whose name doesn't map to a real
	// HTML element (e.g. `_carousel.scss` styles `.carousel`, not a
	// `<carousel>` tag). For those, the token resolution test renders
	// `<div class="{tag}">` instead of `<{tag}>`.
	const CLASS_BASED_COMPONENTS = new Set(['carousel', 'badge', 'dot', 'tag', 'spinner', 'skeleton'])

	for (const tag of elementTags) {
		const tagLeaves = TS_LEAVES.filter((leaf) => leaf.startsWith(`--set-${tag}-`))
		const isClass = CLASS_BASED_COMPONENTS.has(tag)
		const label = isClass ? `.${tag}` : `<${tag}>`
		it.each(tagLeaves)(`%s resolves on a ${label}`, (name) => {
			const el = isClass ? render('div', tag) : render(tag as keyof HTMLElementTagNameMap, '')
			expect(token(el, name)).not.toBe('')
		})
	}

	for (const [group, klass] of Object.entries(MODIFIER_CLASS_BY_GROUP)) {
		const groupLeaves = TS_LEAVES.filter((leaf) => leaf.startsWith(`--set-${group}-`))
		it.each(groupLeaves)(`%s resolves on a .${klass} element`, (name) => {
			const el = render('div', `primary ${klass}`)
			expect(token(el, name)).not.toBe('')
		})
	}
})

// ─────────────────────────────────────────────────────────────────────────────
//  SCSS / CSS → TS — every framework declaration is mirrored
// ─────────────────────────────────────────────────────────────────────────────

describe('SCSS / CSS → TS: every framework declaration is mirrored', () => {
	it('every --set-* in _tokens.scss is in tokens.ts', () => {
		const declarations = declarationsIn(tokensScss).filter((name) => name.startsWith('--set-'))
		for (const name of declarations) {
			expect(TS_SET, `${name} declared in _tokens.scss but missing in tokens.ts`).toContain(name)
		}
	})

	it('every --color-{variant} in _theme.scss @theme is in tokens.color', () => {
		const themeColors = declarationsIn(themeScss).filter((name) => name.startsWith('--color-'))
		expect(themeColors.length).toBeGreaterThan(0)
		for (const name of themeColors) {
			expect(TS_SET, `${name} registered via @theme but missing in tokens.color`).toContain(name)
		}
	})

	for (const [tag, source] of SUBSTANTIVE_PARTIALS) {
		it(`every --set-${tag}-* in _${tag}.scss is in tokens.${tag}`, () => {
			const declarations = declarationsIn(source).filter((name) => name.startsWith(`--set-${tag}-`))
			expect(declarations.length).toBeGreaterThan(0)
			for (const name of declarations) {
				expect(TS_SET, `${name} declared in _${tag}.scss but missing in tokens.${tag}`).toContain(
					name,
				)
			}
		})
	}

	for (const [name, source] of SURFACE_PARTIALS) {
		it(`every --set-${name}-* in surfaces/_${name}.scss is in tokens.${name}`, () => {
			const declarations = declarationsIn(source).filter((decl) =>
				decl.startsWith(`--set-${name}-`),
			)
			expect(declarations.length).toBeGreaterThan(0)
			for (const decl of declarations) {
				expect(
					TS_SET,
					`${decl} declared in surfaces/_${name}.scss but missing in tokens.${name}`,
				).toContain(decl)
			}
		})
	}
})
