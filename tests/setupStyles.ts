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
 * Switch the document's `data-bs-theme` attribute for the duration of the
 * current test. The original value is restored automatically.
 */
export function setTheme(value: 'light' | 'dark'): void {
	const previous = document.documentElement.getAttribute('data-bs-theme')
	document.documentElement.setAttribute('data-bs-theme', value)
	STYLE_TEARDOWNS.push(() => {
		if (previous === null) document.documentElement.removeAttribute('data-bs-theme')
		else document.documentElement.setAttribute('data-bs-theme', previous)
	})
}

// ── Color palette constants ────────────────────────────────────────────────

/**
 * The canonical Bootstrap-compatible semantic color list. Mirrors
 * `mixins.$bs-colors` from `_mixins.scss` — every per-color `@each` loop in
 * the framework iterates this set, so style tests use it for `it.each`-style
 * variant tables.
 */
export const BS_COLORS = [
	'primary',
	'secondary',
	'success',
	'info',
	'warning',
	'danger',
	'light',
	'dark',
] as const

export type BsColor = (typeof BS_COLORS)[number]

// ── Element factories ──────────────────────────────────────────────────────
//
//  Each factory returns a real DOM node ready to mount. They follow the same
//  `create{Entity}Element` naming as `setupBrowser.ts`. Factories never call
//  `mount()` themselves — the test composes the parent fixture and decides
//  what to mount.

/** Plain `<button class="btn …">` builder. */
export function createButtonElement(extra = ''): HTMLButtonElement {
	return build('button', `btn ${extra}`.trim())
}

/**
 * `<button class="btn btn-primary {modifier}"><i><span class="btn-label">…</span></button>`
 * — the documented `.btn-reveal` markup contract.
 */
export function createRevealButton(
	modifier: 'btn-reveal' | 'btn-reveal-end' = 'btn-reveal',
	label = 'Add new',
): {
	button: HTMLButtonElement
	icon: HTMLElement
	label: HTMLSpanElement
} {
	const button = build('button', `btn btn-primary ${modifier}`)
	const icon = build('i', 'bi bi-plus')
	icon.setAttribute('aria-hidden', 'true')
	const labelEl = build('span', 'btn-label', label)
	button.append(icon, labelEl)
	return { button, icon, label: labelEl }
}

/**
 * `<input class="btn-check"> + <label class="btn …">` companion pair — the
 * documented segmented-control markup contract.
 */
export function createCheckPair(
	checked = false,
	classes = 'btn btn-primary',
): {
	input: HTMLInputElement
	label: HTMLLabelElement
} {
	const input = build('input', 'btn-check')
	input.type = 'checkbox'
	input.id = `check-${Math.random().toString(36).slice(2)}`
	input.checked = checked
	const label = build('label', classes, 'Toggle')
	label.htmlFor = input.id
	return { input, label }
}

/**
 * `<div class="btn-group-{size}"><button class="btn …">…</div>` — for size
 * inheritance assertions.
 */
export function createButtonGroup(
	size: 'sm' | 'lg',
	classes = 'btn btn-primary',
): {
	group: HTMLDivElement
	button: HTMLButtonElement
} {
	const group = build('div', `btn-group-${size}`)
	const button = build('button', classes)
	group.appendChild(button)
	return { group, button }
}

/**
 * Build a parent + N children fixture. The children list is callable so
 * each test can compose any tag/class combination.
 */
export function createParentWithChildren<
	P extends keyof HTMLElementTagNameMap,
	C extends keyof HTMLElementTagNameMap,
>(
	parentTag: P,
	parentClasses: string,
	childTag: C,
	childClasses: string,
	count: number,
): {
	parent: HTMLElementTagNameMap[P]
	children: readonly HTMLElementTagNameMap[C][]
} {
	const parent = build(parentTag, parentClasses)
	const children: HTMLElementTagNameMap[C][] = []
	for (let i = 0; i < count; i += 1) {
		const child = build(childTag, childClasses)
		parent.appendChild(child)
		children.push(child)
	}
	return { parent, children }
}

// ── Generic per-color factory ──────────────────────────────────────────────
//
//  Most components ship a `.{component}-{color}` modifier family. Instead of
//  hand-building eight elements per partial, use the helpers below to drive
//  `it.each` rows. They follow §4.3 — `{verb}{Noun}` — and live in setup so
//  the second consumer never re-invents them.

/** Render `<{tag} class="{base} {base}-{color}">` and return it mounted. */
export function renderColorVariant<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	base: string,
	color: string,
	extra = '',
): HTMLElementTagNameMap[K] {
	const className = `${base} ${base}-${color} ${extra}`.trim()
	return render(tag, className)
}

// ── it.each row builders ───────────────────────────────────────────────────
//
//  Reusable row tables for `it.each`. Each builder returns a frozen object
//  array — `it.each` interpolates `$field` into the test title, so single-
//  field rows give the best diagnostic output.

/** `[{ color: 'primary' }, …]` — every Bootstrap color. */
export function colorRows(): readonly { readonly color: BsColor }[] {
	return BS_COLORS.map((color) => ({ color }))
}

/** Same as `colorRows()` but excludes the named colors. */
export function colorRowsExcept(
	...excluded: readonly BsColor[]
): readonly { readonly color: BsColor }[] {
	const skip = new Set(excluded)
	return BS_COLORS.filter((c) => !skip.has(c)).map((color) => ({ color }))
}

/**
 * Cartesian product of any list with `BS_COLORS`. Used when a per-color
 * table also needs to vary a property/token.
 */
export function colorRowsWith<T extends Record<string, unknown>>(
	rows: readonly T[],
): readonly (T & { readonly color: BsColor })[] {
	const out: (T & { readonly color: BsColor })[] = []
	for (const color of BS_COLORS) {
		for (const row of rows) out.push({ ...row, color })
	}
	return out
}

// ── Element factories ──────────────────────────────────────────────────────
//
//  Each factory returns a real DOM node ready to mount. They follow the same
//  `create{Entity}Element` naming as `setupBrowser.ts`. Factories never call
//  `mount()` themselves — the test composes the parent fixture and decides
//  what to mount.

/** `<span class="badge {extra}">…</span>` */
export function createBadgeElement(extra = '', text = '1'): HTMLSpanElement {
	return build('span', `badge ${extra}`.trim(), text)
}

/** `<span class="dot {extra}"></span>` */
export function createDotElement(extra = ''): HTMLSpanElement {
	return build('span', `dot ${extra}`.trim())
}

/** `<kbd>…</kbd>` */
export function createKbdElement(text = 'K'): HTMLElement {
	return build('kbd', '', text)
}

/** `<code>…</code>` */
export function createCodeElement(text = 'code'): HTMLElement {
	return build('code', '', text)
}

/** `<button class="btn-close" aria-label="Close"></button>` */
export function createCloseButton(extra = ''): HTMLButtonElement {
	const button = build('button', `btn-close ${extra}`.trim())
	button.type = 'button'
	button.setAttribute('aria-label', 'Close')
	return button
}

/** `<div class="spinner-border" role="status"><span class="visually-hidden">…</span></div>` */
export function createSpinnerElement(
	variant: 'spinner-border' | 'spinner-grow' = 'spinner-border',
	extra = '',
): HTMLDivElement {
	const root = build('div', `${variant} ${extra}`.trim())
	root.setAttribute('role', 'status')
	const sr = build('span', 'visually-hidden', 'Loading...')
	root.appendChild(sr)
	return root
}

/** `<div class="placeholder {extra}"></div>` */
export function createPlaceholderElement(extra = ''): HTMLSpanElement {
	return build('span', `placeholder ${extra}`.trim())
}

/** `<div class="skeleton {extra}"></div>` */
export function createSkeletonElement(extra = ''): HTMLDivElement {
	return build('div', `skeleton ${extra}`.trim())
}

/** `<div class="avatar {extra}"><img …/></div>` (image optional). */
export function createAvatarElement(
	extra = '',
	withImage = false,
): { root: HTMLDivElement; image: HTMLImageElement | null } {
	const root = build('div', `avatar ${extra}`.trim())
	let image: HTMLImageElement | null = null
	if (withImage) {
		image = build('img')
		image.alt = ''
		image.src =
			'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22/%3E'
		root.appendChild(image)
	}
	return { root, image }
}

/** `<div class="alert alert-{color}" role="alert">…</div>` */
export function createAlertElement(color: BsColor = 'primary', extra = ''): HTMLDivElement {
	const root = build('div', `alert alert-${color} ${extra}`.trim(), 'Heads up!')
	root.setAttribute('role', 'alert')
	return root
}

/** `<span class="tag {extra}">…</span>` */
export function createTagElement(extra = '', text = 'tag'): HTMLSpanElement {
	return build('span', `tag ${extra}`.trim(), text)
}

/** `<nav><ol class="breadcrumb"><li class="breadcrumb-item">…</li>…</ol></nav>` */
export function createBreadcrumbElement(labels: readonly string[] = ['Home', 'Library', 'Data']): {
	nav: HTMLElement
	ol: HTMLOListElement
	items: readonly HTMLLIElement[]
} {
	const nav = build('nav')
	nav.setAttribute('aria-label', 'breadcrumb')
	const ol = build('ol', 'breadcrumb')
	const items: HTMLLIElement[] = []
	for (let i = 0; i < labels.length; i += 1) {
		const li = build('li', 'breadcrumb-item', labels[i])
		if (i === labels.length - 1) li.classList.add('active')
		ol.appendChild(li)
		items.push(li)
	}
	nav.appendChild(ol)
	return { nav, ol, items }
}

/** `<ul class="pagination"><li class="page-item"><a class="page-link">…</a></li>…</ul>` */
export function createPaginationElement(count = 3): {
	ul: HTMLUListElement
	items: readonly HTMLLIElement[]
	links: readonly HTMLAnchorElement[]
} {
	const ul = build('ul', 'pagination')
	const items: HTMLLIElement[] = []
	const links: HTMLAnchorElement[] = []
	for (let i = 0; i < count; i += 1) {
		const li = build('li', 'page-item')
		const a = build('a', 'page-link', `${i + 1}`)
		a.href = '#'
		li.appendChild(a)
		ul.appendChild(li)
		items.push(li)
		links.push(a)
	}
	return { ul, items, links }
}

/** `<div class="progress"><div class="progress-bar" style="width: {pct}%"></div></div>` */
export function createProgressElement(
	percent = 50,
	extra = '',
): { root: HTMLDivElement; bar: HTMLDivElement } {
	const root = build('div', `progress ${extra}`.trim())
	root.setAttribute('role', 'progressbar')
	const bar = build('div', 'progress-bar')
	bar.style.width = `${percent}%`
	root.appendChild(bar)
	return { root, bar }
}

/** `<div class="empty-state">…</div>` */
export function createEmptyStateElement(extra = ''): HTMLDivElement {
	return build('div', `empty-state ${extra}`.trim(), 'Nothing here')
}

/** `<div class="stat">…</div>` */
export function createStatElement(extra = ''): HTMLDivElement {
	return build('div', `stat ${extra}`.trim(), '42')
}

/**
 * `<ol class="stepper"><li class="stepper-item"><span class="stepper-dot">…</span>
 *  <span class="stepper-label">…</span></li>…</ol>`
 *
 * Each item is composed of a dot + label pair. The caller can set
 * `.active` / `.completed` on individual items to test the state rules.
 */
export function createStepperElement(count = 3): {
	root: HTMLOListElement
	items: readonly HTMLLIElement[]
	dots: readonly HTMLSpanElement[]
	labels: readonly HTMLSpanElement[]
} {
	const root = build('ol', 'stepper')
	const items: HTMLLIElement[] = []
	const dots: HTMLSpanElement[] = []
	const labels: HTMLSpanElement[] = []
	for (let i = 0; i < count; i += 1) {
		const item = build('li', 'stepper-item')
		const dot = build('span', 'stepper-dot', String(i + 1))
		const label = build('span', 'stepper-label', `Step ${i + 1}`)
		item.append(dot, label)
		root.appendChild(item)
		items.push(item)
		dots.push(dot)
		labels.push(label)
	}
	return { root, items, dots, labels }
}

/**
 * `<ul class="timeline"><li class="timeline-item"><span class="timeline-marker"></span>
 *  <div class="timeline-content">…</div></li>…</ul>`
 *
 * Each item is composed of a marker + content pair. The marker accepts an
 * optional `markerExtra` per item (e.g. `'timeline-marker-success'`).
 */
export function createTimelineElement(count = 3): {
	root: HTMLUListElement
	items: readonly HTMLLIElement[]
	markers: readonly HTMLSpanElement[]
	contents: readonly HTMLDivElement[]
} {
	const root = build('ul', 'timeline')
	const items: HTMLLIElement[] = []
	const markers: HTMLSpanElement[] = []
	const contents: HTMLDivElement[] = []
	for (let i = 0; i < count; i += 1) {
		const item = build('li', 'timeline-item')
		const marker = build('span', 'timeline-marker')
		const content = build('div', 'timeline-content', `Event ${i + 1}`)
		item.append(marker, content)
		root.appendChild(item)
		items.push(item)
		markers.push(marker)
		contents.push(content)
	}
	return { root, items, markers, contents }
}
