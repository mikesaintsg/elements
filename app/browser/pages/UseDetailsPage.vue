<script lang="ts" setup>
/**
 * UseDetailsPage — JS-driven `<details>` composable.
 *
 * `useDetails(elementRef, options?)` is the framework's adapter over
 * `createDetails`. The factory is intentionally TINY because the
 * platform already gives us the disclosure widget for free:
 *
 *   - `[open]` attribute toggles the shown / hidden state natively;
 *   - `<summary>` fires `click` → toggles `[open]` → fires `toggle`;
 *   - `details::details-content` (Chromium 131+, Safari 18.4+) is the
 *     animation surface — `block-size: 0 ↔ auto` interpolates via
 *     `interpolate-size: allow-keywords` (declared on `<html>`),
 *     `opacity` fades, `content-visibility` flips discretely via
 *     `transition-behavior: allow-discrete`. The framework's motion
 *     contract IS this animation — every other panel-reveal surface
 *     in the framework matches it.
 *
 * The composable is the programmatic shim on top:
 *
 *   1. **Element gating.** `useDetails` ASSERTS the host is
 *      `<details>` — the factory throws on mismatch.
 *   2. **Programmatic `show()` / `hide()` / `toggle()`** map to
 *      `element.open = true | false`. The platform fires the native
 *      `toggle` event in response.
 *   3. **Reactive `visible`** mirrors `element.open`. Stays in sync
 *      across every flip path — programmatic, `<summary>` click,
 *      direct `details.open = …` from outside the composable.
 *   4. **`initial: true`** opens on mount (vs. pre-authoring `[open]`
 *      in the markup).
 *   5. **`accordion: Ref<HTMLElement>`** — when one panel opens, the
 *      factory walks the accordion's `<details[open]>` siblings and
 *      dispatches `elements:details:deactivate` on each, so they
 *      hide themselves. No shared registry — pure DOM event
 *      delegation.
 *   6. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE
 *      flipping `[open]` with `event.preventDefault()` aborting the
 *      change. `on.open` / `on.close` are post-flip. `on.deactivate`
 *      fires on a sibling that's been displaced by the accordion's
 *      one-open rule.
 *
 * What this page is NOT: the static `<details>` chrome (token surface,
 * `<summary>` marker styling, `::details-content` height tween). For
 * all of that, see [DetailsPage](#/details). This page proves the JS
 * shim.
 */
import { ref, useTemplateRef } from 'vue'
import { useDetails } from '@elements/browser'
import { useLog } from '../composables.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — programmatic open / close + reactive visible.
// ─────────────────────────────────────────────────────────────────────
const programmaticRef = useTemplateRef<HTMLDetailsElement>('programmaticRef')
const programmatic = useDetails(programmaticRef, { initial: true })

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — accordion group: one-open-at-a-time.
// ─────────────────────────────────────────────────────────────────────
const accordionRef = useTemplateRef<HTMLElement>('accordionRef')
const accordionA = useTemplateRef<HTMLDetailsElement>('accordionA')
const accordionB = useTemplateRef<HTMLDetailsElement>('accordionB')
const accordionC = useTemplateRef<HTMLDetailsElement>('accordionC')
const a = useDetails(accordionA, { accordion: accordionRef, initial: true })
const b = useDetails(accordionB, { accordion: accordionRef })
const c = useDetails(accordionC, { accordion: accordionRef })

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — cancellable lifecycle. preventDefault on show vetoes.
// ─────────────────────────────────────────────────────────────────────
const lifecycleRef = useTemplateRef<HTMLDetailsElement>('lifecycleRef')
const { entries: lifecycleLog, push: note } = useLog(6)
const allowOpen = ref(true)
const allowClose = ref(true)
const lifecycle = useDetails(lifecycleRef, {
	on: {
		show: (event: CustomEvent) => {
			if (!allowOpen.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open (after height tween)'),
		hide: (event: CustomEvent) => {
			if (!allowClose.value) {
				event.preventDefault()
				note('hide vetoed via preventDefault()')
				return
			}
			note('hide')
		},
		close: () => note('close (after height tween)'),
	},
})
</script>

<template>
	<section id="use-details-intro">
		<hgroup>
			<h1>useDetails</h1>
			<p>
				JS-driven adapter for the native <code>&lt;details&gt;</code> disclosure widget. Pass a
				<code>Ref&lt;HTMLDetailsElement&gt;</code> + optional <code>initial</code> /
				<code>accordion</code> / lifecycle handlers — the composable wires <code>show()</code> /
				<code>hide()</code> / <code>toggle()</code> over the platform's
				<code>[open]</code> attribute, mirrors the native <code>toggle</code> event into a reactive
				<code>visible</code> ref, and (when an accordion ref is passed) coordinates
				one-open-at-a-time via per-element DOM events.
			</p>
		</hgroup>
		<p>
			What it buys you over a bare <code>&lt;details&gt;&lt;summary&gt;</code> markup: a
			<strong>programmatic open / close path</strong> for cases where a route change or async event
			needs to expand a panel without simulating a click; a
			<strong>reactive <code>visible</code></strong> ref bound to the actual
			<code>[open]</code> state (stays in sync if a third party flips
			<code>details.open</code> directly); a <strong>cancellable lifecycle</strong> via
			<code>preventDefault()</code> on <code>show</code> / <code>hide</code>; and an
			<strong>accordion group coordinator</strong> that closes sibling open panels without a shared
			registry. The animated height transition and `<code>::details-content</code>` chrome itself
			live entirely on the static element — the composable doesn't touch it. See
			<a href="#/details">DetailsPage</a> for the bare-element chrome reference.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				programmatic <code>{{ programmatic.visible.value ? 'open' : 'closed' }}</code> · accordion-A
				<code>{{ a.visible.value ? 'open' : 'closed' }}</code> · -B
				<code>{{ b.visible.value ? 'open' : 'closed' }}</code> · -C
				<code>{{ c.visible.value ? 'open' : 'closed' }}</code> · lifecycle
				<code>{{ lifecycle.visible.value ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-details-programmatic">
		<h2>1. Programmatic open / close + reactive visible</h2>
		<p>
			<code>show()</code> / <code>hide()</code> / <code>toggle()</code> map to
			<code>element.open = true | false</code>. The platform fires the native
			<code>toggle</code> event in response, and the composable's <code>visible</code> ref updates
			synchronously. Use the buttons below to drive the panel — and click the
			<code>&lt;summary&gt;</code> directly to confirm the ref re-syncs from external flips too.
		</p>
		<menu>
			<li><button type="button" @click="programmatic.show()">Open</button></li>
			<li><button type="button" @click="programmatic.hide()">Close</button></li>
			<li><button type="button" @click="programmatic.toggle()">Toggle</button></li>
		</menu>
		<details ref="programmaticRef">
			<summary>Programmatically driven panel</summary>
			<p>
				This panel is open on mount because the composable was called with
				<code>initial: true</code>. Click <strong>Close</strong> above to close it via JS, or click
				the summary directly — both paths flip the same <code>visible</code> ref.
			</p>
		</details>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const ref = useTemplateRef&lt;HTMLDetailsElement&gt;('ref')
const panel = useDetails(ref, { initial: true })

&lt;button @click="panel.show()"&gt;Open&lt;/button&gt;
&lt;button @click="panel.hide()"&gt;Close&lt;/button&gt;
&lt;details ref="ref"&gt;
  &lt;summary&gt;Programmatically driven panel&lt;/summary&gt;
  &lt;p&gt;…&lt;/p&gt;
&lt;/details&gt;</code></pre>
		</details>
	</section>

	<section id="use-details-accordion">
		<h2>2. Accordion group — one-open-at-a-time</h2>
		<p>
			Pass <code>accordion: Ref&lt;HTMLElement&gt;</code> and the composable walks the group on
			every open: when one panel opens, sibling <code>&lt;details[open]&gt;</code> elements get
			<code>elements:details:deactivate</code> dispatched on them, and each closes itself via its
			own composable's listener. No shared registry — pure DOM-event delegation; instances don't
			know about each other.
		</p>
		<div ref="accordionRef" class="showcase-accordion-group">
			<details ref="accordionA">
				<summary>Section A</summary>
				<p>
					Opening Section B or C closes Section A automatically. Initially open via
					<code>initial: true</code> on the first composable.
				</p>
			</details>
			<details ref="accordionB">
				<summary>Section B</summary>
				<p>Opening Section A or C closes Section B automatically.</p>
			</details>
			<details ref="accordionC">
				<summary>Section C</summary>
				<p>Opening Section A or B closes Section C automatically.</p>
			</details>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const groupRef = useTemplateRef('group')
const aRef = useTemplateRef('a')
const bRef = useTemplateRef('b')
const cRef = useTemplateRef('c')

useDetails(aRef, { accordion: groupRef, initial: true })
useDetails(bRef, { accordion: groupRef })
useDetails(cRef, { accordion: groupRef })

&lt;div ref="group"&gt;
  &lt;details ref="a"&gt;…&lt;/details&gt;
  &lt;details ref="b"&gt;…&lt;/details&gt;
  &lt;details ref="c"&gt;…&lt;/details&gt;
&lt;/div&gt;</code></pre>
		</details>
	</section>

	<section id="use-details-lifecycle">
		<h2>3. Cancellable lifecycle</h2>
		<p>
			<code>on.show</code> / <code>on.hide</code> fire BEFORE the <code>[open]</code> flip with a
			cancellable <code>CustomEvent</code> — calling <code>event.preventDefault()</code> aborts the
			change. <code>on.open</code> / <code>on.close</code> fire AFTER (informational,
			non-cancellable). <code>on.deactivate</code> fires on a sibling that's been displaced by the
			accordion's one-open rule. All five also dispatch as DOM events
			(<code>elements:details:{show,open,hide,close,deactivate}</code>).
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
		</menu>
		<details ref="lifecycleRef">
			<summary>Vetoable disclosure</summary>
			<p>
				If <strong>allow show</strong> is off, opening this panel (via the summary or via
				<code>show()</code>) is vetoed. If <strong>allow hide</strong> is off, closing is vetoed.
				The log below records each event as it fires.
			</p>
		</details>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">flip a checkbox and toggle the disclosure</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
	</section>

	<section id="use-details-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useDetails(elementRef, options?): UseDetailsReturn</code></dt>
			<dd>
				Composable. <code>elementRef</code> must point at an <code>HTMLDetailsElement</code> — the
				factory throws on mismatch.
			</dd>
			<dt><code>options.initial</code></dt>
			<dd>
				<code>boolean</code> (default <code>false</code>). Open the panel on mount. Equivalent to
				pre-authoring <code>[open]</code> on the markup before the composable runs.
			</dd>
			<dt><code>options.accordion</code></dt>
			<dd>
				<code>Ref&lt;HTMLElement | null&gt;</code>. When passed, opening this panel walks the
				accordion's <code>&lt;details[open]&gt;</code> siblings and dispatches
				<code>elements:details:deactivate</code> on each so they close themselves. No shared
				registry; instances coordinate via DOM events alone.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close?, deactivate? }</code>. <code>show</code> +
				<code>hide</code> are pre-flip and cancellable; <code>open</code> + <code>close</code> fire
				after the platform-driven height tween; <code>deactivate</code> fires on the accordion
				sibling that's been displaced.
			</dd>
			<dt><code>UseDetailsReturn.visible</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Mirrors <code>element.open</code>. Stays in
				sync across every flip path.
			</dd>
			<dt>
				<code>UseDetailsReturn.show()</code> / <code>.hide()</code> /
				<code>.toggle()</code>
			</dt>
			<dd>
				Programmatic lifecycle. Map to <code>element.open = true | false</code>. Honor the
				cancellable-event contract (calling <code>preventDefault()</code> in
				<code>on.show</code> aborts a programmatic open just as it does a summary click).
			</dd>
		</dl>
		<p>
			Cross-references: <a href="#/details">DetailsPage</a> for the bare-element chrome (<code
				>::details-content</code
			>
			height tween, <code>&lt;summary&gt;</code> marker styling, token surface).
		</p>
	</section>
</template>

<style scoped>
.showcase-accordion-group {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}
</style>
