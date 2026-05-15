import { describe, expect, it } from 'vitest'
import { createTabs, TABS_EVENTS } from '@elements/browser'
import { createRecorder } from '../../../setup'
import { assertCleanDispose, buildElement, createFactoryFixture } from '../../../setupBrowser'

function createTabsFixture(): {
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
	// Sibling pane starts visible (no `[hidden]`) because its trigger has
	// `aria-selected="true"` above; the factory's job on `show()` of THE
	// OTHER trigger is to hide this one.
	return { group, trigger, pane, siblingTrigger, siblingPane }
}

describe('createTabs', () => {
	it('seeds ARIA + aria-controls + [hidden] on the inactive pane', () => {
		const { trigger, pane, group } = createTabsFixture()
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
		const { trigger, pane, group, siblingTrigger, siblingPane } = createTabsFixture()
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		expect(api.active.value).toBe(true)
		expect(trigger.getAttribute('aria-selected')).toBe('true')
		expect(siblingTrigger.getAttribute('aria-selected')).toBe('false')
		expect(pane.hasAttribute('hidden')).toBe(false)
		expect(siblingPane.hasAttribute('hidden')).toBe(true)
	})

	it('hide re-applies [hidden] to its own pane', () => {
		const { trigger, pane, group } = createTabsFixture()
		const [api] = createFactoryFixture(() =>
			createTabs({ trigger, pane, group }, { initial: true }),
		)
		expect(pane.hasAttribute('hidden')).toBe(false)
		api.hide()
		expect(api.active.value).toBe(false)
		expect(pane.hasAttribute('hidden')).toBe(true)
	})

	it('paints --set-tabs-indicator-* on show', () => {
		const { trigger, pane, group } = createTabsFixture()
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		// jsdom rect is zero-sized but the property is still written.
		expect(group.style.getPropertyValue('--set-tabs-indicator-x')).toMatch(/px$/)
		expect(group.style.getPropertyValue('--set-tabs-indicator-width')).toMatch(/px$/)
	})

	it('uses namespaced event names', () => {
		const { trigger, pane, group } = createTabsFixture()
		const show = createRecorder<[Event]>()
		trigger.addEventListener(TABS_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => {
			const { trigger, pane, group } = createTabsFixture()
			return createTabs({ trigger, pane, group })
		})
	})
})
