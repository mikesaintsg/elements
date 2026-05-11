import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { POPOVER_EVENTS, TRANSITION_FALLBACK_MS, usePopover } from '@elements/browser'
import { buildElement, createRecorder, mountSetup, waitForBootstrap } from '../../../setupBrowser'

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

describe('usePopover', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('starts hidden and configures native manual popover mode', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() => usePopover({ anchor: ref(anchor), panel: ref(panel) }))
		await waitForBootstrap()

		expect(api.visible.value).toBe(false)
		expect(panel.popover).toBe('manual')
		expect(panel.matches(':popover-open')).toBe(false)
		unmount()
	})

	it('show opens the native popover and tags the panel side', async () => {
		const { anchor, panel } = createPopoverElements()
		const show = createRecorder<[CustomEvent]>()
		const open = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				placement: 'end',
				on: { show: show.handler, open: open.handler },
			}),
		)
		await waitForBootstrap()

		api.show()

		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBe('end')
		expect(panel.style.positionArea).toBe('right')
		expect(show.count).toBe(1)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(open.count).toBe(1)
		unmount()
	})

	it('hide closes the native popover and emits close after transition fallback', async () => {
		const { anchor, panel } = createPopoverElements()
		const close = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			usePopover({ anchor: ref(anchor), panel: ref(panel), on: { close: close.handler } }),
		)
		await waitForBootstrap()

		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()

		expect(api.visible.value).toBe(false)
		expect(panel.matches(':popover-open')).toBe(false)
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		expect(close.count).toBe(1)
		unmount()
	})

	it('cancelable show and hide events are honored', async () => {
		const first = createPopoverElements()
		const [blocked, unmountBlocked] = mountSetup(() =>
			usePopover({
				anchor: ref(first.anchor),
				panel: ref(first.panel),
				on: { show: (event) => event.preventDefault() },
			}),
		)
		await waitForBootstrap()
		blocked.show()
		expect(blocked.visible.value).toBe(false)
		unmountBlocked()

		const second = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(second.anchor),
				panel: ref(second.panel),
				on: { hide: (event) => event.preventDefault() },
			}),
		)
		await waitForBootstrap()
		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		api.hide()
		expect(api.visible.value).toBe(true)
		unmount()
	})

	it('click, hover, and focus triggers work while programmatic methods stay available', async () => {
		const click = createPopoverElements()
		const [clickApi, unmountClick] = mountSetup(() =>
			usePopover({
				anchor: ref(click.anchor),
				panel: ref(click.panel),
				trigger: { click: true },
			}),
		)
		await waitForBootstrap()
		click.anchor.click()
		expect(clickApi.visible.value).toBe(true)
		clickApi.hide()
		expect(clickApi.visible.value).toBe(false)
		unmountClick()

		const hover = createPopoverElements()
		const [hoverApi, unmountHover] = mountSetup(() =>
			usePopover({
				anchor: ref(hover.anchor),
				panel: ref(hover.panel),
				trigger: { hover: true },
			}),
		)
		await waitForBootstrap()
		hover.anchor.dispatchEvent(new Event('mouseenter'))
		expect(hoverApi.visible.value).toBe(true)
		hover.anchor.dispatchEvent(new Event('mouseleave'))
		expect(hoverApi.visible.value).toBe(false)
		unmountHover()

		const focus = createPopoverElements()
		const [focusApi, unmountFocus] = mountSetup(() =>
			usePopover({
				anchor: ref(focus.anchor),
				panel: ref(focus.panel),
				trigger: { focus: true },
			}),
		)
		await waitForBootstrap()
		focus.anchor.dispatchEvent(new Event('focusin'))
		expect(focusApi.visible.value).toBe(true)
		focus.anchor.dispatchEvent(new Event('focusout'))
		expect(focusApi.visible.value).toBe(false)
		unmountFocus()
	})

	it('empty trigger object disables automatic listeners but keeps programmatic control', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({ anchor: ref(anchor), panel: ref(panel), trigger: {} }),
		)
		await waitForBootstrap()

		anchor.click()
		expect(api.visible.value).toBe(false)
		api.show()
		expect(api.visible.value).toBe(true)
		unmount()
	})

	it('placement:false opens natively without placement attributes', async () => {
		const { anchor, panel } = createPopoverElements()
		const place = createRecorder<[CustomEvent]>()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				placement: false,
				on: { place: place.handler },
			}),
		)
		await waitForBootstrap()

		api.show()

		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.style.positionArea).toBe('')
		expect(place.count).toBe(0)
		unmount()
	})

	it('outside pointerdown and Escape dismiss by default', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() => usePopover({ anchor: ref(anchor), panel: ref(panel) }))
		await waitForBootstrap()

		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		expect(api.visible.value).toBe(false)

		api.show()
		vi.advanceTimersByTime(TRANSITION_FALLBACK_MS)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(false)
		unmount()
	})

	it('dismiss options can keep outside pointerdown and Escape from closing', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				dismiss: { outside: false, escape: false },
			}),
		)
		await waitForBootstrap()

		api.show()
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(api.visible.value).toBe(true)
		unmount()
	})

	it('show and hide delays can be canceled by the opposite action', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				delay: { show: 200, hide: 300 },
			}),
		)
		await waitForBootstrap()

		api.show()
		api.hide()
		vi.advanceTimersByTime(200)
		expect(api.visible.value).toBe(false)

		api.show()
		vi.advanceTimersByTime(200)
		api.hide()
		api.show()
		vi.advanceTimersByTime(300)
		expect(api.visible.value).toBe(true)
		unmount()
	})

	it('repeated delayed actions only keep the latest pending timer', async () => {
		const { anchor, panel } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				delay: { show: 200, hide: 300 },
			}),
		)
		await waitForBootstrap()

		api.show()
		vi.advanceTimersByTime(100)
		api.show()
		api.hide()
		vi.advanceTimersByTime(200)
		expect(api.visible.value).toBe(false)

		api.show()
		vi.advanceTimersByTime(200)
		api.hide()
		vi.advanceTimersByTime(100)
		api.hide()
		api.show()
		vi.advanceTimersByTime(300)
		expect(api.visible.value).toBe(true)
		unmount()
	})

	it('update refreshes placement attributes and emits place', async () => {
		const { anchor, panel } = createPopoverElements()
		const place = createRecorder<[CustomEvent]>()
		const placement = ref<'top' | 'bottom'>('top')
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				placement,
				on: { place: place.handler },
			}),
		)
		await waitForBootstrap()

		api.show()
		placement.value = 'bottom'
		await nextTick()

		expect(api.placement.value).toBe('bottom')
		expect(api.visible.value).toBe(true)
		expect(panel.matches(':popover-open')).toBe(true)
		expect(panel.dataset.popoverSide).toBe('bottom')
		expect(panel.style.positionArea).toBe('bottom')
		expect(place.count).toBeGreaterThan(0)
		unmount()
	})

	it('updates the resolved-side attribute after native fallback flips placement', async () => {
		const { anchor, panel } = createPopoverElements()
		vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 100, 80, 40))
		vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 40, 80, 60))
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				placement: 'bottom',
			}),
		)
		await waitForBootstrap()

		api.show()
		// Initial assignment is the requested side; the post-frame resolve
		// then reads the actual rectangles and swaps to the rendered side.
		expect(panel.dataset.popoverSide).toBe('bottom')

		await vi.advanceTimersByTimeAsync(20)

		expect(panel.dataset.popoverSide).toBe('top')
		unmount()
	})

	it('writes anchor-name + position-anchor and clears them on unmount', async () => {
		const { anchor, panel, arrow } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({
				anchor: ref(anchor),
				panel: ref(panel),
				arrow: ref(arrow),
				placement: 'bottom-start',
				offset: 12,
			}),
		)
		await waitForBootstrap()

		api.show()

		// The factory wires an explicit anchor binding so consumer CSS can
		// read the anchor's edges via `anchor()` calc — placement flows
		// through `position-area` (inline style) and the resolved-side
		// attribute on the panel, not through component classes.
		expect(anchor.style.anchorName).toMatch(/^--elements-anchor-/)
		expect(panel.style.positionAnchor).toBe(anchor.style.anchorName)
		expect(arrow.style.cssText).toBe('')
		expect(panel.dataset.popoverStrategy).toBe('absolute')
		expect(panel.dataset.popoverOffset).toBe('12')
		// `position-area` is normalized by the browser; the order of the
		// physical-axis token and the `span-*` token may swap on read.
		expect(panel.style.positionArea).toMatch(/(bottom\s+span-right|span-right\s+bottom)/)

		unmount()

		expect(anchor.style.anchorName).toBe('')
		expect(panel.style.positionAnchor).toBe('')
		expect(panel.dataset.popoverStrategy).toBeUndefined()
		expect(panel.dataset.popoverOffset).toBeUndefined()
	})

	it('destroy and unmount clear native popover state', async () => {
		const { anchor, panel, arrow } = createPopoverElements()
		const [api, unmount] = mountSetup(() =>
			usePopover({ anchor: ref(anchor), panel: ref(panel), arrow: ref(arrow) }),
		)
		await waitForBootstrap()

		api.show()
		api.destroy()

		expect(api.visible.value).toBe(false)
		expect(anchor.style.cssText).toBe('')
		expect(panel.style.cssText).toBe('')
		expect(arrow.style.cssText).toBe('')
		expect(panel.dataset.popoverSide).toBeUndefined()
		expect(panel.matches(':popover-open')).toBe(false)

		api.show()
		expect(panel.dataset.popoverSide).toBe('bottom')
		unmount()
		expect(api.visible.value).toBe(false)
	})

	it('uses namespaced event names', async () => {
		const { anchor, panel } = createPopoverElements()
		const show = createRecorder<[Event]>()
		anchor.addEventListener(POPOVER_EVENTS.show, show.handler)
		const [api, unmount] = mountSetup(() => usePopover({ anchor: ref(anchor), panel: ref(panel) }))
		await waitForBootstrap()

		api.show()

		expect(show.count).toBe(1)
		unmount()
	})
})
