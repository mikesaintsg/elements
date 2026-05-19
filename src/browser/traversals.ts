// ============================================================================
//  DOM traversal utilities — native-API-backed, type-safe, allocation-aware.
//
//  Simple lookups (`findDescendantByClass`, `findAncestorByTag`, …) delegate
//  to native `querySelector` / `closest` / `getElementsBy*` for C++-level
//  speed. Predicate-based traversals (`findDescendant`, `findAncestor`, …)
//  use stack/queue iteration so arbitrary matching logic stays O(depth)
//  without recursion limits or interim array allocations.
//
//  Every symbol here is a pure DOM operation: no Vue, no framework state.
// ============================================================================

import type { ElementPredicate } from './types.js'
import { isTagType } from './helpers.js'

// ============================================================================
// CHILD UTILITIES (O(1) operations)
// ============================================================================

/**
 * Get the count of child elements
 *
 * Performance:  O(1) - uses native childElementCount
 */
export function getChildCount(element: Element): number {
	return element.childElementCount
}

/**
 * Check if element has child elements
 *
 * Performance:  O(1)
 */
export function hasChildren(element: Element): boolean {
	return element.childElementCount > 0
}

/**
 * Check if element has no child elements
 *
 * Performance: O(1)
 */
export function isEmpty(element: Element): boolean {
	return element.childElementCount === 0
}

/**
 * Get first child element
 *
 * Performance:  O(1)
 */
export function getFirstChild(element: Element): Element | null {
	return element.firstElementChild
}

/**
 * Get last child element
 *
 * Performance: O(1)
 */
export function getLastChild(element: Element): Element | null {
	return element.lastElementChild
}

/**
 * Get child at specific index
 *
 * Performance:  O(1) for HTMLCollection access
 */
export function getChildAt(element: Element, index: number): Element | null {
	if (index < 0) return null
	return element.children[index] ?? null
}

/**
 * Get children as a static array
 *
 * Creates a snapshot - safe for iteration during DOM modification
 */
export function getChildren(element: Element): readonly Element[] {
	return Array.from(element.children)
}

// ============================================================================
// SIBLING UTILITIES (O(1) operations)
// ============================================================================

/**
 * Get next sibling element
 *
 * Performance: O(1)
 */
export function getNextSibling(element: Element): Element | null {
	return element.nextElementSibling
}

/**
 * Get previous sibling element
 *
 * Performance: O(1)
 */
export function getPreviousSibling(element: Element): Element | null {
	return element.previousElementSibling
}

/**
 * Get sibling index (position among siblings)
 *
 * Performance:  O(n) where n is position
 */
export function getSiblingIndex(element: Element): number {
	let index = 0
	let current = element.previousElementSibling
	while (current !== null) {
		index++
		current = current.previousElementSibling
	}
	return index
}

/**
 * Get all siblings (excluding the element itself)
 */
export function getSiblings(element: Element): readonly Element[] {
	const parent = element.parentElement
	if (parent === null) return []
	const siblings: Element[] = []
	const children = parent.children
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (child !== undefined && child !== element) {
			siblings.push(child)
		}
	}
	return siblings
}

/**
 * Get all next siblings
 */
export function getNextSiblings(element: Element): readonly Element[] {
	const siblings: Element[] = []
	let current = element.nextElementSibling
	while (current !== null) {
		siblings.push(current)
		current = current.nextElementSibling
	}
	return siblings
}

/**
 * Get all previous siblings (in document order, oldest first)
 */
export function getPreviousSiblings(element: Element): readonly Element[] {
	const siblings: Element[] = []
	let current = element.previousElementSibling
	while (current !== null) {
		siblings.unshift(current)
		current = current.previousElementSibling
	}
	return siblings
}

// ============================================================================
// PARENT UTILITIES (O(1) operations)
// ============================================================================

/**
 * Get parent element
 *
 * Performance:  O(1)
 */
export function getParent(element: Element): Element | null {
	return element.parentElement
}

// ============================================================================
// ANCESTOR TRAVERSAL
// ============================================================================

/**
 * Find the first ancestor matching a predicate
 *
 * Does NOT include the element itself.  Use findClosest for that.
 *
 * Performance:  O(d) where d is depth of element in tree
 *
 * @example
 * ```ts
 * const form = findAncestor(input, el => matchesTag(el, 'form'))
 * ```
 */
export function findAncestor(element: Element, predicate: ElementPredicate): Element | null {
	let current = element.parentElement
	while (current !== null) {
		if (predicate(current)) {
			return current
		}
		current = current.parentElement
	}
	return null
}

/**
 * Find the first ancestor matching a tag name
 *
 * Uses native `closest()` for optimal performance.
 *
 * @example
 * ```ts
 * const table = findAncestorByTag(cell, 'table')
 * ```
 */
export function findAncestorByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	// Use closest() for optimal performance, but skip the element itself
	const parent = element.parentElement
	if (parent === null) return null
	return parent.closest(tagName)
}

/**
 * Find the first ancestor with a specific class
 *
 * Uses native `closest()` for optimal performance.
 *
 * @example
 * ```ts
 * const container = findAncestorByClass(button, 'modal')
 * ```
 */
export function findAncestorByClass(element: Element, className: string): Element | null {
	// Use closest() for optimal performance, but skip the element itself
	const parent = element.parentElement
	if (parent === null) return null
	return parent.closest(`.${className}`)
}

/**
 * Find the first ancestor with a specific ID
 *
 * Uses native `closest()` for optimal performance.
 */
export function findAncestorById(element: Element, id: string): Element | null {
	// Use closest() for optimal performance, but skip the element itself
	const parent = element.parentElement
	if (parent === null) return null
	return parent.closest(`#${id}`)
}

/**
 * Get all ancestors up to an optional boundary element
 *
 * @example
 * ```ts
 * const path = getAncestors(button, document.body)
 * ```
 */
export function getAncestors(element: Element, boundary?: Element | null): readonly Element[] {
	const ancestors: Element[] = []
	let current = element.parentElement
	while (current !== null && current !== boundary) {
		ancestors.push(current)
		current = current.parentElement
	}
	return ancestors
}

/**
 * Find the common ancestor of two elements
 */
export function findCommonAncestor(element1: Element, element2: Element): Element | null {
	const ancestors1 = new Set<Element>()
	let current: Element | null = element1
	while (current !== null) {
		ancestors1.add(current)
		current = current.parentElement
	}
	current = element2
	while (current !== null) {
		if (ancestors1.has(current)) {
			return current
		}
		current = current.parentElement
	}
	return null
}

// ============================================================================
// CLOSEST MATCHING (Includes self - like Element.closest but with predicates)
// ============================================================================

/**
 * Find the closest ancestor (or self) matching a predicate
 *
 * Like Element.closest() but uses a predicate function instead of CSS selector.
 * Includes the element itself in the search.
 *
 * @param element - Starting element
 * @param predicate - Function to test elements
 * @returns Matching element or null
 *
 * @example
 * ```ts
 * const form = findClosest(input, el => el.tagName === 'FORM')
 * ```
 */
export function findClosest(element: Element, predicate: ElementPredicate): Element | null {
	let current: Element | null = element
	while (current !== null) {
		if (predicate(current)) {
			return current
		}
		current = current.parentElement
	}
	return null
}

/**
 * Find the closest ancestor (or self) by tag name
 */
export function findClosestByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	let current: Element | null = element
	while (current !== null) {
		if (isTagType(current, tagName)) {
			return current
		}
		current = current.parentElement
	}
	return null
}

/**
 * Find the closest ancestor (or self) by class name
 */
export function findClosestByClass(element: Element, className: string): Element | null {
	let current: Element | null = element
	while (current !== null) {
		if (current.classList.contains(className)) {
			return current
		}
		current = current.parentElement
	}
	return null
}

/**
 * Find the closest ancestor (or self) by ID
 */
export function findClosestById(element: Element, id: string): Element | null {
	let current: Element | null = element
	while (current !== null) {
		if (current.id === id) {
			return current
		}
		current = current.parentElement
	}
	return null
}

// ============================================================================
// CHILD TRAVERSAL
// ============================================================================

/**
 * Find the first child element matching a predicate
 *
 * Performance: O(n) where n is number of children
 */
export function findChild(element: Element, predicate: ElementPredicate): Element | null {
	const children = element.children
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (child !== undefined && predicate(child)) {
			return child
		}
	}
	return null
}

/**
 * Find the first child by tag name
 *
 * Uses native `querySelector()` with `:scope` for optimal performance.
 */
export function findChildByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	// Use :scope > to match only direct children
	return element.querySelector(`:scope > ${tagName}`)
}

/**
 * Find the first child by class name
 *
 * Uses native `querySelector()` with `:scope` for optimal performance.
 */
export function findChildByClass(element: Element, className: string): Element | null {
	// Use :scope > to match only direct children
	return element.querySelector(`:scope > .${className}`)
}

/**
 * Find the first child by ID
 *
 * Uses native `querySelector()` with `:scope` for optimal performance.
 */
export function findChildById(element: Element, id: string): Element | null {
	// Use :scope > to match only direct children
	return element.querySelector(`:scope > #${id}`)
}

/**
 * Find all children matching a predicate
 */
export function findChildren(element: Element, predicate: ElementPredicate): readonly Element[] {
	const matches: Element[] = []
	const children = element.children
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (child !== undefined && predicate(child)) {
			matches.push(child)
		}
	}
	return matches
}

/**
 * Find all children by tag name
 *
 * Uses native `querySelectorAll()` with `:scope` for optimal performance.
 */
export function findChildrenByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): readonly HTMLElementTagNameMap[K][] {
	// Use :scope > to match only direct children
	return Array.from(element.querySelectorAll(`:scope > ${tagName}`))
}

/**
 * Find all children by class name
 *
 * Uses native `querySelectorAll()` with `:scope` for optimal performance.
 */
export function findChildrenByClass(element: Element, className: string): readonly Element[] {
	// Use :scope > to match only direct children
	return Array.from(element.querySelectorAll(`:scope > .${className}`))
}

// ============================================================================
// SIBLING TRAVERSAL
// ============================================================================

/**
 * Find the next sibling matching a predicate
 */
export function findNextSibling(element: Element, predicate: ElementPredicate): Element | null {
	let current = element.nextElementSibling
	while (current !== null) {
		if (predicate(current)) {
			return current
		}
		current = current.nextElementSibling
	}
	return null
}

/**
 * Find the next sibling by tag name
 */
export function findNextSiblingByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	let current = element.nextElementSibling
	while (current !== null) {
		if (isTagType(current, tagName)) {
			return current
		}
		current = current.nextElementSibling
	}
	return null
}

/**
 * Find the next sibling by class name
 */
export function findNextSiblingByClass(element: Element, className: string): Element | null {
	let current = element.nextElementSibling
	while (current !== null) {
		if (current.classList.contains(className)) {
			return current
		}
		current = current.nextElementSibling
	}
	return null
}

/**
 * Find the previous sibling matching a predicate
 */
export function findPreviousSibling(element: Element, predicate: ElementPredicate): Element | null {
	let current = element.previousElementSibling
	while (current !== null) {
		if (predicate(current)) {
			return current
		}
		current = current.previousElementSibling
	}
	return null
}

/**
 * Find the previous sibling by tag name
 */
export function findPreviousSiblingByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	let current = element.previousElementSibling
	while (current !== null) {
		if (isTagType(current, tagName)) {
			return current
		}
		current = current.previousElementSibling
	}
	return null
}

/**
 * Find the previous sibling by class name
 */
export function findPreviousSiblingByClass(element: Element, className: string): Element | null {
	let current = element.previousElementSibling
	while (current !== null) {
		if (current.classList.contains(className)) {
			return current
		}
		current = current.previousElementSibling
	}
	return null
}

// ============================================================================
// DESCENDANT TRAVERSAL
// ============================================================================

/**
 * Find the first descendant matching a predicate (depth-first)
 *
 * Uses stack-based iteration to avoid recursion limits
 *
 * @example
 * ```ts
 * const activeInput = findDescendant(form, el =>
 *   matchesTag(el, 'input') && hasClass(el, 'active')
 * )
 * ```
 */
export function findDescendant(element: Element, predicate: ElementPredicate): Element | null {
	const stack: Element[] = []
	// Push children in reverse order for correct traversal
	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		if (predicate(current)) {
			return current
		}
		// Push children in reverse order
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}
	return null
}

/**
 * Find the first descendant by tag name
 */
export function findDescendantByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	// Use querySelector for optimal performance
	return element.querySelector(tagName)
}

/**
 * Find the first descendant by class name
 *
 * Uses native `querySelector()` for optimal performance.
 */
export function findDescendantByClass(element: Element, className: string): Element | null {
	// Use querySelector for optimal performance
	return element.querySelector(`.${className}`)
}

/**
 * Find the first descendant by ID
 *
 * Uses native `querySelector()` for optimal performance.
 */
export function findDescendantById(element: Element, id: string): Element | null {
	// Use querySelector for optimal performance
	return element.querySelector(`#${id}`)
}

/**
 * Find all descendants matching a predicate (depth-first)
 */
export function findAllDescendants(
	element: Element,
	predicate: ElementPredicate,
): readonly Element[] {
	const matches: Element[] = []
	const stack: Element[] = []
	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		if (predicate(current)) {
			matches.push(current)
		}
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}
	return matches
}

/**
 * Find descendants matching a predicate with a limit
 *
 * Stops searching after finding the specified number of matches.
 * More efficient than findAllDescendants when you only need a few results.
 */
export function findDescendantsWithLimit(
	element: Element,
	predicate: ElementPredicate,
	limit: number,
): readonly Element[] {
	if (limit <= 0) return []

	const matches: Element[] = []
	const stack: Element[] = []

	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}

	while (stack.length > 0 && matches.length < limit) {
		const current = stack.pop()
		if (current === undefined) break
		if (predicate(current)) {
			matches.push(current)
			if (matches.length >= limit) break
		}
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}

	return matches
}

/**
 * Walk all descendants with a callback (depth-first)
 *
 * Return true from callback to stop walking early
 *
 * @example
 * ```ts
 * walkDescendants(container, el => {
 *   if (hasClass(el, 'stop')) return true // stop walking
 *   console.log(el.tagName)
 * })
 * ```
 */
export function walkDescendants(
	element: Element,
	callback: (element: Element) => boolean | void,
): void {
	const stack: Element[] = []
	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		if (callback(current) === true) {
			return
		}
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}
}

/**
 * Generator for walking descendants (memory-efficient for large trees)
 *
 * @example
 * ```ts
 * for (const element of walkDescendantsGenerator(container)) {
 *   if (hasClass(element, 'target')) {
 *     processElement(element)
 *     break // early exit supported
 *   }
 * }
 * ```
 */
export function* walkDescendantsGenerator(element: Element): Generator<Element, void, unknown> {
	const stack: Element[] = []
	let child = element.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}
	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		yield current
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}
}

/**
 * Walk descendants breadth-first
 */
export function walkDescendantsBreadthFirst(
	element: Element,
	callback: (element: Element) => boolean | void,
): void {
	const queue: Element[] = []
	let child = element.firstElementChild
	while (child !== null) {
		queue.push(child)
		child = child.nextElementSibling
	}
	let index = 0
	while (index < queue.length) {
		const current = queue[index]
		index++
		if (current === undefined) continue
		if (callback(current) === true) {
			return
		}
		child = current.firstElementChild
		while (child !== null) {
			queue.push(child)
			child = child.nextElementSibling
		}
	}
}

// ============================================================================
// ELEMENT COLLECTIONS (Use Native APIs)
// ============================================================================

/**
 * Get descendants by tag name using native API
 *
 * This is faster than manual traversal for tag-based searches
 * because it uses the browser's optimized internal methods
 */
export function getDescendantsByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLCollectionOf<HTMLElementTagNameMap[K]> {
	return element.getElementsByTagName(tagName)
}

/**
 * Get descendants by class name using native API
 */
export function getDescendantsByClass(
	element: Element,
	className: string,
): HTMLCollectionOf<Element> {
	return element.getElementsByClassName(className)
}

/**
 * Get first descendant by tag using native API
 */
export function getFirstDescendantByTag<K extends keyof HTMLElementTagNameMap>(
	element: Element,
	tagName: K,
): HTMLElementTagNameMap[K] | null {
	const elements = element.getElementsByTagName(tagName)
	return elements.length > 0 ? (elements[0] ?? null) : null
}

/**
 * Get first descendant by class using native API
 */
export function getFirstDescendantByClass(element: Element, className: string): Element | null {
	const elements = element.getElementsByClassName(className)
	return elements.length > 0 ? (elements[0] ?? null) : null
}

// ============================================================================
// DOCUMENT-LEVEL ACCESS
// ============================================================================

/**
 * Get element by ID (fastest possible lookup - O(1) hash map)
 */
export function getElementById(id: string, doc: Document = document): HTMLElement | null {
	return doc.getElementById(id)
}

/**
 * Get elements by tag name from document
 */
export function getElementsByTag<K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	doc: Document = document,
): HTMLCollectionOf<HTMLElementTagNameMap[K]> {
	return doc.getElementsByTagName(tagName)
}

/**
 * Get elements by class name from document
 */
export function getElementsByClass(
	className: string,
	doc: Document = document,
): HTMLCollectionOf<Element> {
	return doc.getElementsByClassName(className)
}

/**
 * Get elements by name attribute
 */
export function getElementsByName(name: string, doc: Document = document): NodeListOf<HTMLElement> {
	return doc.getElementsByName(name)
}

// ============================================================================
// ELEMENT RELATIONSHIPS
// ============================================================================

/**
 * Check if element is a descendant of another
 */
export function isDescendantOf(element: Element, ancestor: Element): boolean {
	let current = element.parentElement
	while (current !== null) {
		if (current === ancestor) {
			return true
		}
		current = current.parentElement
	}
	return false
}

/**
 * Check if element is an ancestor of another
 */
export function isAncestorOf(element: Element, descendant: Element): boolean {
	return isDescendantOf(descendant, element)
}

/**
 * Check if two elements are siblings (share the same parent)
 */
export function isSiblingOf(element: Element, other: Element): boolean {
	return element.parentElement !== null && element.parentElement === other.parentElement
}

/**
 * Check if element comes before another in document order
 */
export function isBefore(element1: Element, element2: Element): boolean {
	return (element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

/**
 * Check if element comes after another in document order
 */
export function isAfter(element1: Element, element2: Element): boolean {
	return (element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
}

/**
 * Check if element contains another (is ancestor of)
 */
export function contains(element: Element, other: Element): boolean {
	return element.contains(other)
}

/**
 * Get the distance between two elements in the tree
 * Returns null if elements don't share a common ancestor
 */
export function getTreeDistance(element1: Element, element2: Element): number | null {
	const commonAncestor = findCommonAncestor(element1, element2)
	if (commonAncestor === null) return null

	let distance1 = 0
	let current: Element | null = element1
	while (current !== null && current !== commonAncestor) {
		distance1++
		current = current.parentElement
	}

	let distance2 = 0
	current = element2
	while (current !== null && current !== commonAncestor) {
		distance2++
		current = current.parentElement
	}

	return distance1 + distance2
}

/**
 * Get the path from element to an ancestor (or document root)
 */
export function getPathToAncestor(element: Element, ancestor?: Element | null): readonly Element[] {
	const path: Element[] = []
	let current: Element | null = element
	while (current !== null && current !== ancestor) {
		path.push(current)
		current = current.parentElement
	}
	return path
}

// ============================================================================
// VISIBILITY UTILITIES
// ============================================================================

/**
 * Check if element is in the viewport
 */
export function isInViewport(element: Element): boolean {
	const rect = element.getBoundingClientRect()
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	)
}

/**
 * Check if element is partially visible in viewport
 */
export function isPartiallyInViewport(element: Element): boolean {
	const rect = element.getBoundingClientRect()
	const windowHeight = window.innerHeight || document.documentElement.clientHeight
	const windowWidth = window.innerWidth || document.documentElement.clientWidth
	return rect.bottom > 0 && rect.right > 0 && rect.top < windowHeight && rect.left < windowWidth
}

/**
 * Check if an element is rendered (not display:none)
 *
 * Uses offsetParent which is null for hidden elements,
 * except for body and fixed/sticky positioned elements
 */
export function isRendered(element: HTMLElement): boolean {
	return element.offsetParent !== null || element.offsetWidth > 0 || element.offsetHeight > 0
}

/**
 * Get percentage of element visible in viewport
 */
export function getViewportVisibility(element: Element): number {
	const rect = element.getBoundingClientRect()
	const windowHeight = window.innerHeight || document.documentElement.clientHeight
	const windowWidth = window.innerWidth || document.documentElement.clientWidth

	if (rect.bottom < 0 || rect.top > windowHeight || rect.right < 0 || rect.left > windowWidth) {
		return 0
	}

	const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)
	const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0)

	const visibleArea = visibleHeight * visibleWidth
	const totalArea = rect.height * rect.width

	if (totalArea === 0) return 0
	return (visibleArea / totalArea) * 100
}

// ============================================================================
// COLLECTION UTILITIES
// ============================================================================

/**
 * Convert HTMLCollection or NodeList to array
 *
 * Useful for safe iteration when you need to modify the DOM during iteration,
 * since live collections update during iteration
 */
export function toArray<T extends Element>(
	collection: HTMLCollectionOf<T> | NodeListOf<T>,
): readonly T[] {
	return Array.from(collection)
}

/**
 * Find in HTMLCollection
 */
export function findInCollection<T extends Element>(
	collection: HTMLCollectionOf<T>,
	predicate: (element: T) => boolean,
): T | null {
	for (let i = 0; i < collection.length; i++) {
		const item = collection[i]
		if (item !== undefined && predicate(item)) {
			return item
		}
	}
	return null
}

/**
 * Filter HTMLCollection
 */
export function filterCollection<T extends Element>(
	collection: HTMLCollectionOf<T>,
	predicate: (element: T) => boolean,
): readonly T[] {
	const matches: T[] = []
	for (let i = 0; i < collection.length; i++) {
		const item = collection[i]
		if (item !== undefined && predicate(item)) {
			matches.push(item)
		}
	}
	return matches
}

// ============================================================================
// BATCH DOM OPERATIONS (Minimize Reflows)
// ============================================================================

/**
 * Append nodes to a parent efficiently using DocumentFragment
 *
 * Uses DocumentFragment to batch DOM insertions, triggering only one reflow
 * instead of one per element. This is significantly faster for large batches.
 *
 * Performance: O(n) with single reflow vs O(n) reflows for individual appends
 *
 * @example
 * ```ts
 * append(container, node1, node2, node3)
 * ```
 */
export function append(parent: Element, ...nodes: readonly Node[]): void {
	if (nodes.length === 0) return

	if (nodes.length === 1) {
		const node = nodes[0]
		if (node !== undefined) parent.appendChild(node)
		return
	}

	const fragment = document.createDocumentFragment()
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (node !== undefined) fragment.appendChild(node)
	}
	parent.appendChild(fragment)
}

/**
 * Prepend nodes to a parent efficiently using DocumentFragment
 *
 * @example
 * ```ts
 * prepend(container, node1, node2)
 * ```
 */
export function prepend(parent: Element, ...nodes: readonly Node[]): void {
	if (nodes.length === 0) return

	const firstChild = parent.firstChild

	if (nodes.length === 1) {
		const node = nodes[0]
		if (node !== undefined) parent.insertBefore(node, firstChild)
		return
	}

	const fragment = document.createDocumentFragment()
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (node !== undefined) fragment.appendChild(node)
	}
	parent.insertBefore(fragment, firstChild)
}

/**
 * Insert nodes before a reference node efficiently
 *
 * @example
 * ```ts
 * insertBefore(container, refNode, node1, node2)
 * ```
 */
export function insertBefore(
	parent: Element,
	referenceNode: Node | null,
	...nodes: readonly Node[]
): void {
	if (nodes.length === 0) return

	if (nodes.length === 1) {
		const node = nodes[0]
		if (node !== undefined) parent.insertBefore(node, referenceNode)
		return
	}

	const fragment = document.createDocumentFragment()
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (node !== undefined) fragment.appendChild(node)
	}
	parent.insertBefore(fragment, referenceNode)
}

/**
 * Insert nodes after a reference node efficiently
 *
 * @example
 * ```ts
 * insertAfter(container, refNode, node1, node2)
 * ```
 */
export function insertAfter(parent: Element, referenceNode: Node, ...nodes: readonly Node[]): void {
	if (nodes.length === 0) return

	const nextSibling = referenceNode.nextSibling

	if (nodes.length === 1) {
		const node = nodes[0]
		if (node !== undefined) parent.insertBefore(node, nextSibling)
		return
	}

	const fragment = document.createDocumentFragment()
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (node !== undefined) fragment.appendChild(node)
	}
	parent.insertBefore(fragment, nextSibling)
}

/**
 * Replace all children of an element with new nodes
 *
 * Clears existing children and appends new nodes efficiently.
 *
 * @example
 * ```ts
 * replace(container, newNode1, newNode2)
 * ```
 */
export function replace(parent: Element, ...nodes: readonly Node[]): void {
	// Clear existing children
	clear(parent)
	// Append new children
	append(parent, ...nodes)
}

/**
 * Clear all children from an element
 *
 * @example
 * ```ts
 * clear(container)
 * ```
 */
export function clear(element: Element): void {
	while (element.firstChild !== null) {
		element.removeChild(element.firstChild)
	}
}

/**
 * Remove nodes from their parents
 *
 * @example
 * ```ts
 * remove(node1, node2, node3)
 * ```
 */
export function remove(...nodes: readonly Node[]): void {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (node === undefined) continue
		const parent = node.parentNode
		if (parent !== null) {
			parent.removeChild(node)
		}
	}
}

/**
 * Move an element to a new position within the same parent
 *
 * @returns true if element was moved, false if already in position
 *
 * @example
 * ```ts
 * move(element, 0) // Move to first position
 * ```
 */
export function move(element: Element, newIndex: number): boolean {
	const parent = element.parentElement
	if (parent === null) return false

	const children = parent.children
	const currentIndex = getSiblingIndex(element)

	if (currentIndex === newIndex) return false

	if (newIndex >= children.length) {
		parent.appendChild(element)
	} else if (newIndex <= 0) {
		const firstChild = children[0]
		if (firstChild !== undefined) parent.insertBefore(element, firstChild)
	} else {
		const refIndex = newIndex > currentIndex ? newIndex + 1 : newIndex
		const referenceNode = children[refIndex]
		if (referenceNode !== undefined) {
			parent.insertBefore(element, referenceNode)
		} else {
			parent.appendChild(element)
		}
	}

	return true
}

/**
 * Swap positions of two sibling elements
 *
 * @returns true if swap was performed
 *
 * @example
 * ```ts
 * swap(element1, element2)
 * ```
 */
export function swap(element1: Element, element2: Element): boolean {
	const parent1 = element1.parentElement
	const parent2 = element2.parentElement

	if (parent1 === null || parent2 === null) return false
	if (parent1 !== parent2) return false
	if (element1 === element2) return false

	const next1 = element1.nextElementSibling
	const next2 = element2.nextElementSibling

	if (next1 === element2) {
		parent1.insertBefore(element2, element1)
	} else if (next2 === element1) {
		parent1.insertBefore(element1, element2)
	} else {
		parent1.insertBefore(element2, next1)
		parent1.insertBefore(element1, next2)
	}

	return true
}

/**
 * Clone an element
 *
 * @param element - Element to clone
 * @param deep - Whether to deep clone (default: true)
 * @returns Cloned element
 *
 * @example
 * ```ts
 * const copy = clone(element)
 * ```
 */
export function clone(element: Element, deep = true): Element {
	const copy = element.cloneNode(deep)
	if (!(copy instanceof Element)) {
		throw new TypeError('clone: expected an Element clone')
	}
	return copy
}

// ============================================================================
// EVENT DELEGATION
// ============================================================================

/**
 * Setup event delegation on a container element
 *
 * Efficiently handles events on dynamically added elements by listening
 * at a parent level and matching targets.
 *
 * @overload With tag name selector
 * @param container - Parent element to attach listener to
 * @param eventType - DOM event type
 * @param selector - Tag name to match (e.g., 'button', 'li')
 * @param handler - Handler receiving matched element and event
 * @returns Cleanup function to remove listener
 *
 * @overload With predicate function
 * @param container - Parent element to attach listener to
 * @param eventType - DOM event type
 * @param predicate - Function to test if element matches
 * @param handler - Handler receiving matched element and event
 * @returns Cleanup function to remove listener
 *
 * @example
 * ```ts
 * // Delegate by tag name
 * const cleanup = delegate(container, 'click', 'button', (button, event) => {
 *   console.log('Button clicked:', button)
 * })
 *
 * // Delegate by predicate
 * const cleanup = delegate(container, 'click', el => el.classList.contains('item'), (el, event) => {
 *   console.log('Item clicked:', el)
 * })
 *
 * // Cleanup when done
 * cleanup()
 * ```
 */
export function delegate<K extends keyof HTMLElementEventMap>(
	container: Element,
	eventType: K,
	selector: string,
	handler: (target: Element, event: HTMLElementEventMap[K]) => void,
): () => void
export function delegate<K extends keyof HTMLElementEventMap>(
	container: Element,
	eventType: K,
	predicate: ElementPredicate,
	handler: (target: Element, event: HTMLElementEventMap[K]) => void,
): () => void
export function delegate<K extends keyof HTMLElementEventMap>(
	container: Element,
	eventType: K,
	selectorOrPredicate: string | ElementPredicate,
	handler: (target: Element, event: Event) => void,
): () => void {
	const predicate: ElementPredicate =
		typeof selectorOrPredicate === 'string'
			? (el: Element) => el.tagName === selectorOrPredicate.toUpperCase()
			: selectorOrPredicate

	const listener = (event: Event): void => {
		const start = event.target
		let target: Element | null = start instanceof Element ? start : null
		while (target !== null && target !== container) {
			if (predicate(target)) {
				handler(target, event)
				return
			}
			target = target.parentElement
		}
	}
	container.addEventListener(eventType, listener)
	return () => container.removeEventListener(eventType, listener)
}

// ============================================================================
// KEYED ELEMENT TRAVERSAL
// ============================================================================

/**
 * Find an element by its data-key attribute within a container
 *
 * Uses stack-based traversal for performance.
 *
 * @param container - The container element to search in
 * @param key - The key to find
 * @returns The element with matching data-key, or null
 *
 * @example
 * ```ts
 * const item = findByKey(listElement, '123')
 * if (item) {
 *   item.classList.add('selected')
 * }
 * ```
 */
export function findByKey(container: Element, key: string): HTMLElement | null {
	// Check direct children first for common case
	const children = container.children
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (child instanceof HTMLElement && child.dataset.key === key) {
			return child
		}
	}

	// Search descendants using stack-based traversal
	const stack: Element[] = []
	let child = container.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}

	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		if (current instanceof HTMLElement && current.dataset.key === key) {
			return current
		}
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}

	return null
}

/**
 * Get all keyed elements in a container
 *
 * Uses stack-based traversal for performance.
 *
 * @param container - The container element
 * @returns Array of elements that have data-key attributes
 *
 * @example
 * ```ts
 * const keyedItems = getAllKeyed(listElement)
 * keyedItems.forEach(item => console.log(item.dataset.key))
 * ```
 */
export function getAllKeyed(container: Element): readonly HTMLElement[] {
	const result: HTMLElement[] = []
	const stack: Element[] = []

	let child = container.lastElementChild
	while (child !== null) {
		stack.push(child)
		child = child.previousElementSibling
	}

	while (stack.length > 0) {
		const current = stack.pop()
		if (current === undefined) break
		if (current instanceof HTMLElement && current.dataset.key !== undefined) {
			result.push(current)
		}
		child = current.lastElementChild
		while (child !== null) {
			stack.push(child)
			child = child.previousElementSibling
		}
	}

	return result
}
