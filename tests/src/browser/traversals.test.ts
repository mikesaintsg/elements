import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	// Type guards
	isElement,
	isHTMLElement,
	isTextNode,
	isTagType,

	// Matching utilities
	matchesTag,
	hasClass,
	hasClasses,
	hasId,
	hasAttribute,
	createMatcher,

	// Ancestor traversal
	findAncestor,
	findAncestorByTag,
	findAncestorByClass,
	findAncestorById,
	getAncestors,
	findCommonAncestor,

	// Child traversal
	findChild,
	findChildByTag,
	findChildByClass,
	findChildById,
	findChildren,
	findChildrenByTag,
	findChildrenByClass,
	getChildAt,
	getChildren,

	// Sibling traversal
	findNextSibling,
	findNextSiblingByTag,
	findNextSiblingByClass,
	findPreviousSibling,
	findPreviousSiblingByTag,
	findPreviousSiblingByClass,
	getSiblings,
	getNextSiblings,
	getPreviousSiblings,
	getSiblingIndex,

	// Descendant traversal
	findDescendant,
	findAllDescendants,
	walkDescendants,
	walkDescendantsGenerator,
	walkDescendantsBreadthFirst,
	getDescendantsByTag,
	getDescendantsByClass,
	getFirstDescendantByTag,
	getFirstDescendantByClass,

	// Document-level access
	getElementById,
	getElementsByTag,
	getElementsByClass,
	getElementsByName,

	// Relationships
	isDescendantOf,
	isAncestorOf,
	isSiblingOf,
	isBefore,
	isAfter,
	getTreeDistance,
	getPathToAncestor,

	// Visibility
	isInViewport,
	isPartiallyInViewport,
	isRendered,
	getViewportVisibility,

	// Collections
	toArray,
	findInCollection,
	filterCollection,

	// Batch DOM operations
	append,
	prepend,
	replace,
	clear,
	remove,
	move,
	swap,
	clone,
	insertBefore,
	insertAfter,

	// Delegation
	delegate,

	// Focus
	findFocusableElements,
	isFocusable,
	findFirstFocusable,
	findLastFocusable,

	// Keyed elements
	findByKey,
	getAllKeyed,
} from '@elements/browser'

describe('traversal', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		container.id = 'test-container'
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	// Query within `container`, throwing if the selector matches nothing.
	// Replaces the brought-over `container.querySelector(...)!` pattern with
	// an explicit null guard (AGENTS forbids the `!` non-null assertion).
	function query(selector: string): Element {
		const found = container.querySelector(selector)
		if (found === null) throw new Error(`expected an element matching ${selector}`)
		return found
	}

	// Same as `query`, but narrows to `HTMLElement` via `instanceof` so
	// callers that need `.click()` / `isFocusable(...)` stay assertion-free.
	function queryHTML(selector: string): HTMLElement {
		const found = query(selector)
		if (!(found instanceof HTMLElement)) {
			throw new Error(`expected an HTMLElement matching ${selector}`)
		}
		return found
	}

	describe('type guards', () => {
		it('isElement should return true for element nodes', () => {
			const div = document.createElement('div')
			expect(isElement(div)).toBe(true)
			expect(isElement(null)).toBe(false)
			expect(isElement(document.createTextNode('text'))).toBe(false)
		})

		it('isHTMLElement should return true for HTML elements', () => {
			const div = document.createElement('div')
			expect(isHTMLElement(div)).toBe(true)
			expect(isHTMLElement(null)).toBe(false)
		})

		it('isTextNode should return true for text nodes', () => {
			const text = document.createTextNode('hello')
			expect(isTextNode(text)).toBe(true)
			expect(isTextNode(document.createElement('div'))).toBe(false)
		})

		it('isTagType should check specific tag types', () => {
			const button = document.createElement('button')
			expect(isTagType(button, 'button')).toBe(true)
			expect(isTagType(button, 'div')).toBe(false)
		})
	})

	describe('matching utilities', () => {
		it('matchesTag should check tag name case-insensitively', () => {
			const div = document.createElement('div')
			expect(matchesTag(div, 'div')).toBe(true)
			expect(matchesTag(div, 'DIV')).toBe(true)
			expect(matchesTag(div, 'span')).toBe(false)
		})

		it('hasClass should check for a single class', () => {
			const div = document.createElement('div')
			div.className = 'foo bar'
			expect(hasClass(div, 'foo')).toBe(true)
			expect(hasClass(div, 'bar')).toBe(true)
			expect(hasClass(div, 'baz')).toBe(false)
		})

		it('hasClasses should check for all classes', () => {
			const div = document.createElement('div')
			div.className = 'foo bar baz'
			expect(hasClasses(div, ['foo', 'bar'])).toBe(true)
			expect(hasClasses(div, ['foo', 'qux'])).toBe(false)
		})

		it('hasId should check element ID', () => {
			const div = document.createElement('div')
			div.id = 'myId'
			expect(hasId(div, 'myId')).toBe(true)
			expect(hasId(div, 'other')).toBe(false)
		})

		it('hasAttribute should check attribute existence and value', () => {
			const div = document.createElement('div')
			div.setAttribute('data-foo', 'bar')
			expect(hasAttribute(div, 'data-foo')).toBe(true)
			expect(hasAttribute(div, 'data-foo', 'bar')).toBe(true)
			expect(hasAttribute(div, 'data-foo', 'baz')).toBe(false)
			expect(hasAttribute(div, 'data-qux')).toBe(false)
		})

		it('createMatcher should create a predicate from criteria', () => {
			const div = document.createElement('div')
			div.id = 'myId'
			div.className = 'foo bar'
			div.setAttribute('data-test', 'value')

			const matcher = createMatcher({ tag: 'div', id: 'myId', class: 'foo' })
			expect(matcher(div)).toBe(true)

			const matcherWithClasses = createMatcher({ classes: ['foo', 'bar'] })
			expect(matcherWithClasses(div)).toBe(true)

			const matcherWithAttrs = createMatcher({ attributes: { 'data-test': 'value' } })
			expect(matcherWithAttrs(div)).toBe(true)

			const nonMatcher = createMatcher({ tag: 'span' })
			expect(nonMatcher(div)).toBe(false)
		})
	})

	describe('ancestor traversal', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="grandparent" class="ancestor">
					<div id="parent" class="ancestor">
						<span id="child">Child</span>
					</div>
				</div>
			`
		})

		it('findAncestor should find first matching ancestor', () => {
			const child = query('#child')
			const result = findAncestor(child, el => el.id === 'parent')
			expect(result?.id).toBe('parent')
		})

		it('findAncestor should return null when no match found', () => {
			const child = query('#child')
			const result = findAncestor(child, el => el.id === 'non-existent')
			expect(result).toBeNull()
		})

		it('findAncestor should not match the element itself', () => {
			const parent = query('#parent')
			const result = findAncestor(parent, el => el.id === 'parent')
			expect(result).toBeNull()
		})

		it('findAncestorByTag should find by tag name', () => {
			const child = query('#child')
			const result = findAncestorByTag(child, 'div')
			expect(result?.id).toBe('parent')
		})

		it('findAncestorByTag should return null for non-existent tag', () => {
			const child = query('#child')
			const result = findAncestorByTag(child, 'article')
			expect(result).toBeNull()
		})

		it('findAncestorByClass should find by class name', () => {
			const child = query('#child')
			const result = findAncestorByClass(child, 'ancestor')
			expect(result?.id).toBe('parent')
		})

		it('findAncestorByClass should return null for non-existent class', () => {
			const child = query('#child')
			const result = findAncestorByClass(child, 'non-existent')
			expect(result).toBeNull()
		})

		it('findAncestorById should find by ID', () => {
			const child = query('#child')
			const result = findAncestorById(child, 'grandparent')
			expect(result?.id).toBe('grandparent')
		})

		it('findAncestorById should return null for non-existent ID', () => {
			const child = query('#child')
			const result = findAncestorById(child, 'non-existent')
			expect(result).toBeNull()
		})

		it('getAncestors should return all ancestors', () => {
			const child = query('#child')
			const ancestors = getAncestors(child)
			expect(ancestors.length).toBeGreaterThanOrEqual(3)
			expect(ancestors[0]?.id).toBe('parent')
			expect(ancestors[1]?.id).toBe('grandparent')
		})

		it('getAncestors should return empty array for element at root level', () => {
			const orphan = document.createElement('div')
			const ancestors = getAncestors(orphan)
			expect(ancestors.length).toBe(0)
		})

		it('getAncestors with boundary should stop at boundary', () => {
			const child = query('#child')
			const grandparent = query('#grandparent')
			const ancestors = getAncestors(child, grandparent)
			expect(ancestors.length).toBe(1)
			expect(ancestors[0]?.id).toBe('parent')
		})

		it('findCommonAncestor should find shared ancestor', () => {
			container.innerHTML = `
				<div id="common">
					<div id="left"><span id="a">A</span></div>
					<div id="right"><span id="b">B</span></div>
				</div>
			`
			const a = query('#a')
			const b = query('#b')
			const common = findCommonAncestor(a, b)
			expect(common?.id).toBe('common')
		})

		it('findCommonAncestor should return element itself if elements are same', () => {
			const element = query('#child')
			const common = findCommonAncestor(element, element)
			expect(common).toBe(element)
		})

		it('findCommonAncestor should return null for unrelated elements', () => {
			const orphan = document.createElement('div')
			const child = query('#child')
			const common = findCommonAncestor(orphan, child)
			expect(common).toBeNull()
		})
	})

	describe('child traversal', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="parent">
					<span class="item first">First</span>
					<span class="item second">Second</span>
					<div class="item third">Third</div>
				</div>
			`
		})

		it('findChild should find first matching child', () => {
			const parent = query('#parent')
			const result = findChild(parent, el => el.classList.contains('second'))
			expect(result?.classList.contains('second')).toBe(true)
		})

		it('findChild should return null when no match', () => {
			const parent = query('#parent')
			const result = findChild(parent, el => el.classList.contains('non-existent'))
			expect(result).toBeNull()
		})

		it('findChild should return null for empty parent', () => {
			const empty = document.createElement('div')
			const result = findChild(empty, () => true)
			expect(result).toBeNull()
		})

		it('findChildByTag should find by tag name', () => {
			const parent = query('#parent')
			const result = findChildByTag(parent, 'div')
			expect(result?.classList.contains('third')).toBe(true)
		})

		it('findChildByTag should return null for non-existent tag', () => {
			const parent = query('#parent')
			const result = findChildByTag(parent, 'article')
			expect(result).toBeNull()
		})

		it('findChildByClass should find by class', () => {
			const parent = query('#parent')
			const result = findChildByClass(parent, 'first')
			expect(result?.textContent?.trim()).toBe('First')
		})

		it('findChildByClass should return null for non-existent class', () => {
			const parent = query('#parent')
			const result = findChildByClass(parent, 'non-existent')
			expect(result).toBeNull()
		})

		it('findChildById should find child by id', () => {
			const parent = query('#parent')
			// Add a child with an id for testing
			const childWithId = document.createElement('div')
			childWithId.id = 'test-child'
			parent.appendChild(childWithId)
			const result = findChildById(parent, 'test-child')
			expect(result).toBe(childWithId)
		})

		it('findChildById should return null for non-existent id', () => {
			const parent = query('#parent')
			const result = findChildById(parent, 'non-existent-id')
			expect(result).toBeNull()
		})

		it('findChildById should not find descendant (only direct children)', () => {
			const grandparent = document.createElement('div')
			const parent = document.createElement('div')
			const child = document.createElement('div')
			child.id = 'deep-child'
			parent.appendChild(child)
			grandparent.appendChild(parent)

			const result = findChildById(grandparent, 'deep-child')
			expect(result).toBeNull()
		})

		it('findChildren should find all matching children', () => {
			const parent = query('#parent')
			const results = findChildren(parent, el => el.classList.contains('item'))
			expect(results.length).toBe(3)
		})

		it('findChildren should return empty array when no matches', () => {
			const parent = query('#parent')
			const results = findChildren(parent, el => el.classList.contains('non-existent'))
			expect(results.length).toBe(0)
		})

		it('findChildrenByTag should find all by tag', () => {
			const parent = query('#parent')
			const results = findChildrenByTag(parent, 'span')
			expect(results.length).toBe(2)
		})

		it('findChildrenByTag should return empty array for non-existent tag', () => {
			const parent = query('#parent')
			const results = findChildrenByTag(parent, 'article')
			expect(results.length).toBe(0)
		})

		it('findChildrenByClass should find all by class', () => {
			const parent = query('#parent')
			const results = findChildrenByClass(parent, 'item')
			expect(results.length).toBe(3)
		})

		it('findChildrenByClass should return empty array for non-existent class', () => {
			const parent = query('#parent')
			const results = findChildrenByClass(parent, 'non-existent')
			expect(results.length).toBe(0)
		})

		it('getChildAt should get child by index', () => {
			const parent = query('#parent')
			expect(getChildAt(parent, 0)?.classList.contains('first')).toBe(true)
			expect(getChildAt(parent, 2)?.classList.contains('third')).toBe(true)
			expect(getChildAt(parent, 10)).toBeNull()
		})

		it('getChildAt should return null for negative index', () => {
			const parent = query('#parent')
			expect(getChildAt(parent, -1)).toBeNull()
		})

		it('getChildren should return static array', () => {
			const parent = query('#parent')
			const children = getChildren(parent)
			expect(Array.isArray(children)).toBe(true)
			expect(children.length).toBe(3)
		})

		it('getChildren should return empty array for empty parent', () => {
			const empty = document.createElement('div')
			const children = getChildren(empty)
			expect(children.length).toBe(0)
		})
	})

	describe('sibling traversal', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="parent">
					<span class="first">First</span>
					<div class="second">Second</div>
					<span class="third target">Third</span>
					<div class="fourth">Fourth</div>
					<span class="fifth">Fifth</span>
				</div>
			`
		})

		it('findNextSibling should find next matching sibling', () => {
			const target = query('.target')
			const result = findNextSibling(target, el => el.tagName === 'SPAN')
			expect(result?.classList.contains('fifth')).toBe(true)
		})

		it('findNextSiblingByTag should find next by tag', () => {
			const target = query('.target')
			const result = findNextSiblingByTag(target, 'div')
			expect(result?.classList.contains('fourth')).toBe(true)
		})

		it('findNextSiblingByClass should find next by class', () => {
			const target = query('.target')
			const result = findNextSiblingByClass(target, 'fifth')
			expect(result?.textContent?.trim()).toBe('Fifth')
		})

		it('findPreviousSibling should find previous matching sibling', () => {
			const target = query('.target')
			const result = findPreviousSibling(target, el => el.tagName === 'SPAN')
			expect(result?.classList.contains('first')).toBe(true)
		})

		it('findPreviousSiblingByTag should find previous by tag', () => {
			const target = query('.target')
			const result = findPreviousSiblingByTag(target, 'div')
			expect(result?.classList.contains('second')).toBe(true)
		})

		it('findPreviousSiblingByClass should find previous by class', () => {
			const target = query('.target')
			const result = findPreviousSiblingByClass(target, 'first')
			expect(result?.textContent?.trim()).toBe('First')
		})

		it('getSiblings should return all siblings except self', () => {
			const target = query('.target')
			const siblings = getSiblings(target)
			expect(siblings.length).toBe(4)
			expect(siblings.some(s => s.classList.contains('target'))).toBe(false)
		})

		it('getNextSiblings should return all following siblings', () => {
			const target = query('.target')
			const siblings = getNextSiblings(target)
			expect(siblings.length).toBe(2)
		})

		it('getPreviousSiblings should return all preceding siblings in order', () => {
			const target = query('.target')
			const siblings = getPreviousSiblings(target)
			expect(siblings.length).toBe(2)
			const firstSibling = siblings[0]
			expect(firstSibling?.classList.contains('first')).toBe(true)
		})

		it('getSiblingIndex should return correct index', () => {
			const target = query('.target')
			expect(getSiblingIndex(target)).toBe(2)
		})
	})

	describe('descendant traversal', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="root">
					<div class="level1 a">
						<span class="level2 b">B</span>
						<span class="level2 c target">C</span>
					</div>
					<div class="level1 d">
						<div class="level2 e">
							<span class="level3 f">F</span>
						</div>
					</div>
				</div>
			`
		})

		it('findDescendant should find first matching (depth-first)', () => {
			const root = query('#root')
			const result = findDescendant(root, el => el.classList.contains('level2'))
			expect(result?.classList.contains('b')).toBe(true)
		})

		it('findDescendant should find deeply nested elements', () => {
			const root = query('#root')
			const result = findDescendant(root, el => el.classList.contains('level3'))
			expect(result?.classList.contains('f')).toBe(true)
		})

		it('findAllDescendants should find all matching', () => {
			const root = query('#root')
			const results = findAllDescendants(root, el => el.classList.contains('level2'))
			expect(results.length).toBe(3)
		})

		it('walkDescendants should call callback for each descendant', () => {
			const root = query('#root')
			const visited: string[] = []
			walkDescendants(root, el => {
				visited.push(el.className)
			})
			expect(visited.length).toBe(6)
		})

		it('walkDescendants should stop when callback returns true', () => {
			const root = query('#root')
			const visited: string[] = []
			walkDescendants(root, el => {
				visited.push(el.className)
				return el.classList.contains('target')
			})
			expect(visited.length).toBeLessThan(6)
		})

		it('walkDescendantsGenerator should yield elements', () => {
			const root = query('#root')
			let count = 0
			for (const _ of walkDescendantsGenerator(root)) {
				count++
			}
			expect(count).toBe(6)
		})

		it('walkDescendantsGenerator should support early exit', () => {
			const root = query('#root')
			let count = 0
			for (const el of walkDescendantsGenerator(root)) {
				count++
				if (el.classList.contains('target')) break
			}
			expect(count).toBeLessThan(6)
		})

		it('walkDescendantsBreadthFirst should traverse level by level', () => {
			const root = query('#root')
			const visited: string[] = []
			walkDescendantsBreadthFirst(root, el => {
				if (el.classList.contains('level1') || el.classList.contains('level2') || el.classList.contains('level3')) {
					visited.push(el.classList.contains('level1') ? 'l1' : el.classList.contains('level2') ? 'l2' : 'l3')
				}
			})
			// Level 1s should come before level 2s
			const firstL2 = visited.indexOf('l2')
			const lastL1 = visited.lastIndexOf('l1')
			expect(lastL1).toBeLessThan(firstL2)
		})

		it('getDescendantsByTag should use native method', () => {
			const root = query('#root')
			const spans = getDescendantsByTag(root, 'span')
			expect(spans.length).toBe(3)
		})

		it('getDescendantsByClass should use native method', () => {
			const root = query('#root')
			const level2 = getDescendantsByClass(root, 'level2')
			expect(level2.length).toBe(3)
		})

		it('getFirstDescendantByTag should return first match', () => {
			const root = query('#root')
			const span = getFirstDescendantByTag(root, 'span')
			expect(span?.classList.contains('b')).toBe(true)
		})

		it('getFirstDescendantByClass should return first match', () => {
			const root = query('#root')
			const el = getFirstDescendantByClass(root, 'level2')
			expect(el?.classList.contains('b')).toBe(true)
		})
	})

	describe('document-level access', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="unique-test-id" class="test-class" name="test-name">Test</div>
				<span class="test-class">Another</span>
				<input name="my-input" value="hello" />
				<input name="my-input" value="world" />
			`
		})

		it('getElementById should return element by ID', () => {
			const el = getElementById('unique-test-id')
			expect(el?.textContent).toBe('Test')
		})

		it('getElementById should return null for non-existent ID', () => {
			const el = getElementById('non-existent-id')
			expect(el).toBeNull()
		})

		it('getElementsByTag should return elements by tag', () => {
			const spans = getElementsByTag('span')
			expect(spans.length).toBeGreaterThanOrEqual(1)
		})

		it('getElementsByTag should return empty collection for non-existent tag', () => {
			const articles = getElementsByTag('article')
			expect(articles.length).toBe(0)
		})

		it('getElementsByClass should return elements by class', () => {
			const els = getElementsByClass('test-class')
			expect(els.length).toBe(2)
		})

		it('getElementsByClass should return empty collection for non-existent class', () => {
			const els = getElementsByClass('non-existent-class')
			expect(els.length).toBe(0)
		})

		it('getElementsByName should return elements by name attribute', () => {
			const inputs = getElementsByName('my-input')
			expect(inputs.length).toBe(2)
		})

		it('getElementsByName should return empty list for non-existent name', () => {
			const els = getElementsByName('non-existent-name')
			expect(els.length).toBe(0)
		})
	})

	describe('visibility utilities', () => {
		// These run in real headless Chromium (the `src:browser` project),
		// so `getBoundingClientRect` reflects true layout. Fixed positioning
		// makes the rect deterministic regardless of scroll/parent layout.

		function makeFixed(styles: Partial<CSSStyleDeclaration>): HTMLElement {
			const el = document.createElement('div')
			el.style.position = 'fixed'
			Object.assign(el.style, styles)
			container.appendChild(el)
			return el
		}

		it('isInViewport returns false for an element far off-screen', () => {
			const offscreen = makeFixed({ top: '-10000px', left: '0px', width: '100px', height: '100px' })
			expect(isInViewport(offscreen)).toBe(false)
		})

		it('isInViewport returns true for an element fully within the viewport', () => {
			// The element is a 60x60 box at (10,10); assert it only when the headless
			// viewport is at least that large (viewport size varies by runner — see
			// tests/src/styles/elements/typography.test.ts).
			expect(window.innerWidth).toBeGreaterThanOrEqual(60)
			expect(window.innerHeight).toBeGreaterThanOrEqual(60)
			const inside = makeFixed({ top: '10px', left: '10px', width: '50px', height: '50px' })
			expect(isInViewport(inside)).toBe(true)
		})

		it('isPartiallyInViewport returns false for an element far off-screen', () => {
			const offscreen = makeFixed({ top: '-10000px', left: '0px', width: '100px', height: '100px' })
			expect(isPartiallyInViewport(offscreen)).toBe(false)
		})

		it('isPartiallyInViewport returns true for an element fully within the viewport', () => {
			// The element is a 60x60 box at (10,10); assert it only when the headless
			// viewport is at least that large (viewport size varies by runner — see
			// tests/src/styles/elements/typography.test.ts).
			expect(window.innerWidth).toBeGreaterThanOrEqual(60)
			expect(window.innerHeight).toBeGreaterThanOrEqual(60)
			const inside = makeFixed({ top: '10px', left: '10px', width: '50px', height: '50px' })
			expect(isPartiallyInViewport(inside)).toBe(true)
		})

		it('isRendered returns true for a laid-out element', () => {
			const rendered = makeFixed({ top: '10px', left: '10px', width: '50px', height: '50px' })
			expect(isRendered(rendered)).toBe(true)
		})

		it('isRendered returns false for a display:none element', () => {
			const hidden = document.createElement('div')
			hidden.style.display = 'none'
			hidden.textContent = 'Hidden'
			container.appendChild(hidden)
			expect(isRendered(hidden)).toBe(false)
		})

		it('getViewportVisibility returns 0 for an element far off-screen', () => {
			const offscreen = makeFixed({ top: '-10000px', left: '0px', width: '100px', height: '100px' })
			expect(getViewportVisibility(offscreen)).toBe(0)
		})

		it('getViewportVisibility returns 100 for an element fully within the viewport', () => {
			// The element is a 60x60 box at (10,10); assert it only when the headless
			// viewport is at least that large (viewport size varies by runner — see
			// tests/src/styles/elements/typography.test.ts).
			expect(window.innerWidth).toBeGreaterThanOrEqual(60)
			expect(window.innerHeight).toBeGreaterThanOrEqual(60)
			const inside = makeFixed({ top: '10px', left: '10px', width: '50px', height: '50px' })
			expect(getViewportVisibility(inside)).toBeGreaterThanOrEqual(99)
		})
	})

	describe('relationships', () => {
		beforeEach(() => {
			container.innerHTML = `
				<div id="ancestor">
					<div id="parent">
						<span id="child">Child</span>
						<span id="sibling">Sibling</span>
					</div>
				</div>
			`
		})

		it('isDescendantOf should check descendant relationship', () => {
			const child = query('#child')
			const ancestor = query('#ancestor')
			expect(isDescendantOf(child, ancestor)).toBe(true)
			expect(isDescendantOf(ancestor, child)).toBe(false)
		})

		it('isAncestorOf should check ancestor relationship', () => {
			const child = query('#child')
			const ancestor = query('#ancestor')
			expect(isAncestorOf(ancestor, child)).toBe(true)
			expect(isAncestorOf(child, ancestor)).toBe(false)
		})

		it('isSiblingOf should check sibling relationship', () => {
			const child = query('#child')
			const sibling = query('#sibling')
			const parent = query('#parent')
			expect(isSiblingOf(child, sibling)).toBe(true)
			expect(isSiblingOf(child, parent)).toBe(false)
		})

		it('isBefore should check document order', () => {
			const child = query('#child')
			const sibling = query('#sibling')
			expect(isBefore(child, sibling)).toBe(true)
			expect(isBefore(sibling, child)).toBe(false)
		})

		it('isAfter should check document order', () => {
			const child = query('#child')
			const sibling = query('#sibling')
			expect(isAfter(sibling, child)).toBe(true)
			expect(isAfter(child, sibling)).toBe(false)
		})

		it('getTreeDistance should calculate tree distance', () => {
			const child = query('#child')
			const sibling = query('#sibling')
			expect(getTreeDistance(child, sibling)).toBe(2)
		})

		it('getPathToAncestor should return path', () => {
			const child = query('#child')
			const ancestor = query('#ancestor')
			const path = getPathToAncestor(child, ancestor)
			expect(path.length).toBe(2) // child -> parent
			expect(path[0]?.id).toBe('child')
			expect(path[1]?.id).toBe('parent')
		})
	})

	describe('collections', () => {
		it('toArray should convert collection to array', () => {
			container.innerHTML = '<span>A</span><span>B</span>'
			const collection = container.getElementsByTagName('span')
			const arr = toArray(collection)
			expect(Array.isArray(arr)).toBe(true)
			expect(arr.length).toBe(2)
		})

		it('findInCollection should find matching element', () => {
			container.innerHTML = '<span class="a">A</span><span class="b">B</span>'
			const collection = container.getElementsByTagName('span')
			const result = findInCollection(collection, el => el.classList.contains('b'))
			expect(result?.textContent).toBe('B')
		})

		it('filterCollection should filter elements', () => {
			container.innerHTML = '<span class="keep">A</span><span class="discard">B</span><span class="keep">C</span>'
			const collection = container.getElementsByTagName('span')
			const result = filterCollection(collection, el => el.classList.contains('keep'))
			expect(result.length).toBe(2)
		})
	})

	describe('delegation', () => {
		it('delegate should handle events on matching children', () => {
			container.innerHTML = '<div id="buttons"><button class="a">A</button><button class="b">B</button></div>'
			const buttons = query('#buttons')
			let clicked: string | null = null

			const cleanup = delegate(buttons, 'click', 'button', (target) => {
				clicked = target.className
			})

			const buttonB = queryHTML('.b')
			buttonB.click()

			expect(clicked).toBe('b')
			cleanup()
		})

		it('delegate should handle events with custom predicate', () => {
			container.innerHTML = '<div id="wrapper"><span class="active">Active</span><span>Inactive</span></div>'
			const wrapper = query('#wrapper')
			let handled = false

			const cleanup = delegate(wrapper, 'click', (el: Element) => el.classList.contains('active'), () => {
				handled = true
			})

			const active = queryHTML('.active')
			active.click()

			expect(handled).toBe(true)
			cleanup()
		})
	})

	describe('focus utilities', () => {
		beforeEach(() => {
			container.innerHTML = `
				<form>
					<input type="text" id="input1" />
					<button id="button1">Click</button>
					<a href="#" id="link1">Link</a>
					<div tabindex="0" id="focusable-div">Focusable Div</div>
					<input type="text" disabled id="disabled-input" />
				</form>
			`
		})

		it('isFocusable should identify focusable elements', () => {
			expect(isFocusable(queryHTML('#input1'))).toBe(true)
			expect(isFocusable(queryHTML('#button1'))).toBe(true)
			expect(isFocusable(queryHTML('#link1'))).toBe(true)
			expect(isFocusable(queryHTML('#focusable-div'))).toBe(true)
			expect(isFocusable(queryHTML('#disabled-input'))).toBe(false)
		})

		it('findFocusableElements should find all focusable elements', () => {
			const focusable = findFocusableElements(container)
			expect(focusable.length).toBe(4) // input1, button1, link1, focusable-div
		})

		it('findFirstFocusable should find first focusable', () => {
			const first = findFirstFocusable(container)
			expect((first)?.id).toBe('input1')
		})

		it('findLastFocusable should find last focusable', () => {
			const last = findLastFocusable(container)
			expect((last)?.id).toBe('focusable-div')
		})
	})

	// ========================================================================
	// BATCH DOM OPERATIONS
	// ========================================================================

	describe('batch DOM operations', () => {
		beforeEach(() => {
			container.innerHTML = ''
		})

		describe('clear', () => {
			it('should remove all children', () => {
				container.appendChild(document.createElement('div'))
				container.appendChild(document.createElement('span'))
				container.appendChild(document.createTextNode('text'))

				clear(container)
				expect(container.childNodes.length).toBe(0)
			})

			it('should handle empty container', () => {
				clear(container)
				expect(container.childNodes.length).toBe(0)
			})
		})

		describe('append', () => {
			it('should append nodes to existing', () => {
				container.appendChild(document.createElement('div'))
				append(container, document.createElement('span'))
				expect(container.childNodes.length).toBe(2)
			})

			it('should handle multiple nodes', () => {
				append(container, document.createElement('div'), document.createElement('span'))
				expect(container.childNodes.length).toBe(2)
			})

			it('should handle text nodes', () => {
				append(container, document.createTextNode('hello'))
				expect(container.childNodes.length).toBe(1)
				expect(container.textContent).toBe('hello')
			})

			it('should use DocumentFragment for efficiency', () => {
				const nodes = Array.from({ length: 100 }, () => document.createElement('div'))
				append(container, ...nodes)
				expect(container.childNodes.length).toBe(100)
			})
		})

		describe('prepend', () => {
			it('should prepend nodes before existing', () => {
				container.appendChild(document.createElement('div'))
				prepend(container, document.createElement('span'))
				expect(container.firstElementChild?.tagName).toBe('SPAN')
			})

			it('should handle multiple nodes in order', () => {
				container.appendChild(document.createElement('div'))
				const a = document.createElement('a')
				const b = document.createElement('b')
				prepend(container, a, b)
				expect(container.children[0]).toBe(a)
				expect(container.children[1]).toBe(b)
				const thirdChild = container.children[2]
				expect(thirdChild?.tagName).toBe('DIV')
			})
		})

		describe('replace', () => {
			it('should replace all children', () => {
				container.appendChild(document.createElement('div'))
				const newChild = document.createElement('span')
				replace(container, newChild)
				expect(container.childNodes.length).toBe(1)
				expect(container.firstChild).toBe(newChild)
			})

			it('should handle multiple nodes', () => {
				replace(
					container,
					document.createElement('div'),
					document.createElement('span'),
				)
				expect(container.childNodes.length).toBe(2)
			})

			it('should handle text nodes', () => {
				replace(container, document.createTextNode('hello'))
				expect(container.childNodes.length).toBe(1)
				expect(container.textContent).toBe('hello')
			})

			it('should clear children when no nodes provided', () => {
				container.appendChild(document.createElement('div'))
				replace(container)
				expect(container.childNodes.length).toBe(0)
			})
		})

		describe('remove', () => {
			it('should remove nodes from their parents', () => {
				const el1 = document.createElement('div')
				const el2 = document.createElement('span')
				container.appendChild(el1)
				container.appendChild(el2)

				remove(el1, el2)
				expect(container.childNodes.length).toBe(0)
			})

			it('should handle nodes without parents', () => {
				const orphan = document.createElement('div')
				expect(() => remove(orphan)).not.toThrow()
				expect(orphan.parentNode).toBeNull()
			})
		})

		describe('insertBefore', () => {
			it('should insert nodes before reference', () => {
				const ref = document.createElement('div')
				container.appendChild(ref)
				const newEl = document.createElement('span')
				insertBefore(container, ref, newEl)
				expect(container.firstElementChild).toBe(newEl)
			})

			it('should handle null reference (append)', () => {
				container.appendChild(document.createElement('div'))
				const newEl = document.createElement('span')
				insertBefore(container, null, newEl)
				expect(container.lastElementChild).toBe(newEl)
			})
		})

		describe('insertAfter', () => {
			it('should insert nodes after reference', () => {
				const ref = document.createElement('div')
				const existing = document.createElement('span')
				container.appendChild(ref)
				container.appendChild(existing)
				const newEl = document.createElement('a')
				insertAfter(container, ref, newEl)
				expect(container.children[1]).toBe(newEl)
			})
		})

		describe('move', () => {
			it('should move element to new index', () => {
				const el1 = document.createElement('div')
				const el2 = document.createElement('span')
				const el3 = document.createElement('a')
				container.appendChild(el1)
				container.appendChild(el2)
				container.appendChild(el3)

				move(el3, 0)
				expect(container.firstElementChild).toBe(el3)
			})

			it('should return true on successful move', () => {
				const el1 = document.createElement('div')
				const el2 = document.createElement('span')
				container.appendChild(el1)
				container.appendChild(el2)

				expect(move(el1, 1)).toBe(true)
			})

			it('should return false when already at index', () => {
				const el = document.createElement('div')
				container.appendChild(el)

				expect(move(el, 0)).toBe(false)
			})
		})

		describe('swap', () => {
			it('should swap two sibling elements', () => {
				const el1 = document.createElement('div')
				el1.id = 'first'
				const el2 = document.createElement('span')
				el2.id = 'second'
				container.appendChild(el1)
				container.appendChild(el2)

				swap(el1, el2)

				expect(container.firstElementChild).toBe(el2)
				expect(container.lastElementChild).toBe(el1)
			})

			it('should return true on successful swap', () => {
				const el1 = document.createElement('div')
				const el2 = document.createElement('span')
				container.appendChild(el1)
				container.appendChild(el2)

				expect(swap(el1, el2)).toBe(true)
			})

			it('should return false when swapping same element', () => {
				const el = document.createElement('div')
				container.appendChild(el)

				expect(swap(el, el)).toBe(false)
			})

			it('should return false when elements have different parents', () => {
				const parent1 = document.createElement('div')
				const parent2 = document.createElement('div')
				const el1 = document.createElement('span')
				const el2 = document.createElement('span')
				parent1.appendChild(el1)
				parent2.appendChild(el2)

				expect(swap(el1, el2)).toBe(false)
			})
		})

		describe('clone', () => {
			it('should deep clone by default', () => {
				container.innerHTML = '<div><span>text</span></div>'
				const original = container.firstElementChild
				if (original === null) throw new Error('expected a first element child')
				const cloned = clone(original)

				expect(cloned).not.toBe(original)
				expect(cloned.innerHTML).toBe(original.innerHTML)
			})

			it('should shallow clone when specified', () => {
				container.innerHTML = '<div><span>text</span></div>'
				const original = container.firstElementChild
				if (original === null) throw new Error('expected a first element child')
				const cloned = clone(original, false)

				expect(cloned.children.length).toBe(0)
			})
		})
	})

	// ========================================================================
	// KEYED ELEMENTS
	// ========================================================================

	describe('keyed elements', () => {
		beforeEach(() => {
			container.innerHTML = ''
		})

		describe('findByKey', () => {
			it('should find element by key in direct children', () => {
				const child = document.createElement('div')
				child.dataset.key = 'target'
				container.appendChild(child)

				const result = findByKey(container, 'target')
				expect(result).toBe(child)
			})

			it('should find element by key in descendants', () => {
				const wrapper = document.createElement('div')
				const child = document.createElement('span')
				child.dataset.key = 'nested'
				wrapper.appendChild(child)
				container.appendChild(wrapper)

				const result = findByKey(container, 'nested')
				expect(result).toBe(child)
			})

			it('should return null if not found', () => {
				const child = document.createElement('div')
				child.dataset.key = 'other'
				container.appendChild(child)

				const result = findByKey(container, 'notfound')
				expect(result).toBeNull()
			})

			it('should return null for empty container', () => {
				const result = findByKey(container, 'any')
				expect(result).toBeNull()
			})

			it('should find first matching key', () => {
				const child1 = document.createElement('div')
				child1.dataset.key = 'duplicate'
				const child2 = document.createElement('div')
				child2.dataset.key = 'duplicate'
				container.appendChild(child1)
				container.appendChild(child2)

				const result = findByKey(container, 'duplicate')
				expect(result).toBe(child1)
			})
		})

		describe('getAllKeyed', () => {
			it('should return all keyed elements', () => {
				const child1 = document.createElement('div')
				child1.dataset.key = 'a'
				const child2 = document.createElement('span')
				child2.dataset.key = 'b'
				container.appendChild(child1)
				container.appendChild(child2)

				const result = getAllKeyed(container)
				expect(result).toHaveLength(2)
			})

			it('should find keyed elements in nested structure', () => {
				const wrapper = document.createElement('div')
				const nested = document.createElement('span')
				nested.dataset.key = 'nested'
				wrapper.appendChild(nested)
				container.appendChild(wrapper)

				const result = getAllKeyed(container)
				expect(result).toHaveLength(1)
				expect(result[0]).toBe(nested)
			})

			it('should return empty array for container without keyed elements', () => {
				container.appendChild(document.createElement('div'))
				const result = getAllKeyed(container)
				expect(result).toHaveLength(0)
			})

			it('should return empty array for empty container', () => {
				const result = getAllKeyed(container)
				expect(result).toHaveLength(0)
			})
		})
	})
})
