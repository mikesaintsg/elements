// ============================================================================
//  _details.scss + _summary.scss — disclosure box + toggle label.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, style, token } from '../../../setupStyles'

function buildDetails(
	classes = '',
	open = false,
): {
	details: HTMLDetailsElement
	summary: HTMLElement
} {
	const details = build('details', classes)
	if (open) details.setAttribute('open', '')
	const summary = build('summary', '', 'Disclosure')
	const body = build('p', '', 'content')
	details.appendChild(summary)
	details.appendChild(body)
	mount(details)
	return { details, summary }
}

describe('details — baseline', () => {
	it('renders padding from --set-size-padding-* fallback', () => {
		const { details } = buildDetails()
		expect(pixels(details, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(details, 'padding-left')).toBeGreaterThan(0)
	})

	it('renders a 1px border', () => {
		const { details } = buildDetails()
		expect(pixels(details, 'border-top-width')).toBe(1)
	})

	it('renders a non-zero border-radius', () => {
		const { details } = buildDetails()
		expect(pixels(details, 'border-top-left-radius')).toBeGreaterThan(0)
	})
})

describe('details — variant cascade', () => {
	it('.success moves border-color to the success token', () => {
		const { details } = buildDetails('success')
		const expected = style(document.documentElement, '--color-success').trim()
		expect(token(details, '--set-details-border-color').trim()).toBe(expected)
	})
})

describe('summary — chrome', () => {
	it('renders cursor: pointer', () => {
		const { summary } = buildDetails()
		expect(style(summary, 'cursor')).toBe('pointer')
	})

	it('inherits color from the parent details', () => {
		const { details, summary } = buildDetails('primary')
		expect(token(summary, '--set-summary-color').trim()).toBe(
			token(details, '--set-details-color').trim(),
		)
	})

	it('renders font-weight 600', () => {
		const { summary } = buildDetails()
		expect(parseInt(style(summary, 'font-weight'), 10)).toBe(600)
	})
})

// ── Accordion-group adjacency ──────────────────────────────────────────────
// Per HTML5, `<details name="…">` makes the group "exclusive" (opening one
// closes the others); the framework's `details + details` margin rule
// applies to every consecutive sibling pair regardless of whether `name=`
// is present. The rule itself lives in `src/styles/elements/_details.scss`.

describe('details — adjacent-sibling spacing (accordion group)', () => {
	it('the second `<details>` in a sequence gets margin-block-start', () => {
		const wrap = build('section')
		const first = build('details')
		const summary1 = build('summary')
		summary1.textContent = 'A'
		first.appendChild(summary1)

		const second = build('details')
		const summary2 = build('summary')
		summary2.textContent = 'B'
		second.appendChild(summary2)

		wrap.append(first, second)
		mount(wrap)

		expect(pixels(second, 'margin-top')).toBeGreaterThan(0)
		expect(pixels(first, 'margin-top')).toBe(0)
	})

	it('a single `<details>` with no preceding sibling has no extra margin', () => {
		const wrap = build('section')
		const only = build('details')
		const summary = build('summary')
		summary.textContent = 'Only'
		only.appendChild(summary)
		wrap.appendChild(only)
		mount(wrap)
		expect(pixels(only, 'margin-top')).toBe(0)
	})
})
