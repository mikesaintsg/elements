<script lang="ts" setup>
/**
 * UseNavPage — IntersectionObserver-driven scroll-spy on `<nav>` +
 * scrollable container.
 *
 * `useNav(containerRef, { nav?, intersection?, on? })` wraps
 * `createNav`. The factory watches every `[id]` descendant of the
 * container and writes `aria-current="location"` to the matching
 * `<a href="#id">` inside the optional `<nav>` element as that section
 * scrolls into view. The active section's id is exposed as a reactive
 * `Ref<string | null>` and broadcast via the `elements:nav:activate`
 * CustomEvent.
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Reactive state:
 *     active   Ref<string | null>   — id of the topmost visible section.
 *
 *   Imperative API:
 *     refresh()   — disconnect + re-establish the IntersectionObserver
 *                   (call after dynamically adding / removing sections).
 *
 *   Options (`UseNavOptions`):
 *     nav                  Ref<HTMLElement | null>   — `<nav>` carrying the
 *                                                       link list. Optional;
 *                                                       without it the
 *                                                       reactive `active` ref
 *                                                       still updates but no
 *                                                       `aria-current` is
 *                                                       written.
 *     intersection.offset  number (default 10 px)    — top inset; controls
 *                                                       when a section is
 *                                                       considered "in view".
 *     intersection.margin  string                    — full IntersectionObserver
 *                                                       `rootMargin` override
 *                                                       when `offset` isn't
 *                                                       enough (e.g. when a
 *                                                       sticky toolbar covers
 *                                                       part of the container).
 *     intersection.threshold  number | readonly number[]
 *                                  (default 0.1)     — IO `threshold`.
 *     on                   Partial<UseNavEventMap>   — listen for `activate`
 *                                                       on the container.
 *
 *   Selectors (consumer DOM contract):
 *     `NAV_SECTION_SELECTOR = '[id]'`   — every descendant with an `id`
 *                                          inside the container becomes a
 *                                          scroll-spy target.
 *     `NAV_LINK_SELECTOR = 'a'`         — every `<a>` inside the optional
 *                                          `<nav>` is candidate. The factory
 *                                          matches `href="#id"` (or bare `id`)
 *                                          to flip `aria-current`.
 *
 *   Framework chrome (declared in `components/_menu.scss`):
 *     `body:has(main) > aside menu > li > :where(a, button)[aria-current='location']`
 *       → leading-bar accent on the TOC row. The whole showcase's right rail
 *         IS this pattern — `useNav` is what flips the flag as the reader
 *         scrolls the page.
 *
 * Native-platform redundancy walk (`contribute.md` §5.4.1):
 *   1. `aria-current="location"` is the documented ARIA value for
 *      "this row matches the current scroll location" — Bootstrap parity
 *      replaces `.active` class with the semantic attribute. Hooked by
 *      `components/_menu.scss` lines 296-297. Not dead.
 *   2. No `runTransition` (no transition lifecycle).
 *   3. No re-implemented Escape / outside-click dismiss.
 *   4. No JS-driven ARIA chrome beyond `aria-current`.
 *   5. No body-scroll lock.
 *   6. `activate` is an informational event (no `dispatch` cancellable
 *      wrapper). Correct — scroll-spy is post-state observation, not a
 *      user-triggered transition the consumer can veto.
 *   Factory is clean; no strip needed.
 *
 * Cross-references:
 *   - NavPage — the static `<nav>` chrome (rails, breadcrumbs, pagination,
 *     `aria-current="page"` styling). UseNavPage layers scroll-spy state on
 *     the same vocabulary.
 *   - The showcase's right-hand TOC rail (every page) IS a useNav consumer.
 *     `App.vue` mounts `useNav(mainRef, { nav: tocRef })` so the active
 *     section id flips as the user reads.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useNav } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// Demo 1 — Basic scroll-spy.
// `<article>` is the scrollable container, an `<aside>` rail carries
// the menu link list. As the reader scrolls the article, `aria-current=
// "location"` flips to the matching link and the active leading-bar
// accent paints automatically (framework's TOC chrome).
// ─────────────────────────────────────────────────────────────────────
const basicContainer = useTemplateRef<HTMLElement>('basicContainer')
const basicNav = useTemplateRef<HTMLElement>('basicNav')
const basic = useNav(basicContainer, { nav: basicNav })

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — `intersection.offset` controls when a section counts as
// "in view". A sticky toolbar covering the top 64 px of the container
// would otherwise mark sections active too early.
// ─────────────────────────────────────────────────────────────────────
const offsetContainer = useTemplateRef<HTMLElement>('offsetContainer')
const offsetNav = useTemplateRef<HTMLElement>('offsetNav')
const offsetValue = ref(80)
const offset = useNav(offsetContainer, {
	nav: offsetNav,
	intersection: computed(() => ({ offset: offsetValue.value })).value,
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — `activate` event listener. The container fires
// `elements:nav:activate` with `{ id }` whenever the active section
// changes. Useful for analytics / persisting last-read position /
// driving a non-link-based UI (a progress meter, a "you are here"
// breadcrumb).
// ─────────────────────────────────────────────────────────────────────
const eventContainer = useTemplateRef<HTMLElement>('eventContainer')
const eventLog = ref<readonly { id: string; time: string }[]>([])
const event = useNav(eventContainer, {
	on: {
		activate: (e: CustomEvent) => {
			const detail = e.detail as { id: string }
			const time = new Date().toLocaleTimeString(undefined, { hour12: false })
			const next = [...eventLog.value, { id: detail.id, time }]
			eventLog.value = next.slice(-6)
		},
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — `refresh()`. The IntersectionObserver caches its target
// set when first attached. Adding / removing sections at runtime
// needs an explicit `refresh()` so the new targets get observed.
// ─────────────────────────────────────────────────────────────────────
const refreshContainer = useTemplateRef<HTMLElement>('refreshContainer')
const refreshNav = useTemplateRef<HTMLElement>('refreshNav')
const refreshSections = ref<readonly string[]>(['Alpha', 'Bravo', 'Charlie'])
const refresh = useNav(refreshContainer, { nav: refreshNav })
const addSection = (): void => {
	const next = ['Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India']
	const remaining = next.find((label) => !refreshSections.value.includes(label))
	if (!remaining) return
	refreshSections.value = [...refreshSections.value, remaining]
	queueMicrotask(() => refresh.refresh())
}
const removeSection = (): void => {
	if (refreshSections.value.length <= 1) return
	refreshSections.value = refreshSections.value.slice(0, -1)
	queueMicrotask(() => refresh.refresh())
}
</script>

<template>
	<section id="use-nav-intro">
		<hgroup>
			<h1>useNav</h1>
			<p>
				IntersectionObserver-driven scroll-spy. Pair a scrollable container with a `&lt;nav&gt;`
				link list and the framework flips <code>aria-current="location"</code> on the matching link
				as each section scrolls into view.
			</p>
		</hgroup>
		<p>
			The framework chrome lives in
			<a href="#/menu"><code>components/_menu.scss</code></a> — a TOC-style link inside
			<code>&lt;body&gt; &gt; &lt;aside&gt; &lt;menu&gt;</code> picks up a leading-bar accent the
			moment <code>aria-current="location"</code> appears. The whole showcase's right rail (this
			very page) is one such consumer; scroll the article and you'll see the matching link in the
			TOC light up.
		</p>
	</section>

	<section id="use-nav-basic">
		<h2>1. Basic scroll-spy</h2>
		<p>
			An <code>&lt;article&gt;</code> as the scrollable container; an
			<code>&lt;aside&gt;</code> rail with a <code>&lt;menu&gt;</code> of
			<code>&lt;a href="#id"&gt;</code> links. <code>useNav</code> ties the two together.
		</p>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: min(20rem, 100%)">
			<aside>
				<nav ref="basicNav" aria-label="In-article navigation" class="showcase-nav-demo">
					<menu>
						<li><a href="#basic-overview">Overview</a></li>
						<li><a href="#basic-installation">Installation</a></li>
						<li><a href="#basic-configuration">Configuration</a></li>
						<li><a href="#basic-troubleshooting">Troubleshooting</a></li>
						<li><a href="#basic-changelog">Changelog</a></li>
					</menu>
				</nav>
				<p>
					<small class="showcase-muted">
						Active id: <code>{{ basic.active.value ?? 'none' }}</code>
					</small>
				</p>
			</aside>
			<article ref="basicContainer" class="overflow-auto" style="block-size: 24rem">
				<section id="basic-overview">
					<h3>Overview</h3>
					<p>
						The fastest way to wire scroll-spy into an existing page: drop a
						<code>&lt;nav&gt;</code> alongside the scrollable region, point <code>useNav</code> at
						both, and the framework handles the rest.
					</p>
					<p>
						Sections are discovered by the IntersectionObserver default selector
						(<code>[id]</code>); any descendant with an id is a scroll-spy target.
					</p>
				</section>
				<section id="basic-installation">
					<h3>Installation</h3>
					<p>
						Add the composable to your import map. No SCSS-side wiring is required — the chrome
						lives in <code>components/_menu.scss</code> already.
					</p>
					<p>
						<code>useNav</code> attaches on mount via <code>watch({ flush: 'post' })</code> so
						consumer refs are populated before the IntersectionObserver runs.
					</p>
				</section>
				<section id="basic-configuration">
					<h3>Configuration</h3>
					<p>
						Three intersection knobs: <code>offset</code> (top inset, default 10 px),
						<code>margin</code> (full <code>rootMargin</code> override), and
						<code>threshold</code> (IO threshold, default 0.1).
					</p>
				</section>
				<section id="basic-troubleshooting">
					<h3>Troubleshooting</h3>
					<p>
						If the active link doesn't flip, check that every target section has an
						<code>id</code> and that the link's <code>href</code> matches with the leading
						<code>#</code>.
					</p>
					<p>
						If the container itself isn't scrollable, the IntersectionObserver falls back to the
						viewport — useful for documents where the whole page scrolls.
					</p>
				</section>
				<section id="basic-changelog">
					<h3>Changelog</h3>
					<p>
						Released as <code>useNav</code> (renamed from <code>useScrollSpy</code>); folded under
						the <code>&lt;nav&gt;</code> semantic so the composable name matches the element it
						drives.
					</p>
				</section>
			</article>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const containerRef = useTemplateRef('containerRef')
const navRef = useTemplateRef('navRef')
useNav(containerRef, { nav: navRef })

&lt;nav ref="navRef"&gt;
  &lt;menu&gt;
    &lt;li&gt;&lt;a href="#section-1"&gt;Section 1&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="#section-2"&gt;Section 2&lt;/a&gt;&lt;/li&gt;
  &lt;/menu&gt;
&lt;/nav&gt;
&lt;article ref="containerRef" style="overflow: auto; block-size: 24rem"&gt;
  &lt;section id="section-1"&gt;…&lt;/section&gt;
  &lt;section id="section-2"&gt;…&lt;/section&gt;
&lt;/article&gt;</code></pre>
		</details>
	</section>

	<section id="use-nav-offset">
		<h2>2. <code>intersection.offset</code></h2>
		<p>
			The top inset that decides when a section counts as "in view." Default 10 px; raise it when a
			sticky toolbar covers the top of the container so sections aren't marked active while still
			behind the toolbar.
		</p>
		<p>
			Slider rebuilds the IntersectionObserver — drag and watch the active link change as the
			"trigger line" moves down the container.
		</p>
		<label class="cluster gap-2">
			<span>Offset (px)</span>
			<input
				type="range"
				min="0"
				max="240"
				step="10"
				v-model.number="offsetValue"
				@change="offset.refresh()"
			/>
			<output
				><code>{{ offsetValue }}</code></output
			>
		</label>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: min(20rem, 100%)">
			<aside>
				<nav ref="offsetNav" aria-label="Offset demo navigation" class="showcase-nav-demo">
					<menu>
						<li><a href="#offset-one">Section one</a></li>
						<li><a href="#offset-two">Section two</a></li>
						<li><a href="#offset-three">Section three</a></li>
						<li><a href="#offset-four">Section four</a></li>
					</menu>
				</nav>
				<p>
					<small class="showcase-muted">
						Active id: <code>{{ offset.active.value ?? 'none' }}</code>
					</small>
				</p>
			</aside>
			<article ref="offsetContainer" class="overflow-auto" style="block-size: 20rem">
				<section id="offset-one">
					<h3>Section one</h3>
					<p>The offset shifts the active-section trigger line down by this many pixels.</p>
				</section>
				<section id="offset-two">
					<h3>Section two</h3>
					<p>Scroll slowly and watch the active link in the rail.</p>
				</section>
				<section id="offset-three">
					<h3>Section three</h3>
					<p>
						The IntersectionObserver's <code>rootMargin</code> resolves to
						<code>-{{ offsetValue }}px 0px 0px 0px</code>.
					</p>
				</section>
				<section id="offset-four">
					<h3>Section four</h3>
					<p>For more complex coverage, supply <code>intersection.margin</code> directly.</p>
				</section>
			</article>
		</div>
	</section>

	<section id="use-nav-events">
		<h2>3. <code>activate</code> event</h2>
		<p>
			Every active-section transition fires
			<code>elements:nav:activate</code> on the container with <code>{ id }</code> in the detail.
			The composable's <code>on</code> option wires it. Use for analytics ("which section is being
			read?"), persisting last-read position, or driving non-link-based UI (a "you are here"
			breadcrumb / progress meter / mini-map).
		</p>
		<div class="showcase-tile-grid" style="--showcase-tile-grid-min: min(20rem, 100%)">
			<article ref="eventContainer" class="overflow-auto" style="block-size: 18rem">
				<section id="event-alpha">
					<h3>Alpha</h3>
					<p>Scroll to see events fire.</p>
				</section>
				<section id="event-bravo">
					<h3>Bravo</h3>
					<p>Each visibility change emits an activate event.</p>
				</section>
				<section id="event-charlie">
					<h3>Charlie</h3>
					<p>The latest 6 events appear in the panel.</p>
				</section>
				<section id="event-delta">
					<h3>Delta</h3>
					<p>No event fires if the same id stays active.</p>
				</section>
				<section id="event-echo">
					<h3>Echo</h3>
					<p>The factory de-dupes via the reactive ref's equality check.</p>
				</section>
			</article>
			<article>
				<header>
					<h3>Event log</h3>
					<p class="showcase-card-subtitle">Last 6 activate events.</p>
				</header>
				<ul v-if="eventLog.length === 0">
					<li>
						<small class="showcase-muted">No events yet — scroll the article.</small>
					</li>
				</ul>
				<ol v-else class="group">
					<li v-for="(entry, idx) in eventLog" :key="idx">
						<code>{{ entry.time }}</code> — <code>{{ entry.id }}</code>
					</li>
				</ol>
			</article>
		</div>
	</section>

	<section id="use-nav-refresh">
		<h2>4. <code>refresh()</code> for dynamic sections</h2>
		<p>
			The IntersectionObserver caches its target set when first attached. Adding or removing
			sections at runtime needs an explicit <code>refresh()</code> so the new targets get observed.
			The factory disconnects the previous observer and re-establishes a fresh one with the current
			DOM.
		</p>
		<div class="cluster gap-2">
			<button type="button" class="subtle" @click="addSection">Add section</button>
			<button type="button" class="subtle" @click="removeSection">Remove last</button>
		</div>
		<div class="showcase-tile-grid mt-3" style="--showcase-tile-grid-min: min(20rem, 100%)">
			<aside>
				<nav ref="refreshNav" aria-label="Refresh demo navigation" class="showcase-nav-demo">
					<menu>
						<li v-for="label in refreshSections" :key="label">
							<a :href="`#refresh-${label.toLowerCase()}`">{{ label }}</a>
						</li>
					</menu>
				</nav>
				<p>
					<small class="showcase-muted">
						Active id: <code>{{ refresh.active.value ?? 'none' }}</code>
					</small>
				</p>
			</aside>
			<article ref="refreshContainer" class="overflow-auto" style="block-size: 18rem">
				<section
					v-for="label in refreshSections"
					:key="label"
					:id="`refresh-${label.toLowerCase()}`"
				>
					<h3>{{ label }}</h3>
					<p>Dynamic section under <code>useNav</code>'s observer.</p>
				</section>
			</article>
		</div>
	</section>

	<section id="use-nav-options">
		<h2>5. Options reference</h2>
		<dl>
			<dt><code>nav</code></dt>
			<dd>
				<code>Ref&lt;HTMLElement | null&gt;</code>. The <code>&lt;nav&gt;</code> element carrying
				the link list. Optional — without it, the reactive <code>active</code> ref still updates but
				no <code>aria-current</code> is written. Useful when the consumer drives non-link chrome
				from the <code>activate</code> event.
			</dd>
			<dt><code>intersection.offset</code></dt>
			<dd>
				Top inset in pixels (default <code>10</code>). Translates to
				<code>rootMargin: "-{offset}px 0px 0px 0px"</code>.
			</dd>
			<dt><code>intersection.margin</code></dt>
			<dd>
				Full <code>rootMargin</code> override. Wins over <code>offset</code> when supplied. Use this
				when you need asymmetric or non-pixel insets.
			</dd>
			<dt><code>intersection.threshold</code></dt>
			<dd>
				IntersectionObserver <code>threshold</code>. Default <code>0.1</code> (10% of the section
				visible counts as in-view). Accepts a number or readonly number array.
			</dd>
			<dt><code>on.activate</code></dt>
			<dd>
				Listener for the <code>elements:nav:activate</code> event. <code>event.detail</code> is
				<code>{ id: string }</code>.
			</dd>
		</dl>
	</section>

	<section id="use-nav-a11y">
		<h2>6. Accessibility</h2>
		<dl>
			<dt><code>aria-current="location"</code></dt>
			<dd>
				WAI-ARIA's documented value for "this link matches the user's current scroll position."
				Bootstrap's <code>.active</code> class is replaced by the semantic attribute so screen
				readers announce "current location" instead of an arbitrary class.
			</dd>
			<dt>Selector contract</dt>
			<dd>
				The composable reads the link's <code>href</code> attribute and matches the bare id (with or
				without the leading <code>#</code>). Use a real <code>&lt;a href="#id"&gt;</code> rather
				than a JS-only click handler — the link is keyboard-navigable, indexable, and deep-linkable.
			</dd>
			<dt>No focus stealing</dt>
			<dd>
				The factory does NOT move DOM focus on activation. Scrolling is a passive observation; the
				keyboard cursor stays where the user put it.
			</dd>
			<dt>Reduced motion / forced colors</dt>
			<dd>
				The framework's TOC chrome paints with <code>border-inline-start</code> + variant tint — no
				animations. Forced-colors mode keeps the leading bar visible via
				<code>border-color: Highlight</code> in the menu rule's <code>forced-colors</code> block.
			</dd>
		</dl>
	</section>

	<section id="use-nav-tokens">
		<h2>7. Tokens</h2>
		<p>
			<code>useNav</code> declares no element-scoped tokens of its own — it writes
			<code>aria-current</code> and lets the framework's
			<code>:where(a, button)[aria-current='location']</code> rule consume the existing
			<code>--set-menu-*</code> + variant cascade. See <a href="#/menu">MenuPage</a> for the menu
			chrome and <a href="#/nav">NavPage</a> for the broader <code>&lt;nav&gt;</code> token surface.
		</p>
	</section>
</template>
