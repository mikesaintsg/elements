<script lang="ts" setup>
/**
 * UseCarouselPage — slide-deck composition with autoplay + keyboard /
 * touch nav.
 *
 * `useCarousel(elementRef, options?)` wraps `createCarousel`. The
 * factory owns the active-slide index, the autoplay timer, the
 * keyboard / mouse-leave / touch-swipe handlers, and the four-class
 * slide-axis transition lifecycle that `components/_carousel.scss`
 * paints (`.active`, `.carousel-item-{next,prev,start,end}`). The
 * composable renders no DOM — the consumer supplies the markup, the
 * factory orchestrates state.
 *
 * Markup contract (mirrors WAI-ARIA Carousel pattern + Bootstrap):
 *
 *   <section role="region" aria-roledescription="carousel" class="carousel" tabindex="0">
 *     <ol role="list">
 *       <li role="listitem" class="active">…</li>
 *       <li role="listitem">…</li>
 *     </ol>
 *     <button class="carousel-control prev" aria-label="Previous">…</button>
 *     <button class="carousel-control next" aria-label="Next">…</button>
 *     <menu class="carousel-indicators" role="tablist">
 *       <li><button role="tab" aria-selected="true">…</button></li>
 *       …
 *     </menu>
 *   </section>
 *
 * API surface coverage (Phase 1 audit):
 *
 *   Reactive state:
 *     index    Readonly<Ref<number>>   — current slide index (0-based).
 *     cycling  Readonly<Ref<boolean>>  — autoplay running.
 *
 *   Imperative API:
 *     next()    — advance one slide (respects `wrap`).
 *     prev()    — go back one slide.
 *     to(i)     — jump to a specific index (clamped or wrapped).
 *     start()   — begin autoplay (idempotent).
 *     stop()    — halt autoplay (idempotent; no event).
 *     pause()   — halt + emit `elements:carousel:pause`.
 *     resume()  — start + emit `elements:carousel:resume`.
 *
 *   Options (`UseCarouselOptions`):
 *     autoplay.interval   number (default 5000 ms)   — slide cycle delay.
 *     autoplay.pause      'hover' | false (default 'hover')
 *                                                    — auto-pause on
 *                                                      `mouseenter`.
 *     autoplay.ride       'mount' | 'interaction' | false (default false)
 *                                                    — start autoplay
 *                                                      either on mount,
 *                                                      after first user
 *                                                      interaction, or
 *                                                      not at all.
 *     keyboard            boolean (default true)     — ArrowLeft / Right
 *                                                      drive prev / next.
 *     wrap                boolean (default true)     — cycle past last /
 *                                                      first slide.
 *     touch               boolean (default true)     — touchstart /
 *                                                      touchend swipe
 *                                                      (40 px threshold).
 *     on                  Partial<UseCarouselEventMap>
 *                                                    — cancellable `slide`
 *                                                      + post-transition
 *                                                      `change` + autoplay
 *                                                      `pause` / `resume`.
 *
 *   Framework chrome hooks (declared in `composables/_carousel.scss`):
 *     `.carousel > ol > li.active`                     → visible slide.
 *     `.carousel > ol > li.carousel-item-{next,prev,start,end}`
 *                                                       → transition
 *                                                          lifecycle
 *                                                          (translateX
 *                                                          ±100% →  0).
 *     `.carousel-indicators > li > button[aria-selected='true']`
 *                                                       → stretched
 *                                                          active pill.
 *     `.carousel-control.{prev,next}`                  → arrow chip,
 *                                                          chevron mask
 *                                                          from
 *                                                          `--set-icon-
 *                                                          chevron-*`.
 *     Variant tints on items: `.primary`, `.success`, `.warning`,
 *     `.danger`, `.information` paint a `color-mix(variant 12-18%,
 *     transparent)` background tint.
 *
 * Native-platform redundancy walk (`contribute.md` §5.4.1):
 *   1. `.active`, `.carousel-item-{next,prev,start,end}` on items —
 *      CSS-consumed by the slide-axis lifecycle rules in `composables/
 *      _carousel.scss`. Not dead.
 *   2. `runTransition` runs AFTER the `.carousel-item-{start,end}`
 *      classes are applied (which TRIGGER the CSS transition) and
 *      AFTER a `void offsetHeight` reflow. Correct ordering.
 *   3. `slide` dispatch is cancellable; `preventDefault()` vetoes the
 *      transition. `change` is post-state info.
 *   4. No re-implemented Escape / outside-click dismiss (carousel is
 *      in-flow, not popover).
 *   5. No body-scroll lock.
 *   6. Strip shipped in this PR — the factory wrote `.active` +
 *      `aria-current="true"` on indicator buttons, but the CSS reads
 *      `[aria-selected='true']` (per the WAI-ARIA carousel pattern
 *      where indicators are `role="tab"`). Both factory writes were
 *      dead — the active-pill chrome NEVER painted. Replaced with the
 *      ARIA-spec-correct `aria-selected` mirror; consumer-visible
 *      change is "the pill now stretches when you click an
 *      indicator," which it should have done from day one.
 *
 * Cross-references:
 *   - The carousel chrome is the only `composables/` partial that
 *     ships variant tinting on its children — most composable chrome
 *     is invariant; carousel slides participate in the cross-cutting
 *     variant cascade.
 */
import { ref, useTemplateRef } from 'vue'
import { useCarousel } from '@elements/browser'

import { CAROUSEL_SLIDES as slides, VARIANTS_FEEDBACK as variants } from '../constants.js'


// ─────────────────────────────────────────────────────────────────────
// Demo 1 — Bare carousel. No autoplay; user drives prev / next /
// indicators / keyboard / touch. Five variant-tinted slides exercise
// the variant cascade on `<li role="listitem">` children.
// ─────────────────────────────────────────────────────────────────────
const basicRef = useTemplateRef<HTMLElement>('basicRef')
const basic = useCarousel(basicRef)

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — Autoplay on mount, pause on hover.
// ─────────────────────────────────────────────────────────────────────
const autoplayRef = useTemplateRef<HTMLElement>('autoplayRef')
const autoplay = useCarousel(autoplayRef, {
	autoplay: { ride: 'mount', interval: 3000, pause: 'hover' },
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Cancellable `slide` event. Toggle the "Pause sliding"
// checkbox to veto every `slide` dispatch and freeze navigation.
// ─────────────────────────────────────────────────────────────────────
const allowSlide = ref(true)
const slideLog = ref<readonly string[]>([])
const noteSlide = (message: string): void => {
	const next = [...slideLog.value, message]
	slideLog.value = next.slice(-5)
}
const guardRef = useTemplateRef<HTMLElement>('guardRef')
const guard = useCarousel(guardRef, {
	on: {
		slide: (event) => {
			const d = event.detail as { from: number; to: number; direction: string }
			if (!allowSlide.value) {
				event.preventDefault()
				noteSlide(`slide → VETOED (${d.from} → ${d.to})`)
				return
			}
			noteSlide(`slide → ${d.direction} (${d.from} → ${d.to})`)
		},
		change: (event) => {
			const d = event.detail as { from: number; to: number; direction: string }
			noteSlide(`change → settled at ${d.to}`)
		},
		pause: () => noteSlide('pause'),
		resume: () => noteSlide('resume'),
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — `wrap: false`. The end-of-deck disables `next()`; the
// start-of-deck disables `prev()`. Useful for tutorials / forms split
// across slides where wrapping past the end is confusing.
// ─────────────────────────────────────────────────────────────────────
const wrapRef = useTemplateRef<HTMLElement>('wrapRef')
const wrap = useCarousel(wrapRef, { wrap: false })

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — No keyboard / touch. Pure mouse + indicators. Use for
// embeds inside larger keyboard-navigable structures (a form, a
// table) so arrow keys don't conflict with the host's nav model.
// ─────────────────────────────────────────────────────────────────────
const tightRef = useTemplateRef<HTMLElement>('tightRef')
const tight = useCarousel(tightRef, { keyboard: false, touch: false })

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — Programmatic control. `to(i)` jumps; `pause()` / `resume()`
// emit lifecycle events. The control row below mirrors the imperative
// surface 1:1.
// ─────────────────────────────────────────────────────────────────────
const programRef = useTemplateRef<HTMLElement>('programRef')
const program = useCarousel(programRef, {
	autoplay: { ride: 'interaction', interval: 4000, pause: false },
})
</script>

<template>
	<section id="use-carousel-intro">
		<hgroup>
			<h1>useCarousel</h1>
			<p>
				Slide-deck composition. <code>useCarousel</code> owns the active-slide index, the autoplay
				timer, and the keyboard / mouse / touch handlers; the framework's
				<code>composables/_carousel.scss</code> paints the visual chrome (translateX slide-axis
				lifecycle, variant-tinted slides, control chips, indicator pills).
			</p>
		</hgroup>
		<p>
			The composable renders no DOM — the consumer supplies the markup contract (<code
				>&lt;section class="carousel"&gt;</code
			>
			wrapper + <code>&lt;ol&gt;</code> of <code>role="listitem"</code> children + optional
			<code>.carousel-control</code> buttons + optional <code>.carousel-indicators</code> menu); the
			factory orchestrates state.
		</p>
	</section>

	<section id="use-carousel-basic">
		<h2>1. Bare carousel</h2>
		<p>
			Five variant-tinted slides, no autoplay. Click the inline-edge chips for prev / next; arrow
			keys move while focus is on the region; the indicator pills jump directly to a slide; touch
			swipe works at the 40 px threshold.
		</p>
		<section
			ref="basicRef"
			class="carousel"
			role="region"
			aria-roledescription="carousel"
			aria-label="Basic carousel"
			tabindex="0"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				@click="basic.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				@click="basic.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="basic.to(idx)"
					></button>
				</li>
			</menu>
		</section>
		<p class="mt-3">
			<small class="showcase-muted">
				Active index: <code>{{ basic.index.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-carousel-autoplay">
		<h2>2. Autoplay — <code>ride: 'mount'</code> + <code>pause: 'hover'</code></h2>
		<p>
			Cycles every 3 seconds starting on mount. Hovering the carousel pauses; mouseleave resumes.
			This is the canonical hero-banner shape.
		</p>
		<section
			ref="autoplayRef"
			class="carousel"
			role="region"
			aria-roledescription="carousel"
			aria-label="Autoplay carousel"
			tabindex="0"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				@click="autoplay.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				@click="autoplay.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="autoplay.to(idx)"
					></button>
				</li>
			</menu>
		</section>
		<p class="mt-3">
			<small class="showcase-muted">
				Cycling: <code>{{ autoplay.cycling.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-carousel-events">
		<h2>3. Cancellable <code>slide</code> + lifecycle events</h2>
		<p>
			Every slide attempt dispatches a cancellable <code>elements:carousel:slide</code> CustomEvent
			before the transition. <code>preventDefault()</code> vetoes; the post-transition
			<code>change</code> event fires after a successful slide. <code>pause</code> /
			<code>resume</code>
			fire when autoplay state changes via the explicit methods (mouseenter / leave use
			<code>start</code> / <code>stop</code> instead — silent, no events).
		</p>
		<label class="cluster gap-2">
			<input type="checkbox" v-model="allowSlide" />
			<span>Allow slide (uncheck to veto every <code>slide</code> dispatch)</span>
		</label>
		<section
			ref="guardRef"
			class="carousel mt-3"
			role="region"
			aria-roledescription="carousel"
			aria-label="Event-guarded carousel"
			tabindex="0"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				@click="guard.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				@click="guard.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="guard.to(idx)"
					></button>
				</li>
			</menu>
		</section>
		<article class="mt-3">
			<header>
				<h3>Event log</h3>
				<p class="showcase-card-subtitle">Last 5 events fired.</p>
			</header>
			<ul v-if="slideLog.length === 0">
				<li>
					<small class="showcase-muted">No events yet — interact with the carousel.</small>
				</li>
			</ul>
			<ol v-else class="group">
				<li v-for="(message, idx) in slideLog" :key="idx">
					<code class="text-sm">{{ message }}</code>
				</li>
			</ol>
		</article>
	</section>

	<section id="use-carousel-wrap">
		<h2>4. <code>wrap: false</code></h2>
		<p>
			Disables cycling past the last / first slide. The arrow controls still fire but become no-ops
			at the deck boundaries. Useful for sequenced flows (tutorials, multi-step forms across slides,
			gallery viewers with explicit start / end).
		</p>
		<section
			ref="wrapRef"
			class="carousel"
			role="region"
			aria-roledescription="carousel"
			aria-label="Non-wrapping carousel"
			tabindex="0"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				:disabled="wrap.index.value === 0"
				@click="wrap.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				:disabled="wrap.index.value === slides.length - 1"
				@click="wrap.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="wrap.to(idx)"
					></button>
				</li>
			</menu>
		</section>
		<p class="mt-3">
			<small class="showcase-muted">
				At <code>{{ wrap.index.value }}</code> of <code>{{ slides.length - 1 }}</code>
			</small>
		</p>
	</section>

	<section id="use-carousel-tight">
		<h2>5. <code>keyboard: false</code> + <code>touch: false</code></h2>
		<p>
			Tightens the input surface to mouse + indicator clicks only. Use when the carousel is embedded
			inside a host that already owns arrow keys (a form, a table cell, another roving- focus
			widget) — the carousel's keyboard handler would otherwise compete for the same keys.
		</p>
		<section
			ref="tightRef"
			class="carousel"
			role="region"
			aria-roledescription="carousel"
			aria-label="Mouse-only carousel"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				@click="tight.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				@click="tight.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="tight.to(idx)"
					></button>
				</li>
			</menu>
		</section>
	</section>

	<section id="use-carousel-imperative">
		<h2>6. Imperative API — <code>to / pause / resume</code></h2>
		<p>
			Programmatic control. <code>to(i)</code> jumps to any index; <code>pause()</code> /
			<code>resume()</code> halt / restart autoplay AND emit the matching events. The control row
			below mirrors the imperative surface 1:1.
		</p>
		<section
			ref="programRef"
			class="carousel"
			role="region"
			aria-roledescription="carousel"
			aria-label="Programmatic carousel"
			tabindex="0"
		>
			<ol role="list">
				<li
					v-for="(slide, idx) in slides"
					:key="slide.title"
					role="listitem"
					:class="[slide.variant, idx === 0 ? 'active' : '']"
				>
					<strong>{{ slide.title }}</strong>
					<p>{{ slide.body }}</p>
				</li>
			</ol>
			<button
				type="button"
				class="carousel-control prev"
				aria-label="Previous slide"
				@click="program.prev()"
			></button>
			<button
				type="button"
				class="carousel-control next"
				aria-label="Next slide"
				@click="program.next()"
			></button>
			<menu class="carousel-indicators" role="tablist">
				<li v-for="(slide, idx) in slides" :key="slide.title">
					<button
						type="button"
						role="tab"
						:aria-selected="idx === 0 ? 'true' : 'false'"
						:aria-label="`Slide ${idx + 1}`"
						@click="program.to(idx)"
					></button>
				</li>
			</menu>
		</section>
		<div class="cluster gap-2 mt-3">
			<button type="button" class="subtle" @click="program.prev()">prev()</button>
			<button type="button" class="subtle" @click="program.next()">next()</button>
			<button type="button" class="subtle" @click="program.to(0)">to(0)</button>
			<button type="button" class="subtle" @click="program.to(slides.length - 1)">to(last)</button>
			<button
				type="button"
				class="primary"
				@click="program.resume()"
				:disabled="program.cycling.value"
			>
				resume()
			</button>
			<button
				type="button"
				class="subtle"
				@click="program.pause()"
				:disabled="!program.cycling.value"
			>
				pause()
			</button>
		</div>
		<p class="mt-3">
			<small class="showcase-muted">
				Index: <code>{{ program.index.value }}</code> · cycling:
				<code>{{ program.cycling.value }}</code>
			</small>
		</p>
	</section>

	<section id="use-carousel-a11y">
		<h2>7. Accessibility</h2>
		<dl>
			<dt><code>role="region"</code> + <code>aria-roledescription="carousel"</code></dt>
			<dd>
				Hosts the WAI-ARIA Carousel pattern. Screen readers announce "{name}, carousel" instead of
				the generic "region." Pair with an explicit <code>aria-label</code> per carousel.
			</dd>
			<dt><code>role="tablist"</code> on the indicator menu</dt>
			<dd>
				Indicator buttons carry <code>role="tab"</code> + <code>aria-selected="true"/"false"</code>.
				The factory writes the <code>aria-selected</code> mirror; the framework chrome reads it to
				paint the active-pill stretch. Click any indicator to jump.
			</dd>
			<dt><code>tabindex="0"</code> on the carousel region</dt>
			<dd>
				Without it, ArrowLeft / Right won't reach the keyboard handler. The framework's focus-ring
				surface paints the focus indicator when the region receives keyboard focus.
			</dd>
			<dt>Reduced motion</dt>
			<dd>
				The slide-axis transition is wrapped in <code>@include transition()</code> — users with
				<code>prefers-reduced-motion: reduce</code> see the slide snap to the new position rather
				than animate.
			</dd>
			<dt>Forced colors (Windows HC)</dt>
			<dd>
				The control chips and indicator pills fall back to system colours (<code>ButtonText</code> /
				<code>Highlight</code>) so the affordances stay visible in HC mode.
			</dd>
		</dl>
	</section>

	<section id="use-carousel-tokens">
		<h2>8. Tokens</h2>
		<dl>
			<dt><code>--set-carousel-block-size</code></dt>
			<dd>
				Carousel viewport height. Default <code>12rem</code>; <code>.carousel-compact</code> retunes
				to <code>8rem</code>.
			</dd>
			<dt><code>--set-carousel-padding</code></dt>
			<dd>Per-slide content padding.</dd>
			<dt><code>--set-carousel-transition-duration</code> / <code>-easing</code></dt>
			<dd>Slide-axis transform timing. Default <code>0.6s</code> + iOS stiff-decel curve.</dd>
			<dt><code>--set-carousel-control-{size, background-color, icon}</code></dt>
			<dd>
				Prev / next chip diameter, fill, and glyph colour. The chevron glyph comes from
				<code>--set-icon-chevron-{left,right}</code> in <code>_tokens.scss</code> so a host-page
				icon swap retunes the carousel alongside every other chevron consumer.
			</dd>
			<dt>
				<code
					>--set-carousel-indicator-{size, active-size, background-color,
					background-color-active}</code
				>
			</dt>
			<dd>Resting and active indicator-pill geometry + colour.</dd>
			<dt>Variant tints on slides</dt>
			<dd>
				<code>&lt;li role="listitem" class="primary"&gt;</code> picks up
				<code>color-mix(in oklab, var(--color-primary) 12%, transparent)</code>; same recipe for the
				other variants with per-variant ratio tuning (warning at 18% for adequate contrast).
			</dd>
		</dl>
	</section>
</template>
