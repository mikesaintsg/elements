<script lang="ts" setup>
/**
 * UseAlertPage — dismissible in-flow alert lifecycle.
 *
 * `useAlert(elementRef, options?)` wraps `createAlert`. The factory
 * binds a click handler that listens for any descendant carrying
 * `[data-alert-dismiss]` and toggles a `[data-alert-open]` attribute
 * on the host. The attribute is the visual gate — `components/_aside.
 * scss` collapses the alert to `block-size: 0` + zero opacity when
 * absent and animates the height tween via the framework-wide
 * `--set-motion-{duration, timing-function}` tokens (the same motion
 * contract `<details>::details-content`, drawers, dialogs, and table-
 * row expansions ride).
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Reactive state:
 *     visible   Readonly<Ref<boolean>>   — current visibility (post-
 *                                          dispatch, pre-transition).
 *
 *   Imperative API:
 *     show()    — open. Dispatches cancellable `elements:alert:show`;
 *                  on no-cancel, sets `[data-alert-open]` + clears
 *                  `aria-hidden`; emits `elements:alert:open` once
 *                  the transition settles.
 *     hide()    — close. Dispatches cancellable `elements:alert:hide`;
 *                  on no-cancel, removes `[data-alert-open]`; emits
 *                  `elements:alert:close` (and sets `aria-hidden=
 *                  "true"`) once the transition settles.
 *     toggle()  — show / hide depending on current state.
 *
 *   Options (`UseAlertOptions = CreateAlertOptions`):
 *     initial   boolean (default `true`)   — initial visibility on
 *                                             mount. Default `true`
 *                                             because `<aside role=
 *                                             "alert">` is meaningless
 *                                             when hidden.
 *     on        Partial<UseAlertEventMap>  — listen for `show`, `open`,
 *                                             `hide`, `close` on the
 *                                             host.
 *
 *   Selectors (consumer DOM contract):
 *     `[data-alert-dismiss]` on any descendant element registers a
 *     click-to-dismiss trigger. Mirrors Bootstrap's `.btn-close` /
 *     `data-bs-dismiss="alert"` but uses the framework's attribute-
 *     based pattern.
 *
 *   Framework chrome (declared in `components/_aside.scss`):
 *     `aside[role='alert']`                    → closed state (block-
 *                                                 size: 0, opacity: 0,
 *                                                 visibility: hidden,
 *                                                 transform translateY)
 *     `aside[role='alert'][data-alert-open]`   → open state (block-
 *                                                 size: auto, full
 *                                                 padding-block, bar
 *                                                 width restored)
 *     Variant cascade: `aside[role='alert'].{variant}` paints
 *     `--color-{variant}-bg-subtle` body + `--color-{variant}-text-
 *     emphasis` leading bar + `--color-{variant}-border-subtle`
 *     perimeter.
 *
 * Native-platform redundancy walk (`contribute.md` §5.4.1):
 *   1. `[data-alert-open]` is CSS-consumed (`components/_aside.scss`
 *      line 321). Not dead.
 *   2. `aria-hidden="true"` on close is the standard ARIA mirror —
 *      `display: none` would defeat the transition; `aria-hidden`
 *      is the spec-compliant signal that the alert is no longer in
 *      the AT tree. Not dead.
 *   3. `runTransition` runs AFTER the `[data-alert-open]` attribute
 *      flip and the reactive ref update. Correct — the CSS transition
 *      is what we're waiting on, and the attribute change is what
 *      triggered it.
 *   4. No re-implemented Escape / outside-click dismiss — `<aside
 *      role="alert">` is in-flow, not top-layer, so neither applies.
 *   5. No body-scroll lock (in-flow).
 *   6. `show` / `hide` dispatches are cancellable; consumer
 *      `preventDefault()` vetoes the transition.
 *   7. Strip shipped in this PR: removed the dead `initialFromAttr`
 *      branch in `createAlert.ts`. The expression
 *      `options.initial ?? (initialFromAttr || true)` short-circuits
 *      to `options.initial ?? true` because the `|| true` consumes
 *      the attribute read regardless of its value. Replaced with the
 *      simpler form; default-open behaviour preserved.
 *
 * Cross-references:
 *   - AsidePage — the static `<aside role="alert">` chrome (variant
 *     tints, sizes, the `useAlert` wiring already present in its
 *     section 3). UseAlertPage focuses on the JS lifecycle proper.
 *   - UseToastPage — `<output popover>` toast deck. Toasts share the
 *     variant palette but NOT the geometry (toast is corner-anchored
 *     top-layer; alert is in-flow banner).
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useAlert } from '@elements/browser'

const variants = ['primary', 'secondary', 'success', 'warning', 'danger', 'information'] as const

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — Show / hide / toggle lifecycle.
// Three buttons drive `useAlert`'s imperative API. The host alert
// transitions through the `[data-alert-open]` attribute flip.
// ─────────────────────────────────────────────────────────────────────
const lifecycleRef = useTemplateRef<HTMLElement>('lifecycleRef')
const lifecycle = useAlert(lifecycleRef)

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — `[data-alert-dismiss]` descendants close the alert. A
// trailing `<button data-alert-dismiss>` is the canonical pattern; any
// element with the attribute (an icon `<i>`, a link, a nested button
// row) becomes a dismiss trigger via the factory's click handler.
// ─────────────────────────────────────────────────────────────────────
const dismissRef = useTemplateRef<HTMLElement>('dismissRef')
const dismiss = useAlert(dismissRef)
const restoreDismiss = (): void => dismiss.show()

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Variant cascade. Seven `<aside role="alert">` banners, one
// per variant, each with its own dismiss button. Variant chrome paints
// the bg-subtle body + saturated leading bar + subtle perimeter
// triplet. Re-open with the master "Show all" button.
// ─────────────────────────────────────────────────────────────────────
const variantBag = ref<Record<string, boolean>>(Object.fromEntries(variants.map((v) => [v, true])))
const dismissVariant = (v: string): void => {
	variantBag.value = { ...variantBag.value, [v]: false }
}
const showAllVariants = (): void => {
	variantBag.value = Object.fromEntries(variants.map((v) => [v, true]))
}
const variantOpenCount = computed(() => Object.values(variantBag.value).filter(Boolean).length)

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — Cancellable lifecycle. The factory dispatches
// `elements:alert:{show, hide}` as cancellable events. `preventDefault()`
// inside the `on.hide` callback below vetoes dismiss when a "Confirm
// dismiss" toggle is off — useful for "are you sure?" affordances.
// ─────────────────────────────────────────────────────────────────────
const allowDismiss = ref(true)
const guardLog = ref<readonly string[]>([])
const noteGuard = (message: string): void => {
	const next = [...guardLog.value, message]
	guardLog.value = next.slice(-4)
}
const guardRef = useTemplateRef<HTMLElement>('guardRef')
const guard = useAlert(guardRef, {
	on: {
		show: () => noteGuard('show — proceeding'),
		open: () => noteGuard('open — transition settled'),
		hide: (event) => {
			if (!allowDismiss.value) {
				event.preventDefault()
				noteGuard('hide — VETOED (guard active)')
				return
			}
			noteGuard('hide — proceeding')
		},
		close: () => noteGuard('close — transition settled'),
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — Polite vs assertive live region.
// `role="status"` is the polite live region — screen readers announce
// when the user is idle. `role="alert"` is assertive — interrupts the
// user's current task. Pick the role to match the urgency.
// ─────────────────────────────────────────────────────────────────────
const politeRef = useTemplateRef<HTMLElement>('politeRef')
const assertiveRef = useTemplateRef<HTMLElement>('assertiveRef')
const polite = useAlert(politeRef)
const assertive = useAlert(assertiveRef)
const cycleAnnouncements = (): void => {
	if (polite.visible.value) polite.hide()
	else polite.show()
	queueMicrotask(() => {
		if (assertive.visible.value) assertive.hide()
		else assertive.show()
	})
}

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — Initial visibility. `{ initial: false }` mounts the alert
// in the closed state — useful when the alert exists in the DOM but
// the consumer wants to open it via an upstream event (timer, server
// push, validation step).
// ─────────────────────────────────────────────────────────────────────
const deferredRef = useTemplateRef<HTMLElement>('deferredRef')
const deferred = useAlert(deferredRef, { initial: false })
</script>

<template>
	<section id="use-alert-intro">
		<hgroup>
			<h1>useAlert</h1>
			<p>
				Dismissible in-flow alert lifecycle. Pair an
				<code>&lt;aside role="alert"&gt;</code> (or any element with <code>role="alert"</code> /
				<code>role="status"</code>) with <code>useAlert(elementRef, options?)</code> and the
				framework wires the <code>[data-alert-open]</code> attribute flip, the cancellable
				<code>show</code> / <code>hide</code> events, the post-transition <code>open</code> /
				<code>close</code> notifications, and the descendant <code>[data-alert-dismiss]</code> click
				triggers.
			</p>
		</hgroup>
		<p>
			The closed-state chrome lives in <code>components/_aside.scss</code> — block-size collapses to
			zero, opacity fades, and the leading bar shrinks via the framework's
			<code>--set-motion-{duration, timing-function}</code> tokens (same motion contract every
			expanding / collapsing surface uses). See <a href="#/aside">AsidePage</a> for the static
			variant + size matrix; this page focuses on the JS layer.
		</p>
	</section>

	<section id="use-alert-lifecycle">
		<h2>1. Show / hide / toggle</h2>
		<p>
			The three imperative methods. <code>show()</code> opens, <code>hide()</code> closes,
			<code>toggle()</code> flips the current state. Each transitions through the framework's
			height-collapse animation (250 ms by default).
		</p>
		<aside ref="lifecycleRef" role="alert" class="success">
			<div><strong>Build passed.</strong> 1,420 / 1,420 tests on <code>main</code>.</div>
		</aside>
		<div class="cluster gap-2 mt-3">
			<button
				type="button"
				class="primary"
				@click="lifecycle.show()"
				:disabled="lifecycle.visible.value"
			>
				show()
			</button>
			<button
				type="button"
				class="subtle"
				@click="lifecycle.hide()"
				:disabled="!lifecycle.visible.value"
			>
				hide()
			</button>
			<button type="button" class="subtle" @click="lifecycle.toggle()">toggle()</button>
		</div>
		<p>
			<small class="showcase-muted">
				visible: <code>{{ lifecycle.visible.value }}</code>
			</small>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const alertRef = useTemplateRef('alertRef')
const alert = useAlert(alertRef)

&lt;aside ref="alertRef" role="alert" class="success"&gt;
  Build passed. 1,420 / 1,420 tests on &lt;code&gt;main&lt;/code&gt;.
&lt;/aside&gt;
&lt;button @click="alert.toggle()"&gt;toggle()&lt;/button&gt;</code></pre>
		</details>
	</section>

	<section id="use-alert-dismiss">
		<h2>2. <code>[data-alert-dismiss]</code> descendant triggers</h2>
		<p>
			Any descendant element with the <code>[data-alert-dismiss]</code> attribute becomes a click-
			to-close trigger. The framework wires the click handler — no per-button listener wiring on the
			consumer's side. Mirrors Bootstrap's <code>.btn-close</code> /
			<code>data-bs-dismiss="alert"</code>.
		</p>
		<aside ref="dismissRef" role="alert" class="warning">
			<div><strong>Pending upload.</strong> 4 of 12 files queued. Dismiss to acknowledge.</div>
			<button type="button" class="subtle small" data-alert-dismiss aria-label="Dismiss alert">
				×
			</button>
		</aside>
		<div class="cluster gap-2 mt-3">
			<button
				type="button"
				class="primary"
				@click="restoreDismiss"
				:disabled="dismiss.visible.value"
			>
				Restore
			</button>
		</div>
	</section>

	<section id="use-alert-variants">
		<h2>3. Variant cascade</h2>
		<p>
			Six variants × one alert each. Each carries a trailing
			<code>[data-alert-dismiss]</code> button; click any × to collapse that specific banner.
			Variant chrome (bg-subtle body + saturated leading bar + subtle perimeter) paints from the
			same <code>--color-{`{variant}`}-*</code> cascade every other framework surface uses.
		</p>
		<div class="stack" style="--set-stack-gap: 0.5rem">
			<aside
				v-for="v in variants"
				:key="v"
				role="alert"
				:class="v"
				:data-alert-open="variantBag[v] ? '' : undefined"
			>
				<div>
					<strong class="capitalize">{{ v }}</strong> — this alert paints the
					<code>--color-{{ v }}-*</code> triplet.
				</div>
				<button
					type="button"
					class="subtle small"
					data-alert-dismiss
					@click="dismissVariant(v)"
					aria-label="Dismiss alert"
				>
					×
				</button>
			</aside>
		</div>
		<div class="cluster gap-2 mt-3">
			<button type="button" class="primary" @click="showAllVariants">Show all</button>
			<small class="showcase-muted">
				Open: <code>{{ variantOpenCount }} / {{ variants.length }}</code>
			</small>
		</div>
		<p>
			<small class="showcase-muted">
				The <code>useAlert</code> composable isn't needed here — the framework's
				<code>[data-alert-open]</code> attribute is the only thing the chrome reads, and Vue's
				declarative binding flips it directly. <code>useAlert</code> earns its keep when the dismiss
				trigger lives inside the alert (Demo 2) or when consumer code needs to listen for the
				lifecycle events (Demo 4).
			</small>
		</p>
	</section>

	<section id="use-alert-guard">
		<h2>4. Cancellable lifecycle</h2>
		<p>
			Both <code>show</code> and <code>hide</code> are dispatched as cancellable
			<code>elements:alert:{kind}</code> events. <code>event.preventDefault()</code> inside the
			handler vetoes the state transition. Use for "are you sure?" affordances or for blocking
			dismiss while a critical operation is in flight.
		</p>
		<label class="cluster gap-2">
			<input type="checkbox" v-model="allowDismiss" />
			<span>Allow dismiss (uncheck to veto)</span>
		</label>
		<aside ref="guardRef" role="alert" class="danger mt-3">
			<div><strong>Destructive operation pending.</strong> Dismiss to cancel.</div>
			<button type="button" class="subtle small" data-alert-dismiss aria-label="Dismiss alert">
				×
			</button>
		</aside>
		<div class="cluster gap-2 mt-3">
			<button type="button" class="subtle" @click="guard.show()" :disabled="guard.visible.value">
				show()
			</button>
		</div>
		<article class="mt-3">
			<header>
				<h3>Event log</h3>
				<p class="showcase-card-subtitle">Last 4 lifecycle transitions.</p>
			</header>
			<ul v-if="guardLog.length === 0">
				<li>
					<small class="showcase-muted">No transitions yet — toggle the alert above.</small>
				</li>
			</ul>
			<ol v-else class="group">
				<li v-for="(message, idx) in guardLog" :key="idx">{{ message }}</li>
			</ol>
		</article>
	</section>

	<section id="use-alert-politeness">
		<h2>5. <code>role="alert"</code> vs <code>role="status"</code></h2>
		<p>
			Two live-region politeness levels.
			<code>role="alert"</code> is <strong>assertive</strong> — screen readers interrupt the user's
			current task to announce the message. Use sparingly: payment failures, form-submit errors,
			critical warnings. <code>role="status"</code> is <strong>polite</strong> — announced when the
			user is idle. Use for non-urgent state updates: "Saved", "Sync in progress", "Build queued".
		</p>
		<button type="button" class="primary" @click="cycleAnnouncements">Cycle both</button>
		<aside ref="politeRef" role="status" class="information mt-3">
			<div><strong>role="status"</strong> — polite live region.</div>
		</aside>
		<aside ref="assertiveRef" role="alert" class="warning mt-3">
			<div><strong>role="alert"</strong> — assertive live region.</div>
		</aside>
		<p class="mt-3">
			<small class="showcase-muted">
				The factory accepts both roles — they share the visual chrome; only the AT politeness
				differs.
			</small>
		</p>
	</section>

	<section id="use-alert-deferred">
		<h2>6. Deferred initial — <code>{ initial: false }</code></h2>
		<p>
			Default initial visibility is <code>true</code> because an
			<code>&lt;aside role="alert"&gt;</code> is meaningless when hidden. Pass
			<code>initial: false</code> when the alert exists in the DOM but should mount in the closed
			state — useful for "open via an upstream event" patterns (timer, server push, validation
			step).
		</p>
		<aside ref="deferredRef" role="alert" class="primary">
			<div>
				<strong>Triggered alert.</strong> Mounted with <code>initial: false</code>; clicked into
				view.
			</div>
			<button type="button" class="subtle small" data-alert-dismiss aria-label="Dismiss alert">
				×
			</button>
		</aside>
		<div class="cluster gap-2 mt-3">
			<button
				type="button"
				class="primary"
				@click="deferred.show()"
				:disabled="deferred.visible.value"
			>
				Trigger
			</button>
		</div>
	</section>

	<section id="use-alert-a11y">
		<h2>7. Accessibility</h2>
		<dl>
			<dt><code>role="alert"</code> / <code>role="status"</code></dt>
			<dd>
				Pick the politeness to match urgency.
				<code>role="alert"</code> interrupts; <code>role="status"</code> announces when idle. The
				factory adds <code>role="alert"</code> automatically if the host has no role.
			</dd>
			<dt><code>aria-hidden="true"</code> on close</dt>
			<dd>
				The factory writes <code>aria-hidden="true"</code> AFTER the close transition settles so
				screen readers stop tracking the dismissed alert. Removing it on open lets the live region
				re-announce.
			</dd>
			<dt><code>[data-alert-dismiss]</code> on a real <code>&lt;button&gt;</code></dt>
			<dd>
				Use a real button for the dismiss trigger — it's keyboard-focusable, gets the framework's
				focus ring, and announces "button" to AT.
				<code>aria-label="Dismiss alert"</code> on icon-only buttons clears the WCAG name
				requirement.
			</dd>
			<dt>Reduced motion</dt>
			<dd>
				The height-collapse animation is wrapped via <code>@include transition()</code> so users
				with <code>prefers-reduced-motion: reduce</code> see instant collapse rather than a slide.
			</dd>
			<dt>Forced colors (Windows HC)</dt>
			<dd>
				The aside-alert baseline falls back to <code>Mark</code> / <code>MarkText</code> system
				colours in <code>forced-colors: active</code> mode; the leading bar stays visible via
				<code>border-color: CanvasText</code>.
			</dd>
		</dl>
	</section>

	<section id="use-alert-tokens">
		<h2>8. Tokens</h2>
		<p>
			The element-scoped tokens live on
			<code>aside[role='alert']</code> — see <a href="#/aside">AsidePage's</a> token reference for
			the full surface. The notable ones <code>useAlert</code> interacts with:
		</p>
		<dl>
			<dt><code>--set-alert-padding-block</code></dt>
			<dd>
				Closed state forces this to <code>0</code>; open state restores it. Drives the
				height-collapse layout shift.
			</dd>
			<dt><code>--set-alert-bar-width</code></dt>
			<dd>
				The saturated leading bar's width. Closed state forces it to 0; open state restores.
				Variants tint it via the <code>--color-{`{variant}`}-text-emphasis</code> token.
			</dd>
			<dt><code>--set-motion-duration</code> / <code>--set-motion-timing-function</code></dt>
			<dd>
				Framework-wide motion contract — the same tokens drive
				<code>&lt;details&gt;::details-content</code>, drawers, dialogs, and table-row expansions.
				One <code>:root</code> override retunes every collapsing surface.
			</dd>
			<dt><code>--set-motion-slide-distance</code></dt>
			<dd>
				The small inward translate the closed state applies (subtle "settling into place" feel).
				Shared with the non-modal <code>&lt;dialog&gt;</code> Y-slide entry.
			</dd>
		</dl>
	</section>
</template>
