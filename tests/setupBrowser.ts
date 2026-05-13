// ============================================================================
//  Browser test setup — composable + factory test infrastructure.
//
//  Imports the same SCSS pipeline the style tests use so any test that needs
//  CSS-resolved tokens (e.g. surface-layer rules, modifier rules) works
//  without duplicating the import sequence.
//
//  Three groups of helpers live here:
//    1. Vue mounting harness   — `mount`, `withElement`, `mountComponent`.
//    2. Async / event helpers  — `waitForBootstrap`, `flushPromises`,
//       `createPointerEvent`, `createDragEvent`, `fireTransitionEnd`.
//    3. Dispose harness        — `installDisposeHarness`, `assertCleanDispose`
//       — used to verify factories tear down every listener / observer they
//       installed.
//
//  Per-element fixture builders (createDialogElement, createMenuElement, …)
//  live with their composable test files; this setup ships only generic
//  primitives so it stays small.
// ============================================================================

// Loads the same CSS pipeline the styles tests use, so tests under
// tests/src/browser/ that need CSS-resolved tokens or stylesheet introspection
// work without duplicating the import sequence.
import './setup.css'
import '../src/styles/index.scss'

import type { App, Component, Ref } from 'vue'
import type { DragEndDetail, DragStartDetail } from '../src/browser/types'
import { afterEach, expect, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import { STORAGE_KEY_THEME } from '../src/browser/constants'
import { resetTheme } from '../src/browser/factories/createTheme'
import { extractProperty, waitForDelay } from './setup'

export * from './setup'

// ── Factory fixtures ────────────────────────────────────────────────────────
// Factory tests do NOT mount a Vue app — factories are framework-agnostic.
// `createFactoryFixture` accepts a setup function that returns a `{ destroy }`
// instance and an unmount callback that calls `destroy()` once at teardown.

export interface FactoryFixtureInstance {
	readonly destroy: () => void
}

export const FACTORY_TEARDOWNS: Array<() => void> = []

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

export const BROWSER_UNMOUNTS: Array<() => void> = []

export interface TestDragEventOptions {
	readonly x?: number
	readonly y?: number
	readonly data?: DataTransfer
}

export function registerUnmount(app: App<Element>, container: HTMLElement): () => void {
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
 */
export function mountSetup<T>(setup: () => T): readonly [T, () => void] {
	let result: T | undefined
	const container = document.createElement('div')
	document.body.appendChild(container)

	const app = createApp({
		setup() {
			result = setup()
			return () => null
		},
	})
	app.mount(container)

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

/**
 * Mount a real Vue component with optional props and provides. Returns the
 * mounted root element and an `unmount` callback.
 */
export async function mountComponent(
	component: Component,
	props?: Record<string, unknown>,
	provides?: Record<string | symbol, unknown>,
): Promise<readonly [HTMLElement, () => void]> {
	const container = document.createElement('div')
	document.body.appendChild(container)

	const app = createApp({
		render() {
			return h(component, props)
		},
	})

	if (provides !== undefined) {
		for (const [key, value] of Object.entries(provides)) {
			app.provide(key, value)
		}
		for (const key of Object.getOwnPropertySymbols(provides)) {
			app.provide(key, provides[key])
		}
	}

	app.mount(container)
	await nextTick()

	return [container, registerUnmount(app, container)]
}

// ── Async helpers ───────────────────────────────────────────────────────────

/** Resolve after the next two microtask ticks — flushes most pending promises. */
export async function flushPromises(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
}

export async function waitForFrame(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve())
	})
}

/** Wait for `nextTick()` to flush any post-mount watchEffects. */
export async function waitForBootstrap(delay = 0): Promise<void> {
	await nextTick()
	if (delay > 0) {
		await waitForDelay(delay)
	}
	await nextTick()
}

/**
 * Poll `predicate()` up to ~20 microtask ticks. Throws `message` after
 * exhausting attempts.
 */
export async function waitForCondition(
	predicate: () => boolean,
	message = 'Expected condition',
): Promise<void> {
	for (let i = 0; i < 20; i++) {
		if (predicate()) return
		await flushPromises()
		await waitForFrame()
	}
	throw new Error(message)
}

// ── DOM event helpers ───────────────────────────────────────────────────────

/**
 * Dispatch a `transitionend` event on `el`. Many factories use this event
 * to commit the post-show / post-hide phase; firing it manually skips the
 * 400ms `TRANSITION_FALLBACK_MS` timer.
 */
export function fireTransitionEnd(el: Element): void {
	el.dispatchEvent(new Event('transitionend', { bubbles: true }))
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

export function typeInput(
	input: HTMLInputElement,
	handler: (event: Event) => void,
	value: string,
): void {
	input.value = value
	input.addEventListener('input', handler)
	input.dispatchEvent(new Event('input', { bubbles: true }))
	input.removeEventListener('input', handler)
}

export function computeElementCenter(element: HTMLElement): {
	readonly x: number
	readonly y: number
} {
	const rect = element.getBoundingClientRect()
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function computeElementBottom(element: HTMLElement): {
	readonly x: number
	readonly y: number
} {
	const rect = element.getBoundingClientRect()
	return { x: rect.left + rect.width / 2, y: rect.bottom - 1 }
}

export function layoutRows(rows: readonly HTMLElement[]): void {
	for (const row of rows) {
		row.style.display = 'block'
		row.style.height = '24px'
		row.style.padding = '0'
	}
}

export function extractDragStartDetail(event: CustomEvent | undefined): DragStartDetail {
	const detail = event?.detail
	const indices = extractProperty(detail, 'indices')
	const pointer = extractProperty(detail, 'pointer')
	if (indices instanceof Set && pointer instanceof PointerEvent) {
		return { indices, pointer }
	}
	throw new Error('Expected drag start detail')
}

export function extractDragEndDetail(event: CustomEvent | undefined): DragEndDetail {
	const detail = event?.detail
	const cancelled = extractProperty(detail, 'cancelled')
	const pointer = extractProperty(detail, 'pointer')
	if (typeof cancelled === 'boolean' && (pointer instanceof PointerEvent || pointer === null)) {
		return { cancelled, pointer }
	}
	throw new Error('Expected drag end detail')
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

export interface DisposeHarness {
	readonly listeners: () => number
	readonly observers: () => number
	readonly restore: () => void
}

export function installDisposeHarness(): DisposeHarness {
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

// ── Global teardown ─────────────────────────────────────────────────────────

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
	document.documentElement.removeAttribute('data-theme')
	window.localStorage.removeItem(STORAGE_KEY_THEME)
	resetTheme()
	vi.restoreAllMocks()
})
