// ============================================================================
//  app:styles SELF-AUDIT gate — the Inspector dogfooded against the
//  STYLE-COMBINATION matrix the framework PURPORTS to support.
//
//  The Phase-6 `tests/app/browser/semantics.test.ts` gate audits the 44
//  showcase PAGES. This gate audits the raw COMBINATIONS the framework's
//  own SCSS claims to style, derived from the machine-readable registries
//  (never invented data):
//
//    1. STRUCTURAL_PAIRINGS — every bare-tag `parent > child` the
//       framework selectors cascade across (`spec` / `slot` / `reset` /
//       `context`). Each pair is the literal DOM a framework rule targets.
//    2. elements (`elements.ts`) × every applicable cross-cutting modifier
//       (variant ∪ size ∪ style ∪ state) + the documented element-local
//       modifiers (`_local.scss`). Cross-cutting modifiers are class-only
//       token-setters, so the structure lens is invariant to them — the
//       value is the PRESENTATION lens running under the REAL compiled
//       cascade (a modifier that ever stripped a load-bearing rendering
//       would be caught here).
//
//  Every subject is built inside a MINIMAL, spec-grounded valid-ancestor
//  scaffold so the inspector evaluates the COMBINATION, not an artifact of
//  an incomplete harness (a bare `<td>` is invalid only because it has no
//  `<table>` — that is the harness's gap, not the framework's). The gate
//  is SELF-VALIDATING: every scaffold is first inspected WITHOUT the
//  subject and MUST be zero-error; a scaffold that isn't clean fails as a
//  loud `[HARNESS]` bug (fix the scaffold here — never the inspector, and
//  it can never silently mask a real framework non-conformance).
//
//  Gate behavior mirrors the page gate EXACTLY: fail only on an
//  `error`-severity finding; warnings / advice are reported (non-failing
//  `afterAll` summary), not failed (the by-design `presentation/list-style`
//  warning on a role-less `list-style:none` list is expected). A genuine
//  `error` is fixed at the framework SOURCE — the inspector and this gate
//  are never weakened.
//
//  Real Chromium, real compiled cascade (`setupStyles.ts` loads
//  `src/styles/index.scss`), no mocks — same idiom as `tests/src/styles`.
// ============================================================================

import { afterAll, describe, expect, it } from 'vitest'
import { Inspector, elements, modifiers, STRUCTURAL_PAIRINGS } from '@elements/browser'
import type { Finding } from '@elements/browser'
import { mount } from '../../setupStyles'

// ── Minimal valid-ancestor scaffold (HTML LS content models — the same
//    source the inspector schema mirrors). Keyed by tag → the ordered
//    ancestor chain (OUTERMOST → innermost) that tag needs to sit in a
//    conformant context. A tag absent here needs no special host (flow
//    content under the universal `<div>` container). ──────────────────────
const HOST: Readonly<Record<string, readonly string[]>> = {
	li: ['ul'],
	dt: ['dl'],
	dd: ['dl'],
	summary: ['details'],
	legend: ['fieldset'],
	figcaption: ['figure'],
	option: ['select'],
	optgroup: ['select'],
	caption: ['table'],
	colgroup: ['table'],
	col: ['table', 'colgroup'],
	thead: ['table'],
	tbody: ['table'],
	tfoot: ['table'],
	tr: ['table', 'tbody'],
	td: ['table', 'tbody', 'tr'],
	th: ['table', 'tbody', 'tr'],
	source: ['picture'],
	img: ['picture'],
	area: ['map'],
}

function withText(tag: string, text: string): HTMLElement {
	const el = document.createElement(tag)
	el.textContent = text
	return el
}

// Attributes a leaf element needs to clear an `attribute/*` rule so the
// scaffold baseline is clean — spec-grounded (the inspector schema mirrors
// these): `<map>` requires `name`, `<data>` requires `value`, a `<time>`
// without `datetime` requires valid datetime text content.
function requiredAttrs(tag: string): Readonly<Record<string, string>> {
	if (tag === 'map') return { name: 'audit-map' }
	if (tag === 'data') return { value: '0' }
	if (tag === 'time') return { datetime: '2026-01-01' }
	return {}
}

function make(tag: string): HTMLElement {
	const el = document.createElement(tag)
	for (const [k, v] of Object.entries(requiredAttrs(tag))) el.setAttribute(k, v)
	return el
}

const FRAGILE = new Set(['picture', 'dl', 'details', 'hgroup'])

// Post-order: make every fragile container in `root`'s subtree (and `root`
// itself) satisfy its OWN content model with the MINIMAL ordered complement,
// idempotently and order-correctingly — never duplicating a child the
// subject already supplied. Called AFTER the subject (pairing child /
// modifier class) is placed, so the inspector evaluates the COMBINATION in
// a conformant container, not a harness artifact. Spec-grounded; the §0
// self-check proves sufficiency.
function conform(root: HTMLElement): void {
	for (const el of [...root.querySelectorAll<HTMLElement>('*'), root]) {
		const tag = el.tagName.toLowerCase()
		if (!FRAGILE.has(tag)) continue
		const kids = [...el.children]
		if (tag === 'picture') {
			// Zero+ <source>, then exactly one <img> (last).
			if (!kids.some((k) => k.tagName === 'IMG')) {
				const img = make('img')
				img.setAttribute('alt', '')
				img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=')
				el.append(img)
			}
		} else if (tag === 'dl') {
			// One+ <dt> then one+ <dd>. Insert the missing side on the
			// correct edge so order ("dt before dd") holds.
			const hasDt = kids.some((k) => k.tagName === 'DT')
			const hasDd = kids.some((k) => k.tagName === 'DD')
			if (!hasDt) el.insertBefore(withText('dt', 'term'), el.firstChild)
			if (!hasDd) el.append(withText('dd', 'definition'))
		} else if (tag === 'details') {
			// Exactly one <summary>, first.
			if (!kids.some((k) => k.tagName === 'SUMMARY')) {
				el.insertBefore(withText('summary', 'Summary'), el.firstChild)
			}
		} else if (tag === 'hgroup') {
			// p* then one h1–h6 then p*. Add a heading if none.
			if (!kids.some((k) => /^H[1-6]$/.test(k.tagName))) {
				el.append(withText('h2', 'Heading'))
			}
		}
	}
}

// Build `tag` inside its minimal valid-ancestor scaffold. Returns the
// outermost mountable root and the `slot` (the `tag` element). Callers add
// the subject (pairing child / modifier class), then call `conform(root)`
// before mounting + inspecting.
function scaffold(tag: string): { root: HTMLElement; slot: HTMLElement } {
	const chain = HOST[tag] ?? []
	const outer = document.createElement('div')
	let cursor: HTMLElement = outer
	for (const ancestor of chain) {
		const node = make(ancestor)
		cursor.appendChild(node)
		cursor = node
	}
	const slot = make(tag)
	cursor.appendChild(slot)
	return { root: outer, slot }
}

// ── Reporting — identical to the page gate (warnings reported, not
//    failed; errors fail loudly with rule · message · path · cite). ───────
function describeFinding(finding: Finding): string {
	const path = finding.path.map((el) => el.tagName.toLowerCase()).join(' > ')
	const extra =
		finding.expected !== undefined || finding.actual !== undefined
			? ` (expected ${finding.expected ?? '—'}, actual ${finding.actual ?? '—'})`
			: ''
	return `[${finding.severity}] ${finding.rule} — ${finding.message}${extra} @ ${path} {${finding.cite}}`
}

const advisory: { subject: string; finding: Finding }[] = []

afterAll(() => {
	if (advisory.length === 0) return
	const byRule = new Map<string, number>()
	for (const { finding } of advisory) byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
	const summary = [...byRule.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([rule, n]) => `${rule}×${n}`)
		.join(', ')
	console.warn(
		`app:styles gate — ${advisory.length} non-error finding(s) across the style matrix (reported, not failed): ${summary}`,
	)
	for (const { subject, finding } of advisory) {
		console.warn(`  ${subject}: ${describeFinding(finding)}`)
	}
})

// Inspect `root`, collect non-error findings into the advisory tally, and
// return the error-severity findings (the only fail signal). Callers assert
// `expect(audit(...).length, `<inline template>`).toBe(0)` — the 2nd
// `expect` arg MUST be a literal/template (the `vitest/valid-expect` lint
// requires it; a helper-call message is rejected). This is the exact
// page-gate idiom (`tests/app/browser/semantics.test.ts`).
function audit(root: HTMLElement, subject: string): readonly Finding[] {
	const result = new Inspector().inspect({ root })
	for (const finding of result.findings) {
		if (finding.severity !== 'error') advisory.push({ subject, finding })
	}
	return result.findings.filter((f) => f.severity === 'error')
}

// ── 0. Harness self-validation — every distinct scaffold, conformed but
//    with NO subject content, must inspect to zero errors. A failure here
//    is a HARNESS bug (fix `HOST` / `conform` / `requiredAttrs` above),
//    proving the gate can neither false-positive nor mask a real framework
//    finding. ───────────────────────────────────────────────────────────
const scaffoldTags = [...new Set([...Object.keys(HOST), ...Object.values(elements)])].sort()

describe('app:styles — scaffold soundness (the gate cannot false-positive)', () => {
	it('discovers the registries (vacuous-pass guard)', () => {
		expect(Object.values(elements).length).toBeGreaterThan(30)
		expect(STRUCTURAL_PAIRINGS.length).toBeGreaterThan(20)
	})

	for (const tag of scaffoldTags) {
		it(`scaffold for <${tag}> is itself conformant`, () => {
			const { root } = scaffold(tag)
			// Conform every fragile container (incl. the slot itself when it
			// IS a fragile container) so the BARE scaffold is clean.
			conform(root)
			mount(root)
			const errors = audit(root, `[HARNESS] scaffold <${tag}>`)
			expect(
				errors.length,
				`[HARNESS] scaffold <${tag}> is not content-model-conformant — ${errors.length} error(s):\n${errors
					.map((f) => `  • ${describeFinding(f)}`)
					.join('\n')}`,
			).toBe(0)
		})
	}
})

// ── 1. STRUCTURAL_PAIRINGS — every framework `parent > child` cascade ────
describe('app:styles — STRUCTURAL_PAIRINGS are content-model-conformant', () => {
	for (const pairing of STRUCTURAL_PAIRINGS) {
		it(`${pairing.parent} > ${pairing.child} (${pairing.kind})`, () => {
			const { root, slot } = scaffold(pairing.parent)
			const child = make(pairing.child)
			slot.insertBefore(child, slot.firstChild)
			// Conform the parent (and any fragile container, incl. the child
			// itself) AROUND the placed pairing child — minimal, ordered, no
			// duplication of what the pairing already supplied.
			conform(root)
			mount(root)
			const subject = `STRUCTURAL_PAIRINGS ${pairing.parent} > ${pairing.child} (${pairing.kind})`
			const errors = audit(root, subject)
			expect(
				errors.length,
				`${subject} surfaced ${errors.length} error-severity finding(s):\n${errors
					.map((f) => `  • ${describeFinding(f)}`)
					.join('\n')}`,
			).toBe(0)
		})
	}
})

// ── 2. styled element × modifier (cross-cutting + element-local) ─────────
// Cross-cutting modifiers apply to ANY element by cascade design; the
// element-local ones are tag-scoped (`_local.scss` / `components/_div.scss`).
const CROSS_CUTTING: readonly string[] = [
	...Object.values(modifiers.variant),
	...Object.values(modifiers.size),
	...Object.values(modifiers.style),
	...Object.values(modifiers.state),
]

// Documented element-local modifiers, keyed by the carrier tag they target
// in `src/styles/modifiers/_local.scss` (+ `components/_div.scss`). Only
// tags present in `elements.ts` are listed (the suite's subject set).
const LOCAL: Readonly<Record<string, readonly string[]>> = {
	article: ['frame', 'flush'],
	a: ['flush'],
	button: ['dropdown', 'flush', 'flat'],
	details: ['flush'],
	dialog: ['flush'],
	fieldset: ['flush'],
	form: ['row', 'flush'],
	input: ['flat', 'flush'],
	section: ['flush'],
	select: ['flat', 'flush'],
	textarea: ['flat', 'flush'],
}

describe('app:styles — every styled element × every applicable modifier conforms', () => {
	for (const tag of Object.values(elements)) {
		const classes = [...CROSS_CUTTING, ...(LOCAL[tag] ?? [])]
		it(`<${tag}> · bare + ${classes.length} modifier(s)`, () => {
			// Baseline: the bare styled element in its scaffold. A failure
			// here is the scaffold's (already covered by §0) — assert it so
			// a modifier failure is unambiguously the modifier's.
			const base = scaffold(tag)
			conform(base.root)
			mount(base.root)
			const bareErrors = audit(base.root, `<${tag}> bare`)
			expect(
				bareErrors.length,
				`<${tag}> bare (baseline) surfaced ${bareErrors.length} error(s):\n${bareErrors
					.map((f) => `  • ${describeFinding(f)}`)
					.join('\n')}`,
			).toBe(0)

			for (const cls of classes) {
				const { root, slot } = scaffold(tag)
				slot.className = cls
				conform(root)
				mount(root)
				const errors = audit(root, `<${tag} class="${cls}">`)
				expect(
					errors.length,
					`<${tag} class="${cls}"> surfaced ${errors.length} error-severity finding(s):\n${errors
						.map((f) => `  • ${describeFinding(f)}`)
						.join('\n')}`,
				).toBe(0)
			}
		})
	}
})
