// ============================================================================
//  Style-test setup — loads the compiled SCSS bundle into the browser-test
//  environment and exposes the CSS assertion primitives every parity test
//  under `tests/src/styles/**/*.test.ts` builds on.
//
//  The two side-effect imports below are the contract:
//    - `./setup.css`           — cascade-layer order + Tailwind import.
//    - `../src/styles/index.scss` — the framework's compiled cascade.
//  Together they wire the same stylesheet stack the showcase + consumer
//  builds run against. Every test shares this one cascade.
//
//  This file ships only helpers consumed by at least one test file. New
//  affordances should land WITH the test that needs them, not ahead of it.
// ============================================================================

import { afterEach } from 'vitest'
import './setup.css'
import '../src/styles/index.scss'

export * from './setup'

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

// ============================================================================
// Tailwind v4 utility class catalog — collision watch list.
//
// Why this exists:
//   The framework lives in `@layer components` (and `elements`, `surfaces`).
//   Tailwind sits in `@layer utilities`, the LAST layer in the merged
//   order. Layered rules from a later layer always beat earlier ones,
//   regardless of selector specificity. So if a Tailwind utility shares a
//   name with a framework modifier (e.g. `.inline`), Tailwind wins —
//   silently — and the framework rule never paints.
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

// ── SCSS source introspection ──────────────────────────────────────────────
//
// Test files glob SCSS partials as raw strings via `import.meta.glob(...,
// { query: '?raw' })` and assert against the raw source. These helpers are
// the shared vocabulary every contract / parity test reaches for. String-
// form RegExps for the comment matchers because the literal `\*/` trips
// vite-oxc's tokenizer on the closing-comment escape sequence.

const BLOCK_COMMENT = new RegExp('\\/\\*[\\s\\S]*?\\*\\/', 'g')
const LINE_COMMENT = new RegExp('\\/\\/[^\\n]*', 'g')

/** Strip SCSS line + block comments from a raw partial source. */
export function stripComments(source: string): string {
	return source.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '')
}

/**
 * Extract the `{tag}` segment from an `_{tag}.scss` partial path. Throws
 * when the path doesn't match — paths come from `import.meta.glob` patterns
 * that already constrain the shape, so a miss is a programmer error.
 */
export function tagFromPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract tag from ${path}`)
	return match[1]
}

/** True when `source` declares `--set-{prefix}-{suffix}: ...`. */
export function declaresToken(source: string, prefix: string, suffix: string): boolean {
	const escaped = suffix.replace(/-/g, '\\-')
	return new RegExp(`--set-${prefix}-${escaped}\\s*:`).test(source)
}

/** True when `source` declares any `--set-{tag}-*` custom property. */
export function declaresElementToken(source: string, tag: string): boolean {
	return new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`, 'i').test(source)
}

/**
 * True when `source` invokes either of the framework's motion mixins —
 * `@include transition(...)` (which emits the bare transition + a paired
 * `prefers-reduced-motion: reduce` opt-out) or `@include reduced-motion`
 * (the same opt-out for `animation:` declarations).
 */
export function usesMotionMixin(source: string): boolean {
	return /@include\s+transition\s*\(/.test(source) || /@include\s+reduced-motion\b/.test(source)
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
