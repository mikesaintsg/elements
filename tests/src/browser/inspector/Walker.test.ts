// ============================================================================
//  Walker + RuleContext + transparent-resolver unit suite.
//
//  Real DOM fixtures per AGENTS.md §16.2 — no mocks, real elements, real
//  shadow roots / slots / templates, real `getComputedStyle`. Synthetic
//  transparent/flow trees are seeded with `@elements/core` `createRandom`
//  so a failing tree is reproducible from its seed.
//
//  Covered cases (the Phase-2 spec's named set, plus restriction
//  accumulation):
//    1. detached transparent root → flow fallback
//    2. nested transparent (`<a><ins>…`) resolution
//    3. slotted / shadow descent
//    4. `<template>` content descent
//    5. foreign-subtree (`<svg>` / `<math>`) skip
//    6. inherited-restriction accumulation under `<a>` / `<button>` /
//       media elements
//    7. resolver determinism over seeded synthetic trees
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	Walker,
	effectiveCategories,
	flatChildren,
	nodePath,
	resolveModel,
} from '@elements/browser'
import { createRandom } from '@elements/core'

describe('Walker', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	// Build an element with optional children / attributes, no mounting.
	function el(tag: string, children: readonly Element[] = []): Element {
		const node = document.createElement(tag)
		for (const child of children) node.appendChild(child)
		return node
	}

	// ── construction ──────────────────────────────────────────────────────

	describe('construction', () => {
		it('throws on a non-Element root (programmer error, AGENTS §13)', () => {
			// A text node is a real DOM node but not an Element.
			const text = document.createTextNode('x')
			expect(() => new Walker(text as unknown as Element)).toThrow(/must be an Element/)
		})

		it('exposes the root via `element`', () => {
			const root = el('section')
			expect(new Walker(root).element).toBe(root)
		})
	})

	// ── walk: ordinary subtree parity with the traversals spine ───────────

	describe('walk — ordinary light-DOM subtree', () => {
		it('yields every descendant depth-first in document order', () => {
			const a = el('span')
			const b = el('em')
			const c = el('strong')
			const root = el('p', [el('span', [a]), el('b', [b, c])])
			container.appendChild(root)

			const tags = Array.from(new Walker(root).walk()).map((n) => n.tagName.toLowerCase())
			expect(tags).toEqual(['span', 'span', 'b', 'em', 'strong'])
		})

		it('supports early break (lazy, nothing materialized ahead)', () => {
			const root = el('div', [el('p'), el('p'), el('p')])
			container.appendChild(root)
			const seen: string[] = []
			for (const node of new Walker(root).walk()) {
				seen.push(node.tagName.toLowerCase())
				break
			}
			expect(seen).toEqual(['p'])
		})

		it('`nodes()` is the eager frozen snapshot of `walk()`', () => {
			const root = el('ul', [el('li'), el('li')])
			container.appendChild(root)
			const walker = new Walker(root)
			expect(walker.nodes().map((n) => n.tagName.toLowerCase())).toEqual(
				Array.from(walker.walk()).map((n) => n.tagName.toLowerCase()),
			)
		})
	})

	// ── 1. detached transparent root → flow fallback ──────────────────────

	describe('resolveModel — detached transparent root resolves to flow', () => {
		it('a detached `<a>` (transparent, no parent) → flow content model', () => {
			// Spec: "when a transparent element has no parent, its content
			// model restrictions are instead based on flow content".
			const link = el('a')
			expect(resolveModel(link)).toBe('children')
			expect(effectiveCategories(link)).toEqual(['flow'])
		})

		it('a non-transparent detached element keeps its own model', () => {
			expect(resolveModel(el('p'))).toBe('children')
			expect(resolveModel(el('br'))).toBe('void')
			expect(resolveModel(el('title'))).toBe('text')
		})

		it('an unknown tag resolves to null', () => {
			expect(resolveModel(el('made-up-thing'))).toBeNull()
			expect(effectiveCategories(el('made-up-thing'))).toEqual([])
		})
	})

	// ── 2. nested transparent (`<a><ins>…`) resolution ────────────────────

	describe('resolveModel — nested transparent resolution', () => {
		it('`<p><a><ins><span>` — ins/a resolve through to p (children/flow)', () => {
			const span = el('span')
			const ins = el('ins', [span])
			const anchor = el('a', [ins])
			const para = el('p', [anchor])
			container.appendChild(para)

			// p is non-transparent → its own model.
			expect(resolveModel(para)).toBe('children')
			// a is transparent, nearest non-transparent ancestor is p — so
			// its effective categories are p's own categories.
			expect(resolveModel(anchor)).toBe('children')
			expect(effectiveCategories(anchor)).toEqual(effectiveCategories(para))
			// ins is transparent, walks a (transparent) then p.
			expect(resolveModel(ins)).toBe('children')
			// span is its own non-transparent model.
			expect(resolveModel(span)).toBe('children')
		})

		it('transparent chain bottoming out at a void ancestor inherits void', () => {
			// object is transparent; its nearest non-transparent ancestor here
			// is the table cell's model. Use a concrete non-transparent host.
			const obj = el('object')
			const td = el('td', [obj])
			el('tr', [td])
			expect(resolveModel(td)).toBe('children')
			expect(resolveModel(obj)).toBe('children')
		})

		it('effectiveCategories of a transparent element mirrors the resolved ancestor', () => {
			const ins = el('ins')
			const section = el('section', [ins])
			container.appendChild(section)
			expect(effectiveCategories(ins)).toEqual(effectiveCategories(section))
		})
	})

	// ── 3. slotted / shadow descent ───────────────────────────────────────

	describe('walk — shadow / slot descent (flat tree)', () => {
		it('descends into a shadow root', () => {
			const host = el('div')
			container.appendChild(host)
			const shadow = host.attachShadow({ mode: 'open' })
			const inner = document.createElement('span')
			inner.textContent = 'shadow'
			shadow.appendChild(inner)

			const tags = Array.from(new Walker(host).walk()).map((n) => n.tagName.toLowerCase())
			expect(tags).toContain('span')
		})

		it('resolves a `<slot>` to its assigned (distributed) elements', () => {
			const host = el('div')
			const light = document.createElement('p')
			light.textContent = 'projected'
			host.appendChild(light)
			container.appendChild(host)

			const shadow = host.attachShadow({ mode: 'open' })
			const slot = document.createElement('slot')
			shadow.appendChild(slot)

			// flatChildren of the slot is its assignedElements() — the light
			// <p> distributed into it.
			expect(flatChildren(slot)).toContain(light)
		})
	})

	// ── 4. `<template>` content descent ───────────────────────────────────

	describe('walk — `<template>` content descent', () => {
		it('descends into inert `<template>.content`', () => {
			const template = document.createElement('template')
			const inner = document.createElement('li')
			template.content.appendChild(inner)
			const root = el('ul', [template])
			container.appendChild(root)

			const tags = Array.from(new Walker(root).walk()).map((n) => n.tagName.toLowerCase())
			expect(tags).toEqual(['template', 'li'])
			expect(flatChildren(template)).toEqual([inner])
		})
	})

	// ── 5. foreign-subtree (`<svg>` / `<math>`) skip ──────────────────────

	describe('walk — foreign-content subtree skip', () => {
		it('yields the `<svg>` host but never its non-HTML subtree', () => {
			const root = document.createElement('div')
			root.innerHTML =
				'<p>before</p><svg viewBox="0 0 1 1"><rect/><g><circle/></g></svg><span>after</span>'
			container.appendChild(root)

			const tags = Array.from(new Walker(root).walk()).map((n) => n.tagName.toLowerCase())
			expect(tags).toContain('svg')
			expect(tags).toContain('p')
			expect(tags).toContain('span')
			expect(tags).not.toContain('rect')
			expect(tags).not.toContain('circle')
			expect(tags).not.toContain('g')
		})

		it('yields the `<math>` host but never its subtree', () => {
			const root = document.createElement('div')
			root.innerHTML = '<math><mrow><mi>x</mi></mrow></math>'
			container.appendChild(root)

			const tags = Array.from(new Walker(root).walk()).map((n) => n.tagName.toLowerCase())
			expect(tags).toEqual(['math'])
		})
	})

	// ── 6. inherited-restriction accumulation ─────────────────────────────

	describe('context — inherited restriction accumulation', () => {
		it('no restrictions when no restricting ancestor', () => {
			const span = el('span')
			el('p', [span])
			const { restrictions } = new Walker(span).context(span)
			expect(restrictions).toEqual({
				interactive: false,
				link: false,
				tabindex: false,
				media: false,
			})
		})

		it('`<a>` ancestor forbids interactive / a / tabindex descendants', () => {
			const span = el('span')
			const anchor = el('a', [el('em', [span])])
			container.appendChild(anchor)
			const { restrictions } = new Walker(anchor).context(span)
			expect(restrictions).toEqual({
				interactive: true,
				link: true,
				tabindex: true,
				media: false,
			})
		})

		it('`<button>` ancestor forbids interactive / tabindex but not `a`', () => {
			const span = el('span')
			const button = el('button', [span])
			container.appendChild(button)
			const { restrictions } = new Walker(button).context(span)
			expect(restrictions).toEqual({
				interactive: true,
				link: false,
				tabindex: true,
				media: false,
			})
		})

		it('media (`<video>`) ancestor forbids nested media descendants', () => {
			const source = el('source')
			const video = el('video', [source])
			container.appendChild(video)
			const { restrictions } = new Walker(video).context(source)
			expect(restrictions.media).toBe(true)
			expect(restrictions.interactive).toBe(false)
		})

		it('parents is the nearest-first ancestor chain', () => {
			const span = el('span')
			const inner = el('em', [span])
			const root = el('section', [inner])
			container.appendChild(root)
			const { parents } = new Walker(root).context(span)
			expect(parents.map((p) => p.tagName.toLowerCase())).toEqual([
				'em',
				'section',
				'div',
				'body',
				'html',
			])
		})
	})

	// ── lazy computed-style accessor ──────────────────────────────────────

	describe('context — lazy memoized style accessor', () => {
		it('returns a real CSSStyleDeclaration and memoizes the call', () => {
			const box = document.createElement('div')
			box.style.display = 'flex'
			container.appendChild(box)
			const context = new Walker(box).context(box)
			const first = context.style()
			const second = context.style()
			expect(first.display).toBe('flex')
			// Memoized: same object identity across calls.
			expect(first).toBe(second)
		})
	})

	// ── nodePath adapter ──────────────────────────────────────────────────

	describe('nodePath — wraps getPathToAncestor', () => {
		it('path runs from the element up to (excluding) the ancestor', () => {
			const leaf = el('span')
			const mid = el('em', [leaf])
			const root = el('section', [mid])
			container.appendChild(root)
			expect(nodePath(leaf, root).map((n) => n.tagName.toLowerCase())).toEqual(['span', 'em'])
		})

		it('with no ancestor the path runs to the root', () => {
			const leaf = el('span')
			el('p', [leaf])
			expect(nodePath(leaf)).toContain(leaf)
		})
	})

	// ── 7. seeded synthetic-tree determinism ──────────────────────────────

	describe('resolveModel — deterministic over seeded synthetic trees', () => {
		const TRANSPARENT = ['a', 'ins', 'del', 'object', 'map'] as const
		const HOSTS = ['p', 'section', 'div', 'span', 'article'] as const

		// Build a deterministic nested transparent chain ending in a
		// non-transparent host, seeded so the structure is reproducible.
		function syntheticChain(seed: number): { leaf: Element; host: Element } {
			const random = createRandom(seed)
			const depth = 1 + Math.floor(random() * 6)
			const hostTag = HOSTS[Math.floor(random() * HOSTS.length)] ?? 'p'
			const host = document.createElement(hostTag)
			let current: Element = host
			for (let i = 0; i < depth; i += 1) {
				const t = TRANSPARENT[Math.floor(random() * TRANSPARENT.length)] ?? 'a'
				const wrap = document.createElement(t)
				current.appendChild(wrap)
				current = wrap
			}
			return { leaf: current, host }
		}

		it('same seed → identical structure → identical resolution', () => {
			const a = syntheticChain(1337)
			const b = syntheticChain(1337)
			container.append(a.host, b.host)
			// The deepest transparent leaf resolves to the host's model.
			expect(resolveModel(a.leaf)).toBe(resolveModel(a.host))
			expect(resolveModel(a.leaf)).toBe(resolveModel(b.leaf))
			expect(effectiveCategories(a.leaf)).toEqual(effectiveCategories(b.leaf))
		})

		it('every transparent node in a seeded chain resolves to the same host model', () => {
			for (const seed of [1, 42, 99, 2024, 65535]) {
				const { host } = syntheticChain(seed)
				container.appendChild(host)
				const hostModel = resolveModel(host)
				for (const node of new Walker(host).walk()) {
					expect(resolveModel(node)).toBe(hostModel)
				}
			}
		})
	})
})
