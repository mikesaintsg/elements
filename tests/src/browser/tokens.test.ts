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
import { tokens } from '@src/browser'
import { render, rootToken, token } from '../../setupStyles.ts'

import tokensScss from '../../../src/styles/_tokens.scss?raw'
import buttonScss from '../../../src/styles/elements/_button.scss?raw'
import themeScss from '../../../src/styles/_theme.scss?raw'

const VARIANTS = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

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
		size: 'small',
		style: 'filled',
	}

	const globalLeaves = TS_LEAVES.filter((leaf) => {
		if (leaf.startsWith('--set-button-')) return false
		if (leaf.startsWith('--set-size-')) return false
		return !leaf.startsWith('--set-style-');
	})

	it.each(globalLeaves)('%s resolves on :root', (name) => {
		expect(rootToken(name)).not.toBe('')
	})

	const buttonLeaves = TS_LEAVES.filter((leaf) => leaf.startsWith('--set-button-'))

	it.each(buttonLeaves)('%s resolves on a button', (name) => {
		const btn = render('button', '')
		expect(token(btn, name)).not.toBe('')
	})

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

	it('every --set-button-* in _button.scss is in tokens.button', () => {
		const declarations = declarationsIn(buttonScss).filter((name) =>
			name.startsWith('--set-button-'),
		)
		for (const name of declarations) {
			expect(TS_SET, `${name} declared in _button.scss but missing in tokens.button`).toContain(
				name,
			)
		}
	})
})
