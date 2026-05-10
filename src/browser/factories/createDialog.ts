import type { CreateDialogInstance, CreateDialogOptions } from '../types.js'
import { effectScope, readonly, ref } from '@vue/reactivity'
import { DIALOG_EVENTS } from '../constants.js'
import {
	assertElement,
	attachListeners,
	bindEventMap,
	dispatch,
	emit,
	lockBodyScroll,
	runTransition,
	unlockBodyScroll,
} from '../helpers.js'

/**
 * Framework-agnostic native `<dialog>` factory. Layers our cancellable
 * `elements:dialog:show / hide` pipeline over the platform's `showModal()` /
 * `close()` API:
 *
 *   - The browser owns top-layer rendering, focus management (initial focus
 *     + Tab trap when modal), and the native `::backdrop` pseudo-element —
 *     so the factory does NOT carry its own backdrop element, focus-trap
 *     loop, or scroll-lock for the modal case (`showModal()` locks the
 *     document scroll natively).
 *   - The factory owns: the cancellable lifecycle events, dismiss policy
 *     (Escape + backdrop-click static-vs-true), optional non-modal scroll
 *     lock, and the post-transition `open` / `close` notifications.
 *
 * Semantic gating: throws if the host is not `<dialog>`.
 */
export function createDialog(
	element: HTMLDialogElement,
	options: CreateDialogOptions = {},
): CreateDialogInstance {
	assertElement<HTMLDialogElement>(element, 'dialog', 'createDialog')

	const backdropMode = options.dismiss?.backdrop ?? true
	const escape = options.dismiss?.escape ?? true
	const lockNonModal = options.scroll?.lock ?? false
	const modal = options.modal ?? true

	const scope = effectScope()
	const visible = scope.run(() => ref(element.open))
	if (!visible) throw new Error('createDialog: failed to initialize reactive scope')

	let locked = false
	let transition: (() => void) | null = null
	let suppressNativeClose = false

	const cancelTransition = (): void => {
		transition?.()
		transition = null
	}

	const show = (): void => {
		if (visible.value) return
		if (!dispatch(element, DIALOG_EVENTS.show)) return

		visible.value = true
		// `showModal()` locks document scroll natively; only lock manually
		// for non-modal dialogs that opt in via `scroll.lock`.
		if (modal) {
			element.showModal()
		} else {
			element.show()
			if (lockNonModal) {
				lockBodyScroll()
				locked = true
			}
		}

		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, DIALOG_EVENTS.open)
		})
	}

	const hide = (): void => {
		if (!visible.value) return
		if (!dispatch(element, DIALOG_EVENTS.hide)) return

		visible.value = false
		// Suppress the native `close` listener for our explicit close so we
		// don't double-fire `elements:dialog:close`.
		suppressNativeClose = true
		element.close()
		suppressNativeClose = false

		if (locked) {
			unlockBodyScroll()
			locked = false
		}

		cancelTransition()
		transition = runTransition(element, () => {
			transition = null
			emit(element, DIALOG_EVENTS.close)
		})
	}

	const toggle = (): void => (visible.value ? hide() : show())

	// ── Native event bridges ────────────────────────────────────────────────

	// `cancel` fires on Escape (modal dialogs) and form `method="dialog"`
	// cancellation. We honor `dismiss.escape === false` by preventing the
	// default close, and dispatch `prevent` for `dismiss.backdrop === 'static'`.
	const onCancel = (event: Event): void => {
		if (!visible.value) return
		if (!escape) {
			event.preventDefault()
			if (backdropMode === 'static') emit(element, DIALOG_EVENTS.prevent)
		}
	}

	// Catches external closes (form submit with `method="dialog"`, an
	// inner button calling `dialog.close()`, etc.). When the close is
	// driven by our own `hide()` we suppress this to avoid double events.
	const onNativeClose = (): void => {
		if (suppressNativeClose) return
		if (!visible.value) return
		visible.value = false
		if (locked) {
			unlockBodyScroll()
			locked = false
		}
		emit(element, DIALOG_EVENTS.close)
	}

	// Backdrop-click dismiss: clicks on the `::backdrop` pseudo bubble up
	// with `event.target === dialog`. Inner content clicks have a deeper
	// target. When `dismiss.backdrop === 'static'` we fire `prevent`; when
	// `false`, we ignore.
	//
	// Mobile padding-band footgun: the native `<dialog>` element receives
	// padding, so a tap inside that padding band still has `event.target ===
	// dialog`. On phones the dialog padding is ~1rem, which is wide enough
	// to hit by accident — and would dismiss as if the user clicked the
	// `::backdrop`. To distinguish a true backdrop click (outside the
	// dialog box) from a padding-band tap (inside the dialog box), we
	// compare the pointer coordinates against the dialog's bounding rect:
	// if the pointer is inside the rect we treat it as a content click and
	// ignore it.
	const onClick = (event: Event): void => {
		if (!visible.value || event.target !== element) return
		if (!(event instanceof MouseEvent)) return
		const rect = element.getBoundingClientRect()
		const inside =
			event.clientX >= rect.left &&
			event.clientX <= rect.right &&
			event.clientY >= rect.top &&
			event.clientY <= rect.bottom
		if (inside) return
		if (backdropMode === true) hide()
		else if (backdropMode === 'static') emit(element, DIALOG_EVENTS.prevent)
	}

	const offBound = bindEventMap(element, DIALOG_EVENTS, options.on)
	const offNative = attachListeners(element, [
		{ name: 'cancel', handler: onCancel },
		{ name: 'close', handler: onNativeClose },
		{ name: 'click', handler: onClick },
	])

	let destroyed = false
	const destroy = (): void => {
		if (!destroyed) {
			destroyed = true
			offBound()
			offNative()
			scope.stop()
		}
		cancelTransition()
		if (locked) {
			unlockBodyScroll()
			locked = false
		}
		if (element.open) {
			suppressNativeClose = true
			element.close()
			suppressNativeClose = false
		}
		visible.value = false
	}

	return {
		visible: readonly(visible),
		show,
		hide,
		toggle,
		destroy,
	}
}
