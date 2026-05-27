import type { CreateFocusInstance, CreateFocusOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { FOCUS_EVENTS, FOCUSABLE_SELECTOR } from '../constants.js'
import { attachListeners, emit } from '../helpers.js'

/**
 * Framework-agnostic focus management factory. Confines `Tab` navigation
 * to focusable descendants of the host element while active and restores
 * the previous focus on deactivation — a focus trap with explicit
 * `activate()` / `deactivate()` lifecycle.
 *
 * Lifecycle:
 *   - `activate()`   stores the currently focused element, then focuses
 *                    the first focusable descendant (or `initial`, when
 *                    supplied).
 *   - `deactivate()` restores focus to whatever was focused before
 *                    activation (skipped if `restore: false`).
 *
 * Tab handling: when focus is on the last focusable element, Tab wraps
 * to the first; Shift+Tab on the first wraps to the last. Other keys
 * pass through.
 *
 * Element-agnostic — accepts any `HTMLElement`. The host MUST contain
 * at least one focusable descendant for the trap to function; if not,
 * `activate()` is a no-op (consumers should style the trap container
 * with `tabindex="-1"` and call `host.focus()` themselves).
 *
 * @remarks This factory is intentionally minimal — the dialog / aside
 * factories layer their own ARIA / scroll-lock concerns on top.
 */
export function createFocus(
	element: HTMLElement,
	options: CreateFocusOptions = {},
): CreateFocusInstance {
	const restore = options.restore ?? true
	const initialOpt = options.initial

	const scope = effectScope()
	const active = scope.run(() => ref(false))
	if (!active) throw new Error('createFocus: failed to initialize reactive scope')

	let previousFocus: Element | null = null

	const focusables = (): HTMLElement[] =>
		Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
			(el) => !el.hasAttribute('disabled'),
		)

	const onKeydown = (event: Event): void => {
		if (!(event instanceof KeyboardEvent)) return
		if (!active.value || event.key !== 'Tab') return
		const items = focusables()
		const first = items[0]
		const last = items.at(-1)
		if (!first || !last) return

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault()
			last.focus()
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault()
			first.focus()
		}
	}

	const offDoc = attachListeners(document, [{ name: 'keydown', handler: onKeydown }])

	const activate = (): void => {
		if (active.value) return
		active.value = true
		previousFocus = document.activeElement
		const items = focusables()
		const target =
			(typeof initialOpt === 'function' ? initialOpt(element) : initialOpt) ?? items[0] ?? null
		target?.focus()
		emit(element, FOCUS_EVENTS.activate)
	}

	const deactivate = (): void => {
		if (!active.value) return
		active.value = false
		if (restore && previousFocus instanceof HTMLElement) previousFocus.focus()
		previousFocus = null
		emit(element, FOCUS_EVENTS.deactivate)
	}

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offDoc()
			scope.stop()
		}
		deactivate()
	}

	return {
		active: readonly(active),
		activate,
		deactivate,
		destroy,
	}
}
