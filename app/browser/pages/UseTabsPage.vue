<script lang="ts" setup>
/**
 * UseTabsPage — JS-driven `[role="tablist"]` composable.
 *
 * `useTabs(triggerRef, { pane, group, ... })` wires ONE trigger to ONE
 * pane within a tablist. Sibling triggers coordinate through per-element
 * DOM events (no shared registry) — when one tab activates, it walks
 * the group, finds the previously-`aria-selected="true"` sibling, and
 * flips its state.
 *
 * What the composable owns (and what the platform doesn't give you for
 * free):
 *
 *   1. **ARIA wiring.** Seeds `role="tablist"` / `role="tab"` /
 *      `role="tabpanel"` when absent; mirrors `aria-selected` on the
 *      active trigger and pairs it with `aria-controls="<paneId>"`.
 *   2. **Pane visibility via the HTML `[hidden]` attribute.** Active
 *      pane has `[hidden]` removed; inactive panes have `[hidden]` set.
 *      Matches the `[role='tabpanel'][hidden] { display: none }` rule in
 *      `components/_nav.scss`. The platform handles the visual hide AND
 *      removes the hidden subtree from the accessibility tree —
 *      no second `[aria-hidden]` write needed.
 *   3. **Indicator geometry tokens.** Writes
 *      `--set-tabs-indicator-{x,y,width,height}` on the tablist so the
 *      author's CSS can animate an underline / pill / segmented-control
 *      indicator that tracks the active trigger.
 *   4. **Cancellable lifecycle.** `on.show` / `on.hide` fire BEFORE the
 *      state flip with `event.preventDefault()` aborting the change.
 *      `on.open` / `on.close` are post-flip (informational, non-cancellable).
 *      `on.deactivate` fires on the sibling trigger that's been displaced
 *      so its own composable can sync state.
 *
 * What the composable INTENTIONALLY doesn't do:
 *
 *   - No pane-transition machinery. The previous version called
 *     `runTransition` and waited for a `transitionend` event the
 *     framework's tab chrome doesn't declare — a 400 ms dead wait
 *     before every pane swap. Strip dropped it; pane swap is now
 *     instantaneous, which is the right default for `[hidden]`
 *     (`display: none` can't transition).
 *   - No `[data-tab-open]` attribute. The previous version wrote it on /
 *     off but no SCSS file referenced it. The HTML `[hidden]` attribute
 *     IS the visibility contract; one source of truth.
 *
 * Cross-references:
 *   - `<nav>` baseline + tablist chrome in
 *     [components/_nav.scss](https://github.com/…/components/_nav.scss).
 *   - `.pills` / `.bordered` / `.vertical` style modifiers in
 *     [composables/_tabs.scss](…).
 */
import { ref, useTemplateRef } from 'vue'
import { useTabs } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — default horizontal tablist.
// ─────────────────────────────────────────────────────────────────────
const defaultGroup = useTemplateRef<HTMLElement>('defaultGroup')

const defaultTrigger1 = useTemplateRef<HTMLButtonElement>('defaultTrigger1')
const defaultPane1 = useTemplateRef<HTMLElement>('defaultPane1')
const tab1 = useTabs(defaultTrigger1, {
	pane: defaultPane1,
	group: defaultGroup,
	initial: true,
})

const defaultTrigger2 = useTemplateRef<HTMLButtonElement>('defaultTrigger2')
const defaultPane2 = useTemplateRef<HTMLElement>('defaultPane2')
const tab2 = useTabs(defaultTrigger2, { pane: defaultPane2, group: defaultGroup })

const defaultTrigger3 = useTemplateRef<HTMLButtonElement>('defaultTrigger3')
const defaultPane3 = useTemplateRef<HTMLElement>('defaultPane3')
const tab3 = useTabs(defaultTrigger3, { pane: defaultPane3, group: defaultGroup })

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — `.pills` style modifier. Segmented-control look.
// ─────────────────────────────────────────────────────────────────────
const pillsGroup = useTemplateRef<HTMLElement>('pillsGroup')

const pillsTrigger1 = useTemplateRef<HTMLButtonElement>('pillsTrigger1')
const pillsPane1 = useTemplateRef<HTMLElement>('pillsPane1')
const pill1 = useTabs(pillsTrigger1, {
	pane: pillsPane1,
	group: pillsGroup,
	initial: true,
})

const pillsTrigger2 = useTemplateRef<HTMLButtonElement>('pillsTrigger2')
const pillsPane2 = useTemplateRef<HTMLElement>('pillsPane2')
const pill2 = useTabs(pillsTrigger2, { pane: pillsPane2, group: pillsGroup })

const pillsTrigger3 = useTemplateRef<HTMLButtonElement>('pillsTrigger3')
const pillsPane3 = useTemplateRef<HTMLElement>('pillsPane3')
const pill3 = useTabs(pillsTrigger3, { pane: pillsPane3, group: pillsGroup })

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — cancellable lifecycle. preventDefault on show vetoes.
// ─────────────────────────────────────────────────────────────────────
const lifecycleGroup = useTemplateRef<HTMLElement>('lifecycleGroup')
const lifecycleLog = ref<string[]>([])
const allowActivate = ref(true)
const note = (line: string): void => {
	lifecycleLog.value = [...lifecycleLog.value.slice(-5), line]
}

const lifeTrigger1 = useTemplateRef<HTMLButtonElement>('lifeTrigger1')
const lifePane1 = useTemplateRef<HTMLElement>('lifePane1')
useTabs(lifeTrigger1, {
	pane: lifePane1,
	group: lifecycleGroup,
	initial: true,
	on: {
		show: () => note('tab 1: show'),
		hide: () => note('tab 1: hide'),
		open: () => note('tab 1: open'),
		close: () => note('tab 1: close'),
	},
})

const lifeTrigger2 = useTemplateRef<HTMLButtonElement>('lifeTrigger2')
const lifePane2 = useTemplateRef<HTMLElement>('lifePane2')
useTabs(lifeTrigger2, {
	pane: lifePane2,
	group: lifecycleGroup,
	on: {
		show: (event: CustomEvent) => {
			if (!allowActivate.value) {
				event.preventDefault()
				note('tab 2: show vetoed via preventDefault()')
				return
			}
			note('tab 2: show')
		},
		open: () => note('tab 2: open'),
		hide: () => note('tab 2: hide'),
		close: () => note('tab 2: close'),
	},
})
</script>

<template>
	<section id="use-tabs-intro">
		<hgroup>
			<h1>useTabs</h1>
			<p>
				JS adapter for the WAI-ARIA tabs pattern. Pass refs to the
				<code>&lt;button role="tab"&gt;</code> trigger, its
				<code>&lt;section role="tabpanel"&gt;</code> pane, and the
				<code>&lt;ul role="tablist"&gt;</code> wrapper — the composable seeds the ARIA roles,
				mirrors <code>aria-selected</code> on the active trigger, pairs it with
				<code>aria-controls</code>, toggles the HTML <code>[hidden]</code> attribute on inactive
				panes, and writes <code>--set-tabs-indicator-{x,y,width,height}</code> on the tablist so the
				author's CSS can animate a sliding underline / pill indicator.
			</p>
		</hgroup>
		<p>
			Sibling triggers coordinate through DOM events — no shared registry. When one tab activates,
			it walks the tablist, finds the previously-selected sibling, and dispatches
			<code>elements:tabs:deactivate</code> on it so the sibling's own <code>useTabs</code> instance
			syncs state. Each instance is independent. The page below demonstrates three tablists side by
			side; they don't know about each other.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				default tab 1 <code>{{ tab1.active.value ? 'active' : 'inactive' }}</code> · tab 2
				<code>{{ tab2.active.value ? 'active' : 'inactive' }}</code> · tab 3
				<code>{{ tab3.active.value ? 'active' : 'inactive' }}</code> · pill 1
				<code>{{ pill1.active.value ? 'active' : 'inactive' }}</code> · pill 2
				<code>{{ pill2.active.value ? 'active' : 'inactive' }}</code> · pill 3
				<code>{{ pill3.active.value ? 'active' : 'inactive' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-tabs-default">
		<h2>1. Default horizontal tablist</h2>
		<p>
			Three tabs sharing one group. Click a trigger or focus it and press <kbd>Enter</kbd> to
			activate. Inactive panes get <code>[hidden]</code> set on them by the composable; the
			framework's <code>[role='tabpanel'][hidden] { display: none }</code> rule (in
			<code>components/_nav.scss</code>) is what actually hides them. One attribute, one source of
			truth for visibility AND the accessibility tree.
		</p>
		<ul ref="defaultGroup" role="tablist" class="reset-list">
			<li>
				<button ref="defaultTrigger1" type="button">Overview</button>
			</li>
			<li>
				<button ref="defaultTrigger2" type="button">Specifications</button>
			</li>
			<li>
				<button ref="defaultTrigger3" type="button">Reviews</button>
			</li>
		</ul>
		<section ref="defaultPane1" role="tabpanel">
			<h3>Overview</h3>
			<p>
				The first pane is active because the <code>initial: true</code> option was passed to its
				<code>useTabs</code> call. On mount, the factory set <code>aria-selected="true"</code> on
				this trigger and removed <code>[hidden]</code>
				from this pane.
			</p>
		</section>
		<section ref="defaultPane2" role="tabpanel">
			<h3>Specifications</h3>
			<ul>
				<li>Display: 6.1" OLED, 460 ppi</li>
				<li>Battery: 22 hours video playback</li>
				<li>Weight: 187g</li>
			</ul>
		</section>
		<section ref="defaultPane3" role="tabpanel">
			<h3>Reviews</h3>
			<p>
				<strong>★★★★☆</strong> — "Build quality is great, but the camera bump is more prominent than
				the press shots suggested."
			</p>
		</section>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const tab1 = useTabs(trigger1, { pane: pane1, group, initial: true })
const tab2 = useTabs(trigger2, { pane: pane2, group })
const tab3 = useTabs(trigger3, { pane: pane3, group })

&lt;ul ref="group" role="tablist"&gt;
  &lt;li&gt;&lt;button ref="trigger1" type="button"&gt;Overview&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button ref="trigger2" type="button"&gt;Specifications&lt;/button&gt;&lt;/li&gt;
  &lt;li&gt;&lt;button ref="trigger3" type="button"&gt;Reviews&lt;/button&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;section ref="pane1" role="tabpanel"&gt;…&lt;/section&gt;
&lt;section ref="pane2" role="tabpanel"&gt;…&lt;/section&gt;
&lt;section ref="pane3" role="tabpanel"&gt;…&lt;/section&gt;</code></pre>
		</details>
	</section>

	<section id="use-tabs-pills">
		<h2>2. <code>.pills</code> style modifier</h2>
		<p>
			Add <code>.pills</code> to the tablist for a segmented-control look — filled background on the
			active trigger, no underline indicator, compact gap between buttons. The composable is
			unchanged; only the CSS in <code>composables/_tabs.scss</code> differs.
		</p>
		<ul ref="pillsGroup" role="tablist" class="pills reset-list">
			<li><button ref="pillsTrigger1" type="button">Day</button></li>
			<li><button ref="pillsTrigger2" type="button">Week</button></li>
			<li><button ref="pillsTrigger3" type="button">Month</button></li>
		</ul>
		<section ref="pillsPane1" role="tabpanel">
			<h3>Day view</h3>
			<p>24-hour breakdown of activity, hourly granularity.</p>
		</section>
		<section ref="pillsPane2" role="tabpanel">
			<h3>Week view</h3>
			<p>Aggregated daily totals for the last 7 days, Monday → Sunday.</p>
		</section>
		<section ref="pillsPane3" role="tabpanel">
			<h3>Month view</h3>
			<p>30-day rolling window with weekly trend lines overlaid.</p>
		</section>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>&lt;ul role="tablist" class="pills"&gt;…&lt;/ul&gt;
// The composable call is identical — only the class on the tablist changes.</code></pre>
		</details>
	</section>

	<section id="use-tabs-lifecycle">
		<h2>3. Cancellable lifecycle</h2>
		<p>
			<code>on.show</code> / <code>on.hide</code> fire BEFORE the active-state flip with a
			cancellable <code>CustomEvent</code> — calling <code>event.preventDefault()</code> aborts the
			activation. <code>on.open</code> / <code>on.close</code> fire AFTER (informational). Toggle
			the checkbox below to veto activation of the "Vetoable" tab; the log shows when each event
			fires.
		</p>
		<menu>
			<li>
				<label>
					<input v-model="allowActivate" type="checkbox" />
					allow activation of the "Vetoable" tab
				</label>
			</li>
		</menu>
		<ul ref="lifecycleGroup" role="tablist" class="reset-list">
			<li>
				<button ref="lifeTrigger1" type="button">Always available</button>
			</li>
			<li>
				<button ref="lifeTrigger2" type="button">Vetoable</button>
			</li>
		</ul>
		<section ref="lifePane1" role="tabpanel">
			<p>This tab activates normally — no veto in its <code>on.show</code> handler.</p>
		</section>
		<section ref="lifePane2" role="tabpanel">
			<p>
				This tab only activates when the checkbox above is enabled. Otherwise
				<code>on.show</code> calls <code>event.preventDefault()</code> and the activation aborts;
				the previously-active tab stays active.
			</p>
		</section>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">click a tab to trigger events</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
	</section>

	<section id="use-tabs-api">
		<h2>API reference</h2>
		<dl>
			<dt>
				<code>useTabs(triggerRef, options): UseTabsReturn</code>
			</dt>
			<dd>
				Composable. <code>triggerRef</code> points at the <code>&lt;button role="tab"&gt;</code>;
				<code>options.pane</code> + <code>options.group</code>
				point at the tabpanel and tablist wrapper respectively. The factory adds the
				<code>role="tab"</code> / <code>role="tabpanel"</code> / <code>role="tablist"</code>
				attributes when absent.
			</dd>
			<dt><code>options.initial</code></dt>
			<dd>
				<code>boolean</code>. Force this tab active on first mount. Equivalent to pre-authoring
				<code>aria-selected="true"</code> on the trigger before the composable runs. Falls back to
				reading <code>aria-selected="true"</code> from the trigger if not provided.
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close?, deactivate? }</code>. <code>show</code> /
				<code>hide</code> are pre-flip + cancellable (call <code>preventDefault()</code> on the
				event to abort). <code>open</code> / <code>close</code> are post-flip and informational.
				<code>deactivate</code> fires on the sibling trigger that's been displaced — useful for
				syncing external state.
			</dd>
			<dt><code>UseTabsReturn.active</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reflects whether this trigger is currently
				the selected tab.
			</dd>
			<dt><code>UseTabsReturn.show()</code> / <code>.hide()</code> / <code>.toggle()</code></dt>
			<dd>Programmatic lifecycle. Honors the same cancellable-event contract.</dd>
		</dl>
	</section>
</template>

<style scoped>
.reset-list {
	list-style: none;
	margin: 0;
	padding: 0;
}
</style>
