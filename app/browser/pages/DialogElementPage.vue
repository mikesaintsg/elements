<script lang="ts" setup>
/**
 * DialogElementPage — the canonical reference for the bare `<dialog>`
 * element baseline. Composable-level chrome (focus trap, scroll lock,
 * `[data-dialog-*]` lifecycle, programmatic open/close events) lives on
 * the upcoming `UseDialogPage`; this page demonstrates only what the
 * native element + framework `.scss` together ship.
 *
 * API surface coverage (Phase 1 audit):
 *   - Bare `<dialog>` baseline — 1px bordered box, framework-tuned padding,
 *     elevation shadow, viewport-clamped inline-size (`min(32rem, …)`),
 *     viewport-clamped max-block-size (`min(85dvh, …)`).
 *   - Three open modes — `[open]` attribute (non-modal, inline-flow),
 *     `.show()` (non-modal, programmatic, inline-flow), `.showModal()`
 *     (modal, top-layer, viewport-centered, paints `::backdrop`).
 *   - 7 variant cascade — variant tints the BORDER by default; the same
 *     container contract as `<fieldset>`, `<aside>`, `<article>`,
 *     `<details>`. `.filled` opts into the saturated body fill.
 *   - 2 sizes (`.small` / `.large`) + 2 layout modifiers (`.fullscreen` /
 *     `.scrollable`) shipped from `composables/_dialog.scss` — the
 *     class-based opt-in is element-layer markup, the
 *     scroll-container shape is composable-layer chrome but applies to
 *     a bare `<dialog>` without `useDialog`.
 *   - `<form method="dialog">` — submit closes the dialog without page
 *     navigation; `<button value="…">` provides the close reason via
 *     `dialog.returnValue`.
 *   - Footer chrome — `<dialog> > <footer>` (or `<dialog> > <form> >
 *     <footer>`) is auto-laid-out as a flex-row with trailing affirmative
 *     action and consistent gap.
 *   - `::backdrop` — the scrim that paints behind a modal is styled in
 *     `surfaces/_backdrop.scss` (translucent dim with `@starting-style`
 *     entry).
 *   - Mobile padding tuning — `<480px` tightens the inline padding so the
 *     content area isn't squeezed on narrow viewports.
 *   - Forced-colors fallback — drops custom bg + shadow, keeps a
 *     `CanvasText` perimeter so the dialog still reads in HC mode.
 *
 * Cross-references:
 *   - `UseDialogPage` will demonstrate the `useDialog` composable —
 *     focus trap, programmatic `open()` / `close()`, body scroll lock
 *     while modal, Esc dismissal hooks, the `'static'` mode that
 *     blocks backdrop-click dismissal.
 *   - `PopoverSurfacesPage` will cover `dialog:modal::backdrop` styling
 *     in depth alongside the `[popover]` / `[role="tooltip"]` chrome
 *     vocabulary.
 */
import { ref, useTemplateRef } from 'vue'
import {
	DIALOG_ELEMENT_SNIPPET_FORM as snippetForm,
	DIALOG_ELEMENT_SNIPPET_OPEN_MODES as snippetOpenModes,
	DIALOG_ELEMENT_SNIPPET_SCROLLABLE as snippetScrollable,
	DIALOG_ELEMENT_SNIPPET_SIZES as snippetSizes,
	DIALOG_ELEMENT_SNIPPET_VARIANTS as snippetVariants,
} from '../constants.js'

const dialogBare = useTemplateRef<HTMLDialogElement>('dialogBare')
const dialogModal = useTemplateRef<HTMLDialogElement>('dialogModal')
const dialogSmall = useTemplateRef<HTMLDialogElement>('dialogSmall')
const dialogLarge = useTemplateRef<HTMLDialogElement>('dialogLarge')
const dialogFullscreen = useTemplateRef<HTMLDialogElement>('dialogFullscreen')
const dialogScrollable = useTemplateRef<HTMLDialogElement>('dialogScrollable')
const dialogPrimary = useTemplateRef<HTMLDialogElement>('dialogPrimary')
const dialogDanger = useTemplateRef<HTMLDialogElement>('dialogDanger')
const dialogFilled = useTemplateRef<HTMLDialogElement>('dialogFilled')
const dialogForm = useTemplateRef<HTMLDialogElement>('dialogForm')

// `<form method="dialog">` writes the clicked submit-button's `value=` to
// `dialog.returnValue` on close — captured here so the demo can echo
// which action the user chose (Cancel / Save / Delete).
const lastReturn = ref('')
</script>

<template>
	<section id="dialog-element-intro">
		<hgroup>
			<h1>Dialog element</h1>
			<p>
				The native modal / non-modal disclosure surface. The framework hydrates
				<code>&lt;dialog&gt;</code> as a centered, viewport-clamped, elevation-lifted panel that
				lives in the platform top layer when shown via <code>.showModal()</code> or stays in normal
				document flow when shown via <code>.show()</code> / the bare <code>open</code> attribute.
				The chrome contract mirrors the framework's other container elements
				(<code>&lt;fieldset&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;article&gt;</code>):
				variants tint the BORDER by default; opt into a body fill with <code>.filled</code>.
			</p>
		</hgroup>
		<p>
			Composable-layer behavior (focus trap, scroll lock, Esc dismissal hooks, the
			<code>'static'</code> mode that blocks backdrop-click dismissal, the
			<code>[data-dialog-*]</code> lifecycle attributes) lives on <code>useDialog</code> — see the
			eventual <code>UseDialogPage</code>. Everything below is the bare element baseline: real
			markup driven by native methods.
		</p>
	</section>

	<section id="dialog-element-open-modes">
		<h2>Three open modes</h2>
		<p><code>&lt;dialog&gt;</code> has three ways to show:</p>
		<ol>
			<li>
				<strong>Bare <code>[open]</code> attribute</strong> — markup-only, non-modal. The dialog
				renders in normal document flow at its source position. No backdrop, no focus trap, no
				top-layer promotion.
			</li>
			<li>
				<strong><code>dialog.show()</code></strong> — programmatic non-modal. Same flow as
				<code>[open]</code>; useful when JS needs to open / close on user action.
			</li>
			<li>
				<strong><code>dialog.showModal()</code></strong> — programmatic modal. Promotes the dialog
				into the platform <em>top layer</em> (above every sibling element regardless of z-index),
				paints the <code>::backdrop</code> scrim, and centers the panel on the viewport. The UA
				handles Esc-to-close + initial focus.
			</li>
		</ol>
		<div class="cluster">
			<button @click="dialogBare?.show()">Open inline (non-modal)</button>
			<button @click="dialogModal?.showModal()">Open modal</button>
		</div>
		<p>
			Two example dialogs follow this paragraph in document order. The inline dialog opens here; the
			modal opens centered on the viewport over a backdrop scrim. Click outside the modal to see the
			framework's default backdrop click behavior (the bare element doesn't dismiss — that's a
			<code>useDialog</code> opt-in).
		</p>
		<dialog ref="dialogBare">
			<p>
				<strong>Inline dialog</strong> — this panel renders in document flow at the source position,
				not above the page. Reads like an inline disclosure with the dialog chrome.
			</p>
			<footer>
				<button @click="dialogBare?.close()">Close</button>
			</footer>
		</dialog>
		<dialog ref="dialogModal">
			<header>
				<h3>Modal dialog</h3>
			</header>
			<p>
				Top-layer + <code>::backdrop</code>. The native <code>Esc</code> key closes the modal — try
				it. Clicking outside the dialog hits the backdrop, not the page.
			</p>
			<footer>
				<button @click="dialogModal?.close()">Close</button>
				<button class="primary filled" @click="dialogModal?.close()">OK</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetOpenModes }}</code></pre>
		</details>
	</section>

	<section id="dialog-element-sizes">
		<h2>Size and layout modifiers</h2>
		<p>
			Four size / layout opt-ins ship from <code>composables/_dialog.scss</code> (the modifier
			classes work on a bare <code>&lt;dialog&gt;</code> without <code>useDialog</code>):
		</p>
		<dl>
			<dt><code>.small</code></dt>
			<dd>Caps inline-size to 20rem. Confirms, tight prompts.</dd>
			<dt><code>.large</code></dt>
			<dd>Stretches to 48rem. Multi-field forms, two-pane wizards.</dd>
			<dt><code>.fullscreen</code></dt>
			<dd>Edge-to-edge with zero border radius. Mobile sheet, full-page editors.</dd>
			<dt><code>.scrollable</code></dt>
			<dd>
				Child <code>&lt;section&gt;</code> becomes the scroll container; header and footer stay
				pinned outside the scroll. The dialog stays compact at the framework's max-block-size.
			</dd>
		</dl>
		<div class="cluster">
			<button @click="dialogSmall?.showModal()">.small</button>
			<button @click="dialogLarge?.showModal()">.large</button>
			<button @click="dialogFullscreen?.showModal()">.fullscreen</button>
			<button @click="dialogScrollable?.showModal()">.scrollable</button>
		</div>
		<dialog ref="dialogSmall" class="small">
			<header><h3>Small dialog</h3></header>
			<p>20rem cap. Right size for a single-question prompt.</p>
			<footer>
				<button @click="dialogSmall?.close()">Cancel</button>
				<button class="primary filled" @click="dialogSmall?.close()">Confirm</button>
			</footer>
		</dialog>
		<dialog ref="dialogLarge" class="large">
			<header><h3>Large dialog</h3></header>
			<p>
				48rem inline-size. Multi-field forms, two-pane wizards, or any panel that needs more
				horizontal room than the default 32rem.
			</p>
			<form>
				<label for="dlg-name">Full name</label>
				<input id="dlg-name" type="text" placeholder="Ada Lovelace" />
				<label for="dlg-email">Email</label>
				<input id="dlg-email" type="email" placeholder="ada@example.com" />
			</form>
			<footer>
				<button @click="dialogLarge?.close()">Cancel</button>
				<button class="primary filled" @click="dialogLarge?.close()">Save</button>
			</footer>
		</dialog>
		<dialog ref="dialogFullscreen" class="fullscreen">
			<header><h3>Fullscreen dialog</h3></header>
			<p>
				Edge-to-edge sheet — covers the entire viewport with no border radius. The mobile-app
				equivalent of a modal sheet. Tap close to exit.
			</p>
			<footer>
				<button class="primary filled" @click="dialogFullscreen?.close()">Close</button>
			</footer>
		</dialog>
		<dialog ref="dialogScrollable" class="scrollable">
			<header>
				<h3>Scrollable dialog</h3>
			</header>
			<section>
				<p v-for="i in 30" :key="i">
					Paragraph {{ i }} — the dialog stays compact and the body content scrolls inside its own
					track. The header above and the footer below stay pinned outside the scroll container so
					the action buttons are always reachable without scrolling to the bottom.
				</p>
			</section>
			<footer>
				<button @click="dialogScrollable?.close()">Close</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetSizes }}</code></pre>
		</details>
	</section>

	<section id="dialog-element-variants">
		<h2>Variant cascade</h2>
		<p>
			Adding a variant class tints the border (the same contract as
			<code>&lt;fieldset&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;article&gt;</code>).
			Pair with <code>.filled</code> to fill the body. <code>.subtle</code> reads the variant's
			tinted-bg + emphasis-text + subtle-border triplet — the soft-confirm look.
		</p>
		<div class="cluster">
			<button @click="dialogPrimary?.showModal()" class="primary">Primary border</button>
			<button @click="dialogDanger?.showModal()" class="danger">Danger border</button>
			<button @click="dialogFilled?.showModal()" class="primary filled">Filled primary</button>
		</div>
		<dialog ref="dialogPrimary" class="primary">
			<header><h3>Primary dialog</h3></header>
			<p>
				Variant border via <code>--set-variant-background-color</code>. Body chrome stays neutral by
				default — containers don't auto-fill with their variant identity.
			</p>
			<footer>
				<button @click="dialogPrimary?.close()">Close</button>
			</footer>
		</dialog>
		<dialog ref="dialogDanger" class="danger">
			<header><h3>Confirm deletion</h3></header>
			<p>
				Common pattern: danger-tinted border on a destructive-action confirmation modal. Keeps the
				surface neutral so the body is still readable; the border signals urgency.
			</p>
			<footer>
				<button @click="dialogDanger?.close()">Cancel</button>
				<button class="danger filled" @click="dialogDanger?.close()">Delete</button>
			</footer>
		</dialog>
		<dialog ref="dialogFilled" class="primary filled">
			<header><h3>Filled dialog</h3></header>
			<p>
				Saturated <code>--color-primary</code> body fill with white text. Reads as a "branded" modal
				— useful for promotional sheets, onboarding gates, and emphasis moments. Same chrome
				contract as <code>&lt;button class="primary filled"&gt;</code>.
			</p>
			<footer>
				<button @click="dialogFilled?.close()">Close</button>
			</footer>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetVariants }}</code></pre>
		</details>
	</section>

	<section id="dialog-element-flush">
		<h2><code>.flush</code> — non-modal dialog inset into a host</h2>
		<p>
			<code>dialog.flush</code> is scoped to non-modal (<code>:not(:modal)</code>) — the modifier
			drops the outer border, radius, shadow, and margin so the dialog fuses into its host's
			boundary. Modal dialogs are explicitly excluded because the modal at rest IS the chrome
			(centered top-layer, scrim) and dissolving the panel would defeat the modal shape. The header
			/ footer pin chrome survives because it's painted from inside the dialog's grid; only the
			outer perimeter dissolves.
		</p>
		<p>
			Use when a workflow needs an inline dialog (revealable confirmation, status panel, inline edit
			affordance) that should read as part of its host surface — a card body, an expandable region —
			instead of paint its own outer card.
		</p>
		<article class="frame">
			<header>
				<h3>Account changes</h3>
			</header>
			<dialog open class="flush">
				<header><h4>Email updated</h4></header>
				<p>
					New email confirmed: <code>ada@example.com</code>. The change applies to every signed-in
					session immediately.
				</p>
				<footer>
					<button type="button">Got it</button>
				</footer>
			</dialog>
			<dialog open class="success flush">
				<header><h4>Backup complete</h4></header>
				<p>
					Snapshot stored. Variant cascade reaches the border + header band; outer perimeter still
					dissolves.
				</p>
			</dialog>
			<dialog open class="warning flush">
				<header><h4>Session expiring</h4></header>
				<p>You'll be signed out in 5 minutes unless you re-authenticate.</p>
				<footer>
					<button type="button" class="warning">Re-authenticate</button>
				</footer>
			</dialog>
			<dialog open class="danger flush">
				<header><h4>Delete account?</h4></header>
				<p>This action cannot be undone.</p>
				<footer>
					<button type="button">Cancel</button>
					<button type="button" class="danger filled">Delete</button>
				</footer>
			</dialog>
			<footer>
				<small
					>Three inline dialogs, no outer chrome — host (this article) owns the perimeter.</small
				>
			</footer>
		</article>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>&lt;article&gt;
  &lt;header&gt;…&lt;/header&gt;
  &lt;dialog open class="flush"&gt;…&lt;/dialog&gt;
  &lt;dialog open class="success flush"&gt;…&lt;/dialog&gt;
  &lt;dialog open class="danger flush"&gt;…&lt;/dialog&gt;
  &lt;footer&gt;…&lt;/footer&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="dialog-element-form">
		<h2><code>&lt;form method="dialog"&gt;</code></h2>
		<p>
			The platform's built-in dialog-close pattern. A
			<code>&lt;form method="dialog"&gt;</code> inside a <code>&lt;dialog&gt;</code> closes the
			dialog on submit without a page navigation. Each submit
			<code>&lt;button value="…"&gt;</code> writes its <code>value</code> to
			<code>dialog.returnValue</code> on close so the host code knows which action fired.
		</p>
		<div class="cluster">
			<button @click="dialogForm?.showModal()" class="danger">Open delete confirmation</button>
			<output v-if="lastReturn">
				Last return value: <strong>{{ lastReturn }}</strong>
			</output>
		</div>
		<dialog ref="dialogForm" @close="lastReturn = dialogForm?.returnValue ?? ''">
			<form method="dialog">
				<header><h3>Delete this draft?</h3></header>
				<p>
					This action can't be undone. The form's <code>method="dialog"</code> closes the modal on
					submit and writes the clicked button's <code>value</code> to
					<code>dialog.returnValue</code>.
				</p>
				<footer>
					<button value="cancel">Cancel</button>
					<button class="danger filled" value="delete">Delete</button>
				</footer>
			</form>
		</dialog>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ snippetForm }}</code></pre>
		</details>
	</section>

	<section id="dialog-element-sections">
		<h2>Header / body / footer chrome</h2>
		<p>
			A direct-child <code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> inside a
			<code>&lt;dialog&gt;</code> (or inside a <code>&lt;dialog&gt; &gt; &lt;form&gt;</code>)
			auto-hydrate as Bootstrap-style modal-header / modal-footer bands. Three things happen without
			any class:
		</p>
		<ul>
			<li>
				<strong>Edge-to-edge band.</strong> Each section extends to the dialog's border-box via a
				negative inline margin, then re-applies the dialog's <code>padding-inline</code> so the
				section's content stays aligned with the body.
			</li>
			<li>
				<strong>Divider line.</strong> A 1px <code>border-block-end</code> (header) /
				<code>border-block-start</code> (footer) separates the band from the body. Color follows the
				dialog's own border so a variant-tinted dialog gets a matching divider.
			</li>
			<li>
				<strong>Vertical rhythm.</strong> A consistent <code>--set-dialog-section-gap</code>
				margin sits between the band and the body so the heading and the affirmative-action row
				never crash into the body copy.
			</li>
		</ul>
		<p>
			The "body" is whatever sits between header and footer in document order. No
			<code>&lt;section class="body"&gt;</code> wrapper required — the framework treats "anything
			not header / footer" AS the body. For the <code>.scrollable</code> modifier the inner
			<code>&lt;section&gt;</code> becomes the explicit scroll container so the header / footer can
			stay pinned.
		</p>
		<p>
			Footer-specific chrome: actions auto-lay out as a flex-row with
			<code>justify-content: flex-end</code> + <code>flex-wrap: wrap</code> + a
			<code>--set-dialog-footer-gap</code> between siblings. Convention: cancel / dismiss action on
			the left, primary affirmative action on the right (trailing inline-end). On narrow viewports
			the row wraps cleanly so two buttons never collide.
		</p>
	</section>

	<section id="dialog-element-backdrop">
		<h2>Backdrop scrim</h2>
		<p>
			Only <strong>modal</strong> dialogs (`.showModal()`) paint a <code>::backdrop</code>. The
			scrim is styled in <code>surfaces/_backdrop.scss</code> — a translucent dim layer with an
			<code>@starting-style</code> entry so the fade-in animates on every engine. The bare element
			doesn't dismiss on backdrop click; that's a <code>useDialog</code> opt-in. Tooltips, popovers,
			and other top-layer surfaces don't paint a backdrop — the scrim is specifically for
			<code>:modal</code>.
		</p>
		<p>
			See <code>PopoverSurfacesPage</code> for the full top-layer / backdrop / anchor-positioning
			vocabulary.
		</p>
	</section>

	<section id="dialog-element-a11y">
		<h2>Accessibility</h2>
		<p>
			Modal dialogs (<code>.showModal()</code>) get a free accessibility floor from the platform:
		</p>
		<ul>
			<li>
				<strong>Focus enters the dialog</strong> on open — the first focusable element inside (or
				the dialog itself if none) receives focus.
			</li>
			<li>
				<strong>Esc closes the modal</strong> — the UA dispatches a <code>cancel</code> event
				followed by <code>close</code>. The bare element honors this; <code>useDialog</code>'s
				<code>'static'</code> mode lets consumers cancel the cancellation.
			</li>
			<li>
				<strong>Focus is trapped</strong> while the modal is open — Tab cycles only through
				descendants of the dialog. (This is a top-layer affordance; non-modal dialogs don't trap
				focus.)
			</li>
			<li>
				<strong>Background is inert</strong> — every element outside the modal is treated as
				<code>inert</code> while the modal is open, so click and keyboard events route to the
				dialog. The framework doesn't have to add this; the platform handles it.
			</li>
		</ul>
		<p>
			Non-modal dialogs (<code>.show()</code> / <code>[open]</code>) inherit none of the above —
			they're regular inline content that happens to render in the dialog chrome. Use them for
			lightweight disclosures where focus management isn't critical; reach for
			<code>.showModal()</code> when the panel is a hard interruption.
		</p>
	</section>

	<section id="dialog-element-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (<code>forced-colors: active</code>), the dialog drops its custom
			background and shadow — HC mode forces <code>Canvas</code> behind everything anyway — and
			keeps a 1px <code>CanvasText</code> perimeter so the dialog still reads as a discrete surface.
			The <code>::backdrop</code> falls back to its own forced-colors rule in
			<code>surfaces/_backdrop.scss</code>.
		</p>
	</section>
</template>
