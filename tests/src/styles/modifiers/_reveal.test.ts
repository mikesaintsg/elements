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
//      zeroes. The label `<span>` fades, clips, and slides out from behind the
//      icon (which is raised above it via z-index).
//    • `.compact` composes: padding stays equal inline/block AND constant
//      across states, so the icon is a stable anchor (no bounce).
//    • A `[role="toolbar"]` of reveals opens them together on hover /
//      focus-within (pure-CSS group reveal — no JS latch).
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

// ── Slide-from-behind motion ────────────────────────────────────────────────
//
// The label does not merely fade: it transitions `transform` (slides out from
// behind the icon, which is raised above it via z-index). Mirrored for `.end`.

describe('button.reveal — slide-from-behind motion', () => {
	it('transitions the label transform (slides, not just fades)', () => {
		const label = labelOf(revealButton('reveal'))
		expect(style(label, 'transition-property')).toContain('transform')
		expect(style(label, 'transition-property')).toContain('opacity')
	})

	it('raises the icon above the label so the label slides out from behind it', () => {
		const icon = revealButton('reveal').querySelector('i')
		if (!icon) throw new Error('reveal button has no icon')
		expect(style(icon, 'position')).toBe('relative')
		expect(style(icon, 'z-index')).toBe('1')
	})
})

// ── Group reveal — a toolbar opens its reveals together ──────────────────────
//
// `:hover` / `:focus-within` on a `[role="toolbar"]` reveal every child at
// once (the pure-CSS group reveal — no JS latch). Declared-in-cascade
// assertion: a real `:hover` can't be synthesised from a non-interactive
// render, so the rules are asserted as present via `findRule`.

describe('button.reveal — group reveal in a [role="toolbar"]', () => {
	it('declares the toolbar group-reveal rules (hover + focus-within)', () => {
		expect(findRule('[role="toolbar"]:hover button.reveal')).toBe(true)
		expect(findRule('[role="toolbar"]:focus-within button.reveal')).toBe(true)
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
