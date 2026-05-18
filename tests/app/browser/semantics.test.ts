// ============================================================================
//  Phase 6 — showcase SELF-AUDIT gate. The Inspector dogfooded against the
//  framework's OWN 43 showcase pages + the real CSS cascade.
//
//  A permanent standing driver (the `parity.test.ts` / `pages.test.ts`
//  analogue, run in the `app:browser` chromium project so the real
//  framework cascade is loaded — `setupBrowser.ts` imports
//  `src/styles/index.scss`):
//
//    • component surface — every `*Page` named export of the
//                          `app/browser` barrel (the same identity map
//                          `pages.test.ts` / `parity.test.ts` build).
//    • isolated mount    — each page is `createApp(page).mount(host)`-ed
//                          onto a FRESH `<div>` appended to
//                          `document.body` (the page component ALONE, NOT
//                          the App shell — the `ButtonPage.test.ts`
//                          idiom), so the inspector sees the page's real
//                          rendered DOM under the real cascade.
//    • inspection        — `new Inspector().inspect({ root: host })` runs
//                          BOTH lenses (structure + presentation) over
//                          that mounted subtree.
//    • per-page `it()`   — one test per page; the gate FAILS only on an
//                          `error`-severity finding (`counts.error === 0`).
//                          Warnings / advice are REPORTED (a non-failing
//                          `console.warn` of rule/message/path/page +
//                          a non-failing aggregate summary) — NOT failed
//                          (ROADMAP Phase 6: the gate triages warnings,
//                          fails ONLY on `error`; `presentation/list-style`
//                          on a role-less `list-style:none` list — incl.
//                          the first-party `<menu>` — is a documented
//                          BY-DESIGN `warning`, expected & non-blocking).
//
//  On an error the message names the page + each offending finding
//  (rule · message · element path) so triage is actionable. Teardown
//  (unmount + host.remove) always runs in `finally`. Makes the showcase a
//  continuously-verified semantic-HTML conformance corpus.
// ============================================================================

import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import type { Component } from 'vue'
import { Inspector } from '@elements/browser'
import type { Finding, FindingSeverity } from '@elements/browser'
import * as barrel from '../../../app/browser/index.js'

// ── Barrel page surface — every `*Page` named export (the pages.test.ts /
//    parity.test.ts identity map, verbatim) ──────────────────────────────

const nameByComponent = new Map<unknown, string>()
for (const [key, value] of Object.entries(barrel)) {
	if (key.endsWith('Page')) nameByComponent.set(value, key)
}
const pageEntries: readonly (readonly [string, Component])[] = [...nameByComponent.entries()]
	.map(([component, name]) => [name, component as Component] as const)
	.sort((a, b) => a[0].localeCompare(b[0]))

// ── Isolated mount (the ButtonPage.test.ts idiom — the PAGE component
//    alone on a fresh body host, NOT the App shell) ────────────────────────

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

// ── Reporting (warnings / advice are surfaced, never failed) ──────────────

const SEVERITY_RANK: Readonly<Record<FindingSeverity, number>> = {
	error: 0,
	warning: 1,
	advice: 2,
}

function describeFinding(finding: Finding): string {
	const path = finding.path.map((el) => el.tagName.toLowerCase()).join(' > ')
	const extra =
		finding.expected !== undefined || finding.actual !== undefined
			? ` (expected ${finding.expected ?? '—'}, actual ${finding.actual ?? '—'})`
			: ''
	return `[${finding.severity}] ${finding.rule} — ${finding.message}${extra} @ ${path} {${finding.cite}}`
}

// A cross-page tally of every non-error finding, printed once after the
// suite so the by-design warnings (e.g. `presentation/list-style` on a
// role-less `<menu>`) are visible without failing the gate.
const advisory: { page: string; finding: Finding }[] = []

afterAll(() => {
	if (advisory.length === 0) return
	const byRule = new Map<string, number>()
	for (const { finding } of advisory) {
		byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
	}
	const summary = [...byRule.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([rule, n]) => `${rule}×${n}`)
		.join(', ')
	// Non-failing: the standing record of the by-design warnings/advice the
	// gate consciously does NOT fail on (ROADMAP Phase 6).
	console.warn(
		`semantics gate — ${advisory.length} non-error finding(s) across the showcase (reported, not failed): ${summary}`,
	)
	for (const { page, finding } of advisory) {
		console.warn(`  ${page}: ${describeFinding(finding)}`)
	}
})

// ── The gate — one `it()` per page, ZERO error-severity findings ──────────

describe('semantics — Inspector self-audit over every showcase page (zero error-severity findings)', () => {
	it('discovers the barrel page surface (vacuous-pass guard)', () => {
		expect(pageEntries.length).toBe(44)
	})

	for (const [name, page] of pageEntries) {
		// On failure: mounting `${name}` and inspecting its real rendered DOM
		// (both lenses, real framework cascade) surfaced ≥1 `error`-severity
		// finding. The message names every offending finding (rule · message ·
		// element path · cite). The showcase IS the conformance corpus — fix
		// the framework SCSS / page markup at the source so it genuinely
		// conforms (never weaken the inspector or this gate). Warnings / advice
		// are reported (afterAll summary), not failed.
		it(`${name} — zero error-severity findings`, () => {
			const { host, teardown } = mount(page)
			try {
				const result = new Inspector().inspect({ root: host })
				for (const finding of result.findings) {
					if (finding.severity !== 'error') advisory.push({ page: name, finding })
				}
				const errors = result.findings
					.filter((f) => f.severity === 'error')
					.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
				// On failure: the message (a template literal — the
				// pages.test.ts idiom the `vitest/valid-expect` lint requires)
				// names the page + every offending finding (rule · message ·
				// element path · cite) so a red gate is immediately actionable.
				expect(
					result.counts.error,
					`${name} has ${errors.length} error-severity finding(s):\n${errors
						.map((f) => `  • ${describeFinding(f)}`)
						.join('\n')}`,
				).toBe(0)
			} finally {
				teardown()
			}
		})
	}
})
