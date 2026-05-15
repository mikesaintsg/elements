// ============================================================================
//  Style-test setup — loads the compiled SCSS bundle into the browser-test
//  environment and exposes the CSS assertion primitives every parity test
//  under `tests/src/styles/**/*.test.ts` builds on.
//
//  Setup-file stack (configured per project in `vite.config.ts`):
//
//      setupFiles: ['./tests/setup.ts', './tests/setupStyles.ts']
//
//  `setup.ts` is loaded first and is environment-agnostic (Node + browser);
//  it registers the `vi.restoreAllMocks` afterEach hook and ships the
//  node-safe parsing helpers. This file ships second and adds the
//  DOM-only CSS assertion primitives + the side-effect imports that
//  wire the cascade:
//
//    - `./setup.css`              — cascade-layer order + Tailwind import.
//    - `../src/styles/index.scss` — the framework's compiled cascade.
//
//  Test files import the generic primitives (`leaves`, `stripComments`,
//  `tagFromPath`, `TAILWIND_SINGLE_TOKEN_UTILITIES`, …) from `'./setup'` /
//  `'../setup'` directly; this file's exports cover the DOM-only helpers.
//
//  New affordances should land WITH the test that needs them, not ahead.
// ============================================================================

import { afterEach } from 'vitest'
import './setup.css'
import '../src/styles/index.scss'

// ── Per-test teardown registry ─────────────────────────────────────────────
// Module-private — every public helper that appends a teardown is in this
// file, so the queue never leaks to test code.

const STYLE_TEARDOWNS: Array<() => void> = []

afterEach(() => {
	while (STYLE_TEARDOWNS.length > 0) {
		const teardown = STYLE_TEARDOWNS.pop()
		teardown?.()
	}
	document.body.style.cssText = ''
})

// ── Mounting ───────────────────────────────────────────────────────────────

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
 *   const el = render('button', 'primary large')
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

/** Read a custom property resolved at the element. Accepts `name` with or without `--` prefix. */
export function token(element: Element, name: string): string {
	const prefixed = name.startsWith('--') ? name : `--${name}`
	return style(element, prefixed)
}

/** Read a custom property declared on `:root` (the document element). */
export function rootToken(name: string): string {
	return token(document.documentElement, name)
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

// ── Stylesheet introspection ───────────────────────────────────────────────

/**
 * Walk every loaded stylesheet looking for a rule whose selector text contains
 * `selectorFragment`. Substring match — selector lists like
 * `.btn-check:focus-visible + .btn, .btn:hover` are found by any of their
 * branches. Complementary to `style()` (which reads resolved values); use
 * `findRule(...)` to assert that a rule is DECLARED in the cascade.
 */
export function findRule(selectorFragment: string): boolean {
	function walk(rules: CSSRuleList): boolean {
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSStyleRule && rule.selectorText.includes(selectorFragment)) {
				return true
			}
			if (rule instanceof CSSGroupingRule && walk(rule.cssRules)) return true
		}
		return false
	}
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			if (walk(sheet.cssRules)) return true
		} catch {
			// Cross-origin stylesheet — skip.
		}
	}
	return false
}
