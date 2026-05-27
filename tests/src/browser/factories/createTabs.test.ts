import { describe, expect, it } from 'vitest'
import type { CreateTabsInstance, CreateTabsOptions } from '@elements/browser'
import { createTabs, TABS_EVENTS } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	createFactoryFixture,
	createTabsElements,
	runScenario,
} from '../../../setupBrowser'

describe('createTabs', () => {
	it('seeds ARIA + aria-controls + [hidden] on the inactive pane', () => {
		const { trigger, pane, group } = createTabsElements()
		createFactoryFixture(() => createTabs({ trigger, pane, group }))
		expect(trigger.getAttribute('aria-selected')).toBe('false')
		expect(trigger.getAttribute('tabindex')).toBe('-1')
		expect(trigger.hasAttribute('aria-controls')).toBe(true)
		// Inactive pane uses the HTML `[hidden]` attribute — matches the
		// `[role='tabpanel'][hidden] { display: none }` rule in
		// `components/_nav.scss`. The previous contract toggled
		// `[aria-hidden]`, which doesn't drive `display: none` and left
		// the pane visible.
		expect(pane.hasAttribute('hidden')).toBe(true)
	})

	it('show flips aria-selected, hides the sibling pane, reveals own pane', () => {
		const { trigger, pane, group, siblingTrigger, siblingPane } = createTabsElements()
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		expect(api.active.value).toBe(true)
		expect(trigger.getAttribute('aria-selected')).toBe('true')
		expect(siblingTrigger.getAttribute('aria-selected')).toBe('false')
		expect(pane.hasAttribute('hidden')).toBe(false)
		expect(siblingPane.hasAttribute('hidden')).toBe(true)
	})

	it('hide re-applies [hidden] to its own pane', () => {
		const { trigger, pane, group } = createTabsElements()
		const [api] = createFactoryFixture(() =>
			createTabs({ trigger, pane, group }, { initial: true }),
		)
		expect(pane.hasAttribute('hidden')).toBe(false)
		api.hide()
		expect(api.active.value).toBe(false)
		expect(pane.hasAttribute('hidden')).toBe(true)
	})

	it('paints --set-tabs-indicator-* on show', () => {
		const { trigger, pane, group } = createTabsElements()
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		// jsdom rect is zero-sized but the property is still written.
		expect(group.style.getPropertyValue('--set-tabs-indicator-x')).toMatch(/px$/)
		expect(group.style.getPropertyValue('--set-tabs-indicator-width')).toMatch(/px$/)
	})

	it('uses namespaced event names', () => {
		const { trigger, pane, group } = createTabsElements()
		const show = createRecorder<[Event]>()
		trigger.addEventListener(TABS_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => {
			const { trigger, pane, group } = createTabsElements()
			return createTabs({ trigger, pane, group })
		})
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Tabs is a per-trigger binary state — `active.value` mirrors
// `[aria-selected]` on the trigger and the inverse of `[hidden]` on the
// pane. Sibling coordination is event-driven (no shared registry): a
// `show()` on this tab dispatches an event the sibling factory listens
// for to hide itself.
//
//   States   : 'inactive' | 'active'
//   Events   : 'show' | 'hide' | 'toggle' | 'click' | 'destroy'

type TabsState = 'inactive' | 'active'
type TabsEvent = 'show' | 'hide' | 'toggle' | 'click' | 'destroy'

interface TabsContext {
	readonly api: CreateTabsInstance
	readonly trigger: HTMLButtonElement
	readonly pane: HTMLDivElement
	readonly siblingTrigger: HTMLButtonElement
	readonly siblingPane: HTMLDivElement
}

function buildTabsContext(options: CreateTabsOptions = {}): TabsContext {
	const { group, trigger, pane, siblingTrigger, siblingPane } = createTabsElements()
	const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }, options))
	return { api, trigger, pane, siblingTrigger, siblingPane }
}

function driveToTabsState(context: TabsContext, state: TabsState): void {
	if (state === 'active') context.api.show()
}

function fireTabsEvent(context: TabsContext, event: TabsEvent): void {
	if (event === 'show') {
		context.api.show()
		return
	}
	if (event === 'hide') {
		context.api.hide()
		return
	}
	if (event === 'toggle') {
		context.api.toggle()
		return
	}
	if (event === 'click') {
		context.trigger.click()
		return
	}
	context.api.destroy()
}

function assertTabsState(context: TabsContext, state: TabsState): void {
	const expectedActive = state === 'active'
	expect(context.api.active.value).toBe(expectedActive)
	expect(context.trigger.getAttribute('aria-selected')).toBe(expectedActive ? 'true' : 'false')
	expect(context.pane.hasAttribute('hidden')).toBe(!expectedActive)
}

const TABS_SCENARIOS: readonly StateScenario<TabsState, TabsEvent, TabsContext>[] = [
	{
		transition: {
			name: 'inactive × show → active (sibling pane hides)',
			from: 'inactive',
			event: 'show',
			to: 'active',
		},
		arrange: driveToTabsState,
		act: fireTabsEvent,
		assert: (context, state) => {
			assertTabsState(context, state)
			expect(context.siblingTrigger.getAttribute('aria-selected')).toBe('false')
			expect(context.siblingPane.hasAttribute('hidden')).toBe(true)
		},
	},
	{
		transition: { name: 'active × hide → inactive', from: 'active', event: 'hide', to: 'inactive' },
		arrange: driveToTabsState,
		act: fireTabsEvent,
		assert: assertTabsState,
	},
	{
		transition: {
			name: 'inactive × toggle → active',
			from: 'inactive',
			event: 'toggle',
			to: 'active',
		},
		arrange: driveToTabsState,
		act: fireTabsEvent,
		assert: assertTabsState,
	},
	{
		transition: {
			name: 'active × toggle → inactive',
			from: 'active',
			event: 'toggle',
			to: 'inactive',
		},
		arrange: driveToTabsState,
		act: fireTabsEvent,
		assert: assertTabsState,
	},
	{
		transition: {
			name: 'inactive × click → active (native trigger click)',
			from: 'inactive',
			event: 'click',
			to: 'active',
		},
		arrange: driveToTabsState,
		act: fireTabsEvent,
		assert: assertTabsState,
	},
]

describe('createTabs (statechart)', () => {
	it.each(TABS_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildTabsContext()
		expect(context.api.active.value).toBe(false)
		await runScenario(scenario, context)
	})
})
