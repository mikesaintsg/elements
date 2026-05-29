// ============================================================================
//  button.reveal / button.reveal.end — reveal-on-hover element-local modifier.
//
//  Runtime-cascade behavioural test (the `_placements.test.ts` convention):
//  build a real button, mount it, read computed values. The default Playwright
//  chromium reports `(hover: hover) and (pointer: fine)`, so the capability-
//  gated collapse is active and the at-rest (idle) state resolves WITHOUT any
//  interaction — exactly the kind of resolved-value assertion `_placements`
//  makes. The `:hover` / `:focus-visible` reveal can't be synthesised from a
//  non-interactive render, so its rules are asserted as DECLARED in the
//  cascade via `findRule`.
//
//  Contract under test:
//    • Two-track inline-grid; the LABEL track collapses to 0fr at rest
//      (`reveal` trails the label, `reveal.end` leads it) and the column-gap
//      zeroes. The label `<span>` fades + clips.
//    • `.compact` composes: padding stays equal inline/block AND constant
//      across states, so the icon is a stable anchor (no bounce).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, findRule, mount, style } from '../../../setupStyles'

// `<button class="{classes}"><i class="icon"></i><span>…</span></button>` —
// the documented reveal markup (icon + single `<span>` label child).
function revealButton(classes: string): HTMLButtonElement {
	const button = build('button', classes)
	button.append(build('i', 'icon'), build('span', '', 'New invoice'))
	return mount(button)
}

function labelOf(button: HTMLButtonElement): HTMLSpanElement {
	const span = button.querySelector('span')
	if (!(span instanceof HTMLSpanElement)) throw new Error('reveal button has no <span> label')
	return span
}

// ── Grid structure ─────────────────────────────────────────────────────────

describe('button.reveal — grid structure', () => {
	it('is a centered inline-grid', () => {
		const button = revealButton('reveal')
		expect(style(button, 'display')).toBe('inline-grid')
		expect(style(button, 'align-items')).toBe('center')
	})
})

// ── Collapsed at rest (hover-capable environment) ───────────────────────────

describe('button.reveal — collapsed at rest', () => {
	it('collapses the trailing label track to 0px and zeroes the column gap', () => {
		const button = revealButton('reveal')
		const tracks = style(button, 'grid-template-columns').split(/\s+/)
		expect(tracks.length).toBe(2)
		expect(tracks.at(-1)).toBe('0px') // the label track (0fr)
		expect(style(button, 'column-gap')).toBe('0px')
	})

	it('fades the label out and clips its overflow', () => {
		const label = labelOf(revealButton('reveal'))
		expect(style(label, 'opacity')).toBe('0')
		expect(style(label, 'overflow-x')).toBe('hidden')
		expect(style(label, 'white-space')).toBe('nowrap')
	})
})

describe('button.reveal.end — leading collapse, icon trails', () => {
	it('collapses the LEADING label track; the label is pinned to column 1', () => {
		const button = revealButton('reveal end')
		const tracks = style(button, 'grid-template-columns').split(/\s+/)
		expect(tracks.length).toBe(2)
		expect(tracks[0]).toBe('0px') // label leads, collapsed
		const label = labelOf(button)
		expect(style(label, 'grid-column-start')).toBe('1')
		expect(style(label, 'opacity')).toBe('0')
	})
})

// ── Icon anchor — `.compact` keeps padding equal AND constant ───────────────

describe('button.reveal.compact — square glyph, stable icon anchor', () => {
	it('equalises inline and block padding (square; constant across states → no bounce)', () => {
		const button = revealButton('reveal compact')
		expect(style(button, 'padding-inline-start')).toBe(style(button, 'padding-block-start'))
	})
})

// ── Revealed rules are declared in the cascade ──────────────────────────────

describe('button.reveal — revealed rules declared', () => {
	it('declares the :hover and :focus-visible reveal rules', () => {
		expect(findRule('button.reveal:hover')).toBe(true)
		expect(findRule('button.reveal:focus-visible')).toBe(true)
	})

	it('declares the reveal.end reveal rule', () => {
		expect(findRule('button.reveal.end:focus-visible')).toBe(true)
	})
})
