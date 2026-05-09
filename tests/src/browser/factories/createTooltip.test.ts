import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTooltip, TOOLTIP_EVENTS, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

function createTooltipElements(): {
	readonly anchor: HTMLButtonElement
	readonly panel: HTMLDivElement
} {
	const anchor = buildElement('button')
	anchor.type = 'button'
	const panel = buildElement('div', { attrs: { popover: '' } })
	return { anchor, panel }
}

describe('createTooltip', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts hidden, sets manual popover + role="tooltip"', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		expect(api.visible.value).toBe(false)
		expect(panel.popover).toBe('manual')
		expect(panel.getAttribute('role')).toBe('tooltip')
	})

	it('hover anchor shows tooltip; mouseleave hides', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		anchor.dispatchEvent(new Event('mouseenter'))
		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		anchor.dispatchEvent(new Event('mouseleave'))
		expect(api.visible.value).toBe(false)
	})

	it('focus anchor shows tooltip; blur hides', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		anchor.dispatchEvent(new Event('focusin'))
		expect(api.visible.value).toBe(true)
		anchor.dispatchEvent(new Event('focusout'))
		expect(api.visible.value).toBe(false)
	})

	it('show writes data-tooltip-side + position-area', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }, { placement: 'top' }))
		api.show()
		expect(panel.dataset.tooltipSide).toBe('top')
		expect(panel.style.positionArea).toBe('top')
	})

	it('Escape dismisses by default', () => {
		const { anchor, panel } = createTooltipElements()
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { anchor, panel } = createTooltipElements()
		const show = createRecorder<[Event]>()
		anchor.addEventListener(TOOLTIP_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createTooltip({ anchor, panel }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(
			() => {
				const { anchor, panel } = createTooltipElements()
				return createTooltip({ anchor, panel })
			},
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
