// ============================================================================
//  createMenu — statechart-driven transition coverage.
//
//  Companion to `createMenu.test.ts`. Menu composes `createPopover`, so its
//  observable state is the panel's native `:popover-open` flag plus the
//  toggle's `aria-expanded` mirror. `MENU_EVENTS.open` / `close` fire post-
//  transition (delegated through the popover pipeline's `runTransition`),
//  so timer-driven scenarios advance `TRANSITION_FALLBACK_MS`.
//
//  States   : 'closed' | 'open'
//  Events   : 'show' | 'hide' | 'toggleclick' | 'itemclick' | 'escape'
//             | 'outside' | 'destroy'
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateMenuInstance, CreateMenuOptions } from '@elements/browser'
import { createMenu, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

type MenuState = 'closed' | 'open'
type MenuEvent = 'show' | 'hide' | 'toggleclick' | 'itemclick' | 'escape' | 'outside' | 'destroy'

interface EventRecorder {
	readonly count: number
	clear(): void
}

interface MenuContext {
	readonly api: CreateMenuInstance
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
	readonly items: readonly HTMLAnchorElement[]
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildMenuContext(options: CreateMenuOptions = {}): MenuContext {
	const toggle = buildElement('button')
	toggle.type = 'button'
	const menu = buildElement('menu', { attrs: { popover: '' } })
	const items: HTMLAnchorElement[] = []
	for (let i = 0; i < 3; i += 1) {
		const li = document.createElement('li')
		const item = document.createElement('a')
		item.href = '#'
		item.textContent = `Item ${i + 1}`
		li.appendChild(item)
		menu.appendChild(li)
		items.push(item)
	}
	const opens = createRecorder<[CustomEvent]>()
	const closes = createRecorder<[CustomEvent]>()
	const [api] = createFactoryFixture(() =>
		createMenu(
			{ toggle, menu },
			{
				...options,
				on: {
					...options.on,
					open: (event) => {
						opens.handler(event)
						options.on?.open?.(event)
					},
					close: (event) => {
						closes.handler(event)
						options.on?.close?.(event)
					},
				},
			},
		),
	)
	return { api, toggle, menu, items, opens, closes }
}

function driveToState(context: MenuContext, state: MenuState): void {
	if (state === 'open') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		context.opens.clear()
	}
}

function fireEvent(context: MenuContext, event: MenuEvent): void {
	if (event === 'show') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'hide') {
		context.api.hide()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'toggleclick') {
		context.toggle.click()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'itemclick') {
		const first = context.items[0]
		if (first) first.click()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'escape') {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	if (event === 'outside') {
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		return
	}
	context.api.destroy()
}

function assertState(context: MenuContext, state: MenuState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.menu.matches(':popover-open')).toBe(expectedOpen)
	expect(context.toggle.getAttribute('aria-expanded')).toBe(expectedOpen ? 'true' : 'false')
}

const scenarios: readonly StateScenario<MenuState, MenuEvent, MenuContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.closes.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'closed × toggleclick → open',
			from: 'closed',
			event: 'toggleclick',
			to: 'open',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'open × toggleclick → closed',
			from: 'open',
			event: 'toggleclick',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'open × itemclick → closed (dismiss.inside default)',
			from: 'open',
			event: 'itemclick',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'open × escape → closed (dismiss.escape default)',
			from: 'open',
			event: 'escape',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'open × outside pointerdown → closed (dismiss.outside default)',
			from: 'open',
			event: 'outside',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: assertState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToState,
		act: fireEvent,
		assert: (context, state) => {
			assertState(context, state)
			expect(context.opens.count).toBe(0)
			expect(context.closes.count).toBe(0)
		},
	},
]

describe('createMenu (statechart)', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it.each(scenarios)('$transition.name', async (scenario) => {
		const context = buildMenuContext()
		expect(context.api.visible.value).toBe(false)
		await runScenario(scenario, context)
	})

	it('guard: preventDefault on MENU_EVENTS.show keeps state at closed', () => {
		const context = buildMenuContext({
			on: { show: (event) => event.preventDefault() },
		})
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(context.api.visible.value).toBe(false)
		expect(context.menu.matches(':popover-open')).toBe(false)
		expect(context.toggle.getAttribute('aria-expanded')).toBe('false')
		expect(context.opens.count).toBe(0)
	})

	it('guard: dismiss.inside=false keeps menu open after item click', () => {
		const context = buildMenuContext({ dismiss: { inside: false } })
		driveToState(context, 'open')
		const first = context.items[0]
		expect(first).toBeDefined()
		first?.click()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		assertState(context, 'open')
	})

	it('cleanup: destroy is idempotent and reverses every listener', () => {
		assertCleanDispose(
			() => {
				const toggle = buildElement('button')
				const menu = buildElement('menu', { attrs: { popover: '' } })
				return createMenu({ toggle, menu })
			},
			(api) => {
				api.show()
				vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
				api.hide()
				vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
			},
		)
	})

	it('cleanup: destroy removes aria-expanded and aria-haspopup from the toggle', () => {
		const context = buildMenuContext()
		expect(context.toggle.hasAttribute('aria-expanded')).toBe(true)
		expect(context.toggle.hasAttribute('aria-haspopup')).toBe(true)
		context.api.destroy()
		expect(context.toggle.hasAttribute('aria-expanded')).toBe(false)
		expect(context.toggle.hasAttribute('aria-haspopup')).toBe(false)
	})
})
