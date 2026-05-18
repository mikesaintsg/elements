// ============================================================================
//  transparent family — interactive / link / tabindex / nested-media rules.
//
//  Real DOM per AGENTS §16.2 (no mocks). These rules read the Phase-2
//  `RuleContext.restrictions` flags the Walker accumulates over ancestors:
//  an ancestor `<a>` forbids interactive / `<a>` / `[tabindex]` descendants;
//  a media ancestor (`<audio>`/`<video>`) forbids nested media. Clean trees
//  (no restricting ancestor) → no finding; dirty trees → the exact finding.
//  Perturbation: seeded descendant placement under `<a>` is reproducible and
//  the suite bites if a restriction is mis-wired.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Walker, rules } from '@elements/browser'
import { createRandom } from '@elements/core'

function ruleById(id: string): (typeof rules)[number] {
	const found = rules.find((rule) => rule.id === id)
	if (found === undefined) throw new Error(`fixture: ${id} rule missing`)
	return found
}

const interactiveRule = ruleById('transparent/interactive-descendant')
const linkRule = ruleById('transparent/link-descendant')
const tabindexRule = ruleById('transparent/tabindex-descendant')
const mediaRule = ruleById('transparent/nested-media')

describe('rules — transparent family', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	function el(tag: string, children: readonly Element[] = []): Element {
		const node = document.createElement(tag)
		for (const child of children) node.appendChild(child)
		return node
	}

	function verdict(rule: (typeof rules)[number], root: Element, target: Element): boolean {
		const walker = new Walker(root)
		return rule.evaluate(target, walker.context(target)) !== null
	}

	describe('clean — no restricting ancestor', () => {
		it('a <button> inside a <div> trips no transparent rule', () => {
			const button = el('button')
			const root = el('div', [button])
			container.appendChild(root)
			expect(verdict(interactiveRule, root, button)).toBe(false)
			expect(verdict(tabindexRule, root, button)).toBe(false)
		})

		it('an <a> not nested in another <a> trips no link rule', () => {
			const a = el('a')
			const root = el('p', [a])
			container.appendChild(root)
			expect(verdict(linkRule, root, a)).toBe(false)
		})

		it('a lone <video> (no media ancestor) trips no media rule', () => {
			const video = el('video')
			const root = el('div', [video])
			container.appendChild(root)
			expect(verdict(mediaRule, root, video)).toBe(false)
		})
	})

	describe('dirty — restriction tripped', () => {
		it('an interactive <button> under an ancestor <a> is flagged', () => {
			const button = el('button')
			const a = el('a', [el('span', [button])])
			container.appendChild(a)
			const walker = new Walker(a)
			const finding = interactiveRule.evaluate(button, walker.context(button))
			if (finding === null) throw new Error('expected an interactive finding')
			expect(finding.rule).toBe('transparent/interactive-descendant')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(button)
			// The corpus single source of truth for this restriction is the
			// RESTRICTING ANCESTOR's card — the `<a>` element card states "no
			// interactive content descendant" — resolved via the shared
			// `citeOf` path off the parity-gated schema, not a hoisted const.
			expect(finding.cite).toBe('texts#the-a-element')
		})

		it('a nested <a> inside an ancestor <a> is flagged by the link rule', () => {
			const inner = el('a')
			const outer = el('a', [el('em', [inner])])
			container.appendChild(outer)
			const walker = new Walker(outer)
			expect(linkRule.evaluate(inner, walker.context(inner))?.rule).toBe(
				'transparent/link-descendant',
			)
		})

		it('a [tabindex] <span> under an ancestor <a> is flagged', () => {
			const span = el('span')
			span.setAttribute('tabindex', '0')
			const a = el('a', [span])
			container.appendChild(a)
			const walker = new Walker(a)
			expect(tabindexRule.evaluate(span, walker.context(span))?.rule).toBe(
				'transparent/tabindex-descendant',
			)
		})

		it('a <video> nested inside an ancestor <video> is flagged', () => {
			const inner = el('video')
			const outer = el('video', [inner])
			container.appendChild(outer)
			const walker = new Walker(outer)
			expect(mediaRule.evaluate(inner, walker.context(inner))?.rule).toBe(
				'transparent/nested-media',
			)
		})

		it('interactive rule does NOT double-report a nested <a> (link rule owns it)', () => {
			// A nested <a> is interactive AND a link; the interactive rule
			// excludes <a> so each violation produces exactly one finding.
			const inner = el('a')
			const outer = el('a', [inner])
			container.appendChild(outer)
			const walker = new Walker(outer)
			expect(interactiveRule.evaluate(inner, walker.context(inner))).toBeNull()
			expect(linkRule.evaluate(inner, walker.context(inner))).not.toBeNull()
		})
	})

	describe('perturbation — restriction accumulation bites (seeded)', () => {
		it('seeded descendant under <a> verdict is reproducible & correct', () => {
			const KINDS = ['button', 'input', 'select', 'span'] as const
			for (const seed of [3, 55, 909, 30000]) {
				const random = createRandom(seed)
				const kind = KINDS[Math.floor(random() * KINDS.length)] ?? 'span'
				const underAnchor = random() < 0.5

				const buildOnce = (): boolean => {
					const node = el(kind)
					const wrap = underAnchor ? el('a', [node]) : el('div', [node])
					container.appendChild(wrap)
					const walker = new Walker(wrap)
					const flagged = interactiveRule.evaluate(node, walker.context(node)) !== null
					wrap.remove()
					return flagged
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				// Interactive node (button/input/select) under <a> → flagged;
				// a plain <span>, or anything not under <a> → not flagged.
				const interactive = kind !== 'span'
				expect(first).toBe(underAnchor && interactive)
			}
		})
	})
})
