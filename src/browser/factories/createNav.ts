import type { CreateNavElements, CreateNavInstance, CreateNavOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import {
	DEFAULT_NAV_OFFSET_PX,
	DEFAULT_NAV_THRESHOLD,
	NAV_EVENTS,
	NAV_LINK_SELECTOR,
	NAV_SECTION_SELECTOR,
} from '../constants.js'
import { assertElement, bindEventMap, emit } from '../helpers.js'

/**
 * Framework-agnostic IntersectionObserver-driven scroll-spy factory
 * (renamed from `createScrollSpy`). Watches every `[id]` section under
 * the bound scrollable container; the matching `<a href="#id">` link
 * inside the optional `<nav>` element receives `aria-current="location"`
 * (replacing Bootstrap's `.active` class — `aria-current` is the
 * semantic contract for "this is the section the user is on").
 *
 * Element gating: the optional `nav` argument MUST be `<nav>` when
 * supplied. The container can be any scrollable element (typically
 * `<main>` or `<article>`).
 */
export function createNav(
	elements: CreateNavElements,
	options: CreateNavOptions = {},
): CreateNavInstance {
	const { container, nav } = elements
	if (nav) assertElement(nav, 'nav', 'createNav')

	const offset = options.intersection?.offset ?? DEFAULT_NAV_OFFSET_PX
	const margin = options.intersection?.margin
	const threshold = options.intersection?.threshold ?? DEFAULT_NAV_THRESHOLD

	const scope = effectScope()
	const active = scope.run(() => ref<string | null>(null))
	if (!active) throw new Error('createNav: failed to initialize reactive scope')

	let observer: IntersectionObserver | null = null

	const setActive = (id: string): void => {
		if (id === active.value) return
		active.value = id
		if (nav) {
			nav.querySelectorAll<HTMLElement>(NAV_LINK_SELECTOR).forEach((link) => {
				const href = link.getAttribute('href')
				const isActive = href === `#${id}` || href === id
				if (isActive) link.setAttribute('aria-current', 'location')
				else link.removeAttribute('aria-current')
			})
		}
		emit(container, NAV_EVENTS.activate, { id })
	}

	const observe = (): void => {
		observer?.disconnect()

		const root = container.scrollHeight > container.clientHeight ? container : null
		const observerThreshold: number | number[] =
			typeof threshold === 'number'
				? threshold
				: threshold === undefined
					? 0
					: Array.from(threshold)
		const observerOptions: IntersectionObserverInit = {
			root,
			threshold: observerThreshold,
			rootMargin: margin ?? `-${offset}px 0px 0px 0px`,
		}

		const visible = new Set<string>()
		const sections = Array.from(container.querySelectorAll<HTMLElement>(NAV_SECTION_SELECTOR))

		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) visible.add(entry.target.id)
				else visible.delete(entry.target.id)
			}
			for (const section of sections) {
				if (visible.has(section.id)) {
					setActive(section.id)
					break
				}
			}
		}, observerOptions)

		sections.forEach((s) => observer?.observe(s))
	}

	const refresh = (): void => observe()

	const offBound = bindEventMap(container, NAV_EVENTS, options.on)
	observe()

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			scope.stop()
		}
		observer?.disconnect()
		observer = null
		if (nav) {
			for (const link of nav.querySelectorAll<HTMLElement>(NAV_LINK_SELECTOR)) {
				link.removeAttribute('aria-current')
			}
		}
	}

	return {
		active: readonly(active),
		refresh,
		destroy,
	}
}
