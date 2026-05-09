import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPopover, POPOVER_EVENTS, TRANSITION_FALLBACK_MS } from '@src/browser'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	createRecorder,
} from '../../../setupBrowser'

/**
 * Build a `<button>` anchor + `<div popover>` panel pair that the popover
 * factory operates on. The factory itself sets `popover="manual"`; the
 * fixture only provides a baseline DOM structure.
 */
function createPopoverElements(): {
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

describe('createPopover', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts hidden and configures native manual popover mode', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		expect(api.visible.value).toBe(false)
		expect(panel.popover).toBe('manual')
		expect(panel.matches(':popover-open')).toBe(false)
	})

	it('show opens the native popover and tags the panel with the resolved side', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }, { placement: 'end' }))
		api.show()
		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBe('end')
		// `position-area` is the inline override that drives the actual
		// placement; surface CSS reads either this or the fallback token.
		expect(panel.style.positionArea).toBe('right')
	})

	it('hide closes the native popover and emits close after transition', () => {
		const { anchor, panel } = createPopoverElements()
		const close = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { on: { close: close.handler } }),
		)
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(false)
		expect(panel.matches(':popover-open')).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
	})

	it('cancelable show is honored', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { on: { show: (event) => event.preventDefault() } }),
		)
		api.show()
		expect(api.visible.value).toBe(false)
	})

	it('outside pointerdown and Escape dismiss by default', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		expect(api.visible.value).toBe(false)

		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(false)
	})

	it('update with new placement refreshes the side attribute', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }, { placement: 'top' }))
		api.show()
		api.update({ placement: 'bottom' })
		expect(api.placement.value).toBe('bottom')
		expect(panel.dataset.popoverSide).toBe('bottom')
		expect(panel.style.positionArea).toBe('bottom')
	})

	it('placement:false skips placement attributes', () => {
		const { anchor, panel } = createPopoverElements()
		const place = createRecorder<[CustomEvent]>()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { placement: false, on: { place: place.handler } }),
		)
		api.show()
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.style.positionArea).toBe('')
		expect(place.count).toBe(0)
	})

	it('hover trigger toggles visibility', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() =>
			createPopover({ anchor, panel }, { trigger: { hover: true } }),
		)
		anchor.dispatchEvent(new Event('mouseenter'))
		expect(api.visible.value).toBe(true)
		anchor.dispatchEvent(new Event('mouseleave'))
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', () => {
		const { anchor, panel } = createPopoverElements()
		const show = createRecorder<[Event]>()
		anchor.addEventListener(POPOVER_EVENTS.show, show.handler)
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		expect(show.count).toBe(1)
	})

	it('destroy clears placement attributes and removes listeners', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		expect(api.visible.value).toBe(false)
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.style.positionArea).toBe('')
		expect(panel.matches(':popover-open')).toBe(false)
	})

	it('destroy is idempotent', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		expect(() => api.destroy()).not.toThrow()
		expect(panel.dataset.popoverSide).toBeUndefined()
	})

	it('show after destroy still applies attributes (state methods stay callable)', () => {
		const { anchor, panel } = createPopoverElements()
		const [api] = createFactoryFixture(() => createPopover({ anchor, panel }))
		api.show()
		api.destroy()
		api.show()
		expect(panel.dataset.popoverSide).toBe('bottom')
	})

	it('destroy reverses every listener and timer it installed', () => {
		assertCleanDispose(
			() => {
				const { anchor, panel } = createPopoverElements()
				return createPopover({ anchor, panel })
			},
			(api) => {
				api.show()
				api.hide()
			},
		)
	})
})
