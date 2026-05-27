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
 * with per-row "play" buttons, recent-event log, "play all" auto-walk,
 * pass/fail badges, plain-text status announcer, machine-readable
 * `data-statechart-status` attribute.
 *
 * Contract:
 *
 *   - `state` — reactive string describing the entity's current state.
 *               Displayed in the state badge; updates whenever the page's
 *               state-derivation logic runs.
 *   - `events` — bounded log of `{name, time}` records appended by the
 *                page whenever the entity emits something observable.
 *   - `scenarios` — one row per transition. Each row's `run()` owns the
 *                   arrange + act flow; the harness fires it and then
 *                   diffs `state` against the scenario's `to` (the
 *                   expected post-transition state) to decide
 *                   pass / fail.
 *   - `step` — optional callback the harness calls between consecutive
 *              scenarios in the auto-walk so the page can reset its
 *              entity to a clean baseline.
 *
 * Visual-testing affordances:
 *
 *   1. **Inline pass / fail per scenario.** After every `run()` the
 *      harness compares the current `state` to `scenario.to`; the row
 *      paints `.success` (✓ pass) or `.danger` (✗ fail) with the
 *      expected / actual strings rendered as plain text.
 *   2. **Deep-link + URL autoplay.** Query string parsed from the route
 *      hash drives the harness:
 *        - `?scenario=<name>` — auto-plays that scenario on mount
 *        - `?autoplay=all`    — walks every scenario back-to-back
 *      The page's URL therefore deterministically reproduces a state.
 *   3. **Plain-text status announcer.** A live region (`role="status"`)
 *      narrates each step in natural language so screen readers and
 *      vision-model captures pick up "running 'show opens dialog' …
 *      done. state=open. result=pass." without needing visual chrome.
 *   4. **Machine-readable status attr.** `data-statechart-status` on the
 *      harness root cycles `idle | running | passed | failed`; counters
 *      (`data-statechart-passed`, `data-statechart-failed`,
 *      `data-statechart-total`) expose the running tally so external
 *      automation can poll for completion without screen-reading.
 *
 * Naming: `PlaygroundScenario` is the local shape. It mirrors the
 * unit-test `StateScenario<TState, TEvent, TContext>` from `tests/setup.ts`
 * minus the generic bookkeeping — the harness doesn't care about the
 * source / target state types, only the strings to display + the closure
 * to fire + the expected post-transition state to compare against.
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const ASSERTION_SETTLE_MS = 50

type ScenarioStatus = 'pending' | 'running' | 'passed' | 'failed'

interface ScenarioResult {
	readonly status: ScenarioStatus
	readonly expected: string
	readonly actual: string | null
}

const results = ref<Record<string, ScenarioResult>>({})
const running = ref<string | null>(null)
const playingAll = ref(false)
const announcement = ref<string>('idle')
let cancelled = false

const harnessStatus = computed<ScenarioStatus>(() => {
	if (playingAll.value || running.value !== null) return 'running'
	const entries = Object.values(results.value)
	if (entries.length === 0) return 'pending'
	if (entries.length < props.scenarios.length) return 'pending'
	return entries.every((r) => r.status === 'passed') ? 'passed' : 'failed'
})

const passedCount = computed(
	() => Object.values(results.value).filter((r) => r.status === 'passed').length,
)
const failedCount = computed(
	() => Object.values(results.value).filter((r) => r.status === 'failed').length,
)

function recordResult(name: string, scenario: PlaygroundScenario, actual: string): void {
	const status: ScenarioStatus = actual === scenario.to ? 'passed' : 'failed'
	results.value = {
		...results.value,
		[name]: { status, expected: scenario.to, actual },
	}
	announcement.value =
		status === 'passed'
			? `'${name}' done. state=${actual}. result=pass.`
			: `'${name}' done. expected=${scenario.to}, got=${actual}. result=fail.`
	if (status === 'failed' && typeof console !== 'undefined') {
		console.warn(
			`[StatechartHarness] '${name}' failed — expected '${scenario.to}', actual '${actual}'`,
		)
	}
}

async function play(scenario: PlaygroundScenario): Promise<void> {
	running.value = scenario.name
	results.value = {
		...results.value,
		[scenario.name]: { status: 'running', expected: scenario.to, actual: null },
	}
	announcement.value = `running '${scenario.name}'.`
	try {
		await scenario.run()
		await nextTick()
		await waitForDelay(ASSERTION_SETTLE_MS)
		await nextTick()
		recordResult(scenario.name, scenario, props.state)
		await waitForDelay(PLAY_INDIVIDUAL_PAUSE_MS)
	} catch (error) {
		results.value = {
			...results.value,
			[scenario.name]: {
				status: 'failed',
				expected: scenario.to,
				actual: `(error: ${String(error)})`,
			},
		}
		announcement.value = `'${scenario.name}' threw: ${String(error)}.`
	} finally {
		running.value = null
	}
}

async function playAll(): Promise<void> {
	playingAll.value = true
	cancelled = false
	announcement.value = `running ${props.scenarios.length} scenarios.`
	results.value = {}
	try {
		for (const scenario of props.scenarios) {
			if (cancelled) break
			await play(scenario)
			if (cancelled) break
			await props.step?.()
			await waitForDelay(PLAY_BETWEEN_SCENARIOS_MS)
		}
		if (!cancelled) {
			const finalStatus = harnessStatus.value
			announcement.value =
				finalStatus === 'passed'
					? `all ${props.scenarios.length} scenarios passed.`
					: `${failedCount.value} of ${props.scenarios.length} scenarios failed.`
		} else {
			announcement.value = 'stopped.'
		}
	} finally {
		playingAll.value = false
	}
}

function stop(): void {
	cancelled = true
}

function readHashQuery(): URLSearchParams {
	if (typeof window === 'undefined') return new URLSearchParams()
	const hash = window.location.hash
	const queryIndex = hash.indexOf('?')
	if (queryIndex === -1) return new URLSearchParams()
	return new URLSearchParams(hash.slice(queryIndex + 1))
}

async function applyUrlDirectives(): Promise<void> {
	const params = readHashQuery()
	const autoplay = params.get('autoplay')
	const scenarioParam = params.get('scenario')
	if (autoplay === 'all' || autoplay === 'true' || autoplay === '1') {
		await playAll()
		return
	}
	if (scenarioParam) {
		const match = props.scenarios.find((s) => slugify(s.name) === scenarioParam)
		if (match) await play(match)
	}
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

onMounted(() => {
	void applyUrlDirectives()
})

onUnmounted(() => {
	cancelled = true
})

watch(
	() => props.scenarios,
	() => {
		results.value = {}
	},
)

function formatRelativeTime(time: number, latest: number): string {
	const delta = latest - time
	if (delta < 1000) return `${delta}ms ago`
	return `${(delta / 1000).toFixed(1)}s ago`
}

function resultFor(name: string): ScenarioResult | undefined {
	return results.value[name]
}

function rowClassFor(scenario: PlaygroundScenario): Record<string, boolean> {
	const result = resultFor(scenario.name)
	return {
		active: running.value === scenario.name,
		'statechart-row-passed': result?.status === 'passed',
		'statechart-row-failed': result?.status === 'failed',
	}
}
</script>

<template>
	<section
		class="statechart-harness"
		:data-statechart-status="harnessStatus"
		:data-statechart-passed="passedCount"
		:data-statechart-failed="failedCount"
		:data-statechart-total="scenarios.length"
	>
		<header>
			<h2>{{ title }}</h2>
			<aside role="status" class="information" data-alert-open>
				<p>
					<strong>State:</strong>
					<code data-statechart-state>{{ state }}</code>
					<span aria-hidden="true"> · </span>
					<strong>Results:</strong>
					<code data-statechart-tally>
						{{ passedCount }} passed / {{ failedCount }} failed / {{ scenarios.length }} total
					</code>
				</p>
			</aside>
			<output
				role="status"
				aria-live="polite"
				class="statechart-announcer"
				data-statechart-announce
			>
				{{ announcement }}
			</output>
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
						:class="rowClassFor(scenario)"
						:data-statechart-scenario="scenario.name"
						:data-statechart-result="resultFor(scenario.name)?.status ?? 'pending'"
					>
						<button
							type="button"
							class="subtle small"
							:disabled="running !== null || playingAll"
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
							<dd v-if="resultFor(scenario.name)" class="statechart-row-result">
								<span v-if="resultFor(scenario.name)?.status === 'passed'" class="success">
									✓ pass · actual <code>{{ resultFor(scenario.name)?.actual }}</code>
								</span>
								<span v-else-if="resultFor(scenario.name)?.status === 'failed'" class="danger">
									✗ fail · expected <code>{{ resultFor(scenario.name)?.expected }}</code
									>, got <code>{{ resultFor(scenario.name)?.actual }}</code>
								</span>
								<span v-else class="information">running…</span>
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
						<small>{{
							formatRelativeTime(entry.time, events[events.length - 1]?.time ?? entry.time)
						}}</small>
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
.statechart-announcer {
	display: block;
	margin-block-start: calc(var(--spacing) * 2);
	padding: calc(var(--spacing) * 2);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	background-color: color-mix(in oklab, var(--color-canvas) 92%, var(--color-text));
	border-radius: var(--radius-md);
}
.statechart-harness[data-statechart-status='passed'] .statechart-announcer {
	background-color: color-mix(in oklab, var(--color-success) 25%, var(--color-canvas));
}
.statechart-harness[data-statechart-status='failed'] .statechart-announcer {
	background-color: color-mix(in oklab, var(--color-danger) 25%, var(--color-canvas));
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
	align-items: start;
	padding: calc(var(--spacing) * 2);
	border-radius: var(--radius-md);
	background-color: color-mix(in oklab, var(--color-canvas) 92%, var(--color-text));
	transition: background-color 150ms ease;
}
.statechart-scenarios > ol > li.active {
	background-color: color-mix(in oklab, var(--color-primary) 18%, var(--color-canvas));
}
.statechart-scenarios > ol > li.statechart-row-passed {
	background-color: color-mix(in oklab, var(--color-success) 18%, var(--color-canvas));
}
.statechart-scenarios > ol > li.statechart-row-failed {
	background-color: color-mix(in oklab, var(--color-danger) 18%, var(--color-canvas));
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
.statechart-scenarios > ol > li > dl > dd.statechart-row-result {
	font-weight: 600;
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
