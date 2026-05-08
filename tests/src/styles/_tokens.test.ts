// ============================================================================
// Token resolution tests.
//
// Verifies every framework token (--set-* + the @theme variants we register)
// resolves to a non-empty value at runtime. Catches typos in the SCSS, missing
// declarations, and broken @theme processing by Tailwind v4.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { render, rootToken, token } from '../../setupStyles.ts'

const VARIANTS = [
	'primary',
	'secondary',
	'tertiary',
	'success',
	'warning',
	'danger',
	'information',
] as const

describe(':root — semantic variant colors (registered via @theme)', () => {
	it.each(VARIANTS)('declares --color-%s', (name) => {
		expect(rootToken(`--color-${name}`)).not.toBe('')
	})
})

describe(':root — framework-specific --set-* tokens', () => {
	it('declares focus ring sub-tokens', () => {
		expect(rootToken('--set-focus-box-shadow-width')).not.toBe('')
		expect(rootToken('--set-focus-box-shadow-opacity')).not.toBe('')
	})

	it('declares default transition duration', () => {
		expect(rootToken('--set-transition-duration')).not.toBe('')
	})

	it('declares neutral variant context fallbacks', () => {
		expect(rootToken('--set-variant-color')).not.toBe('')
		expect(rootToken('--set-variant-background-color')).not.toBe('')
		expect(rootToken('--set-variant-border-color')).not.toBe('')
		expect(rootToken('--set-variant-border-width')).not.toBe('')
	})
})

describe('button-scoped --set-* tokens resolve on a mounted button', () => {
	const BUTTON_TOKENS = [
		'--set-button-color',
		'--set-button-background-color',
		'--set-button-border-color',
		'--set-button-border-width',
		'--set-button-border-radius',
		'--set-button-padding-inline',
		'--set-button-padding-block',
		'--set-button-font-size',
		'--set-button-font-weight',
		'--set-button-line-height',
		'--set-button-transition-duration',
		'--set-button-cursor',
		'--set-button-disabled-opacity',
		'--set-button-focus-box-shadow',
	] as const

	it.each(BUTTON_TOKENS)('resolves %s', (name) => {
		const btn = render('button', '')
		expect(token(btn, name)).not.toBe('')
	})
})

describe('Tailwind base tokens that the framework relies on land on :root', () => {
	// `--spacing` is referenced as `calc(var(--spacing) * N)` in our context
	// tokens, so Tailwind keeps it in the emitted theme. Other Tailwind theme
	// tokens like --text-* and --radius-* are tree-shaken when not directly
	// used by emitted utility classes — our SCSS doesn't reference them since
	// modifier files use rem literals (see _sizes.scss / _shapes.scss).
	it('--spacing is shipped by Tailwind v4', () => {
		expect(rootToken('--spacing')).not.toBe('')
	})
})
