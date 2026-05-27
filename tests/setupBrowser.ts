// ============================================================================
//  Browser-test setup — composable + factory test infrastructure.
//
//  Loads the framework's SCSS cascade so any composable / factory test
//  that needs CSS-resolved tokens or stylesheet introspection works
//  end-to-end.
//
//  Setup-file stack (configured per project in `vite.config.ts`):
//
//      setupFiles: ['./tests/setup.ts', './tests/setupBrowser.ts']
//
//  `setup.ts` ships first and is environment-agnostic (Node + browser);
//  it registers the `vi.restoreAllMocks` afterEach hook and exports the
//  node-safe parsing helpers. `setupBrowser.ts` ships second and adds
//  the DOM-only Vue + factory + dispose infrastructure on top.
//
//  Test files import the generic primitives (`leaves`, `stripComments`,
//  `tagFromPath`, `createRecorder`, …) directly from `'./setup'` /
//  `'../setup'`; this file's exports cover the DOM-only helpers:
//
//    1. Vue mounting     — `mountSetup`, `withElement`.
//    2. Factory fixtures — `createFactoryFixture` + the `destroy()`-shape
//       contract every factory test relies on.
//    3. DOM primitives   — `buildElement`, `createPointerEvent`,
//       `createDragEvent`.
//    4. Lifecycle        — `waitForBootstrap`, `assertCleanDispose`.
//
//  Per-element fixture builders (e.g. `createDialogElement`,
//  `createMenuElement`) live with their composable test files; this setup
//  ships only what tests consume in more than one place.
// ============================================================================

import './setup.css'
import '../src/styles/index.scss'

import type { App, Ref } from 'vue'
import { afterEach, expect, vi } from 'vitest'
import { createApp, nextTick, ref } from 'vue'
import { STORAGE_KEY_THEME, resetTheme } from '@elements/browser'
import type { StateScenario } from './setup'
import { waitForDelay } from './setup'

// ── Factory fixtures ────────────────────────────────────────────────────────
// Factory tests do NOT mount a Vue app — factories are framework-agnostic.
// `createFactoryFixture` accepts a setup function that returns an instance
// with a `destroy()` method and an unmount callback that calls `destroy()`
// once at teardown.

interface FactoryFixtureInstance {
	readonly destroy: () => void
}

const FACTORY_TEARDOWNS: Array<() => void> = []

export function createFactoryFixture<T extends FactoryFixtureInstance>(
	build: () => T,
): readonly [T, () => void] {
	const instance = build()
	let active = true
	const teardown = (): void => {
		if (!active) return
		active = false
		const index = FACTORY_TEARDOWNS.indexOf(teardown)
		if (index >= 0) FACTORY_TEARDOWNS.splice(index, 1)
		instance.destroy()
	}
	FACTORY_TEARDOWNS.push(teardown)
	return [instance, teardown]
}

// ── Vue mounting helpers ────────────────────────────────────────────────────

const BROWSER_UNMOUNTS: Array<() => void> = []

function registerUnmount(app: App<Element>, container: HTMLElement): () => void {
	let active = true
	const unmount = (): void => {
		if (!active) return
		active = false
		const index = BROWSER_UNMOUNTS.indexOf(unmount)
		if (index >= 0) BROWSER_UNMOUNTS.splice(index, 1)
		app.unmount()
		container.remove()
	}
	BROWSER_UNMOUNTS.push(unmount)
	return unmount
}

/**
 * Mount a Vue app whose only purpose is to run `setup()` inside a real Vue
 * component lifecycle. Returns the value `setup()` returns plus an `unmount`
 * callback. Use this when a composable needs to register `watchEffect`,
 * `onMounted`, etc.
 *
 * Pass `{ silent: true }` for tests that DELIBERATELY trigger a throw from
 * inside `setup()` (or from a post-flush watcher fired during mount). Vue's
 * default error path logs `[Vue warn]: Unhandled error...` and then re-throws
 * — useful in app code, noise in a test whose assertion IS the throw. With
 * `silent: true`, an `app.config.errorHandler` captures the error in place
 * of the warning; `mountSetup` then unmounts and re-throws it so the
 * surrounding `expect(() => …).toThrowError(...)` still fires.
 */
export function mountSetup<T>(
	setup: () => T,
	options: { readonly silent?: boolean } = {},
): readonly [T, () => void] {
	let result: T | undefined
	const container = document.createElement('div')
	document.body.appendChild(container)

	const app = createApp({
		setup() {
			result = setup()
			return () => null
		},
	})

	let captured: unknown = null
	if (options.silent) {
		app.config.errorHandler = (err) => {
			captured = err
		}
	}

	try {
		app.mount(container)
	} catch (err) {
		// Default Vue path (no errorHandler): mount re-throws the error after
		// logging. Tear down before propagating so the DOM stays clean.
		app.unmount()
		container.remove()
		throw err
	}

	if (captured !== null) {
		// Silent path: Vue swallowed the error via our handler. Tear down and
		// re-raise so the test's `toThrowError(...)` still matches.
		app.unmount()
		container.remove()
		throw captured
	}

	if (result === undefined) {
		app.unmount()
		container.remove()
		throw new Error('Expected setup() to return a value')
	}

	return [result, registerUnmount(app, container)]
}

/**
 * Mount `element` inside a Vue app and call `use()` with a `Ref` pointing at
 * the element. Useful for composables whose entry point takes a single
 * `Ref<HTMLElement | null>`.
 */
export function withElement<T, E extends HTMLElement = HTMLElement>(
	element: E,
	use: (element: Ref<E | null>) => T,
): readonly [T, () => void] {
	return mountSetup(() => use(ref<E | null>(element) as Ref<E | null>))
}

// ── Async helpers ───────────────────────────────────────────────────────────

/** Wait for `nextTick()` to flush any post-mount watchEffects. */
export async function waitForBootstrap(delay = 0): Promise<void> {
	await nextTick()
	if (delay > 0) await waitForDelay(delay)
	await nextTick()
}

// ── DOM event helpers ───────────────────────────────────────────────────────

interface TestDragEventOptions {
	readonly x?: number
	readonly y?: number
	readonly data?: DataTransfer
}

export function createDragEvent(name: string, options: TestDragEventOptions = {}): DragEvent {
	return new DragEvent(name, {
		bubbles: true,
		cancelable: true,
		clientX: options.x ?? 0,
		clientY: options.y ?? 0,
		dataTransfer: options.data ?? new DataTransfer(),
	})
}

export function createPointerEvent(name: string, init: PointerEventInit = {}): PointerEvent {
	return new PointerEvent(name, { bubbles: true, cancelable: true, pointerId: 1, ...init })
}

// ── Generic element builder ─────────────────────────────────────────────────
//
// `buildElement` mounts an HTMLElement directly into `document.body` (with
// optional `data-*` attributes and tag-specific properties). This is the
// minimum primitive composable tests need — anything richer is a per-element
// fixture and lives next to its composable test.

export function buildElement<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	options: {
		readonly attrs?: Readonly<Record<string, string>>
		readonly text?: string
	} = {},
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag)
	if (options.attrs) {
		for (const [name, value] of Object.entries(options.attrs)) el.setAttribute(name, value)
	}
	if (options.text !== undefined) el.textContent = options.text
	document.body.appendChild(el)
	return el
}

// ── Dispose hygiene ─────────────────────────────────────────────────────────
// `assertCleanDispose` runs a factory through one show/hide cycle (or any
// caller-supplied exercise) then asserts that `destroy()` reverses every
// `addEventListener`, observer, and timer the factory installed. The
// assertion is what guards routes that swap component instances per
// navigation from accumulating listeners forever.
//
// `installDisposeHarness` is intentionally module-private — its prototype
// patches MUST be reverted via `restore()` in a `finally` block, which
// `assertCleanDispose` already does. Exposing the harness directly is a
// footgun (forgetting `restore()` poisons every subsequent test).

interface DisposeHarness {
	readonly listeners: () => number
	readonly observers: () => number
	readonly restore: () => void
}

function installDisposeHarness(): DisposeHarness {
	const active = new Map<EventTarget, Map<string, Set<unknown>>>()
	const origAdd = EventTarget.prototype.addEventListener
	const origRemove = EventTarget.prototype.removeEventListener

	function wrappedAdd(
		this: EventTarget,
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: AddEventListenerOptions | boolean,
	): void {
		if (listener) {
			let byType = active.get(this)
			if (!byType) {
				byType = new Map()
				active.set(this, byType)
			}
			let bucket = byType.get(type)
			if (!bucket) {
				bucket = new Set()
				byType.set(type, bucket)
			}
			bucket.add(listener)
		}
		return origAdd.call(this, type, listener, options)
	}

	function wrappedRemove(
		this: EventTarget,
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (listener) active.get(this)?.get(type)?.delete(listener)
		return origRemove.call(this, type, listener, options)
	}

	EventTarget.prototype.addEventListener =
		wrappedAdd as typeof EventTarget.prototype.addEventListener
	EventTarget.prototype.removeEventListener =
		wrappedRemove as typeof EventTarget.prototype.removeEventListener

	const observerInstances = new Set<IntersectionObserver>()
	const NativeIO = window.IntersectionObserver
	class TrackedIO extends NativeIO {
		constructor(callback: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
			super(callback, opts)
			observerInstances.add(this)
		}
		override disconnect(): void {
			observerInstances.delete(this)
			super.disconnect()
		}
	}
	window.IntersectionObserver = TrackedIO

	return {
		listeners: () => {
			let total = 0
			for (const byType of active.values()) {
				for (const bucket of byType.values()) total += bucket.size
			}
			return total
		},
		observers: () => observerInstances.size,
		restore: () => {
			EventTarget.prototype.addEventListener = origAdd
			EventTarget.prototype.removeEventListener = origRemove
			window.IntersectionObserver = NativeIO
		},
	}
}

/**
 * Assert that a factory's `destroy()` reverses every listener, observer, and
 * pending timer installed during construction and the optional `exercise`.
 * Also verifies `destroy()` is idempotent (a second call is safe). Timer
 * leaks are only counted when the calling test enables `vi.useFakeTimers()`.
 */
export function assertCleanDispose<T extends FactoryFixtureInstance>(
	setup: () => T,
	exercise?: (instance: T) => void,
): void {
	const harness = installDisposeHarness()
	const fakeTimers = vi.isFakeTimers()
	try {
		const baseListeners = harness.listeners()
		const baseObservers = harness.observers()
		const baseTimers = fakeTimers ? vi.getTimerCount() : 0

		const instance = setup()
		exercise?.(instance)
		instance.destroy()
		instance.destroy()

		expect(harness.listeners() - baseListeners).toBe(0)
		expect(harness.observers() - baseObservers).toBe(0)
		if (fakeTimers) expect(vi.getTimerCount() - baseTimers).toBe(0)
	} finally {
		harness.restore()
	}
}

// ── Reusable DOM fixtures ───────────────────────────────────────────────────
//
// Per-element fixture builders centralized here once they're consumed by
// more than one test file (the statechart describe block + the existing
// one-off describe block in the same test, plus potential future
// composable / integration tests). Each builder returns a small record
// with single-word keys naming the structural slots, ready to feed into
// the matching `create{Name}` factory.

/**
 * Build a `<button>` anchor + `<div popover>` panel + arrow trio that
 * the popover factory operates on. The factory itself sets
 * `popover="manual"`; the fixture provides the baseline DOM structure.
 */
export function createPopoverElements(): {
	readonly anchor: HTMLButtonElement
	readonly panel: HTMLDivElement
	readonly arrow: HTMLDivElement
} {
	const anchor = buildElement('button')
	anchor.type = 'button'
	const panel = buildElement('div', { attrs: { popover: '' } })
	const arrow = document.createElement('div')
	panel.appendChild(arrow)
	return { anchor, panel, arrow }
}

/**
 * Build a `<button>` toggle + `<menu popover>` panel with `<li><a>` items
 * the menu factory operates on. The default of three items matches the
 * roving-focus tests' expectation of a meaningful first / middle / last
 * triple.
 */
export function createMenuElements(itemCount = 3): {
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
} {
	const toggle = buildElement('button')
	toggle.type = 'button'
	const menu = buildElement('menu', { attrs: { popover: '' } })
	for (let i = 0; i < itemCount; i += 1) {
		const li = document.createElement('li')
		const item = document.createElement('a')
		item.href = '#'
		item.textContent = `Item ${i + 1}`
		li.appendChild(item)
		menu.appendChild(li)
	}
	return { toggle, menu }
}

/**
 * Build a `<button>` anchor + `<div popover>` panel pair — the minimum
 * fixture for tooltip tests. No arrow element (tooltips don't ship one
 * by default; see {@link createPopoverElements} for the popover variant).
 */
export function createTooltipElements(): {
	readonly anchor: HTMLButtonElement
	readonly panel: HTMLDivElement
} {
	const anchor = buildElement('button')
	anchor.type = 'button'
	const panel = buildElement('div', { attrs: { popover: '' } })
	return { anchor, panel }
}

/**
 * Build a `<div>` tablist group + two `<button role="tab">` triggers and
 * matching `<div>` panes. The sibling trigger / pane start with the
 * `aria-selected="true"` + revealed-pane configuration so a `show()` on
 * the inactive trigger is observable as the sibling flipping closed.
 */
export function createTabsElements(): {
	readonly group: HTMLDivElement
	readonly trigger: HTMLButtonElement
	readonly pane: HTMLDivElement
	readonly siblingTrigger: HTMLButtonElement
	readonly siblingPane: HTMLDivElement
} {
	const group = buildElement('div')
	const trigger = document.createElement('button')
	trigger.type = 'button'
	trigger.setAttribute('role', 'tab')
	const siblingTrigger = document.createElement('button')
	siblingTrigger.type = 'button'
	siblingTrigger.setAttribute('role', 'tab')
	siblingTrigger.setAttribute('aria-selected', 'true')
	siblingTrigger.setAttribute('aria-controls', 'pane-sibling')
	group.append(siblingTrigger, trigger)
	const pane = buildElement('div')
	const siblingPane = buildElement('div', { attrs: { id: 'pane-sibling' } })
	return { group, trigger, pane, siblingTrigger, siblingPane }
}

/**
 * Build a `<form>` with two named inputs — `username` (required text) +
 * `email` (typed). The required-text field gives form-state tests a
 * predictable native-validity flip when the value is emptied.
 */
export function createFormElements(): {
	readonly form: HTMLFormElement
	readonly username: HTMLInputElement
	readonly email: HTMLInputElement
} {
	const form = buildElement('form')
	const username = document.createElement('input')
	username.name = 'username'
	username.required = true
	username.type = 'text'
	const email = document.createElement('input')
	email.name = 'email'
	email.type = 'email'
	form.append(username, email)
	return { form, username, email }
}

/**
 * Set a form field's value and dispatch a bubbling `input` event so any
 * listeners attached to the form root (e.g. `createForm`'s input bridge)
 * fire as if the user typed. Pair with {@link createFormElements} for
 * form-state tests.
 */
export function inputField(field: HTMLInputElement, value: string): void {
	field.value = value
	field.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Build a `<div popover>` toast root, optionally with the given ARIA
 * role. Empty `role` skips the attribute (the factory will fall back to
 * `role="status"`). Default `'status'` matches the common live-region
 * semantic toasts ship with.
 */
export function createToastElement(role: string = 'status'): HTMLDivElement {
	return buildElement('div', { attrs: role ? { popover: '', role } : { popover: '' } })
}

// ── Statechart scenario runner ──────────────────────────────────────────────
//
// `runScenario` drives a single transition row through its arrange → act →
// assert phases against a freshly-built context. `runScenarios` is the
// `for-await`-of convenience that walks an entire table — typically called
// from `it.each(table)` so per-row failures point at the failing transition.
//
// The runner is intentionally tiny — it owns no fixture lifecycle (callers
// produce the context inside `arrange` or via a closure-captured `build`),
// no event dispatch, and no observable assertion. Every transition's
// arrange / act / assert closures speak DOM directly, so the same harness
// fits factories, composables, and pure-DOM scenarios without abstraction.

export async function runScenario<TState extends string, TEvent extends string, TContext>(
	scenario: StateScenario<TState, TEvent, TContext>,
	context: TContext,
): Promise<void> {
	await scenario.arrange(context, scenario.transition.from)
	await scenario.act(context, scenario.transition.event)
	await scenario.assert(context, scenario.transition.to)
}

export async function runScenarios<TState extends string, TEvent extends string, TContext>(
	scenarios: readonly StateScenario<TState, TEvent, TContext>[],
	build: (scenario: StateScenario<TState, TEvent, TContext>) => TContext,
): Promise<void> {
	for (const scenario of scenarios) {
		await runScenario(scenario, build(scenario))
	}
}

// ── Global teardown ─────────────────────────────────────────────────────────
//
// `vi.restoreAllMocks()` is already registered by `./setup.ts` (re-exported
// above), so it's not repeated here.

afterEach(() => {
	while (BROWSER_UNMOUNTS.length > 0) {
		const unmount = BROWSER_UNMOUNTS.pop()
		unmount?.()
	}
	while (FACTORY_TEARDOWNS.length > 0) {
		const teardown = FACTORY_TEARDOWNS.pop()
		teardown?.()
	}
	document.body.innerHTML = ''
	document.body.className = ''
	document.body.style.cssText = ''
	document.documentElement.removeAttribute('data-mode')
	document.documentElement.removeAttribute('data-theme')
	window.localStorage.removeItem(STORAGE_KEY_THEME)
	resetTheme()
})
