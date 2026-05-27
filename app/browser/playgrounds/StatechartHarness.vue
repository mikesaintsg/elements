<script lang="ts" setup>
/**
 * StatechartHarness — visual driver for the statechart transition tables
 * each factory ships under `tests/src/browser/factories/`.
 *
 * The unit tests run those tables in fake-timer land against a synthetic
 * DOM; this harness runs the same shape against a REAL mounted entity
 * with real-time delays so each transition is observable on screen.
 *
 * Each page builds the entity (e.g. `useDialog`, `useToast`, …), wires
 * the scenario list, and renders the widget into the harness's default
 * slot. The harness owns the visual chrome — state badge, scenario list
 * with per-row "play" buttons, recent-event log, "play all" auto-walk.
 *
 * Contract:
 *
 *   - `state` — reactive string describing the entity's current state.
 *               Displayed in the state badge; updates whenever the page's
 *               state-derivation logic runs.
 *   - `events` — bounded log of `{name, time}` records appended by the
 *                page whenever the entity emits something observable
 *                (post-transition `open` / `close`, autohide elapse,
 *                etc.). Rendered as a scrollable list.
 *   - `scenarios` — one row per transition the page wants to expose. The
 *                   row's `run()` callback owns the arrange + act flow;
 *                   the harness just clicks it when the user hits play.
 *   - `step` — optional callback the harness calls between consecutive
 *              scenarios in the auto-walk so the page can reset its
 *              entity to a clean baseline.
 *
 * Naming: `PlaygroundScenario` is the local shape (this harness only).
 * It mirrors the unit-test `StateScenario<TState, TEvent, TContext>`
 * from `tests/setup.ts` minus the generic bookkeeping — the harness
 * doesn't care about the source state and target state types, only the
 * strings to display and the closure to fire.
 */
import { onUnmounted, ref } from 'vue'
import { waitForDelay } from '../helpers.js'

interface PlaygroundScenario {
	readonly name: string
	readonly from: string
	readonly event: string
	readonly to: string
	readonly run: () => Promise<void> | void
}

interface PlaygroundEvent {
	readonly name: string
	readonly time: number
}

interface Props {
	readonly title: string
	readonly state: string
	readonly events: readonly PlaygroundEvent[]
	readonly scenarios: readonly PlaygroundScenario[]
	readonly step?: () => Promise<void> | void
}

const props = defineProps<Props>()

const PLAY_BETWEEN_SCENARIOS_MS = 700
const PLAY_INDIVIDUAL_PAUSE_MS = 400

const running = ref<string | null>(null)
const playingAll = ref(false)
let cancelled = false

async function play(scenario: PlaygroundScenario): Promise<void> {
	running.value = scenario.name
	try {
		await scenario.run()
		await waitForDelay(PLAY_INDIVIDUAL_PAUSE_MS)
	} finally {
		running.value = null
	}
}

async function playAll(): Promise<void> {
	playingAll.value = true
	cancelled = false
	try {
		for (const scenario of props.scenarios) {
			if (cancelled) break
			await play(scenario)
			if (cancelled) break
			await props.step?.()
			await waitForDelay(PLAY_BETWEEN_SCENARIOS_MS)
		}
	} finally {
		playingAll.value = false
	}
}

function stop(): void {
	cancelled = true
}

onUnmounted(() => {
	cancelled = true
})

function formatRelativeTime(time: number, latest: number): string {
	const delta = latest - time
	if (delta < 1000) return `${delta}ms ago`
	return `${(delta / 1000).toFixed(1)}s ago`
}
</script>

<template>
	<section class="statechart-harness">
		<header>
			<h2>{{ title }}</h2>
			<aside role="status" class="information" data-alert-open>
				<p>
					<strong>State:</strong>
					<code>{{ state }}</code>
				</p>
			</aside>
		</header>

		<div class="statechart-stage">
			<slot />
		</div>

		<div class="statechart-controls">
			<section class="statechart-scenarios">
				<header>
					<h3>Transitions</h3>
					<menu>
						<li>
							<button type="button" class="primary" :disabled="playingAll" @click="playAll">
								Play all
							</button>
						</li>
						<li>
							<button type="button" class="subtle" :disabled="!playingAll" @click="stop">
								Stop
							</button>
						</li>
					</menu>
				</header>
				<ol>
					<li
						v-for="scenario in scenarios"
						:key="scenario.name"
						:class="{ active: running === scenario.name }"
					>
						<button
							type="button"
							class="subtle small"
							:disabled="running !== null"
							@click="play(scenario)"
						>
							▶
						</button>
						<dl>
							<dt>{{ scenario.name }}</dt>
							<dd>
								<code>{{ scenario.from }}</code>
								<span aria-hidden="true"> × </span>
								<code>{{ scenario.event }}</code>
								<span aria-hidden="true"> → </span>
								<code>{{ scenario.to }}</code>
							</dd>
						</dl>
					</li>
				</ol>
			</section>

			<section class="statechart-events">
				<h3>Emitted events</h3>
				<ol v-if="events.length > 0">
					<li v-for="(entry, index) in [...events].reverse()" :key="index">
						<code>{{ entry.name }}</code>
						<small>{{ formatRelativeTime(entry.time, events[events.length - 1]?.time ?? entry.time) }}</small>
					</li>
				</ol>
				<p v-else class="statechart-events-empty">No events yet — drive a transition.</p>
			</section>
		</div>
	</section>
</template>

<style scoped>
.statechart-harness {
	display: grid;
	gap: calc(var(--spacing) * 4);
}
.statechart-stage {
	min-block-size: 12rem;
	padding: calc(var(--spacing) * 4);
	border: 1px dashed var(--set-border-color);
	border-radius: var(--radius-lg);
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color-canvas);
}
.statechart-controls {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	gap: calc(var(--spacing) * 4);
}
@container (inline-size < 640px) {
	.statechart-controls {
		grid-template-columns: 1fr;
	}
}
.statechart-scenarios > header {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: calc(var(--spacing) * 4);
}
.statechart-scenarios menu {
	display: flex;
	gap: calc(var(--spacing) * 2);
	padding: 0;
	margin: 0;
}
.statechart-scenarios > ol {
	list-style: none;
	padding: 0;
	display: grid;
	gap: calc(var(--spacing) * 2);
}
.statechart-scenarios > ol > li {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: calc(var(--spacing) * 3);
	align-items: center;
	padding: calc(var(--spacing) * 2);
	border-radius: var(--radius-md);
	background-color: color-mix(in oklab, var(--color-canvas) 92%, var(--color-text));
	transition: background-color 150ms ease;
}
.statechart-scenarios > ol > li.active {
	background-color: color-mix(in oklab, var(--color-primary) 18%, var(--color-canvas));
}
.statechart-scenarios > ol > li > dl {
	margin: 0;
	display: grid;
	gap: calc(var(--spacing) * 1);
}
.statechart-scenarios > ol > li > dl > dt {
	font-weight: 600;
}
.statechart-scenarios > ol > li > dl > dd {
	margin: 0;
	font-size: var(--text-sm);
	color: color-mix(in oklab, var(--color-text) 80%, var(--color-canvas));
}
.statechart-events > ol {
	list-style: none;
	padding: 0;
	display: grid;
	gap: calc(var(--spacing) * 1);
	max-block-size: 20rem;
	overflow-y: auto;
}
.statechart-events > ol > li {
	display: flex;
	justify-content: space-between;
	gap: calc(var(--spacing) * 2);
	padding-block: calc(var(--spacing) * 1);
	border-block-end: 1px solid color-mix(in oklab, var(--color-canvas) 80%, var(--color-text));
}
.statechart-events > ol > li:last-child {
	border-block-end: 0;
}
.statechart-events-empty {
	font-style: italic;
	color: color-mix(in oklab, var(--color-text) 60%, var(--color-canvas));
}
</style>
