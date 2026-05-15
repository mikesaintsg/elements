<script lang="ts" setup>
/**
 * UseDialogPage — JS-driven native `<dialog>` composable.
 *
 * `useDialog(dialogRef, options)` is the framework's adapter over
 * `createDialog`. The PLATFORM owns the heavy lifting — top-layer
 * rendering, modal focus trap, native `::backdrop`, Tab-trap loop, and
 * the native scroll lock that ships with `showModal()`. The composable
 * adds a thin policy + lifecycle layer:
 *
 *   1. **`modal` toggle.** `modal: true` (default) routes to
 *      `dialog.showModal()` — top-layer, viewport-centered, backdrop scrim,
 *      Tab trap, body scroll lock (all native). `modal: false` routes to
 *      `dialog.show()` — non-modal, inline-flow, no focus trap, no scroll
 *      lock (per platform).
 *   2. **Backdrop dismiss policy.** `dismiss.backdrop: true | false |
 *      'static'`. `true` (default) closes on a click outside the dialog
 *      box; `false` ignores backdrop clicks entirely; `'static'` ignores
 *      them but fires `elements:dialog:prevent` so the consumer can
 *      shake the dialog or beep. Distinguishes the dialog's padding band
 *      from a true backdrop click (the platform forwards both to
 *      `target === dialog`; the factory geometry-tests the pointer).
 *   3. **Escape dismiss policy.** `dismiss.escape: false` cancels the
 *      native `cancel` event so Escape is suppressed. Useful for "must
 *      complete this step" wizards.
 *   4. **Non-modal scroll lock.** `scroll.lock: true` only applies when
 *      `modal: false` — modal dialogs already lock the document scroll
 *      via `showModal()`. The composable doesn't add a second lock for
 *      modals; it adds the lock you'd otherwise miss when you opt out of
 *      modal.
 *   5. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE the
 *      transition with `event.preventDefault()` aborting the change.
 *      `on.open` / `on.close` fire AFTER the transition (informational).
 *      `on.prevent` fires when a `'static'` backdrop click is blocked.
 *      All five are also dispatched as DOM events
 *      (`elements:dialog:{show,open,hide,close,prevent}`).
 *   6. **Native bridges.** `<form method="dialog">` submission + inner
 *      `dialog.close()` calls + the native `close` event all flow
 *      through the composable so `useDialog().visible` stays accurate
 *      even when something else closes the dialog.
 *
 * Element gating: the host MUST be `<dialog>` (`HTMLDialogElement`). The
 * factory throws on mismatch — `useDialog` exists specifically to wrap
 * the native element, not to polyfill it onto a `<div>`.
 *
 * What this page is NOT: the static `<dialog>` chrome (variants, sizes,
 * `.fullscreen`, `.scrollable`, `<form method="dialog">` styling,
 * `::backdrop` surface tokens). For all of that, see
 * [DialogElementPage](#/dialog-element). This page proves the JS policy
 * + lifecycle layer the composable adds on top.
 *
 * Cross-references:
 *   - [DialogElementPage](#/dialog-element) — the CSS chrome + bare
 *     element API.
 *   - [PopoverSurfacesPage](#/popover-surfaces) — `<dialog>` vs
 *     `[popover]` taxonomy + `::backdrop` surface.
 *   - [UsePopoverPage](#/use-popover) — the non-modal floating-surface
 *     analogue (top-layer panel, no native focus trap).
 */
import { ref, useTemplateRef } from 'vue'
import { useDialog } from '@elements/browser'
import { useLog } from '../composables.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — modal vs non-modal.
// ─────────────────────────────────────────────────────────────────────
const modalRef = useTemplateRef<HTMLDialogElement>('modalRef')
const modalDialog = useDialog(modalRef, { modal: true })

const inlineRef = useTemplateRef<HTMLDialogElement>('inlineRef')
const inlineDialog = useDialog(inlineRef, { modal: false })

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — static-backdrop confirm dialog. Backdrop click is ignored
// (fires `prevent` so we can flash a hint), Escape is ignored too. Only
// an explicit button or programmatic hide() closes it. Bootstrap-style
// "must answer this prompt" pattern.
// ─────────────────────────────────────────────────────────────────────
const staticRef = useTemplateRef<HTMLDialogElement>('staticRef')
const preventFlash = ref(false)
const staticDialog = useDialog(staticRef, {
	modal: true,
	dismiss: { backdrop: 'static', escape: false },
	on: {
		prevent: () => {
			preventFlash.value = true
			window.setTimeout(() => {
				preventFlash.value = false
			}, 400)
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — `<form method="dialog">` return-value capture. Native
// submission closes the dialog AND writes the submitter button's
// `value=` to `dialog.returnValue`. The composable hears the native
// `close` event and updates `visible` accordingly.
// ─────────────────────────────────────────────────────────────────────
const formRef = useTemplateRef<HTMLDialogElement>('formRef')
const lastReturn = ref<string | null>(null)
const formDialog = useDialog(formRef, {
	modal: true,
	on: {
		close: () => {
			if (formRef.value) lastReturn.value = formRef.value.returnValue || '(no value)'
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — non-modal with scroll.lock. Modal dialogs lock the document
// scroll natively via showModal(); non-modal dialogs DON'T (the user
// expects to keep scrolling the page underneath). When you DO want
// non-modal chrome without the page jumping under it, opt in via
// `scroll: { lock: true }`.
// ─────────────────────────────────────────────────────────────────────
const lockedRef = useTemplateRef<HTMLDialogElement>('lockedRef')
const lockedDialog = useDialog(lockedRef, {
	modal: false,
	scroll: { lock: true },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — cancellable lifecycle via on.show / on.hide.
// ─────────────────────────────────────────────────────────────────────
const lifecycleRef = useTemplateRef<HTMLDialogElement>('lifecycleRef')
const { entries: lifecycleLog, push: note } = useLog(6)
const allowOpen = ref(true)
const allowClose = ref(true)
const lifecycleDialog = useDialog(lifecycleRef, {
	modal: true,
	on: {
		show: (event: CustomEvent) => {
			if (!allowOpen.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open (after transition)'),
		hide: (event: CustomEvent) => {
			if (!allowClose.value) {
				event.preventDefault()
				note('hide vetoed via preventDefault()')
				return
			}
			note('hide')
		},
		close: () => note('close (after transition)'),
	},
})
</script>

<template>
	<section id="use-dialog-intro">
		<hgroup>
			<h1>useDialog</h1>
			<p>
				JS-driven adapter over the native <code>&lt;dialog&gt;</code>. The platform owns top-layer
				rendering, modal focus-trap, native <code>::backdrop</code>, and <code>showModal()</code>'s
				body scroll lock; the composable adds a thin policy + lifecycle layer. Pass a
				<code>Ref&lt;HTMLDialogElement&gt;</code> + optional <code>modal</code> /
				<code>dismiss</code> / <code>scroll</code> / handlers — the composable wires everything
				else.
			</p>
		</hgroup>
		<p>
			What it buys you over a bare <code>dialog.showModal()</code> call: a
			<strong>cancellable lifecycle</strong> via <code>preventDefault()</code> on
			<code>show</code> / <code>hide</code>; <strong>three backdrop modes</strong> (<code
				>true</code
			>
			/ <code>false</code> / <code>'static'</code>) with a <code>prevent</code> hook for the
			shake-on-static-click pattern; <strong>Escape suppression</strong> for "must answer" prompts;
			<strong>opt-in body scroll lock for non-modal</strong> dialogs (modal already locks natively);
			and a <strong>reactive <code>visible</code></strong> that stays in sync with EVERY close path
			— programmatic <code>hide()</code>, Escape, backdrop click, inner <code>dialog.close()</code>,
			and <code>&lt;form method="dialog"&gt;</code> submission. The CSS chrome itself — variants,
			sizes, <code>.fullscreen</code>, <code>.scrollable</code>,
			<code>&lt;form method="dialog"&gt;</code> styling, <code>::backdrop</code> tokens — lives on
			<a href="#/dialog-element">DialogElementPage</a>.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				modal <code>{{ modalDialog.visible.value ? 'open' : 'closed' }}</code> · inline
				<code>{{ inlineDialog.visible.value ? 'open' : 'closed' }}</code> · static
				<code>{{ staticDialog.visible.value ? 'open' : 'closed' }}</code> · form
				<code>{{ formDialog.visible.value ? 'open' : 'closed' }}</code> · locked
				<code>{{ lockedDialog.visible.value ? 'open' : 'closed' }}</code> · lifecycle
				<code>{{ lifecycleDialog.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-dialog-modal-vs-inline">
		<h2>1. <code>modal</code> — modal vs non-modal</h2>
		<p>
			<code>modal: true</code> (default) routes to <code>dialog.showModal()</code>: top-layer,
			viewport-centered, <code>::backdrop</code> scrim, Tab-trap, body scroll lock. All native.
			<code>modal: false</code> routes to <code>dialog.show()</code>: inline-flow, no focus trap, no
			scroll lock. Use modal for "you must respond to this" prompts; use non-modal for persistent
			inspector panels and floating callouts that share the screen with the page.
		</p>
		<menu>
			<li><button type="button" class="primary" @click="modalDialog.show()">Open modal</button></li>
			<li><button type="button" @click="inlineDialog.show()">Open non-modal</button></li>
		</menu>
		<dialog ref="modalRef">
			<header>
				<h3>Modal dialog</h3>
			</header>
			<p>
				Centered, top-layer, with a dimmed <code>::backdrop</code>. Focus is trapped inside via the
				native Tab loop; the page scroll behind is locked by the browser.
			</p>
			<footer>
				<button type="button" class="subtle" @click="modalDialog.hide()">Cancel</button>
				<button type="button" class="primary" @click="modalDialog.hide()">OK</button>
			</footer>
		</dialog>
		<dialog ref="inlineRef">
			<header>
				<h3>Non-modal dialog</h3>
			</header>
			<p>
				Inline-flow — sits in normal document order, no backdrop, page scroll continues to work. The
				composable still wires lifecycle events and reactive <code>visible</code>, but the focus /
				scroll-lock chrome is intentionally absent.
			</p>
			<footer>
				<button type="button" class="primary" @click="inlineDialog.hide()">Close</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const modal  = useDialog(modalRef,  { modal: true })  // dialog.showModal()
const inline = useDialog(inlineRef, { modal: false }) // dialog.show()

&lt;dialog ref="modalRef"&gt;…&lt;/dialog&gt;
&lt;dialog ref="inlineRef"&gt;…&lt;/dialog&gt;</code></pre>
		</details>
	</section>

	<section id="use-dialog-dismiss">
		<h2>2. <code>dismiss</code> — backdrop + escape policy</h2>
		<p>
			<code>dismiss.backdrop</code> takes <code>true</code> | <code>false</code> |
			<code>'static'</code>. <code>true</code> (default) closes on a click outside the dialog box;
			<code>false</code> ignores backdrop clicks entirely; <code>'static'</code> ignores them and
			fires <code>elements:dialog:prevent</code> so the consumer can shake the dialog or flash a
			hint (Bootstrap modal-static parity). <code>dismiss.escape: false</code> suppresses Escape
			entirely. The dialog below pairs both: only the buttons close it.
		</p>
		<p>
			<strong>Padding-band note:</strong> the platform reports backdrop clicks as
			<code>event.target === dialog</code>, but so do clicks on the dialog's own padding ring
			(visible on phones with ~1rem padding). The factory geometry-tests the pointer against the
			dialog's bounding rect so a tap inside the padding band is NOT misread as a backdrop click.
		</p>
		<menu>
			<li>
				<button type="button" class="warning" @click="staticDialog.show()">
					Open static dialog
				</button>
			</li>
		</menu>
		<dialog ref="staticRef" :class="{ filled: preventFlash, warning: true }">
			<header>
				<h3>Confirm delete</h3>
			</header>
			<p>
				This dialog ignores backdrop clicks and Escape — try them. <code>'static'</code> means the
				click is intercepted and an <code>elements:dialog:prevent</code> event fires, so the dialog
				can flash, shake, or play a beep. The <em>filled</em> warning style here flashes for ~400 ms
				on every blocked click.
			</p>
			<footer>
				<button type="button" class="subtle" @click="staticDialog.hide()">Keep file</button>
				<button type="button" class="danger" @click="staticDialog.hide()">Delete file</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useDialog(dialogRef, {
  modal: true,
  dismiss: { backdrop: 'static', escape: false },
  on: {
    prevent: () =&gt; {
      // Click was on the backdrop, but `static` blocked it.
      // Flash the dialog so the user knows it's intentional.
      flash.value = true
      setTimeout(() =&gt; flash.value = false, 400)
    },
  },
})</code></pre>
		</details>
	</section>

	<section id="use-dialog-form">
		<h2>3. <code>&lt;form method="dialog"&gt;</code> — native return-value capture</h2>
		<p>
			A <code>&lt;form method="dialog"&gt;</code> nested inside <code>&lt;dialog&gt;</code> is the
			platform's "submit-to-close" idiom: pressing a submit button (or Enter on a field) closes the
			dialog AND writes the submitter button's <code>value="…"</code> to
			<code>dialog.returnValue</code>. No page navigation happens. The composable bridges the native
			<code>close</code> event into its <code>visible</code> ref AND into
			<code>elements:dialog:close</code>, so the consumer can read
			<code>dialog.returnValue</code> in the <code>on.close</code> handler.
		</p>
		<menu>
			<li>
				<button type="button" @click="formDialog.show()">Open prompt dialog</button>
			</li>
		</menu>
		<small class="block mt-2">
			<strong>Last return value:</strong>
			<code v-if="lastReturn">{{ lastReturn }}</code>
			<span v-else>(open the dialog and pick an option)</span>
		</small>
		<dialog ref="formRef">
			<form method="dialog">
				<header>
					<h3>Save changes?</h3>
				</header>
				<p>
					You have unsaved changes. Pick an action — the form's <code>method="dialog"</code> closes
					the dialog and writes the submitter's <code>value</code> to
					<code>dialog.returnValue</code>.
				</p>
				<footer>
					<button type="submit" class="subtle" value="cancel">Cancel</button>
					<button type="submit" class="warning" value="discard">Discard</button>
					<button type="submit" class="primary" value="save">Save</button>
				</footer>
			</form>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const dialog = useDialog(dialogRef, {
  on: {
    close: () =&gt; { lastReturn.value = dialogRef.value?.returnValue ?? null },
  },
})

&lt;dialog ref="dialogRef"&gt;
  &lt;form method="dialog"&gt;
    &lt;footer&gt;
      &lt;button type="submit" value="cancel"&gt;Cancel&lt;/button&gt;
      &lt;button type="submit" value="save"&gt;Save&lt;/button&gt;
    &lt;/footer&gt;
  &lt;/form&gt;
&lt;/dialog&gt;</code></pre>
		</details>
	</section>

	<section id="use-dialog-scroll-lock">
		<h2>4. <code>scroll.lock</code> — body scroll lock for non-modal</h2>
		<p>
			Modal dialogs lock the body scroll natively (the browser does it inside
			<code>showModal()</code>). Non-modal dialogs DON'T — the user expects to keep scrolling the
			page underneath. When you want a non-modal panel that DOES pin the page (a settings drawer
			that's intentionally inline-flow but shouldn't let the user drift), opt in via
			<code>scroll: { lock: true }</code>. The composable adds the body scroll-lock on
			<code>show()</code> and removes it on <code>hide()</code>.
		</p>
		<menu>
			<li>
				<button type="button" class="secondary" @click="lockedDialog.show()">
					Open non-modal with scroll lock
				</button>
			</li>
		</menu>
		<dialog ref="lockedRef">
			<header>
				<h3>Non-modal, scroll-locked</h3>
			</header>
			<p>
				Non-modal (no focus trap, no backdrop, inline document flow) — but the page scroll behind is
				locked while this is open. Try scrolling the page now; the locked overlay keeps the viewport
				pinned. Close the dialog and scrolling returns.
			</p>
			<footer>
				<button type="button" class="primary" @click="lockedDialog.hide()">Close</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useDialog(dialogRef, {
  modal: false,
  scroll: { lock: true },
})</code></pre>
		</details>
	</section>

	<section id="use-dialog-lifecycle">
		<h2>5. Cancellable lifecycle + custom events</h2>
		<p>
			<code>on.show</code> / <code>on.hide</code> fire BEFORE the open / close with a cancellable
			<code>CustomEvent</code> — calling <code>event.preventDefault()</code> aborts the change.
			<code>on.open</code> / <code>on.close</code> fire AFTER the transition (informational,
			non-cancellable). <code>on.prevent</code> fires when a <code>'static'</code> backdrop click is
			blocked. All five are also dispatched as DOM events on the dialog element
			(<code>elements:dialog:{show,open,hide,close,prevent}</code>), so external scripts that can't
			import the composable can still listen.
		</p>
		<menu>
			<li>
				<label>
					<input v-model="allowOpen" type="checkbox" />
					allow <code>show</code> to proceed
				</label>
			</li>
			<li>
				<label>
					<input v-model="allowClose" type="checkbox" />
					allow <code>hide</code> to proceed
				</label>
			</li>
			<li>
				<button type="button" @click="lifecycleDialog.show()">Try to open</button>
			</li>
		</menu>
		<dialog ref="lifecycleRef">
			<header>
				<h3>Lifecycle demo</h3>
			</header>
			<p>
				If "allow show" is off the open is vetoed. If "allow hide" is off the close is vetoed (try
				the Cancel button or Escape — both fire <code>hide</code>, both honor the veto).
			</p>
			<footer>
				<button type="button" class="primary" @click="lifecycleDialog.hide()">Close</button>
			</footer>
		</dialog>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">flip a checkbox and click the button</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>useDialog(dialogRef, {
  on: {
    show:    (event) =&gt; { if (!canOpen.value)  event.preventDefault() },
    open:    () =&gt; console.log('opened (after transition)'),
    hide:    (event) =&gt; { if (!canClose.value) event.preventDefault() },
    close:   () =&gt; console.log('closed (after transition)'),
    prevent: () =&gt; flashDialog(), // static-backdrop click was blocked
  },
})</code></pre>
		</details>
	</section>

	<section id="use-dialog-api">
		<h2>API reference</h2>
		<dl>
			<dt>
				<code>useDialog(dialogRef, options?): UseDialogReturn</code>
			</dt>
			<dd>
				Composable. <code>dialogRef</code> must point at an <code>HTMLDialogElement</code> — the
				factory throws on mismatch.
			</dd>
			<dt><code>options.modal</code></dt>
			<dd>
				<code>boolean</code> (default <code>true</code>). <code>true</code> →
				<code>dialog.showModal()</code> (top-layer, focus trap, scroll lock, backdrop).
				<code>false</code> → <code>dialog.show()</code> (inline-flow, no chrome from the platform).
			</dd>
			<dt><code>options.dismiss</code></dt>
			<dd>
				<code>{ backdrop?, escape? }</code>. <code>backdrop: true</code> (default) closes on
				outside-click; <code>false</code> ignores; <code>'static'</code> ignores AND fires
				<code>on.prevent</code>. <code>escape: false</code> suppresses Escape (cancels the native
				<code>cancel</code> event).
			</dd>
			<dt><code>options.scroll</code></dt>
			<dd>
				<code>{ lock?: boolean }</code>. Opt-in body scroll lock for <code>modal: false</code>.
				Ignored for modal (the platform already locks).
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close?, prevent? }</code>. <code>show</code> /
				<code>hide</code> are cancellable; <code>open</code> / <code>close</code> are
				post-transition. <code>prevent</code> fires when a <code>'static'</code> backdrop click is
				blocked.
			</dd>
			<dt><code>UseDialogReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reflects the dialog's open state across
				EVERY close path — programmatic <code>hide()</code>, Escape, <code>'static'</code> backdrop,
				<code>&lt;form method="dialog"&gt;</code> submission, an inner
				<code>dialog.close()</code> call.
			</dd>
			<dt><code>UseDialogReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>
				Programmatic lifecycle. Honors the same cancellable-event contract — calling
				<code>preventDefault()</code> in <code>on.show</code> aborts a programmatic open just as it
				does a Esc / button-driven open.
			</dd>
		</dl>
		<p>
			Cross-references: <a href="#/dialog-element">DialogElementPage</a> for the bare element chrome
			(variants, sizes, <code>.fullscreen</code> / <code>.scrollable</code>,
			<code>&lt;form method="dialog"&gt;</code> styling).
			<a href="#/popover-surfaces">PopoverSurfacesPage</a> for <code>&lt;dialog&gt;</code> vs
			<code>[popover]</code> taxonomy. <a href="#/use-popover">UsePopoverPage</a> for the non-modal
			floating-surface analogue.
		</p>
	</section>
</template>

<style scoped>
dialog header {
	margin-block-end: 0.5rem;
}

dialog header h3 {
	margin-block: 0;
}

dialog footer {
	margin-block-start: 1rem;
}

dialog.warning.filled {
	animation: shake 360ms ease;
}

@keyframes shake {
	0%,
	100% {
		transform: translateX(0);
	}
	20% {
		transform: translateX(-6px);
	}
	40% {
		transform: translateX(6px);
	}
	60% {
		transform: translateX(-4px);
	}
	80% {
		transform: translateX(4px);
	}
}

@media (prefers-reduced-motion: reduce) {
	dialog.warning.filled {
		animation: none;
	}
}
</style>
