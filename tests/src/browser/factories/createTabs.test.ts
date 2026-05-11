import { describe, expect, it } from 'vitest'
import { createTabs, TABS_EVENTS } from '@elements/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

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
	siblingPane.setAttribute('data-tab-open', '')
	return { group, trigger, pane, siblingTrigger, siblingPane }
}

describe('createTabs', () => {
	it('seeds ARIA + aria-controls when missing', () => {
		const { trigger, pane, group } = createTabsFixture()
		createFactoryFixture(() => createTabs({ trigger, pane, group }))
		expect(trigger.getAttribute('aria-selected')).toBe('false')
		expect(trigger.getAttribute('tabindex')).toBe('-1')
		expect(trigger.hasAttribute('aria-controls')).toBe(true)
		expect(pane.getAttribute('aria-hidden')).toBe('true')
	})

	it('show flips aria-selected and deactivates the active sibling', () => {
		const { trigger, pane, group, siblingTrigger, siblingPane } = createTabsFixture()
		const [api] = createFactoryFixture(() => createTabs({ trigger, pane, group }))
		api.show()
		expect(api.active.value).toBe(true)
		expect(trigger.getAttribute('aria-selected')).toBe('true')
		expect(siblingTrigger.getAttribute('aria-selected')).toBe('false')
		void siblingPane
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
