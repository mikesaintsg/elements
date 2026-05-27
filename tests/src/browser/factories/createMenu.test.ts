import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateMenuInstance, CreateMenuOptions } from '@elements/browser'
import { createMenu, MENU_EVENTS, TRANSITION_FALLBACK_MS } from '@elements/browser'
import type { EventRecorder, StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createMenuElements,
	runScenario,
} from '../../../setupBrowser'

describe('createMenu', () => {
	it('rejects non-<menu> panels', () => {
		const toggle = buildElement('button')
		const wrong = buildElement('ul')
		expect(() => createMenu({ toggle, menu: wrong as unknown as HTMLMenuElement })).toThrowError(
			/menu/i,
		)
	})

	it('starts hidden with aria-expanded="false" and aria-haspopup="menu"', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		expect(api.visible.value).toBe(false)
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
		expect(toggle.getAttribute('aria-haspopup')).toBe('menu')
	})

	it('toggle click opens / closes; aria-expanded mirrors', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		toggle.click()
		expect(api.visible.value).toBe(true)
		expect(toggle.getAttribute('aria-expanded')).toBe('true')
		toggle.click()
		expect(api.visible.value).toBe(false)
		expect(toggle.getAttribute('aria-expanded')).toBe('false')
	})

	it('clicking an item dismisses by default', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		api.show()
		const firstItem = menu.querySelector('a')!
		firstItem.click()
		expect(api.visible.value).toBe(false)
	})

	it('keyboard navigation: ArrowDown opens + roves; Home/End jump to ends', () => {
		const { toggle, menu } = createMenuElements()
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		const items = menu.querySelectorAll('a')

		// First ArrowDown on the closed toggle: opens the menu AND focuses the
		// first item (rove-from-nothing → index 0).
		toggle.focus()
		toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		expect(api.visible.value).toBe(true)
		expect(document.activeElement).toBe(items[0])

		// Next ArrowDown moves to the second item.
		items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
		expect(document.activeElement).toBe(items[1])

		// End jumps to the last item.
		items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
		expect(document.activeElement).toBe(items[items.length - 1])

		// Home jumps back to the first.
		items[items.length - 1]?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
		)
		expect(document.activeElement).toBe(items[0])
	})

	it('forwards flip threshold as --set-menu-flip; flip:0 drops the cap', () => {
		const a = createMenuElements()
		const [, ,] = createFactoryFixture(() => createMenu(a, { flip: 7 }))
		expect(a.menu.style.getPropertyValue('--set-menu-flip')).toBe('7')

		const b = createMenuElements()
		const [, ,] = createFactoryFixture(() => createMenu(b, { flip: 0 }))
		expect(b.menu.style.maxBlockSize).toBe('none')
		expect(b.menu.style.positionTryFallbacks).toBe('flip-inline')
	})

	it('uses namespaced event names', () => {
		const { toggle, menu } = createMenuElements()
		const show = createRecorder<[Event]>()
		toggle.addEventListener(MENU_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createMenu({ toggle, menu }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener and clears ARIA', () => {
		assertCleanDispose(
			() => {
				const { toggle, menu } = createMenuElements()
				return createMenu({ toggle, menu })
			},
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Menu composes `createPopover`, so its observable state is the panel's
// native `:popover-open` flag plus the toggle's `aria-expanded` mirror.
// `MENU_EVENTS.open` / `close` fire post-transition (delegated through the
// popover pipeline's `runTransition`), so timer-driven scenarios advance
// `TRANSITION_FALLBACK_MS`.
//
//   States   : 'closed' | 'open'
//   Events   : 'show' | 'hide' | 'toggleclick' | 'itemclick' | 'escape'
//              | 'outside' | 'destroy'

type MenuState = 'closed' | 'open'
type MenuEvent = 'show' | 'hide' | 'toggleclick' | 'itemclick' | 'escape' | 'outside' | 'destroy'

interface MenuContext {
	readonly api: CreateMenuInstance
	readonly toggle: HTMLButtonElement
	readonly menu: HTMLMenuElement
	readonly items: readonly HTMLAnchorElement[]
	readonly opens: EventRecorder
	readonly closes: EventRecorder
}

function buildMenuContext(options: CreateMenuOptions = {}): MenuContext {
	const { toggle, menu } = createMenuElements()
	const items = Array.from(menu.querySelectorAll('a'))
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

function driveToMenuState(context: MenuContext, state: MenuState): void {
	if (state === 'open') {
		context.api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		context.opens.clear()
	}
}

function fireMenuEvent(context: MenuContext, event: MenuEvent): void {
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

function assertMenuState(context: MenuContext, state: MenuState): void {
	const expectedOpen = state === 'open'
	expect(context.api.visible.value).toBe(expectedOpen)
	expect(context.menu.matches(':popover-open')).toBe(expectedOpen)
	expect(context.toggle.getAttribute('aria-expanded')).toBe(expectedOpen ? 'true' : 'false')
}

const MENU_SCENARIOS: readonly StateScenario<MenuState, MenuEvent, MenuContext>[] = [
	{
		transition: { name: 'closed × show → open', from: 'closed', event: 'show', to: 'open' },
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: (context, state) => {
			assertMenuState(context, state)
			expect(context.opens.count).toBe(1)
		},
	},
	{
		transition: { name: 'open × hide → closed', from: 'open', event: 'hide', to: 'closed' },
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: (context, state) => {
			assertMenuState(context, state)
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
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: assertMenuState,
	},
	{
		transition: {
			name: 'open × toggleclick → closed',
			from: 'open',
			event: 'toggleclick',
			to: 'closed',
		},
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: assertMenuState,
	},
	{
		transition: {
			name: 'open × itemclick → closed (dismiss.inside default)',
			from: 'open',
			event: 'itemclick',
			to: 'closed',
		},
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: assertMenuState,
	},
	{
		transition: {
			name: 'open × escape → closed (dismiss.escape default)',
			from: 'open',
			event: 'escape',
			to: 'closed',
		},
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: assertMenuState,
	},
	{
		transition: {
			name: 'open × outside pointerdown → closed (dismiss.outside default)',
			from: 'open',
			event: 'outside',
			to: 'closed',
		},
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: assertMenuState,
	},
	{
		transition: {
			name: 'closed × hide → closed (no-op, no emit)',
			from: 'closed',
			event: 'hide',
			to: 'closed',
		},
		arrange: driveToMenuState,
		act: fireMenuEvent,
		assert: (context, state) => {
			assertMenuState(context, state)
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

	it.each(MENU_SCENARIOS)('$transition.name', async (scenario) => {
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
		driveToMenuState(context, 'open')
		const first = context.items[0]
		expect(first).toBeDefined()
		first?.click()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		assertMenuState(context, 'open')
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
