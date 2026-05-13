// ============================================================================
//  Style test setup — loads the compiled SCSS bundle into the browser test
//  environment and exposes assertion helpers built around the platform's
//  `getComputedStyle` API.
//
//  The SCSS import is the side-effect that wires `src/styles/index.scss`
//  through Vite's Sass pipeline and into the document's stylesheets. Every
//  test in `tests/src/styles/**/*.test.ts` shares this single cascade.
//
//  Every helper in this file is exported. Test files import what they need
//  by name; cross-file reuse is the default expectation.
// ============================================================================

import { afterEach } from 'vitest'
import { userEvent } from 'vitest/browser'
import './setup.css'
import '../src/styles/index.scss'

// ── Re-exports ─────────────────────────────────────────────────────────────

// `userEvent` is the Playwright-bridge user-event API. Re-exported so test
// files have a single import surface and never reach into vitest internals.
export { userEvent }

// ── Mounting ───────────────────────────────────────────────────────────────

export const STYLE_TEARDOWNS: Array<() => void> = []

afterEach(() => {
	while (STYLE_TEARDOWNS.length > 0) {
		const teardown = STYLE_TEARDOWNS.pop()
		if (teardown) teardown()
	}
	document.body.style.cssText = ''
})

// ============================================================================
// Tailwind v4 utility class catalog — collision watch list.
//
// Why this exists:
//   The framework lives in `@layer components` (and `elements`, `surfaces`).
//   Tailwind sits in `@layer utilities`, which is the LAST layer in the
//   merged order. Layered rules from a later layer always beat earlier
//   ones, regardless of selector specificity. So if a Tailwind utility
//   shares a name with a framework modifier (e.g. `.inline`), Tailwind
//   wins — silently — and the framework rule never paints.
//
// What's in this list:
//   Every Tailwind v4 utility class whose ENTIRE class name is a single
//   token (no hyphen-separated value suffix). These are the only ones at
//   risk of colliding with framework modifiers, because every framework
//   modifier is a single semantic English word (`primary`, `small`,
//   `ghost`, `disabled`, etc.).
//
//   Functional utilities (`.bg-blue-500`, `.p-4`, `.text-lg`, etc.) are
//   excluded — the hyphenated value suffix makes a name collision
//   impossible by construction.
//
// How to update:
//   When Tailwind ships a new bare utility, add it here. The conflict
//   detector in `tests/src/styles/integration.test.ts` will then refuse
//   any framework modifier that matches.
//
// Source: https://tailwindcss.com/docs (v4 reference, last reviewed
// 2026-05). Pseudo-class variants and arbitrary values aren't included
// because they can't appear standalone as a class name.
// ============================================================================

export const TAILWIND_SINGLE_TOKEN_UTILITIES: readonly string[] = [
	// ── Display ───────────────────────────────────────────────────────────────
	'block',
	'inline',
	'flex',
	'grid',
	'contents',
	'hidden',
	'table',
	'flow-root',
	'list-item',

	// ── Position ──────────────────────────────────────────────────────────────
	'static',
	'fixed',
	'absolute',
	'relative',
	'sticky',

	// ── Visibility ────────────────────────────────────────────────────────────
	'visible',
	'invisible',
	'collapse',

	// ── Layout helpers ────────────────────────────────────────────────────────
	'isolate',
	'container',
	'truncate',

	// ── Flex/Grid item shorthand ─────────────────────────────────────────────
	'shrink',
	'grow',

	// ── Typography ────────────────────────────────────────────────────────────
	'italic',
	'underline',
	'overline',
	'uppercase',
	'lowercase',
	'capitalize',
	'antialiased',
	'ordinal',
	'normal-nums',

	// ── Borders / decoration ──────────────────────────────────────────────────
	'border',
	'rounded',
	'shadow',
	'ring',
	'outline',

	// ── Behavior ──────────────────────────────────────────────────────────────
	'resize',

	// ── Print / accessibility ─────────────────────────────────────────────────
	'sr-only',

	// ── SVG ───────────────────────────────────────────────────────────────────
	'fill-current',
	'stroke-current',
] as const

/**
 * Append an element to `document.body` so the cascade applies, and register
 * automatic cleanup. Returns the same element for chaining.
 */
export function mount<T extends Element>(element: T): T {
	document.body.appendChild(element)
	STYLE_TEARDOWNS.push(() => element.remove())
	return element
}

/**
 * Build an element from a single tag + class list and mount it.
 *
 * @example
 *   const el = render('button', 'btn btn-primary')
 */
export function render<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	classes: string,
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag)
	if (classes) el.className = classes
	return mount(el)
}

/**
 * Build an unmounted child element with optional class + text. Use to compose
 * fixtures whose root will be passed to `mount()` separately.
 */
export function build<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	classes = '',
	text = '',
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag)
	if (classes) el.className = classes
	if (text) el.textContent = text
	return el
}

// ── Computed-style readers ─────────────────────────────────────────────────

/** Read one resolved CSS property off an element. Empty string if absent. */
export function style(element: Element, property: string): string {
	return globalThis.getComputedStyle(element).getPropertyValue(property).trim()
}

/** Read a custom property (`--bs-*`) resolved at the element. */
export function token(element: Element, name: string): string {
	const prefixed = name.startsWith('--') ? name : `--${name}`
	return style(element, prefixed)
}

/** Read a custom property declared on `:root` (the document element). */
export function rootToken(name: string): string {
	return token(document.documentElement, name)
}

/**
 * Assert that every named token resolves to a non-empty string on `element`.
 * The bulk-token check that lives at the top of every "token surface" block.
 */
export function assertTokens(element: Element, names: readonly string[]): void {
	for (const name of names) {
		const value = token(element, name)
		if (value === '') {
			throw new Error(`Token ${name} did not resolve on element <${describeElement(element)}>`)
		}
	}
}

/** Tag-name + class-list summary for assertion error messages. */
export function describeElement(element: Element): string {
	const className =
		typeof element.className === 'string' && element.className.length > 0
			? `.${element.className.split(/\s+/).join('.')}`
			: ''
	return `${element.tagName.toLowerCase()}${className}`
}

// ── Color helpers ──────────────────────────────────────────────────────────

/**
 * Parse any CSS color the browser is willing to resolve into RGBA channels.
 * The browser normalizes named colors, hex, hsl(), color-mix() and friends
 * to the same `rgb(...)` / `rgba(...)` text shape, so a one-liner regex
 * after a probe paint is all that's needed.
 */
export function rgba(color: string): readonly [number, number, number, number] {
	const probe = document.createElement('div')
	probe.style.color = color
	document.body.appendChild(probe)
	const resolved = globalThis.getComputedStyle(probe).color
	probe.remove()
	const match = resolved.match(/-?\d+(?:\.\d+)?/g)
	if (!match || match.length < 3) {
		throw new Error(`Could not parse color: ${color} (resolved: ${resolved})`)
	}
	const r = Number(match[0])
	const g = Number(match[1])
	const b = Number(match[2])
	const a = match.length >= 4 ? Number(match[3]) : 1
	return [r, g, b, a]
}

/** Compare two CSS colors for visual equality within a per-channel tolerance. */
export function colorEqual(a: string, b: string, tolerance = 1): boolean {
	const left = rgba(a)
	const right = rgba(b)
	for (let i = 0; i < 4; i += 1) {
		if (Math.abs(left[i] - right[i]) > tolerance) return false
	}
	return true
}

// ── Layout helpers ─────────────────────────────────────────────────────────

/** Read a numeric pixel value off a resolved `<length>` property. */
export function pixels(element: Element, property: string): number {
	const value = style(element, property)
	const match = value.match(/-?\d+(?:\.\d+)?/)
	return match ? Number(match[0]) : 0
}

/** Read the resolved width in CSS pixels (post-layout). */
export function width(element: Element): number {
	return element.getBoundingClientRect().width
}

/** Read the resolved height in CSS pixels (post-layout). */
export function height(element: Element): number {
	return element.getBoundingClientRect().height
}

// ── Interaction helpers ────────────────────────────────────────────────────

/**
 * Real pointer hover via Vitest's browser bridge to Playwright. Triggers
 * the CSS `:hover` pseudo-class — synthetic `mouseover` events do not.
 *
 * Note: in headless Chromium this can be unreliable for chrome-changing
 * assertions. Prefer `findRule(...)` + token-wiring assertions when you
 * just need to verify the `:hover` rule contract.
 */
export async function hover(element: Element): Promise<void> {
	await userEvent.hover(element)
}

/** Move the pointer off any hovered element by hovering `<body>`. */
export async function unhover(): Promise<void> {
	await userEvent.hover(document.body)
}

/**
 * Keyboard focus through `Tab` — the only way to trigger `:focus-visible`
 * deterministically across browsers. `element.focus()` gives plain `:focus`
 * but not `:focus-visible` in Chromium when called from script.
 */
export async function tabTo(element: HTMLElement): Promise<void> {
	if (!element.hasAttribute('tabindex') && !isNativelyFocusable(element)) {
		element.setAttribute('tabindex', '0')
	}
	document.body.focus()
	for (let i = 0; i < 50; i += 1) {
		if (document.activeElement === element) return
		await userEvent.tab()
	}
}

/** True when the element type takes part in the sequential focus order natively. */
export function isNativelyFocusable(element: HTMLElement): boolean {
	const tag = element.tagName
	return (
		tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
	)
}

// ── Stylesheet introspection ───────────────────────────────────────────────

/**
 * Walk every loaded stylesheet looking for a rule whose selector text contains
 * the given fragment. Use to assert that a CSS rule is declared in the
 * cascade — complementary to `style()` which only reads the resolved value.
 *
 * Pass a fragment (e.g. `.btn:hover`) — match is substring-based to allow
 * for selector lists like `.btn-check:focus-visible + .btn, .btn:hover`.
 */
export function findRule(selectorFragment: string): boolean {
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList
		try {
			rules = sheet.cssRules
		} catch {
			// Cross-origin stylesheet — skip.
			continue
		}
		if (walkRules(rules, selectorFragment)) return true
	}
	return false
}

/** Recursive walker behind `findRule` — exported for cross-file reuse. */
export function walkRules(rules: CSSRuleList, selectorFragment: string): boolean {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule && rule.selectorText.includes(selectorFragment)) {
			return true
		}
		if (rule instanceof CSSGroupingRule && walkRules(rule.cssRules, selectorFragment)) {
			return true
		}
	}
	return false
}

/**
 * True when an `@keyframes name { … }` rule exists in the loaded stylesheets.
 * Use for animation assertions where reading `animation-name` would just
 * give back the keyframes-name token.
 */
export function findKeyframes(name: string): boolean {
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList
		try {
			rules = sheet.cssRules
		} catch {
			continue
		}
		if (walkKeyframes(rules, name)) return true
	}
	return false
}

export function walkKeyframes(rules: CSSRuleList, name: string): boolean {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSKeyframesRule && rule.name === name) return true
		if (rule instanceof CSSGroupingRule && walkKeyframes(rule.cssRules, name)) return true
	}
	return false
}

// ── Theme helpers ──────────────────────────────────────────────────────────

/**
 * Switch the document's `data-theme` attribute for the duration of the current
 * test. The original value is restored automatically. The attribute name
 * matches the selectors in `src/styles/_theme.scss` (`[data-theme='light']`
 * / `[data-theme='dark']`); the previous `data-bs-theme` form was a leftover
 * from the Bootstrap port and never matched the framework's cascade.
 */
export function setTheme(value: 'light' | 'dark'): void {
	const previous = document.documentElement.getAttribute('data-theme')
	document.documentElement.setAttribute('data-theme', value)
	STYLE_TEARDOWNS.push(() => {
		if (previous === null) document.documentElement.removeAttribute('data-theme')
		else document.documentElement.setAttribute('data-theme', previous)
	})
}

// ── Framework variant + dimension re-exports ───────────────────────────────
//
// Style tests reach for the shipped modifier vocabulary in two patterns:
//   1. `it.each(VARIANTS)(...)` — drive a parameterized assertion across the
//      seven variants without rebuilding the array per test.
//   2. `expect(token(el, '--set-variant-color')).not.toBe('')` after layering
//      a known modifier class.
//
// Importing from `@elements/browser` keeps the test surface in lock-step
// with what's shipped — if a variant is added / removed from `modifiers.ts`,
// every test that touches `VARIANTS` updates with it. The bidirectional
// parity test at `tests/src/browser/modifiers.test.ts` guarantees the import
// is the source of truth.

import { modifiers, type Variant, type Size, type Style, type State } from '@elements/browser'

/** Seven semantic variants — `primary` through `information`. */
export const VARIANTS: readonly Variant[] = Object.values(modifiers.variant)

/** Two scale steps — `small`, `large`. (Default size is the bare element.) */
export const SIZES: readonly Size[] = Object.values(modifiers.size)

/** Two style treatments — `subtle`, `filled`. */
export const STYLES: readonly Style[] = Object.values(modifiers.style)

/** Three interaction states — `disabled`, `active`, `loading`. */
export const STATES: readonly State[] = Object.values(modifiers.state)
