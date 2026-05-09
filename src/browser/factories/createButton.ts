import type { CreateButtonInstance, CreateButtonOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { BUTTON_EVENTS } from '../constants.js'
import { assertElement, bindEventMap, emit } from '../helpers.js'

/**
 * Framework-agnostic toggle-button factory. Mirrors `.active` between the
 * DOM class and a reactive ref; click flips the state and dispatches
 * `elements:button:toggle` with the new value as `event.detail.active`.
 *
 * Element gating: the host MUST be `<button>` (`HTMLButtonElement`). Throws
 * on mismatch — toggle semantics rely on `aria-pressed`, which only applies
 * to button-role elements.
 *
 * @remarks Mount-time class seed does not fire a toggle event; subsequent
 * click-driven flips do.
 */
export function createButton(
	element: HTMLButtonElement,
	options: CreateButtonOptions = {},
): CreateButtonInstance {
	assertElement<HTMLButtonElement>(element, 'button', 'createButton')

	const scope = effectScope()
	const active = scope.run(() => ref(element.classList.contains('active')))
	if (!active) throw new Error('createButton: failed to initialize reactive scope')

	// Seed `aria-pressed` from the initial active state so screen readers
	// announce the toggle's current value on first paint.
	element.setAttribute('aria-pressed', String(active.value))

	const toggle = (): void => {
		active.value = !active.value
		element.classList.toggle('active', active.value)
		element.setAttribute('aria-pressed', String(active.value))
		emit(element, BUTTON_EVENTS.toggle, { active: active.value })
	}

	const onClick = (): void => toggle()

	const offBound = bindEventMap(element, BUTTON_EVENTS, options.on)
	element.addEventListener('click', onClick)

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			element.removeEventListener('click', onClick)
			scope.stop()
		}
		element.classList.remove('active')
		element.removeAttribute('aria-pressed')
	}

	return { active: readonly(active), toggle, destroy }
}
