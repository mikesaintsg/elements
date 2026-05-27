// ============================================================================
//  app/browser/playgrounds/*PlaygroundPage.vue — end-to-end statechart gate.
//
//  Each `<XxxPlaygroundPage>` mounts a real `create*` factory against real
//  DOM and exposes a scenario table that drives every transition the
//  factory ships under `tests/src/browser/factories/`. The unit tests run
//  those tables in fake-timer land against synthetic DOM; this gate runs
//  the same tables against the REAL mounted page with REAL wall-time
//  delays so we catch any regression that the fake-timer harness can't
//  see (live DOM mounting order, real event loop ordering, real popover
//  / dialog top-layer behaviour).
//
//  Contract:
//
//    • Mount each playground page in isolation (the `semantics.test.ts`
//      idiom — the PAGE component alone on a fresh body host).
//    • Click the "Play all" button.
//    • Wait for the harness's `data-statechart-status` attribute to
//      transition to `passed` or `failed` (or time out — the playground
//      is misbehaving).
//    • Assert `data-statechart-status === 'passed'` and
//      `data-statechart-failed === '0'`.
//
//  The harness owns the per-scenario assertion (it compares the page's
//  derived `state` to the scenario's `to` field after each `run()` and
//  flips its `data-statechart-result` attribute on the row). This gate
//  just confirms the harness's overall verdict.
// ============================================================================

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import type { Component } from 'vue'
import * as barrel from '../../../app/browser/index.js'

// ── Barrel page surface — every `*PlaygroundPage` named export ─────────────

const playgrounds: readonly (readonly [string, Component])[] = Object.entries(barrel)
	.filter(([key]) => key.endsWith('PlaygroundPage'))
	.map(([name, component]) => [name, component as Component] as const)
	.sort((a, b) => a[0].localeCompare(b[0]))

// ── Mount + drive helpers ──────────────────────────────────────────────────

function mount(page: Component): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(page)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

function findHarness(host: HTMLElement): HTMLElement {
	const harness = host.querySelector<HTMLElement>('[data-statechart-status]')
	if (!harness) throw new Error('Statechart harness root not found in playground page')
	return harness
}

function findPlayAllButton(harness: HTMLElement): HTMLButtonElement {
	const buttons = harness.querySelectorAll<HTMLButtonElement>('button')
	for (const button of buttons) {
		if (button.textContent?.trim() === 'Play all') return button
	}
	throw new Error('Play all button not found in harness')
}

// Wait for the harness's status attribute to reach a terminal state
// (`passed` or `failed`). The auto-walk takes wall-time — each scenario
// has its own real-time pauses inside the harness — so the timeout
// budget needs to scale with scenario count.
async function waitForStatus(
	harness: HTMLElement,
	terminal: ReadonlySet<string>,
	timeoutMs: number,
): Promise<string> {
	const deadline = performance.now() + timeoutMs
	let last = harness.getAttribute('data-statechart-status') ?? 'idle'
	while (performance.now() < deadline) {
		last = harness.getAttribute('data-statechart-status') ?? 'idle'
		if (terminal.has(last)) return last
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 100)
		})
	}
	throw new Error(
		`Harness did not reach a terminal status within ${timeoutMs}ms (last status: ${last})`,
	)
}

function readCounters(harness: HTMLElement): {
	readonly passed: number
	readonly failed: number
	readonly total: number
} {
	return {
		passed: Number(harness.getAttribute('data-statechart-passed') ?? '0'),
		failed: Number(harness.getAttribute('data-statechart-failed') ?? '0'),
		total: Number(harness.getAttribute('data-statechart-total') ?? '0'),
	}
}

function collectFailedScenarios(harness: HTMLElement): readonly string[] {
	const rows = harness.querySelectorAll<HTMLElement>(
		'[data-statechart-result="failed"][data-statechart-scenario]',
	)
	return [...rows].map(
		(row) => row.getAttribute('data-statechart-scenario') ?? '(unnamed scenario)',
	)
}

// Some scenarios deliberately leave background side-effects (open
// popovers, top-layer dialogs, focus-trap state). Each test tears down
// its own mount, but native popover/dialog elements that escape into the
// document body persist across the gate — clean them up between
// playgrounds so a leaked open `<dialog>` doesn't pollute the next test.
function purgeTopLayer(): void {
	const escapees = document.querySelectorAll<HTMLElement>('[popover]')
	for (const el of escapees) {
		if ('hidePopover' in el && typeof el.hidePopover === 'function') {
			try {
				el.hidePopover()
			} catch {
				/* not currently showing — ignore */
			}
		}
	}
	const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
	for (const d of dialogs) d.close()
}

beforeAll(() => {
	// `applyUrlDirectives` (inside StatechartHarness) reads
	// `window.location.hash` on mount; the test environment's hash may
	// already contain `?autoplay=…` from a previous Vitest pass if Vite's
	// dev server is reused, so normalize before the gate starts.
	if (typeof window !== 'undefined') window.location.hash = ''
})

afterAll(() => {
	purgeTopLayer()
})

// ── The gate — one `it()` per playground page ──────────────────────────────

describe('playgrounds — E2E statechart parity (every scenario passes in a real browser)', () => {
	it('discovers the playground barrel surface (vacuous-pass guard)', () => {
		// Bump when a new playground lands. Initial inventory was 14
		// visual factories; second pass added 6 primitive / stateful
		// factories (Drag, Drop, Focus, Nav, Pointer, Table) for a total
		// of 20.
		expect(playgrounds.length).toBeGreaterThanOrEqual(20)
	})

	for (const [name, page] of playgrounds) {
		it(`${name} — every scenario passes`, { timeout: 90_000 }, async () => {
			const { host, teardown } = mount(page)
			try {
				const harness = findHarness(host)
				// Each playground constructs its factory inside a `watchEffect`
				// that runs AFTER mount. Wait for the Vue scheduler to flush
				// before kicking off the auto-walk, otherwise the first
				// scenario's `run()` sees a null factory.
				await new Promise<void>((resolve) => {
					setTimeout(resolve, 300)
				})
				const total = Number(harness.getAttribute('data-statechart-total') ?? '0')
				// Generous budget: ~3.5s per scenario + overhead. The harness
				// inserts deliberate real-time pauses so the live browser
				// shows each transition; the gate inherits that wall-time.
				const timeoutMs = Math.max(20_000, total * 3_500)
				findPlayAllButton(harness).click()
				const status = await waitForStatus(harness, new Set(['passed', 'failed']), timeoutMs)
				const counters = readCounters(harness)
				const failedNames = collectFailedScenarios(harness)
				// On failure: the assertion message names the playground +
				// status + per-scenario tally + failing scenario names so a
				// red gate is immediately actionable.
				const detail = `${name} — status=${status}, passed=${counters.passed}, failed=${counters.failed}, total=${counters.total}${failedNames.length > 0 ? `, failed scenarios: ${failedNames.join(', ')}` : ''}`
				if (status !== 'passed' || counters.failed !== 0 || counters.passed !== counters.total) {
					throw new Error(detail)
				}
				expect(status).toBe('passed')
				expect(counters.failed).toBe(0)
				expect(counters.passed).toBe(counters.total)
			} finally {
				purgeTopLayer()
				teardown()
			}
		})
	}
})
