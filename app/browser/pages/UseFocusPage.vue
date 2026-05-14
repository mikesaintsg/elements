<script lang="ts" setup>
/**
 * UseFocusPage — focus-trap composable demo.
 *
 * `useFocus(elementRef, options)` confines Tab navigation to focusable
 * descendants of the host element while active and restores the
 * previous focus on deactivation. Built on top of the framework-
 * agnostic `createFocus` factory; the composable just adds the Vue
 * lifecycle wrapper (instantiate on element-ref change, destroy on
 * unmount).
 *
 * Lifecycle:
 *   - `activate()`   stores the currently focused element, then
 *                    focuses the first focusable descendant (or the
 *                    `initial` element / selector function if
 *                    provided).
 *   - `deactivate()` restores focus to whatever was focused before
 *                    `activate()` (unless `restore: false`).
 *
 * Tab handling: when focus reaches the last focusable element, Tab
 * wraps to the first; Shift+Tab on the first wraps to the last. All
 * other keys pass through.
 *
 * When you'd reach for it:
 *   - Custom popovers / overlays that aren't `<dialog>` (which has
 *     a built-in trap via `showModal()`).
 *   - Multi-step forms / wizards where Tab should stay inside the
 *     current step.
 *   - Side drawers that aren't using the framework's `<aside
 *     popover>` chrome.
 *   - Any modal-shaped surface where keyboard navigation should
 *     respect a content boundary.
 *
 * API surface coverage:
 *   1. Basic activate / deactivate cycle.
 *   2. Tab + Shift+Tab wrap-around.
 *   3. `initial` option — start focus on a specific element.
 *   4. `restore` option — opt out of focus restoration.
 *   5. Tab key passes through when inactive.
 *   6. `active` ref reflects the trap state reactively.
 *
 * Cross-references:
 *   - [DialogElementPage](#/dialog-element) — modal `<dialog>` ships
 *     its own native focus trap via `showModal()`; useFocus is for
 *     non-dialog surfaces.
 *   - `useDialog` / `useAside` compose `useFocus` internally.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useFocus } from '@elements/browser'

// Demo 1 — basic trap.
const basicHost = useTemplateRef<HTMLElement>('basicHost')
const basic = useFocus(basicHost)
const basicLog = ref<string[]>([])
const basicNote = (line: string): void => {
	basicLog.value = [...basicLog.value.slice(-4), line]
}
const basicActivate = (): void => {
	basic.activate()
	basicNote('activated')
}
const basicDeactivate = (): void => {
	basic.deactivate()
	basicNote('deactivated')
}

// Demo 2 — `initial` option (focus a specific element on activate).
const initialHost = useTemplateRef<HTMLElement>('initialHost')
const initial = useFocus(initialHost, {
	initial: (host) => host.querySelector<HTMLElement>('[data-initial]'),
})

// Demo 3 — `restore: false` (don't restore focus on deactivate).
const restoreHost = useTemplateRef<HTMLElement>('restoreHost')
const noRestore = useFocus(restoreHost, { restore: false })

const focusedTag = computed(() => {
	const el = typeof document === 'undefined' ? null : document.activeElement
	if (!el || el === document.body) return '(body)'
	return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
})
</script>

<template>
	<section id="use-focus-intro">
		<hgroup>
			<h1>useFocus</h1>
			<p>
				Focus-trap composable. Confines Tab navigation to focusable descendants of the host element
				while active and restores the previous focus on deactivation.
				<code>useFocus(elementRef, options)</code> returns
				<code>{ active, activate(), deactivate() }</code>.
			</p>
		</hgroup>
		<p>
			Built on the framework-agnostic <code>createFocus</code> factory — the composable just adds
			the Vue lifecycle wrapper (instantiate on element-ref change, destroy on unmount). Use it on
			any non-<code>&lt;dialog&gt;</code> surface that needs a keyboard boundary — custom popovers,
			wizards, drawers, side panels. <code>&lt;dialog&gt;</code> opened via
			<code>.showModal()</code> already ships its own native focus trap; reach for
			<code>useDialog</code> there.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Currently focused element:</strong> <code>{{ focusedTag }}</code> — Tab through the
				demos below; the indicator updates on every focus change so you can verify the trap.
			</p>
		</aside>
	</section>

	<section id="use-focus-basic">
		<h2>1. Basic trap — activate / deactivate cycle</h2>
		<p>
			Click <strong>Activate</strong> below. Focus moves to the first focusable element inside the
			trapped panel. Tab cycles through the panel's focusables; Shift+Tab cycles backward. Tab on
			the LAST focusable wraps to the first; Shift+Tab on the first wraps to the last. Click
			<strong>Deactivate</strong> (or use the panel's own Close button) to restore focus to whatever
			button you clicked Activate from.
		</p>
		<menu class="mt-0 mb-4">
			<li>
				<button
					type="button"
					id="basic-activate"
					:disabled="basic.active.value"
					@click="basicActivate"
				>
					Activate trap
				</button>
			</li>
			<li>
				<button type="button" class="subtle" id="basic-cancel" :disabled="basic.active.value">
					Outer button (sibling)
				</button>
			</li>
		</menu>
		<div
			ref="basicHost"
			:aria-hidden="!basic.active.value"
			:style="{
				border: '1px solid var(--color-border)',
				borderRadius: '0.5rem',
				padding: '1rem',
				opacity: basic.active.value ? 1 : 0.55,
				transition: 'opacity 150ms ease',
			}"
		>
			<h3 class="mt-0">Trapped panel</h3>
			<p>
				Tab through these controls. The trap holds focus inside this box — Tabbing past the last
				item wraps back to the first.
			</p>
			<div class="cluster gap-2">
				<button type="button">First button</button>
				<input type="text" placeholder="Text input" />
				<button type="button" class="primary">Primary action</button>
				<a href="#use-focus-basic">Link to top of section</a>
				<button type="button" class="subtle" @click="basicDeactivate">Deactivate</button>
			</div>
		</div>
		<small class="block mt-2">
			Trap is <strong>{{ basic.active.value ? 'active' : 'inactive' }}</strong
			>.
			<span v-if="basicLog.length > 0">Log: {{ basicLog.join(' → ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const host = useTemplateRef&lt;HTMLElement&gt;('host')
const { active, activate, deactivate } = useFocus(host)

// &lt;template&gt;
//   &lt;button @click="activate"&gt;Open panel&lt;/button&gt;
//   &lt;div ref="host"&gt;...focusable children...&lt;/div&gt;
// &lt;/template&gt;</code></pre>
		</details>
	</section>

	<section id="use-focus-initial">
		<h2>2. <code>initial</code> option — focus a specific element on activate</h2>
		<p>
			By default <code>activate()</code> focuses the FIRST focusable descendant. Pass an
			<code>initial</code> option (an element or a selector function) to start somewhere else —
			useful for forms where the primary input should auto-focus, or for confirm dialogs where the
			destructive button should NOT.
		</p>
		<menu class="mt-0 mb-4">
			<li>
				<button type="button" :disabled="initial.active.value" @click="initial.activate()">
					Activate (focus the email field)
				</button>
			</li>
		</menu>
		<div
			ref="initialHost"
			:style="{
				border: '1px solid var(--color-border)',
				borderRadius: '0.5rem',
				padding: '1rem',
				opacity: initial.active.value ? 1 : 0.55,
				transition: 'opacity 150ms ease',
			}"
		>
			<form class="max-w-xs" style="--set-form-gap: 0.75rem">
				<label>
					<small>Username (default first focusable, but skipped)</small>
					<input type="text" name="username" />
				</label>
				<label>
					<small>Email <strong>(initial focus target)</strong></small>
					<input type="email" name="email" data-initial />
				</label>
				<label>
					<small>Password</small>
					<input type="password" name="password" />
				</label>
				<div class="flex gap-2">
					<button type="button" class="subtle" @click="initial.deactivate()">Cancel</button>
					<button type="submit" class="primary">Submit</button>
				</div>
			</form>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const { activate } = useFocus(host, {
  initial: (host) =&gt; host.querySelector('[data-initial]')
})</code></pre>
		</details>
	</section>

	<section id="use-focus-restore">
		<h2>3. <code>restore</code> option — opt out of focus restoration</h2>
		<p>
			By default <code>deactivate()</code> restores focus to whatever was focused before
			<code>activate()</code> fired. Pass <code>{ restore: false }</code> to skip the restoration —
			useful when the trigger element is removed during the panel's lifecycle (e.g. a "delete me"
			button inside a wizard step that's then thrown away).
		</p>
		<menu class="mt-0 mb-4">
			<li>
				<button
					type="button"
					id="restore-trigger"
					:disabled="noRestore.active.value"
					@click="noRestore.activate()"
				>
					Activate (no restore on deactivate)
				</button>
			</li>
		</menu>
		<div
			ref="restoreHost"
			:style="{
				border: '1px solid var(--color-border)',
				borderRadius: '0.5rem',
				padding: '1rem',
				opacity: noRestore.active.value ? 1 : 0.55,
				transition: 'opacity 150ms ease',
			}"
		>
			<p>
				Click <strong>Activate</strong>, then <strong>Close</strong> below. The trigger button will
				NOT auto-receive focus on deactivate (compare to demos 1 + 2 above which DO restore).
			</p>
			<button type="button" class="subtle" @click="noRestore.deactivate()">
				Close (no restore)
			</button>
		</div>
	</section>

	<section id="use-focus-tokens">
		<h2>API reference</h2>
		<dl>
			<dt><code>useFocus(elementRef, options?): UseFocusReturn</code></dt>
			<dd>
				Vue composable. <code>elementRef</code> is a
				<code>Ref&lt;HTMLElement | null&gt;</code> pointing at the trap container. Options are
				forwarded to <code>createFocus</code>.
			</dd>
			<dt><code>options.initial</code></dt>
			<dd>
				<code>HTMLElement | ((host: HTMLElement) =&gt; HTMLElement | null)</code>. Element (or
				selector function) to focus when <code>activate()</code> fires. Defaults to the first
				focusable descendant.
			</dd>
			<dt><code>options.restore</code></dt>
			<dd>
				<code>boolean</code>. When <code>true</code> (default), <code>deactivate()</code> restores
				focus to whatever was focused before <code>activate()</code>. Set to <code>false</code> to
				skip the restoration.
			</dd>
			<dt><code>UseFocusReturn.active</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reactive flag — <code>true</code> while the
				trap is active, <code>false</code> otherwise. Use in template bindings to gate panel
				visibility / chrome.
			</dd>
			<dt><code>UseFocusReturn.activate()</code> / <code>.deactivate()</code></dt>
			<dd>
				Lifecycle controls. Idempotent — calling <code>activate()</code> while already active is a
				no-op (same for <code>deactivate()</code> while inactive).
			</dd>
		</dl>
	</section>
</template>
