// ============================================================================
//  helpers.ts — exhaustive behavioral coverage.
//
//  `src/browser/helpers.ts` is the centralized framework-agnostic guard /
//  utility module consumed by every composable and factory. This suite
//  exercises every behavioral export through the public `@elements/browser`
//  barrel against the REAL Chromium DOM (the `src:browser` project runs
//  Chromium, not happy-dom): real elements, real `CustomEvent`s, real
//  `transitionend`, real `<table>` / `<form>` structures, real
//  `getBoundingClientRect`. No DOM mocking — the recorder pattern and the
//  shared `tests/setupBrowser.ts` primitives stand in for `vi.fn()`.
//
//  `sortCollator` is a module-level const, not a behavioral export — it is
//  exercised indirectly through `compareCellValues` (locale path) rather
//  than asserted directly, per the task's no-direct-test instruction.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	BODY_LOCKED_ATTR,
	TABLE_ARIA_ROWCOUNT,
	TABLE_ARIA_ROWINDEX,
	TABLE_EXPANSION_ATTR,
	Walker,
	alignmentOf,
	areaForPopoverPlacement,
	applyRowCount,
	applyRowIndex,
	assertElement,
	attachListeners,
	bindEventMap,
	buildFinding,
	citeOf,
	cleanTableSelection,
	collectSegmentTags,
	compareCellValues,
	constraintOf,
	countLeadingTag,
	createMatcher,
	cssEscape,
	describeElement,
	dispatch,
	emit,
	entry,
	extractProperty,
	extractRow,
	extractRowId,
	extractRows,
	extractTypes,
	fieldName,
	findAttributeRule,
	findDetailRow,
	findFlatAncestor,
	findFlatDescendant,
	findForbiddenDescendant,
	findMiscategorizedChild,
	findOffendingEnumAttribute,
	findOffendingEnumDomain,
	findOffendingIntegerBound,
	focusableItems,
	generateId,
	hasAttribute,
	hasAttributeRule,
	hasClass,
	hasClasses,
	hasFlatAncestor,
	hasFlatAncestorTag,
	hasId,
	hasLinkAncestorWithHref,
	hasOpenCategoryArm,
	indexOfRow,
	isDragDropDetail,
	isDragOverDetail,
	isDragStartDetail,
	isDragTapDetail,
	isContentCategory,
	isDropPosition,
	isElement,
	isEventHandler,
	isFormFieldElement,
	isHTMLElement,
	isHiddenNode,
	isMouseEvent,
	isPopoverOpen,
	isSetting,
	isSide,
	isStringArray,
	isTableCellTarget,
	isTableRangeTarget,
	isTagType,
	isTagged,
	isTextNode,
	isValidityElement,
	keyOfTableCell,
	leadingTagsOfCompound,
	listen,
	lockBodyScroll,
	makePlacement,
	markTableUnselectedRows,
	matchSegments,
	matchesChildCategory,
	matchesForbiddenToken,
	matchesTag,
	matchesTagCategory,
	normalizeIndex,
	readChildText,
	readFormData,
	readFormErrors,
	readFormFields,
	readFormNames,
	readHiddenState,
	readInlineStyle,
	readRoleTokens,
	readStyleValue,
	readTableCells,
	readTableColumns,
	readTableData,
	readTableFooter,
	readTableHeaders,
	readTableRows,
	requiresLeadingTag,
	resolveLeadingSingularTag,
	resolvePermittedTags,
	resolvePopoverSide,
	resolveReferencedId,
	resolveReferencedTarget,
	rove,
	runTransition,
	satisfiesChildModel,
	satisfiesCount,
	schemaConstrainsValues,
	selfsForPopoverPlacement,
	sideOf,
	splitTopLevel,
	tableBody,
	tableFooterRow,
	tableHeaderRow,
	tagOf,
	tagsInHead,
	toStringList,
	trailingTagsOfCombinatorChain,
	unlockBodyScroll,
	waitForFrame,
	writeTableCell,
	writeTableFooterRow,
	writeTableHeaderRow,
	writeTableRow,
} from '@elements/browser'
import { createRandom } from '@elements/core'
import { createRecorder, waitForDelay } from '../../setup.ts'
import { buildElement, createPointerEvent } from '../../setupBrowser.ts'

// ── Local fixtures ──────────────────────────────────────────────────────────
// `buildElement` only handles a single flat element; tables/forms need
// structured children, so build them here and append to the body so the
// global `setupBrowser` afterEach (which wipes `document.body`) collects them.

function makeTable(): HTMLTableElement {
	const table = document.createElement('table')
	document.body.appendChild(table)
	return table
}

function makeForm(): HTMLFormElement {
	const form = document.createElement('form')
	document.body.appendChild(form)
	return form
}

// ── 1. Identity / narrowing ─────────────────────────────────────────────────

describe('helpers — generateId', () => {
	it('returns a v4 UUID with the version/variant bits set', () => {
		const id = generateId()
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
	})

	it('produces a fresh value on every call', () => {
		const seen = new Set<string>()
		for (let i = 0; i < 64; i += 1) seen.add(generateId())
		expect(seen.size).toBe(64)
	})

	it('namespaces with the given prefix; empty prefix yields a leading hyphen', () => {
		expect(generateId('combo').startsWith('combo-')).toBe(true)
		expect(generateId('').startsWith('-')).toBe(true)
	})
})

describe('helpers — extractProperty', () => {
	it('reads an own property from an object', () => {
		expect(extractProperty({ a: 1 }, 'a')).toBe(1)
	})

	it('returns undefined for non-objects, null, and inherited keys', () => {
		expect(extractProperty(null, 'a')).toBeUndefined()
		expect(extractProperty(42, 'a')).toBeUndefined()
		expect(extractProperty('str', 'length')).toBeUndefined()
		expect(extractProperty({}, 'toString')).toBeUndefined()
	})

	it('rejects class instances and arrays (core isRecord canonical: plain records only)', () => {
		// Core `isRecord` requires prototype === Object.prototype | null, so a
		// class instance is NOT a plain record even though it owns the key.
		class Box {
			value = 1
		}
		expect(extractProperty(new Box(), 'value')).toBeUndefined()
		// Arrays are objects but rejected by isRecord — index/length reads return undefined.
		expect(extractProperty(['x'], '0')).toBeUndefined()
		expect(extractProperty([1, 2], 'length')).toBeUndefined()
		// Object.create(null) IS a plain record (null prototype) — still read.
		const bare = Object.create(null) as { k: number }
		bare.k = 7
		expect(extractProperty(bare, 'k')).toBe(7)
	})
})

describe('helpers — isStringArray', () => {
	it('accepts an all-string array including the empty array', () => {
		expect(isStringArray(['a', 'b'])).toBe(true)
		expect(isStringArray([])).toBe(true)
	})

	it('rejects mixed arrays and non-arrays', () => {
		expect(isStringArray(['a', 1])).toBe(false)
		expect(isStringArray('a')).toBe(false)
		expect(isStringArray(null)).toBe(false)
	})
})

describe('helpers — isSetting', () => {
	it('accepts the three ThemeSetting literals', () => {
		expect(isSetting('light')).toBe(true)
		expect(isSetting('dark')).toBe(true)
		expect(isSetting('system')).toBe(true)
	})

	it('rejects anything else', () => {
		expect(isSetting('auto')).toBe(false)
		expect(isSetting(undefined)).toBe(false)
	})
})

describe('helpers — isEventHandler', () => {
	it('accepts functions', () => {
		expect(isEventHandler(() => {})).toBe(true)
	})

	it('rejects non-functions', () => {
		expect(isEventHandler({})).toBe(false)
		expect(isEventHandler(undefined)).toBe(false)
	})
})

describe('helpers — isMouseEvent', () => {
	it('returns true for undefined and non-pointer events', () => {
		expect(isMouseEvent(undefined)).toBe(true)
		expect(isMouseEvent(new KeyboardEvent('keydown'))).toBe(true)
		expect(isMouseEvent(new MouseEvent('click'))).toBe(true)
	})

	it('returns true for a mouse PointerEvent, false for touch/pen', () => {
		expect(isMouseEvent(createPointerEvent('pointerdown', { pointerType: 'mouse' }))).toBe(true)
		expect(isMouseEvent(createPointerEvent('pointerdown', { pointerType: 'touch' }))).toBe(false)
		expect(isMouseEvent(createPointerEvent('pointerdown', { pointerType: 'pen' }))).toBe(false)
	})
})

describe('helpers — extractTypes', () => {
	it('returns the DataTransfer types as a plain array', () => {
		const data = new DataTransfer()
		data.setData('text/plain', 'hello')
		const event = new DragEvent('dragstart', { dataTransfer: data })
		expect(extractTypes(event)).toContain('text/plain')
	})

	it('returns an empty array when there is no dataTransfer', () => {
		const event = new DragEvent('dragstart')
		expect(extractTypes(event)).toEqual([])
	})
})

// ── DOM node-type guards ────────────────────────────────────────────────────

describe('helpers — node-type guards', () => {
	it('isElement narrows element nodes only', () => {
		expect(isElement(document.createElement('div'))).toBe(true)
		expect(isElement(document.createTextNode('x'))).toBe(false)
		expect(isElement(null)).toBe(false)
	})

	it('isHTMLElement narrows HTMLElements', () => {
		expect(isHTMLElement(document.createElement('span'))).toBe(true)
		expect(isHTMLElement(document.createTextNode('x'))).toBe(false)
		expect(isHTMLElement(null)).toBe(false)
	})

	it('isTextNode narrows text nodes', () => {
		expect(isTextNode(document.createTextNode('x'))).toBe(true)
		expect(isTextNode(document.createElement('p'))).toBe(false)
		expect(isTextNode(null)).toBe(false)
	})

	it('isTagType matches a specific tag, rejecting mismatches and null', () => {
		expect(isTagType(document.createElement('button'), 'button')).toBe(true)
		expect(isTagType(document.createElement('button'), 'div')).toBe(false)
		expect(isTagType(null, 'div')).toBe(false)
	})
})

describe('helpers — matching utilities', () => {
	it('matchesTag is case-insensitive', () => {
		const el = document.createElement('div')
		expect(matchesTag(el, 'div')).toBe(true)
		expect(matchesTag(el, 'DIV')).toBe(true)
		expect(matchesTag(el, 'span')).toBe(false)
	})

	it('hasClass / hasClasses (empty list is vacuously true)', () => {
		const el = document.createElement('div')
		el.className = 'a b'
		expect(hasClass(el, 'a')).toBe(true)
		expect(hasClass(el, 'z')).toBe(false)
		expect(hasClasses(el, ['a', 'b'])).toBe(true)
		expect(hasClasses(el, ['a', 'z'])).toBe(false)
		expect(hasClasses(el, [])).toBe(true)
	})

	it('hasId / hasAttribute (presence vs exact value)', () => {
		const el = document.createElement('div')
		el.id = 'x'
		el.setAttribute('data-k', 'v')
		expect(hasId(el, 'x')).toBe(true)
		expect(hasId(el, 'y')).toBe(false)
		expect(hasAttribute(el, 'data-k')).toBe(true)
		expect(hasAttribute(el, 'data-k', 'v')).toBe(true)
		expect(hasAttribute(el, 'data-k', 'no')).toBe(false)
		expect(hasAttribute(el, 'absent')).toBe(false)
	})

	it('createMatcher composes every criterion', () => {
		const el = document.createElement('div')
		el.id = 'x'
		el.className = 'a b'
		el.setAttribute('data-t', 'v')
		expect(createMatcher({ tag: 'div', id: 'x', class: 'a' })(el)).toBe(true)
		expect(createMatcher({ classes: ['a', 'b'] })(el)).toBe(true)
		expect(createMatcher({ attributes: { 'data-t': 'v' } })(el)).toBe(true)
		expect(createMatcher({ tag: 'span' })(el)).toBe(false)
		expect(createMatcher({ classes: ['a', 'z'] })(el)).toBe(false)
		expect(createMatcher({ attributes: { 'data-t': 'no' } })(el)).toBe(false)
	})

	it('createMatcher treats an undefined attribute value as a presence check', () => {
		const present = document.createElement('div')
		present.setAttribute('data-flag', '')
		const absent = document.createElement('div')
		const matcher = createMatcher({ attributes: { 'data-flag': undefined } })
		expect(matcher(present)).toBe(true)
		expect(matcher(absent)).toBe(false)
	})

	it('createMatcher with empty criteria matches everything', () => {
		expect(createMatcher({})(document.createElement('section'))).toBe(true)
	})
})

// ── Taxonomy primitive ──────────────────────────────────────────────────────

describe('helpers — entry', () => {
	it('builds a TaxonomyEntry with composable defaulting to null', () => {
		expect(entry('p', 'text-content', 'substantive')).toEqual({
			tag: 'p',
			category: 'text-content',
			treatment: 'substantive',
			composable: null,
		})
	})

	it('carries an explicit composable key', () => {
		expect(entry('dialog', 'interactive', 'composable', 'useDialog')).toEqual({
			tag: 'dialog',
			category: 'interactive',
			treatment: 'composable',
			composable: 'useDialog',
		})
	})
})

// ── Table sort / escape primitives ──────────────────────────────────────────

describe('helpers — cssEscape', () => {
	it('escapes selector-hostile characters into a usable attribute value', () => {
		const escaped = cssEscape('a.b#c d')
		expect(typeof escaped).toBe('string')
		// The escaped value must round-trip through a real attribute selector.
		const el = document.createElement('div')
		el.setAttribute('data-v', 'a.b#c d')
		document.body.appendChild(el)
		expect(document.querySelector(`[data-v="${escaped}"]`)).toBe(el)
	})

	it('escapes quotes and backslashes', () => {
		const el = document.createElement('div')
		el.setAttribute('data-v', 'he"llo\\world')
		document.body.appendChild(el)
		expect(document.querySelector(`[data-v="${cssEscape('he"llo\\world')}"]`)).toBe(el)
	})
})

describe('helpers — compareCellValues', () => {
	it('compares numeric-looking strings numerically', () => {
		expect(compareCellValues('2', '10')).toBeLessThan(0)
		expect(compareCellValues('10', '2')).toBeGreaterThan(0)
		expect(compareCellValues(' 5 ', '5')).toBe(0)
	})

	it('falls back to a locale collator for non-numeric strings', () => {
		expect(compareCellValues('apple', 'banana')).toBeLessThan(0)
		// Case-insensitive collation: 'B' must not always trail 'a'.
		expect(compareCellValues('B', 'a')).toBeGreaterThan(0)
		// Numeric-aware collation inside strings: "row 9" before "row 10".
		expect(compareCellValues('row 9', 'row 10')).toBeLessThan(0)
	})

	it('a numeric string and a non-numeric string use the string path', () => {
		expect(compareCellValues('10', 'apple')).toBeLessThan(0)
		expect(compareCellValues('', '5')).not.toBe(0)
	})
})

// ── SCSS selector parsing ───────────────────────────────────────────────────

describe('helpers — splitTopLevel', () => {
	it('splits at the top level only, respecting parens and brackets', () => {
		expect(splitTopLevel('a, b, c', ',')).toEqual(['a', 'b', 'c'])
		expect(splitTopLevel(':is(a, b), c', ',')).toEqual([':is(a, b)', 'c'])
		expect(splitTopLevel('[data-x="a,b"], d', ',')).toEqual(['[data-x="a,b"]', 'd'])
	})

	it('drops empty segments and handles a separator-free string', () => {
		expect(splitTopLevel('a,,b', ',')).toEqual(['a', 'b'])
		expect(splitTopLevel('solo', ',')).toEqual(['solo'])
		expect(splitTopLevel('', ',')).toEqual([])
	})

	it('splits a descendant chain by spaces at the top level', () => {
		expect(splitTopLevel('body:has(main) header', ' ')).toEqual(['body:has(main)', 'header'])
	})
})

describe('helpers — tagsInHead', () => {
	it('returns the leading bare tag of a compound', () => {
		expect(tagsInHead('nav.foo[bar]:not(.x)')).toEqual(['nav'])
		expect(tagsInHead('section')).toEqual(['section'])
	})

	it('flattens :is() / :where() branches', () => {
		expect(tagsInHead(':is(a, button)')).toEqual(['a', 'button'])
		expect(tagsInHead(':where(ul, ol)')).toEqual(['ul', 'ol'])
	})

	it('returns empty for universal, class, attribute, &, pseudo, and blank', () => {
		expect(tagsInHead('*')).toEqual([])
		expect(tagsInHead('.foo')).toEqual([])
		expect(tagsInHead('[data-x]')).toEqual([])
		expect(tagsInHead('&:hover')).toEqual([])
		expect(tagsInHead(':hover')).toEqual([])
		expect(tagsInHead('   ')).toEqual([])
	})
})

describe('helpers — leadingTagsOfCompound', () => {
	it('takes the first whitespace chunk head', () => {
		expect(leadingTagsOfCompound('body:has(main) header')).toEqual(['body'])
		expect(leadingTagsOfCompound(':is(a, b) span')).toEqual(['a', 'b'])
	})

	it('returns empty when the leading compound has no tag head', () => {
		expect(leadingTagsOfCompound('.wrapper > nav')).toEqual([])
	})
})

describe('helpers — trailingTagsOfCombinatorChain', () => {
	it('takes the last whitespace chunk head', () => {
		expect(trailingTagsOfCombinatorChain('body:has(main) nav')).toEqual(['nav'])
		expect(trailingTagsOfCombinatorChain('header :is(a, button)')).toEqual(['a', 'button'])
	})

	it('returns empty when the trailing compound has no tag head', () => {
		expect(trailingTagsOfCombinatorChain('nav .link')).toEqual([])
	})
})

// ── String-list coercion ────────────────────────────────────────────────────

describe('helpers — toStringList', () => {
	it('coerces undefined / empty string to an empty array', () => {
		expect(toStringList(undefined)).toEqual([])
		expect(toStringList('')).toEqual([])
	})

	it('wraps a non-empty string and clones an array input', () => {
		expect(toStringList('x')).toEqual(['x'])
		const input = ['x', 'y']
		const out = toStringList(input)
		expect(out).toEqual(['x', 'y'])
		expect(out).not.toBe(input)
	})
})

// ── 2. Semantic-element gating ──────────────────────────────────────────────

describe('helpers — assertElement', () => {
	it('passes a matching element (string and family forms)', () => {
		expect(() => assertElement(document.createElement('dialog'), 'dialog')).not.toThrow()
		expect(() =>
			assertElement(document.createElement('ul'), ['ul', 'ol', 'menu'], 'useMenu'),
		).not.toThrow()
	})

	it('throws TypeError on a tag mismatch', () => {
		expect(() => assertElement(document.createElement('div'), 'dialog', 'useDialog')).toThrow(
			TypeError,
		)
	})

	it('throws TypeError when the host is null or undefined', () => {
		expect(() => assertElement(null, 'dialog')).toThrow(TypeError)
		expect(() => assertElement(undefined, ['ul', 'ol'])).toThrow(TypeError)
	})
})

describe('helpers — isTagged', () => {
	it('returns a boolean for match / mismatch (never throws)', () => {
		expect(isTagged(document.createElement('dialog'), 'dialog')).toBe(true)
		expect(isTagged(document.createElement('div'), ['ul', 'ol', 'menu'])).toBe(false)
	})

	it('returns false for null/undefined without throwing', () => {
		expect(isTagged(null, 'dialog')).toBe(false)
		expect(isTagged(undefined, ['ul'])).toBe(false)
	})
})

// ── 3. Custom-event plumbing ────────────────────────────────────────────────

describe('helpers — dispatch', () => {
	it('returns true when no listener prevents the default', () => {
		const el = buildElement('div')
		expect(dispatch(el, 'elements:test:go')).toBe(true)
	})

	it('returns false when a listener calls preventDefault, and carries detail', () => {
		const el = buildElement('div')
		const recorder = createRecorder<[unknown]>()
		el.addEventListener('elements:test:go', (event) => {
			recorder.handler((event as CustomEvent).detail)
			event.preventDefault()
		})
		expect(dispatch(el, 'elements:test:go', { n: 1 })).toBe(false)
		expect(recorder.calls[0]?.[0]).toEqual({ n: 1 })
	})

	it('bubbles to ancestors', () => {
		const parent = buildElement('div')
		const child = document.createElement('span')
		parent.appendChild(child)
		const recorder = createRecorder<[]>()
		parent.addEventListener('elements:test:bubble', () => recorder.handler())
		dispatch(child, 'elements:test:bubble')
		expect(recorder.count).toBe(1)
	})
})

describe('helpers — emit', () => {
	it('dispatches a non-cancelable notification with detail', () => {
		const el = buildElement('div')
		const recorder = createRecorder<[boolean, unknown]>()
		el.addEventListener('elements:test:open', (event) => {
			recorder.handler(event.cancelable, (event as CustomEvent).detail)
		})
		emit(el, 'elements:test:open', { ok: true })
		expect(recorder.calls[0]).toEqual([false, { ok: true }])
	})
})

describe('helpers — listen', () => {
	it('subscribes only to CustomEvents and returns a working teardown', () => {
		const el = buildElement('div')
		const recorder = createRecorder<[]>()
		const off = listen(el, 'elements:test:ping', () => recorder.handler())
		emit(el, 'elements:test:ping')
		off()
		emit(el, 'elements:test:ping')
		expect(recorder.count).toBe(1)
	})

	it('ignores a plain (non-Custom) Event of the same name', () => {
		const el = buildElement('div')
		const recorder = createRecorder<[]>()
		listen(el, 'elements:test:ping', () => recorder.handler())
		el.dispatchEvent(new Event('elements:test:ping'))
		expect(recorder.count).toBe(0)
	})
})

describe('helpers — bindEventMap', () => {
	it('binds only keys present in `on` and tears all down', () => {
		const el = buildElement('div')
		const shows = createRecorder<[]>()
		const hides = createRecorder<[]>()
		const off = bindEventMap(
			el,
			{ onShow: 'elements:test:show', onHide: 'elements:test:hide' },
			{ onShow: () => shows.handler() },
		)
		emit(el, 'elements:test:show')
		emit(el, 'elements:test:hide')
		expect(shows.count).toBe(1)
		expect(hides.count).toBe(0)
		off()
		emit(el, 'elements:test:show')
		expect(shows.count).toBe(1)
	})

	it('returns a no-op teardown when `on` is undefined', () => {
		const el = buildElement('div')
		expect(() => bindEventMap(el, { onShow: 'elements:test:show' }, undefined)()).not.toThrow()
	})

	it('skips keys whose value is not a function, binds valid ones, teardown works', () => {
		const el = buildElement('div')
		const validRecorder = createRecorder<[]>()
		// onShow has a real handler; onHide has a non-function value — bindEventMap must not throw
		const off = bindEventMap(
			el,
			{ onShow: 'elements:test:show', onHide: 'elements:test:hide' },
			{ onShow: () => validRecorder.handler(), onHide: 'not-a-fn' as unknown as () => void },
		)
		// Emit both event names
		emit(el, 'elements:test:show')
		emit(el, 'elements:test:hide')
		// (a) valid handler fired exactly once
		expect(validRecorder.count).toBe(1)
		// (b) teardown is a callable function and calling it does not throw
		expect(typeof off).toBe('function')
		expect(() => off()).not.toThrow()
		// (c) after teardown, re-emitting the valid event does NOT increment the recorder
		emit(el, 'elements:test:show')
		expect(validRecorder.count).toBe(1)
	})
})

describe('helpers — attachListeners', () => {
	it('binds every entry and the composite teardown removes them all', () => {
		const el = buildElement('div')
		const a = createRecorder<[]>()
		const b = createRecorder<[]>()
		const off = attachListeners(el, [
			{ name: 'click', handler: () => a.handler() },
			{ name: 'focus', handler: () => b.handler() },
		])
		el.dispatchEvent(new Event('click'))
		el.dispatchEvent(new Event('focus'))
		off()
		el.dispatchEvent(new Event('click'))
		el.dispatchEvent(new Event('focus'))
		expect(a.count).toBe(1)
		expect(b.count).toBe(1)
	})

	it('handles an empty entry list', () => {
		const el = buildElement('div')
		expect(() => attachListeners(el, [])()).not.toThrow()
	})
})

// ── 4. Transition coordination ──────────────────────────────────────────────

describe('helpers — runTransition', () => {
	it('fires the callback on a real transitionend targeting the element', () => {
		const el = buildElement('div')
		const recorder = createRecorder<[]>()
		runTransition(el, () => recorder.handler(), 1000)
		el.dispatchEvent(new TransitionEvent('transitionend'))
		expect(recorder.count).toBe(1)
		// Idempotent: a second transitionend does not re-fire.
		el.dispatchEvent(new TransitionEvent('transitionend'))
		expect(recorder.count).toBe(1)
	})

	it('ignores a transitionend that bubbled from a descendant', () => {
		const el = buildElement('div')
		const child = document.createElement('span')
		el.appendChild(child)
		const recorder = createRecorder<[]>()
		runTransition(el, () => recorder.handler(), 1000)
		child.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }))
		expect(recorder.count).toBe(0)
	})

	it('fires the callback on the fallback timeout', async () => {
		const el = buildElement('div')
		const recorder = createRecorder<[]>()
		runTransition(el, () => recorder.handler(), 20)
		await waitForDelay(80)
		expect(recorder.count).toBe(1)
	})

	it('the returned canceller prevents the callback', async () => {
		const el = buildElement('div')
		const recorder = createRecorder<[]>()
		const cancel = runTransition(el, () => recorder.handler(), 20)
		cancel()
		el.dispatchEvent(new TransitionEvent('transitionend'))
		await waitForDelay(80)
		expect(recorder.count).toBe(0)
	})
})

describe('helpers — waitForFrame', () => {
	it('waitForFrame defers to the next animation frame (not synchronous)', async () => {
		let frameRan = false
		requestAnimationFrame(() => {
			frameRan = true
		})
		let resolved = false
		const pending = waitForFrame().then(() => {
			resolved = true
		})
		// Drain the microtask queue WITHOUT yielding a frame. A synchronous or
		// `Promise.resolve()` implementation would have flipped `resolved` by
		// now; a real frame-bound one cannot resolve until an actual rAF tick.
		await Promise.resolve()
		await Promise.resolve()
		expect(resolved).toBe(false)
		expect(frameRan).toBe(false)
		await pending
		expect(resolved).toBe(true)
		expect(frameRan).toBe(true)
	})
})

// ── 5. Shared body-scroll lock ──────────────────────────────────────────────

describe('helpers — lockBodyScroll / unlockBodyScroll', () => {
	// The lock counter is process-global. Each test must leave it balanced;
	// the safety net below drains any residual lock so order independence
	// holds even if an assertion above throws mid-cycle.
	afterEach(() => {
		for (let i = 0; i < 8; i += 1) unlockBodyScroll()
	})

	it('toggles BODY_LOCKED_ATTR on the first lock and the last unlock', () => {
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(false)
		lockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(true)
		unlockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(false)
	})

	it('reference-counts: nested locks only release on the final unlock', () => {
		lockBodyScroll()
		lockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(true)
		unlockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(true)
		unlockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(false)
	})

	it('unlock without a prior lock is a no-op (counter clamps at 0)', () => {
		expect(() => unlockBodyScroll()).not.toThrow()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(false)
		// An extra unlock must not drive the counter negative — a single
		// later lock/unlock pair still toggles cleanly.
		unlockBodyScroll()
		lockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(true)
		unlockBodyScroll()
		expect(document.body.hasAttribute(BODY_LOCKED_ATTR)).toBe(false)
	})
})

// ── 6a. Drag/drop detail guards ─────────────────────────────────────────────

describe('helpers — isDropPosition', () => {
	it('accepts the three insertion positions', () => {
		expect(isDropPosition('before')).toBe(true)
		expect(isDropPosition('after')).toBe(true)
		expect(isDropPosition('into')).toBe(true)
	})

	it('rejects anything else', () => {
		expect(isDropPosition('above')).toBe(false)
		expect(isDropPosition(null)).toBe(false)
	})
})

describe('helpers — isDragTapDetail', () => {
	const pointer = createPointerEvent('pointerdown')

	it('accepts a well-formed tap detail', () => {
		expect(isDragTapDetail({ index: 0, pointer })).toBe(true)
	})

	it('rejects malformed details', () => {
		expect(isDragTapDetail({ index: '0', pointer })).toBe(false)
		expect(isDragTapDetail({ index: 0, pointer: {} })).toBe(false)
		expect(isDragTapDetail(null)).toBe(false)
	})

	it('rejects unknown extra keys (core recordOf canonical: strict shape)', () => {
		expect(isDragTapDetail({ index: 0, pointer, extra: 1 })).toBe(false)
	})
})

describe('helpers — isDragStartDetail', () => {
	const pointer = createPointerEvent('pointerdown')

	it('accepts a well-formed start detail', () => {
		expect(isDragStartDetail({ indices: new Set([1]), pointer })).toBe(true)
	})

	it('rejects when indices is not a Set or pointer is wrong', () => {
		expect(isDragStartDetail({ indices: [1], pointer })).toBe(false)
		expect(isDragStartDetail({ indices: new Set(), pointer: 1 })).toBe(false)
		expect(isDragStartDetail(undefined)).toBe(false)
	})

	it('rejects unknown extra keys (core recordOf canonical: strict shape)', () => {
		expect(isDragStartDetail({ indices: new Set([1]), pointer, extra: true })).toBe(false)
	})
})

describe('helpers — isDragOverDetail', () => {
	const pointer = createPointerEvent('pointerdown')
	const target = document.createElement('div')

	it('accepts a fully-formed over detail', () => {
		expect(
			isDragOverDetail({ index: 2, position: 'before', target, pointer, types: ['text/plain'] }),
		).toBe(true)
	})

	it('rejects when any field is malformed', () => {
		expect(isDragOverDetail({ index: 2, position: 'nope', target, pointer, types: [] })).toBe(false)
		expect(isDragOverDetail({ index: 2, position: 'before', target: {}, pointer, types: [] })).toBe(
			false,
		)
		expect(isDragOverDetail({ index: 2, position: 'before', target, pointer, types: [1] })).toBe(
			false,
		)
		expect(isDragOverDetail(null)).toBe(false)
	})

	it('rejects unknown extra keys (core recordOf canonical: strict shape)', () => {
		expect(
			isDragOverDetail({
				index: 2,
				position: 'before',
				target,
				pointer,
				types: ['text/plain'],
				extra: 'x',
			}),
		).toBe(false)
	})
})

describe('helpers — isDragDropDetail', () => {
	const pointer = createPointerEvent('pointerdown')
	const target = document.createElement('div')

	it('accepts populated and fully-null (no-target) drop details', () => {
		expect(
			isDragDropDetail({ index: 0, position: 'after', target, pointer, types: ['text/uri-list'] }),
		).toBe(true)
		expect(
			isDragDropDetail({ index: null, position: null, target: null, pointer, types: [] }),
		).toBe(true)
	})

	it('rejects when pointer is missing or types is not a string array', () => {
		expect(
			isDragDropDetail({ index: null, position: null, target: null, pointer: {}, types: [] }),
		).toBe(false)
		expect(isDragDropDetail({ index: 0, position: 'after', target, pointer, types: 'x' })).toBe(
			false,
		)
		expect(isDragDropDetail(null)).toBe(false)
	})

	it('rejects unknown extra keys (core recordOf canonical: strict shape)', () => {
		expect(
			isDragDropDetail({
				index: null,
				position: null,
				target: null,
				pointer,
				types: [],
				extra: 0,
			}),
		).toBe(false)
	})
})

describe('helpers — extractRow / indexOfRow / extractRows', () => {
	it('extractRow finds the direct [data-index] child containing the target', () => {
		const root = buildElement('div')
		const row = document.createElement('div')
		row.setAttribute('data-index', '3')
		const inner = document.createElement('span')
		row.appendChild(inner)
		root.appendChild(row)
		expect(extractRow(inner, root)).toBe(row)
	})

	it('extractRow returns null for null root, non-HTMLElement target, or nested non-child', () => {
		const root = buildElement('div')
		expect(extractRow(document.createElement('span'), null)).toBe(null)
		expect(extractRow('not-a-node' as unknown as EventTarget, root)).toBe(null)
		// A [data-index] row that is NOT a direct child of root is rejected.
		const wrapper = document.createElement('div')
		const row = document.createElement('div')
		row.setAttribute('data-index', '0')
		wrapper.appendChild(row)
		root.appendChild(wrapper)
		expect(extractRow(row, root)).toBe(null)
	})

	it('indexOfRow parses data-index, null on missing/non-finite', () => {
		const row = document.createElement('div')
		row.setAttribute('data-index', '7')
		expect(indexOfRow(row)).toBe(7)
		const bad = document.createElement('div')
		bad.setAttribute('data-index', 'abc')
		expect(indexOfRow(bad)).toBe(null)
		expect(indexOfRow(null)).toBe(null)
		// Core parseNumber canonical: empty / whitespace-only data-index is
		// NOT a number (old `Number('')` coerced to 0).
		const empty = document.createElement('div')
		empty.setAttribute('data-index', '')
		expect(indexOfRow(empty)).toBe(null)
	})

	it('extractRows returns only direct [data-index] HTMLElement children', () => {
		const root = buildElement('div')
		const a = document.createElement('div')
		a.setAttribute('data-index', '0')
		const b = document.createElement('div')
		b.setAttribute('data-index', '1')
		const plain = document.createElement('div')
		root.append(a, plain, b)
		expect(extractRows(root)).toEqual([a, b])
		expect(extractRows(null)).toEqual([])
	})
})

// ── 6b. Form helpers ────────────────────────────────────────────────────────

describe('helpers — form field guards', () => {
	it('isFormFieldElement accepts form-associated controls only', () => {
		expect(isFormFieldElement(document.createElement('input'))).toBe(true)
		expect(isFormFieldElement(document.createElement('button'))).toBe(true)
		expect(isFormFieldElement(document.createElement('select'))).toBe(true)
		expect(isFormFieldElement(document.createElement('textarea'))).toBe(true)
		expect(isFormFieldElement(document.createElement('fieldset'))).toBe(true)
		expect(isFormFieldElement(document.createElement('output'))).toBe(true)
		expect(isFormFieldElement(document.createElement('div'))).toBe(false)
	})

	it('isValidityElement accepts only input/select/textarea', () => {
		expect(isValidityElement(document.createElement('input'))).toBe(true)
		expect(isValidityElement(document.createElement('select'))).toBe(true)
		expect(isValidityElement(document.createElement('textarea'))).toBe(true)
		expect(isValidityElement(document.createElement('button'))).toBe(false)
		expect(isValidityElement(document.createElement('output'))).toBe(false)
	})

	it('fieldName returns the control name or null', () => {
		const named = document.createElement('input')
		named.name = 'email'
		expect(fieldName(named)).toBe('email')
		expect(fieldName(document.createElement('input'))).toBe(null)
		expect(fieldName(document.createElement('div'))).toBe(null)
	})
})

describe('helpers — form readers', () => {
	it('readFormFields / readFormNames over a real form', () => {
		const form = makeForm()
		form.innerHTML =
			'<input name="a" value="1"><input name="a" value="2">' +
			'<select name="b"><option>x</option></select><input value="anon">'
		const fields = readFormFields(form)
		expect(fields.length).toBe(4)
		// Unique names in form order; the unnamed input contributes nothing.
		expect(readFormNames(fields)).toEqual(['a', 'b'])
	})

	it('readFormData snapshots FormData entries (duplicates preserved)', () => {
		const form = makeForm()
		form.innerHTML = '<input name="a" value="1"><input name="a" value="2">'
		expect(readFormData(form)).toEqual([
			{ name: 'a', value: '1' },
			{ name: 'a', value: '2' },
		])
	})

	it('readFormErrors reports invalid validating fields and skips willValidate=false', () => {
		const form = makeForm()
		const required = document.createElement('input')
		required.name = 'needsValue'
		required.required = true
		const disabled = document.createElement('input')
		disabled.name = 'ignored'
		disabled.required = true
		disabled.disabled = true // willValidate === false
		const valid = document.createElement('input')
		valid.name = 'fine'
		valid.value = 'ok'
		form.append(required, disabled, valid)

		const errors = readFormErrors(readFormFields(form))
		expect(errors.map((error) => error.name)).toEqual(['needsValue'])
		expect(errors[0]?.message).toBe(required.validationMessage)
		expect(errors[0]?.validity.valueMissing).toBe(true)
	})

	it('readFormErrors returns empty when every field is valid', () => {
		const form = makeForm()
		form.innerHTML = '<input name="a" value="ok">'
		expect(readFormErrors(readFormFields(form))).toEqual([])
	})
})

// ── 6c. Table helpers ───────────────────────────────────────────────────────

describe('helpers — table cell/row writers and readers', () => {
	it('writeTableCell writes text, clears prior content, and appends Nodes', () => {
		const cell = document.createElement('td')
		writeTableCell(cell, 'hello')
		expect(cell.textContent).toBe('hello')
		writeTableCell(cell, 42)
		expect(cell.textContent).toBe('42')
		writeTableCell(cell, null)
		expect(cell.textContent).toBe('')
		const span = document.createElement('span')
		span.textContent = 'node'
		writeTableCell(cell, span)
		expect(cell.firstElementChild).toBe(span)
	})

	it('writeTableRow adds and removes cells to match the value count', () => {
		const table = makeTable()
		const body = table.createTBody()
		const row = body.insertRow()
		writeTableRow(row, ['a', 'b', 'c'])
		expect(readTableCells(row)).toEqual(['a', 'b', 'c'])
		writeTableRow(row, ['x'])
		expect(readTableCells(row)).toEqual(['x'])
		writeTableRow(row, [])
		expect(readTableCells(row)).toEqual([])
	})

	it('keyOfTableCell serializes a cell coordinate', () => {
		expect(keyOfTableCell({ row: 2, column: 5 })).toBe('2,5')
	})
})

describe('helpers — normalizeIndex', () => {
	it('accepts integers within [0, count]', () => {
		expect(normalizeIndex(0, 3)).toBe(0)
		expect(normalizeIndex(3, 3)).toBe(3)
		expect(normalizeIndex(2, 3)).toBe(2)
	})

	it('rejects non-integers and out-of-range values', () => {
		expect(normalizeIndex(-1, 3)).toBe(null)
		expect(normalizeIndex(4, 3)).toBe(null)
		expect(normalizeIndex(1.5, 3)).toBe(null)
		expect(normalizeIndex(Number.NaN, 3)).toBe(null)
	})
})

describe('helpers — table target guards', () => {
	it('isTableCellTarget narrows a {row,column} target', () => {
		expect(isTableCellTarget({ row: 1, column: 2 })).toBe(true)
		expect(isTableCellTarget({ from: 0, to: 3 })).toBe(false)
		expect(isTableCellTarget(5)).toBe(false)
	})

	it('isTableRangeTarget narrows a {from,to} target', () => {
		expect(isTableRangeTarget({ from: 0, to: 3 })).toBe(true)
		expect(isTableRangeTarget({ row: 1, column: 2 })).toBe(false)
		expect(isTableRangeTarget('all')).toBe(false)
	})
})

describe('helpers — table structure readers', () => {
	function buildFullTable(): HTMLTableElement {
		const table = makeTable()
		table.innerHTML =
			'<thead><tr><th>H1</th><th>H2</th></tr></thead>' +
			'<tbody><tr data-id="r1"><td>a1</td><td>a2</td></tr>' +
			'<tr><td>b1</td><td>b2</td></tr></tbody>' +
			'<tfoot><tr><td>F1</td><td>F2</td></tr></tfoot>'
		return table
	}

	it('readTableRows returns body rows only, across tbodies', () => {
		const table = buildFullTable()
		table.appendChild(document.createElement('tbody')).insertRow().insertCell().textContent = 'c1'
		const rows = readTableRows(table)
		expect(rows.length).toBe(3)
		expect(rows.every((row) => row.parentElement?.tagName === 'TBODY')).toBe(true)
	})

	it('readTableHeaders / readTableFooter / readTableData / readTableColumns', () => {
		const table = buildFullTable()
		expect(readTableHeaders(table)).toEqual(['H1', 'H2'])
		expect(readTableFooter(table)).toEqual(['F1', 'F2'])
		expect(readTableData(table)).toEqual([
			['a1', 'a2'],
			['b1', 'b2'],
		])
		expect(readTableColumns(table)).toEqual([
			['a1', 'b1'],
			['a2', 'b2'],
		])
	})

	it('header/footer readers return [] when the section is absent', () => {
		const table = makeTable()
		expect(readTableHeaders(table)).toEqual([])
		expect(readTableFooter(table)).toEqual([])
		expect(readTableData(table)).toEqual([])
		expect(readTableColumns(table)).toEqual([])
	})

	it('extractRowId prefers data-id, falls back to data-index, then empty', () => {
		const withId = document.createElement('tr')
		withId.setAttribute('data-id', 'abc')
		expect(extractRowId(withId)).toBe('abc')
		const withIndex = document.createElement('tr')
		withIndex.setAttribute('data-index', '4')
		expect(extractRowId(withIndex)).toBe('4')
		expect(extractRowId(document.createElement('tr'))).toBe('')
	})

	it('findDetailRow returns the adjacent expansion row only', () => {
		const table = makeTable()
		const body = table.createTBody()
		const row = body.insertRow()
		const detail = body.insertRow()
		detail.setAttribute(TABLE_EXPANSION_ATTR, '')
		expect(findDetailRow(row)).toBe(detail)
		// A plain following sibling is not a detail row.
		const lonely = table.createTBody().insertRow()
		expect(findDetailRow(lonely)).toBe(null)
	})
})

describe('helpers — table ARIA + section accessors', () => {
	it('applyRowIndex writes 1-based aria-rowindex with a clamped offset', () => {
		const table = makeTable()
		const body = table.createTBody()
		const r0 = body.insertRow()
		const r1 = body.insertRow()
		applyRowIndex([r0, r1], 5)
		expect(r0.getAttribute(TABLE_ARIA_ROWINDEX)).toBe('5')
		expect(r1.getAttribute(TABLE_ARIA_ROWINDEX)).toBe('6')
		applyRowIndex([r0], 0) // offset < 1 → base 1
		expect(r0.getAttribute(TABLE_ARIA_ROWINDEX)).toBe('1')
	})

	it('applyRowCount sets aria-rowcount and removes it when count <= 0', () => {
		const table = makeTable()
		applyRowCount(table, 12)
		expect(table.getAttribute(TABLE_ARIA_ROWCOUNT)).toBe('12')
		applyRowCount(table, 0)
		expect(table.hasAttribute(TABLE_ARIA_ROWCOUNT)).toBe(false)
	})

	it('tableBody / tableHeaderRow / tableFooterRow honor the create flag', () => {
		const table = makeTable()
		expect(tableBody(table, false)).toBe(null)
		expect(tableHeaderRow(table, false)).toBe(null)
		expect(tableFooterRow(table, false)).toBe(null)
		const body = tableBody(table, true)
		expect(body?.tagName).toBe('TBODY')
		expect(tableBody(table, false)).toBe(body) // returns the existing one
		expect(tableHeaderRow(table, true)?.parentElement?.tagName).toBe('THEAD')
		expect(tableFooterRow(table, true)?.parentElement?.tagName).toBe('TFOOT')
	})

	it('writeTableHeaderRow emits <th scope="col"> and replaces existing cells', () => {
		const table = makeTable()
		writeTableHeaderRow(table, ['A', 'B'])
		const head = table.tHead?.rows[0]
		expect(head?.cells.length).toBe(2)
		const firstCell = head?.cells[0] as HTMLTableCellElement
		expect(firstCell.tagName).toBe('TH')
		expect(firstCell.scope).toBe('col')
		writeTableHeaderRow(table, ['C'])
		expect(readTableHeaders(table)).toEqual(['C'])
	})

	it('writeTableFooterRow writes footer cells and replaces existing ones', () => {
		const table = makeTable()
		writeTableFooterRow(table, ['x', 'y'])
		expect(readTableFooter(table)).toEqual(['x', 'y'])
		writeTableFooterRow(table, ['z'])
		expect(readTableFooter(table)).toEqual(['z'])
	})

	it('cleanTableSelection strips aria-selected from every row and cell', () => {
		const table = makeTable()
		const body = table.createTBody()
		const row = body.insertRow()
		row.setAttribute('aria-selected', 'true')
		const cell = row.insertCell()
		cell.setAttribute('aria-selected', 'true')
		cleanTableSelection(table)
		expect(row.hasAttribute('aria-selected')).toBe(false)
		expect(cell.hasAttribute('aria-selected')).toBe(false)
	})

	it('markTableUnselectedRows sets aria-selected="false" only on unmarked body rows', () => {
		const table = makeTable()
		const body = table.createTBody()
		const selected = body.insertRow()
		selected.setAttribute('aria-selected', 'true')
		const unselected = body.insertRow()
		markTableUnselectedRows(table)
		expect(selected.getAttribute('aria-selected')).toBe('true')
		expect(unselected.getAttribute('aria-selected')).toBe('false')
	})
})

// ── 7. Popover placement primitives ─────────────────────────────────────────

describe('helpers — popover placement', () => {
	const SIDES = ['top', 'end', 'bottom', 'start'] as const

	it('isSide narrows the four logical sides', () => {
		for (const side of SIDES) expect(isSide(side)).toBe(true)
		expect(isSide('left')).toBe(false)
		expect(isSide('')).toBe(false)
	})

	it('sideOf extracts the side and defaults to bottom', () => {
		expect(sideOf('top')).toBe('top')
		expect(sideOf('end-start')).toBe('end')
		expect(sideOf('garbage' as never)).toBe('bottom')
	})

	it('alignmentOf extracts start/end or null', () => {
		expect(alignmentOf('top-start')).toBe('start')
		expect(alignmentOf('bottom-end')).toBe('end')
		expect(alignmentOf('bottom')).toBe(null)
	})

	it('makePlacement reassembles side + optional alignment', () => {
		expect(makePlacement('top', null)).toBe('top')
		expect(makePlacement('end', 'start')).toBe('end-start')
	})

	it('areaForPopoverPlacement maps every Placement, with bottom fallback', () => {
		expect(areaForPopoverPlacement('top')).toBe('top')
		expect(areaForPopoverPlacement('bottom-start')).toBe('bottom span-right')
		expect(areaForPopoverPlacement('start-end')).toBe('left span-top')
		expect(areaForPopoverPlacement('nonsense' as never)).toBe(areaForPopoverPlacement('bottom'))
	})

	it('selfsForPopoverPlacement returns the self pair, with bottom fallback', () => {
		expect(selfsForPopoverPlacement('bottom')).toEqual(['start', 'anchor-center'])
		expect(selfsForPopoverPlacement('top-start')).toEqual(['end', 'start'])
		expect(selfsForPopoverPlacement('nonsense' as never)).toEqual(
			selfsForPopoverPlacement('bottom'),
		)
	})

	it('resolvePopoverSide reads real geometry to report the placed side', () => {
		const anchor = buildElement('div')
		const panel = buildElement('div')
		for (const el of [anchor, panel]) {
			el.style.position = 'fixed'
			el.style.width = '40px'
			el.style.height = '20px'
		}
		anchor.style.left = '200px'
		anchor.style.top = '200px'

		// Panel fully above the anchor → 'top'.
		panel.style.left = '200px'
		panel.style.top = '100px'
		expect(resolvePopoverSide(anchor, panel)).toBe('top')

		// Panel fully below → 'bottom'.
		panel.style.top = '300px'
		expect(resolvePopoverSide(anchor, panel)).toBe('bottom')

		// Panel fully left of the anchor → 'start'.
		panel.style.top = '200px'
		panel.style.left = '100px'
		expect(resolvePopoverSide(anchor, panel)).toBe('start')

		// Panel fully right → 'end'.
		panel.style.left = '300px'
		expect(resolvePopoverSide(anchor, panel)).toBe('end')

		// Overlapping the anchor → bottom fallback.
		panel.style.left = '200px'
		panel.style.top = '205px'
		expect(resolvePopoverSide(anchor, panel)).toBe('bottom')
	})

	it('resolvePopoverSide resolves "top" when panel bottom is exactly at anchor top + 1 (±1px tolerance boundary)', () => {
		// impl: `if (p.bottom <= a.top + 1) return 'top'`
		// At equality (p.bottom === a.top + 1) the condition is true → 'top'
		const anchor = buildElement('div')
		const panel = buildElement('div')
		for (const el of [anchor, panel]) {
			el.style.position = 'fixed'
			el.style.width = '40px'
			el.style.height = '20px'
		}
		// anchor.top = 200 → a.top + 1 = 201
		anchor.style.left = '200px'
		anchor.style.top = '200px'
		// panel.top = 181 → panel.bottom = 181 + 20 = 201 = a.top + 1 (exact boundary)
		panel.style.left = '200px'
		panel.style.top = '181px'
		expect(resolvePopoverSide(anchor, panel)).toBe('top')
	})
})

// ── 8. Roving keyboard navigation ───────────────────────────────────────────

describe('helpers — focusableItems', () => {
	it('returns only selector matches whose tabIndex >= 0', () => {
		const root = buildElement('menu')
		const li = document.createElement('li') // tabIndex -1 by default
		const button = document.createElement('button')
		li.appendChild(button)
		const tabbableLi = document.createElement('li')
		tabbableLi.tabIndex = 0
		root.append(li, tabbableLi)
		const items = focusableItems(root, 'li, button')
		expect(items).toEqual([button, tabbableLi])
	})

	it('returns [] for a null root', () => {
		expect(focusableItems(null, 'button')).toEqual([])
	})
})

describe('helpers — rove', () => {
	const items = [
		document.createElement('button'),
		document.createElement('button'),
		document.createElement('button'),
	]

	it('Home / End jump to the bounds', () => {
		expect(rove(items, 'Home', 2)).toBe(0)
		expect(rove(items, 'End', 0)).toBe(2)
	})

	it('ArrowDown / ArrowUp move and wrap', () => {
		expect(rove(items, 'ArrowDown', 0)).toBe(1)
		expect(rove(items, 'ArrowDown', 2)).toBe(0) // wrap forward
		expect(rove(items, 'ArrowUp', 0)).toBe(2) // wrap backward
		expect(rove(items, 'ArrowUp', 1)).toBe(0)
	})

	it('current = -1 seeds the first/last item by direction', () => {
		expect(rove(items, 'ArrowDown', -1)).toBe(0)
		expect(rove(items, 'ArrowUp', -1)).toBe(2)
	})

	it('returns 0 for an empty list and passes through unknown keys', () => {
		expect(rove([], 'ArrowDown', -1)).toBe(0)
		expect(rove(items, 'Tab', 1)).toBe(1)
	})
})

// ════════════════════════════════════════════════════════════════════════════
//  9. Inspector rule-engine helpers — the 39 generic `{verb}{Noun}` building
//     blocks `inspector/rules.ts` composes its registry from (the
//     "Inspector rule-engine helpers" section of `src/browser/helpers.ts`,
//     extracted verbatim in Batch 1 + the generic flat-traversal bases added
//     in Batch 2). CHARACTERIZATION tests: each helper is exercised on REAL
//     Chromium DOM (real shadow roots / `<slot>` + `assignedElements` /
//     `<template>.content` for the flat-tree traversal helpers; real computed
//     styles via the `src:browser` SCSS cascade; real `:popover-open`),
//     against the REAL frozen corpus schema (`describeElement` / the
//     `ATTRIBUTE_*` constants) — never a mock. The module-private
//     `isScriptSupporting` is deliberately NOT tested directly (not exported);
//     it is covered transitively through `matchSegments` (the
//     script-supporting-intermixed cases below).
//
//     `el()` mirrors the inspector suites' builder idiom
//     (`tests/src/browser/inspector/*.test.ts`); the `container` lifecycle
//     mirrors theirs (a fresh detached `<div>` appended to / removed from the
//     body each test, so `flatParent` / computed style resolve in a real
//     connected tree). Seeded synthetic cases use `@elements/core`
//     `createRandom` so a failing tree is reproducible from its seed.
// ════════════════════════════════════════════════════════════════════════════

describe('helpers — inspector rule-engine', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	function el(
		tag: string,
		attrs: Readonly<Record<string, string>> = {},
		children: readonly Element[] = [],
	): Element {
		const node = document.createElement(tag)
		for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
		for (const child of children) node.appendChild(child)
		return node
	}

	// A real `RuleContext` via the public Walker (real computed style, real
	// resolved categories) — the same construction the inspector itself uses.
	function contextFor(root: Element, target: Element): ReturnType<Walker['context']> {
		return new Walker(root).context(target)
	}

	// The rule-authoring projection a custom rule composes over — built EXACTLY
	// as `rules.ts`'s `readSubject` does (flat parent, schema entries), so the
	// reference-resolution helpers see the real subject shape.
	function subjectFor(
		root: Element,
		target: Element,
	): {
		element: Element
		context: ReturnType<Walker['context']>
		tag: string
		entry: ReturnType<typeof describeElement>
		parent: Element | null
		parentEntry: ReturnType<typeof describeElement>
	} {
		const tag = target.tagName.toLowerCase()
		return {
			element: target,
			context: contextFor(root, target),
			tag,
			entry: describeElement(tag),
			parent: null,
			parentEntry: null,
		}
	}

	// ── building blocks / guards ──────────────────────────────────────────────

	describe('isContentCategory', () => {
		it('accepts every member of the closed content-category vocabulary', () => {
			for (const c of [
				'metadata',
				'flow',
				'sectioning',
				'heading',
				'phrasing',
				'embedded',
				'interactive',
				'palpable',
				'script-supporting',
				'transparent',
			]) {
				expect(isContentCategory(c)).toBe(true)
			}
		})

		it('rejects a literal tag, a near-miss, and non-strings (narrows a forbidden token)', () => {
			// The discriminator: a `forbidden` token typed `ContentCategory |
			// string` — `'footer'` is a real tag but NOT a category, so the
			// guard must reject it (else `matchesForbiddenToken` would treat a
			// tag as a category and over-match).
			expect(isContentCategory('footer')).toBe(false)
			expect(isContentCategory('Flow')).toBe(false)
			expect(isContentCategory('')).toBe(false)
			expect(isContentCategory(null)).toBe(false)
			expect(isContentCategory(42)).toBe(false)
		})
	})

	describe('matchesTagCategory', () => {
		it('is driven by the inverted schema index, not a hand-kept set', () => {
			// Corpus-faithful (schema.ts): `<p>` is `flow` + `palpable` (NOT
			// phrasing — it is a flow container); `<span>` is `flow` +
			// `phrasing` + `palpable`; `<section>` is `flow` + `sectioning` +
			// `palpable`.
			expect(matchesTagCategory('p', 'flow')).toBe(true)
			expect(matchesTagCategory('span', 'phrasing')).toBe(true)
			expect(matchesTagCategory('section', 'sectioning')).toBe(true)
			// The discriminators: `<p>` is NOT phrasing and `<section>` is NOT
			// phrasing — must be false (a hand-kept superset would wrongly
			// pass; the index is the schema-derived source of truth).
			expect(matchesTagCategory('p', 'phrasing')).toBe(false)
			expect(matchesTagCategory('section', 'phrasing')).toBe(false)
		})

		it('an unknown tag is in no category', () => {
			expect(matchesTagCategory('made-up', 'flow')).toBe(false)
		})
	})

	describe('matchesForbiddenToken', () => {
		it('a literal-tag token matches by exact tag only', () => {
			expect(matchesForbiddenToken('footer', 'footer')).toBe(true)
			expect(matchesForbiddenToken('footer', 'header')).toBe(false)
		})

		it('a content-category token matches by schema membership', () => {
			// `<dt>` forbids the `heading` category — `h2` is a heading member,
			// `span` is not.
			expect(matchesForbiddenToken('heading', 'h2')).toBe(true)
			expect(matchesForbiddenToken('heading', 'span')).toBe(false)
		})

		it('a literal tag is NOT resolved as a category (the disjoint discriminator)', () => {
			// `'footer'` is a tag, never a category — must not match `header`
			// just because both are sectioning-ish; literal path is exact-only.
			expect(matchesForbiddenToken('footer', 'h1')).toBe(false)
		})
	})

	describe('constraintOf', () => {
		it('finds the first constraint of a kind on a real schema entry', () => {
			// `<legend>` carries a `single-first-child` constraint (parents:
			// fieldset).
			const legend = describeElement('legend')
			const constraint = constraintOf(legend, 'single-first-child')
			expect(constraint?.kind).toBe('single-first-child')
			expect(constraint?.parents).toEqual(['fieldset'])
		})

		it('returns null for a null entry or an absent kind', () => {
			expect(constraintOf(null, 'edge-child')).toBeNull()
			// `<p>` carries no constraints at all.
			expect(constraintOf(describeElement('p'), 'edge-child')).toBeNull()
			// `<legend>` has single-first-child but NOT parent-restricted.
			expect(constraintOf(describeElement('legend'), 'parent-restricted')).toBeNull()
		})
	})

	describe('buildFinding', () => {
		it('assembles the finding, computing path via nodePath and omitting absent optionals', () => {
			const leaf = el('span')
			const root = el('section', {}, [el('em', {}, [leaf])])
			container.appendChild(root)
			const finding = buildFinding({
				rule: 'content/category',
				severity: 'error',
				element: leaf,
				cite: 'texts#the-span-element',
				message: 'nope',
			})
			expect(finding.rule).toBe('content/category')
			expect(finding.severity).toBe('error')
			expect(finding.element).toBe(leaf)
			expect(finding.cite).toBe('texts#the-span-element')
			expect(finding.message).toBe('nope')
			// `path` is the real nodePath (leaf-first up to the root).
			expect(finding.path[0]).toBe(leaf)
			expect(finding.path.map((n) => n.tagName.toLowerCase())).toContain('em')
			// Absent optionals are OMITTED keys, not `undefined` values — the
			// discriminator (a spread-on-undefined bug would add the key).
			expect('expected' in finding).toBe(false)
			expect('actual' in finding).toBe(false)
		})

		it('carries `expected` / `actual` verbatim when supplied', () => {
			const node = el('p')
			container.appendChild(node)
			const finding = buildFinding({
				rule: 'content/required',
				severity: 'error',
				element: node,
				cite: 'x#y',
				message: 'm',
				expected: 'one img element',
				actual: '<source>',
			})
			expect(finding.expected).toBe('one img element')
			expect(finding.actual).toBe('<source>')
		})
	})

	describe('citeOf', () => {
		it('prefers the entry cite, falling back when the entry is null', () => {
			expect(citeOf(describeElement('p'), 'fallback#anchor')).toBe('groupings#the-p-element')
			expect(citeOf(null, 'fallback#anchor')).toBe('fallback#anchor')
		})
	})

	describe('tagOf', () => {
		it('lowercases the tag name (the child-model engine reader)', () => {
			expect(tagOf(document.createElement('DIV'))).toBe('div')
			expect(tagOf(el('section'))).toBe('section')
		})
	})

	// ── child-model engine ────────────────────────────────────────────────────

	describe('matchesChildCategory', () => {
		it('a non-transparent child matches by its own effective categories', () => {
			// `<p>` is flow + palpable (NOT phrasing); `<span>` adds phrasing.
			const p = el('p')
			const span = el('span')
			container.append(p, span)
			expect(matchesChildCategory(p, 'flow')).toBe(true)
			expect(matchesChildCategory(p, 'phrasing')).toBe(false)
			expect(matchesChildCategory(p, 'sectioning')).toBe(false)
			expect(matchesChildCategory(span, 'phrasing')).toBe(true)
		})

		it('a transparent child resolves through its ancestor (effective, not own)', () => {
			// `<a>` is transparent; inside `<section>` (flow) it resolves to
			// flow content, so a flow category arm absorbs it.
			const a = el('a')
			const section = el('section', {}, [a])
			container.appendChild(section)
			expect(matchesChildCategory(a, 'flow')).toBe(true)
		})

		it('a structural child (empty effective categories) matches NO category arm', () => {
			// `<td>` carries `categories: []` — its placement is the structure
			// family's concern; a category arm must never absorb it (keeps the
			// families disjoint).
			const td = el('td')
			container.appendChild(td)
			expect(matchesChildCategory(td, 'flow')).toBe(false)
			expect(matchesChildCategory(td, 'phrasing')).toBe(false)
		})
	})

	describe('hasOpenCategoryArm', () => {
		it('detects a top-level category segment', () => {
			expect(hasOpenCategoryArm([{ kind: 'category', category: 'flow' }])).toBe(true)
		})

		it('recurses into group and choice', () => {
			expect(
				hasOpenCategoryArm([
					{ kind: 'group', count: '*', segments: [{ kind: 'category', category: 'flow' }] },
				]),
			).toBe(true)
			expect(
				hasOpenCategoryArm([
					{
						kind: 'choice',
						options: [
							[{ kind: 'tag', tag: 'tr', count: '+' }],
							[{ kind: 'category', category: 'flow' }],
						],
					},
				]),
			).toBe(true)
		})

		it('a purely tag/group-of-tag model has NO open arm (the discriminator)', () => {
			// `<picture>` = source* img(1) — closed, no category arm. A false
			// positive here would make resolvePermittedTags wrongly return null.
			const picture = describeElement('picture')
			expect(picture?.childModel).toBeDefined()
			expect(hasOpenCategoryArm(picture?.childModel?.segments ?? [])).toBe(false)
			expect(
				hasOpenCategoryArm([
					{ kind: 'tag', tag: 'source', count: '*' },
					{ kind: 'tag', tag: 'img', count: '1' },
				]),
			).toBe(false)
		})
	})

	describe('collectSegmentTags', () => {
		it('collects every concrete tag a recursive segment list can admit', () => {
			const into = new Set<string>()
			collectSegmentTags(
				[
					{ kind: 'tag', tag: 'source', count: '*' },
					{
						kind: 'choice',
						options: [
							[{ kind: 'tag', tag: 'img', count: '1' }],
							[
								{
									kind: 'group',
									count: '*',
									segments: [{ kind: 'tag', tag: 'track', count: '*' }],
								},
							],
						],
					},
				],
				into,
			)
			expect([...into].sort()).toEqual(['img', 'source', 'track'])
		})

		it('a category segment contributes NO tag (only concrete tags collected)', () => {
			const into = new Set<string>()
			collectSegmentTags(
				[
					{ kind: 'tag', tag: 'summary', count: '1' },
					{ kind: 'category', category: 'flow' },
				],
				into,
			)
			expect([...into]).toEqual(['summary'])
		})
	})

	describe('resolvePermittedTags', () => {
		it('a closed tag model yields the closed set PLUS script-supporting', () => {
			// `<picture>` (source* img(1), closed) — admits {source, img} plus
			// the always-tolerated script/template.
			const picture = describeElement('picture')?.childModel
			expect(picture).toBeDefined()
			const tags = resolvePermittedTags(picture ?? { segments: [], closed: true, note: '' })
			expect(tags).not.toBeNull()
			expect([...(tags ?? [])].sort()).toEqual(['img', 'script', 'source', 'template'])
		})

		it('an open-category model returns null (any category-matching child admissible)', () => {
			// `<details>` = summary(1) then *flow content* — the open flow arm
			// means a closed-tag membership check cannot reject; null is the
			// "defer to content/required" signal.
			const details = describeElement('details')?.childModel
			expect(details).toBeDefined()
			expect(resolvePermittedTags(details ?? { segments: [], closed: false, note: '' })).toBeNull()
		})
	})

	describe('satisfiesCount', () => {
		it('characterizes every cardinality marker', () => {
			// '?' zero-or-one
			expect(satisfiesCount('?', 0)).toBe(true)
			expect(satisfiesCount('?', 1)).toBe(true)
			expect(satisfiesCount('?', 2)).toBe(false)
			// '*' zero-or-more (always)
			expect(satisfiesCount('*', 0)).toBe(true)
			expect(satisfiesCount('*', 99)).toBe(true)
			// '+' one-or-more
			expect(satisfiesCount('+', 0)).toBe(false)
			expect(satisfiesCount('+', 1)).toBe(true)
			// '1' exactly one
			expect(satisfiesCount('1', 0)).toBe(false)
			expect(satisfiesCount('1', 1)).toBe(true)
			expect(satisfiesCount('1', 2)).toBe(false)
		})
	})

	describe('matchSegments', () => {
		const tags = (children: readonly string[]): Element[] => children.map((t) => el(t))

		it('consumes an ordered tag run and returns the cursor after the match', () => {
			// picture model: source* img(1).
			const segs = [
				{ kind: 'tag' as const, tag: 'source', count: '*' as const },
				{ kind: 'tag' as const, tag: 'img', count: '1' as const },
			]
			const kids = tags(['source', 'source', 'img'])
			expect(matchSegments(kids, 0, segs)).toBe(3)
		})

		it('returns null when a mandatory segment is unsatisfied', () => {
			// img(1) missing → null (the content/required discriminator).
			const segs = [
				{ kind: 'tag' as const, tag: 'source', count: '*' as const },
				{ kind: 'tag' as const, tag: 'img', count: '1' as const },
			]
			expect(matchSegments(tags(['source', 'source']), 0, segs)).toBeNull()
		})

		it('script-supporting elements are skippable anywhere in the run', () => {
			const segs = [
				{ kind: 'tag' as const, tag: 'source', count: '*' as const },
				{ kind: 'tag' as const, tag: 'img', count: '1' as const },
			]
			const kids = tags(['script', 'source', 'template', 'img', 'script'])
			expect(matchSegments(kids, 0, segs)).toBe(5)
		})

		it('a same-tag run is bounded by a `1`/`?` cardinality upper bound', () => {
			// summary(1) then flow: a SECOND <summary> must be LEFT for the
			// next segment (the flat-tree `group*(choice…)` idiom). With a
			// trailing flow `<p>`, the model still matches because the second
			// summary is flow-absorbable? No — <summary> is NOT flow, so the
			// category arm stops; the run leaves the 2nd summary unconsumed.
			const segs = [
				{ kind: 'tag' as const, tag: 'summary', count: '1' as const },
				{ kind: 'category' as const, category: 'flow' as const },
			]
			const kids = tags(['summary', 'summary', 'p'])
			container.append(...kids)
			// summary(1) consumes ONE; the flow arm then sees <summary> (not
			// flow) and stops → cursor is left BEFORE the 2nd summary (index 1),
			// NOT the end. The discriminator: greedy single-tag over-consume
			// would wrongly return 3.
			expect(matchSegments(kids, 0, segs)).toBe(1)
		})

		it('an open category arm greedily absorbs category-matching children', () => {
			const segs = [
				{ kind: 'tag' as const, tag: 'summary', count: '1' as const },
				{ kind: 'category' as const, category: 'flow' as const },
			]
			const kids = tags(['summary', 'p', 'div', 'section'])
			container.append(...kids)
			expect(matchSegments(kids, 0, segs)).toBe(4)
		})

		it('a repeating group consumes ordered copies; a choice takes the longest arm', () => {
			// group*( dt+ dd+ ) — the dl group form.
			const group = [
				{
					kind: 'group' as const,
					count: '*' as const,
					segments: [
						{ kind: 'tag' as const, tag: 'dt', count: '+' as const },
						{ kind: 'tag' as const, tag: 'dd', count: '+' as const },
					],
				},
			]
			expect(matchSegments(tags(['dt', 'dd', 'dt', 'dd', 'dd']), 0, group)).toBe(5)
			// choice: pick the option that consumes the most.
			const choice = [
				{
					kind: 'choice' as const,
					options: [
						[{ kind: 'tag' as const, tag: 'tr', count: '+' as const }],
						[{ kind: 'tag' as const, tag: 'tbody', count: '*' as const }],
					],
				},
			]
			expect(matchSegments(tags(['tr', 'tr']), 0, choice)).toBe(2)
		})
	})

	describe('satisfiesChildModel', () => {
		it('a closed model must consume EVERY child (no trailing slack)', () => {
			const picture = describeElement('picture')?.childModel
			if (picture === undefined) throw new Error('fixture: picture childModel missing')
			expect(satisfiesChildModel([el('source'), el('img')], picture)).toBe(true)
			// A trailing extra child a closed model does not list → unsatisfied
			// (the closed-exhaustiveness discriminator).
			expect(satisfiesChildModel([el('source'), el('img'), el('div')], picture)).toBe(false)
		})

		it('a non-closed prefix model only needs the prefix to match', () => {
			const details = describeElement('details')?.childModel
			if (details === undefined) throw new Error('fixture: details childModel missing')
			const kids = [el('summary'), el('p'), el('div')]
			container.append(...kids)
			expect(satisfiesChildModel(kids, details)).toBe(true)
			// Missing the required leading summary → the prefix itself fails.
			const noSummary = [el('p')]
			container.append(...noSummary)
			expect(satisfiesChildModel(noSummary, details)).toBe(false)
		})
	})

	describe('requiresLeadingTag', () => {
		it('true only for a mandatory (`1`/`+`) leading TAG segment of that tag', () => {
			const details = describeElement('details')?.childModel
			if (details === undefined) throw new Error('fixture: details childModel missing')
			// details: summary(1) leading → required.
			expect(requiresLeadingTag(details, 'summary')).toBe(true)
			expect(requiresLeadingTag(details, 'legend')).toBe(false)
		})

		it('false for an OPTIONAL leading tag (`?`) — the disjoint-source discriminator', () => {
			// fieldset: legend(?) leading — OPTIONAL, so content/required must
			// stay silent and single-first-child owns it. A bug treating `?`
			// as required would double-report.
			const fieldset = describeElement('fieldset')?.childModel
			if (fieldset === undefined) throw new Error('fixture: fieldset childModel missing')
			expect(requiresLeadingTag(fieldset, 'legend')).toBe(false)
		})

		it('false when segments[0] is not a tag (a choice head) or model empty', () => {
			const figure = describeElement('figure')?.childModel
			if (figure === undefined) throw new Error('fixture: figure childModel missing')
			expect(requiresLeadingTag(figure, 'figcaption')).toBe(false)
			expect(requiresLeadingTag({ segments: [], closed: true, note: '' }, 'x')).toBe(false)
		})
	})

	describe('resolveLeadingSingularTag', () => {
		it('returns the tag of a leading `1` or `?` singular slot', () => {
			// details summary(1) and fieldset legend(?) are BOTH singular slots.
			const details = describeElement('details')?.childModel
			const fieldset = describeElement('fieldset')?.childModel
			if (details === undefined || fieldset === undefined) {
				throw new Error('fixture: childModel missing')
			}
			expect(resolveLeadingSingularTag(details)).toBe('summary')
			expect(resolveLeadingSingularTag(fieldset)).toBe('legend')
		})

		it('returns null for a `+` leading tag or a non-tag head (figure choice)', () => {
			// `+` is NOT a singular slot (no upper bound of one).
			expect(
				resolveLeadingSingularTag({
					segments: [{ kind: 'tag', tag: 'tr', count: '+' }],
					closed: true,
					note: '',
				}),
			).toBeNull()
			const figure = describeElement('figure')?.childModel
			if (figure === undefined) throw new Error('fixture: figure childModel missing')
			// figcaption sits inside a `choice`, not a leading tag → null
			// (its position is structure/edge-child's, not cardinality's).
			expect(resolveLeadingSingularTag(figure)).toBeNull()
		})
	})

	describe('countLeadingTag', () => {
		it('counts only DIRECT flat children carrying the tag (nested scoped out)', () => {
			const inner = el('details', {}, [el('summary')])
			const outer = el('details', {}, [el('summary'), el('p'), inner])
			container.appendChild(outer)
			// Only the outer's OWN direct summary counts — the inner
			// <details>'s <summary> is scoped to the inner (the §3 discriminator).
			expect(countLeadingTag(outer, 'summary')).toBe(1)
			expect(countLeadingTag(inner, 'summary')).toBe(1)
		})

		it('counts a duplicate and counts over the FLAT tree (slot-distributed children)', () => {
			const dup = el('details', {}, [el('summary'), el('summary')])
			container.appendChild(dup)
			expect(countLeadingTag(dup, 'summary')).toBe(2)

			// The FLAT-tree discriminator: `countLeadingTag` iterates
			// `flatChildren`. For a `<slot>`, `flatChildren` is its
			// `assignedElements()` — so summaries DISTRIBUTED through a real
			// shadow slot are counted (the light-DOM `children` of the slot is
			// empty; only the flat tree sees the distribution). Two real
			// projected `<summary>` ⇒ count 2 over the slot.
			const shadowHost = el('div')
			const s1 = el('summary')
			const s2 = el('summary')
			shadowHost.append(s1, s2, el('p'))
			container.appendChild(shadowHost)
			const shadow = shadowHost.attachShadow({ mode: 'open' })
			const slot = document.createElement('slot')
			shadow.appendChild(slot)
			// `flatChildren(slot)` === slot.assignedElements() === [s1, s2, p];
			// light `slot.children` is empty — so a light-only count would be 0.
			expect(slot.children.length).toBe(0)
			expect(countLeadingTag(slot, 'summary')).toBe(2)
		})
	})

	// ── finders (flat-tree) ───────────────────────────────────────────────────

	describe('findFlatDescendant', () => {
		it('returns the first match depth-first in document order', () => {
			const target1 = el('em')
			const target2 = el('em')
			const root = el('div', {}, [el('span', {}, [target1]), el('b', {}, [target2])])
			container.appendChild(root)
			// Depth-first: span's <em> (target1) is reached before b's <em>.
			expect(findFlatDescendant(root, (d) => d.tagName === 'EM')).toBe(target1)
		})

		it('returns null when no descendant matches', () => {
			const root = el('div', {}, [el('span'), el('p')])
			container.appendChild(root)
			expect(findFlatDescendant(root, (d) => d.tagName === 'VIDEO')).toBeNull()
		})

		it('descends the FLAT tree — finds a slot-distributed descendant', () => {
			// Real shadow + slot: the light <mark> is distributed into the
			// shadow <slot>; flatDescendants reaches it, light-tree would not
			// see it as a descendant of the shadow content.
			const host = el('div')
			const projected = el('mark')
			host.appendChild(projected)
			container.appendChild(host)
			const shadow = host.attachShadow({ mode: 'open' })
			const wrapper = document.createElement('section')
			const slot = document.createElement('slot')
			wrapper.appendChild(slot)
			shadow.appendChild(wrapper)
			// Flat descendants of host: section → slot → (assigned) mark.
			expect(findFlatDescendant(host, (d) => d.tagName === 'MARK')).toBe(projected)
		})

		it('descends `<template>.content` (the inert fragment)', () => {
			const template = document.createElement('template')
			const li = document.createElement('li')
			template.content.appendChild(li)
			const root = el('ul', {}, [template])
			container.appendChild(root)
			expect(findFlatDescendant(root, (d) => d.tagName === 'LI')).toBe(li)
		})
	})

	describe('findForbiddenDescendant', () => {
		it('empty-forbidden fast-path returns null without traversing', () => {
			const root = el('header', {}, [el('div', {}, [el('footer')])])
			container.appendChild(root)
			expect(findForbiddenDescendant(root, [])).toBeNull()
		})

		it('finds a literal-tag forbidden descendant (flat tree)', () => {
			const footer = el('footer')
			const header = el('header', {}, [el('div', {}, [footer])])
			container.appendChild(header)
			expect(findForbiddenDescendant(header, ['footer'])).toBe(footer)
		})

		it('finds a CATEGORY-forbidden descendant via schema membership', () => {
			// `dt` forbids the `heading` category — <h2> is a heading member.
			const h2 = el('h2')
			const dt = el('dt', {}, [el('span', {}, [h2])])
			container.appendChild(dt)
			expect(findForbiddenDescendant(dt, ['heading'])).toBe(h2)
		})

		it('returns null when nothing forbidden is present', () => {
			const header = el('header', {}, [el('h1'), el('nav')])
			container.appendChild(header)
			expect(findForbiddenDescendant(header, ['header', 'footer'])).toBeNull()
		})
	})

	describe('findMiscategorizedChild', () => {
		it('empty-permits fast-path returns null', () => {
			const div = el('div', {}, [el('td')])
			container.appendChild(div)
			expect(findMiscategorizedChild(div, [])).toBeNull()
		})

		it('flags a DIRECT flat child whose effective categories miss `permits`', () => {
			// permits phrasing; <div> is flow-only (not phrasing) → flagged.
			const bad = el('div')
			const p = el('p', {}, [el('span'), bad])
			container.appendChild(p)
			expect(findMiscategorizedChild(p, ['phrasing'])).toBe(bad)
		})

		it('skips a transparent child and a structural (empty-categories) child', () => {
			// `<a>` transparent → skipped (transparent family owns it);
			// `<td>` empty categories → skipped (structure family owns it).
			const p = el('p', {}, [el('a'), el('td')])
			container.appendChild(p)
			expect(findMiscategorizedChild(p, ['phrasing'])).toBeNull()
		})

		it('returns null when every non-skipped child intersects permits', () => {
			const p = el('p', {}, [el('span'), el('em')])
			container.appendChild(p)
			expect(findMiscategorizedChild(p, ['phrasing'])).toBeNull()
		})
	})

	// ── finders (flat-tree ancestor) ──────────────────────────────────────────

	describe('findFlatAncestor', () => {
		it('returns null when no ancestor matches', () => {
			const leaf = el('span')
			const root = el('div', {}, [el('p', {}, [leaf])])
			container.appendChild(root)
			expect(findFlatAncestor(leaf, (a) => a.tagName === 'ARTICLE')).toBeNull()
		})

		it('matches at the immediate parent and at a deep ancestor', () => {
			const leaf = el('span')
			const parent = el('em', {}, [leaf])
			const root = el('article', {}, [el('section', {}, [parent])])
			container.appendChild(root)
			expect(findFlatAncestor(leaf, (a) => a.tagName === 'EM')).toBe(parent)
			expect(findFlatAncestor(leaf, (a) => a.tagName === 'ARTICLE')).toBe(root)
		})

		it('is ANCESTOR-ONLY — the start node is never tested even if it matches', () => {
			// The discriminator vs. self-inclusive isHiddenNode: an <a> whose
			// predicate is "is an <a>" still returns null because findFlatAncestor
			// starts at flatParent(element), never `element` itself.
			const selfA = el('a')
			const root = el('div', {}, [selfA])
			container.appendChild(root)
			expect(findFlatAncestor(selfA, (a) => a.tagName === 'A')).toBeNull()
			// But a REAL <a> ANCESTOR is found.
			const inner = el('span')
			const outerA = el('a', {}, [inner])
			container.appendChild(outerA)
			expect(findFlatAncestor(inner, (a) => a.tagName === 'A')).toBe(outerA)
		})

		it('walks the FLAT parent chain across a shadow boundary', () => {
			// Real shadow: the host is the flat parent of its shadow children;
			// light-tree `parentElement` would NOT cross this boundary.
			const host = el('div', { id: 'flat-host' })
			container.appendChild(host)
			const shadow = host.attachShadow({ mode: 'open' })
			const inner = document.createElement('span')
			shadow.appendChild(inner)
			expect(findFlatAncestor(inner, (a) => a.id === 'flat-host')).toBe(host)
		})
	})

	describe('hasFlatAncestor', () => {
		it('is the boolean projection of findFlatAncestor', () => {
			const leaf = el('span')
			const root = el('section', {}, [el('em', {}, [leaf])])
			container.appendChild(root)
			expect(hasFlatAncestor(leaf, (a) => a.tagName === 'SECTION')).toBe(true)
			expect(hasFlatAncestor(leaf, (a) => a.tagName === 'NAV')).toBe(false)
		})

		it('is ancestor-only (start node excluded)', () => {
			const node = el('a')
			container.appendChild(node)
			expect(hasFlatAncestor(node, (a) => a.tagName === 'A')).toBe(false)
		})
	})

	describe('hasFlatAncestorTag', () => {
		it('true when any flat ancestor carries one of the tags', () => {
			const leaf = el('span')
			const root = el('nav', {}, [el('ul', {}, [el('li', {}, [leaf])])])
			container.appendChild(root)
			expect(hasFlatAncestorTag(leaf, ['nav'])).toBe(true)
			expect(hasFlatAncestorTag(leaf, ['article', 'aside'])).toBe(false)
		})

		it('crosses a real shadow boundary (flat, not light)', () => {
			const host = el('nav')
			container.appendChild(host)
			const shadow = host.attachShadow({ mode: 'open' })
			const inner = document.createElement('a')
			shadow.appendChild(inner)
			expect(hasFlatAncestorTag(inner, ['nav'])).toBe(true)
		})
	})

	describe('hasLinkAncestorWithHref', () => {
		it('true only for an `a` ancestor that actually carries a non-empty href', () => {
			const img = el('img', { ismap: '' })
			const linked = el('a', { href: '/page' }, [img])
			container.appendChild(linked)
			expect(hasLinkAncestorWithHref(img)).toBe(true)
		})

		it('the extra href predicate discriminates a bare `<a>` (Batch-2 deferral closer)', () => {
			// An <a> WITHOUT href is NOT a hyperlink ancestor — this is exactly
			// why the helper could not collapse to hasFlatAncestorTag(el,['a'])
			// in Batch 1; the generic predicate base closed that deferral.
			const img = el('img')
			const bareA = el('a', {}, [img])
			container.appendChild(bareA)
			expect(hasLinkAncestorWithHref(img)).toBe(false)
		})

		it('false when there is no `a` ancestor at all', () => {
			const img = el('img')
			container.appendChild(el('figure', {}, [img]))
			expect(hasLinkAncestorWithHref(img)).toBe(false)
		})
	})

	// ── attribute / text readers ──────────────────────────────────────────────

	describe('readChildText', () => {
		it('returns the trimmed OWN child text, undefined when empty/whitespace', () => {
			const time = el('time')
			time.append(document.createTextNode('  2026-05-18  '))
			expect(readChildText(time)).toBe('2026-05-18')

			const blank = el('time')
			blank.append(document.createTextNode('   \n\t '))
			expect(readChildText(blank)).toBeUndefined()
			expect(readChildText(el('time'))).toBeUndefined()
		})

		it('counts ONLY the element’s own text nodes, not descendant text', () => {
			// The discriminator: a nested element's text must NOT leak into the
			// datetime value (corpus: the element's child text content).
			const time = el('time')
			time.append(document.createTextNode('own '))
			const span = el('span')
			span.textContent = 'descendant'
			time.appendChild(span)
			expect(readChildText(time)).toBe('own')
		})
	})

	describe('findAttributeRule', () => {
		it('finds the first AttributeRule matching the predicate on a real entry', () => {
			// `<label>` carries a `for` AttributeRule.
			const label = describeElement('label')
			expect(findAttributeRule(label, (r) => r.attribute === 'for')?.attribute).toBe('for')
		})

		it('returns null for a null entry or no match', () => {
			expect(findAttributeRule(null, () => true)).toBeNull()
			expect(findAttributeRule(describeElement('label'), (r) => r.attribute === 'nope')).toBeNull()
		})
	})

	describe('hasAttributeRule', () => {
		it('true iff the entry carries a rule for the attribute', () => {
			expect(hasAttributeRule(describeElement('label'), 'for')).toBe(true)
			expect(hasAttributeRule(describeElement('output'), 'for')).toBe(true)
			expect(hasAttributeRule(describeElement('p'), 'for')).toBe(false)
			expect(hasAttributeRule(null, 'for')).toBe(false)
		})
	})

	describe('schemaConstrainsValues', () => {
		it('true only when the entry carries a CLOSED `values` domain for the attribute', () => {
			// `<bdo>` carries dir with values ['ltr','rtl'] (a closed domain).
			expect(schemaConstrainsValues(describeElement('bdo'), 'dir')).toBe(true)
			// `<label>` carries `for` but with NO values domain → false (the
			// discriminator: presence is not a closed domain).
			expect(schemaConstrainsValues(describeElement('label'), 'for')).toBe(false)
			expect(schemaConstrainsValues(null, 'dir')).toBe(false)
		})
	})

	describe('findOffendingEnumAttribute', () => {
		it('flags a value outside the entry’s schema-carried closed domain', () => {
			// `<bdo dir="sideways">` — dir∈{ltr,rtl}; "sideways" is out.
			const bdo = el('bdo', { dir: 'sideways' })
			container.appendChild(bdo)
			expect(findOffendingEnumAttribute(describeElement('bdo'), bdo)?.attribute).toBe('dir')
		})

		it('ASCII case-insensitive: an in-domain value (any case) is clean', () => {
			const bdo = el('bdo', { dir: 'RTL' })
			container.appendChild(bdo)
			expect(findOffendingEnumAttribute(describeElement('bdo'), bdo)).toBeNull()
			// Absent attribute → clean (no value to coerce).
			expect(findOffendingEnumAttribute(describeElement('bdo'), el('bdo'))).toBeNull()
		})
	})

	describe('findOffendingIntegerBound', () => {
		it('flags a non-integer / out-of-range corpus integer attribute', () => {
			// colspan ∈ [1,1000] on td/th. "0" < min, "abc" not a valid integer.
			expect(findOffendingIntegerBound(el('td', { colspan: '0' }), 'td')?.attribute).toBe('colspan')
			expect(findOffendingIntegerBound(el('td', { colspan: 'abc' }), 'td')?.attribute).toBe(
				'colspan',
			)
			expect(findOffendingIntegerBound(el('td', { rowspan: '99999' }), 'td')?.attribute).toBe(
				'rowspan',
			)
		})

		it('a valid in-range value is clean; the tag carve-out skips non-applicable tags', () => {
			expect(findOffendingIntegerBound(el('td', { colspan: '3' }), 'td')).toBeNull()
			// `colspan` bound is tag-scoped to td/th — a <div colspan> is NOT
			// in scope (the tags carve-out discriminator).
			expect(findOffendingIntegerBound(el('div', { colspan: '0' }), 'div')).toBeNull()
			// HTML valid-integer grammar is STRICT: " 2 " (spaces) is invalid.
			expect(findOffendingIntegerBound(el('td', { colspan: ' 2 ' }), 'td')?.attribute).toBe(
				'colspan',
			)
		})
	})

	describe('findOffendingEnumDomain', () => {
		it('flags a value outside a GLOBAL enum domain (ATTRIBUTE_ENUM_DOMAINS)', () => {
			// `dir` global domain {ltr,rtl,auto}; "upside" is out. `<p>` has no
			// own schema `dir` constraint, so the global rule owns it.
			const p = el('p', { dir: 'upside' })
			container.appendChild(p)
			expect(findOffendingEnumDomain(p, describeElement('p'))?.attribute).toBe('dir')
		})

		it('DEFERS for an attribute the element’s own schema entry constrains', () => {
			// `<bdo>` carries its OWN `dir` AttributeRule with a closed domain
			// — the global-enum rule must skip it (attribute/value owns it).
			// The discriminator: even an out-of-global-domain value here
			// returns null because the carve-out skips schema-constrained attrs.
			const bdo = el('bdo', { dir: 'sideways' })
			container.appendChild(bdo)
			expect(findOffendingEnumDomain(bdo, describeElement('bdo'))).toBeNull()
		})

		it('the empty-string carve-out: contenteditable="" is faithful, not a violation', () => {
			// `contenteditable` domain has `empty:true` (the *true* state).
			const node = el('div', { contenteditable: '' })
			container.appendChild(node)
			expect(findOffendingEnumDomain(node, describeElement('div'))).toBeNull()
			// A genuinely bad keyword still flags.
			const bad = el('div', { contenteditable: 'maybe' })
			container.appendChild(bad)
			expect(findOffendingEnumDomain(bad, describeElement('div'))?.attribute).toBe(
				'contenteditable',
			)
		})
	})

	// ── interaction / reference resolution ────────────────────────────────────

	describe('resolveReferencedId', () => {
		it('an `a` resolves a bare same-document `#id` fragment only', () => {
			const a = el('a', { href: '#section-2' })
			container.appendChild(a)
			expect(resolveReferencedId(subjectFor(container, a))).toBe('section-2')

			// A non-fragment / absolute URL is navigation, NOT an in-document
			// reference → null (the §6.1 scoping discriminator).
			const ext = el('a', { href: 'https://example.test/#x' })
			container.appendChild(ext)
			expect(resolveReferencedId(subjectFor(container, ext))).toBeNull()
			// Bare "#" with no id → null.
			const empty = el('a', { href: '#' })
			container.appendChild(empty)
			expect(resolveReferencedId(subjectFor(container, empty))).toBeNull()
		})

		it('a schema-`for`-carrying element resolves its IDREF (label / output)', () => {
			const label = el('label', { for: 'field-1' })
			container.appendChild(label)
			expect(resolveReferencedId(subjectFor(container, label))).toBe('field-1')
			const output = el('output', { for: 'r' })
			container.appendChild(output)
			expect(resolveReferencedId(subjectFor(container, output))).toBe('r')
		})

		it('null for a non-referrer element or an empty `for` (schema-driven, not a tag literal)', () => {
			// `<span for>` is not a corpus referrer (no `for` AttributeRule on
			// span's schema entry) — the discriminator that proves recognition
			// is schema-data-driven, not a hardcoded tag set.
			const span = el('span', { for: 'x' })
			container.appendChild(span)
			expect(resolveReferencedId(subjectFor(container, span))).toBeNull()
			const label = el('label', { for: '' })
			container.appendChild(label)
			expect(resolveReferencedId(subjectFor(container, label))).toBeNull()
		})
	})

	describe('resolveReferencedTarget', () => {
		it('resolves the same-document target via getElementById', () => {
			const target = el('section', { id: 'tgt' })
			const a = el('a', { href: '#tgt' })
			container.append(a, target)
			expect(resolveReferencedTarget(subjectFor(container, a))).toBe(target)
		})

		it('null when the id does not resolve', () => {
			const a = el('a', { href: '#nope' })
			container.appendChild(a)
			expect(resolveReferencedTarget(subjectFor(container, a))).toBeNull()
		})

		it('resolves over the referring element’s OWN ownerDocument', () => {
			// A detached referrer in a fresh document resolves within THAT
			// document, not the test document (the ownerDocument discriminator).
			const doc = document.implementation.createHTMLDocument('iso')
			const target = doc.createElement('div')
			target.id = 'iso-target'
			doc.body.appendChild(target)
			const a = doc.createElement('a')
			a.setAttribute('href', '#iso-target')
			doc.body.appendChild(a)
			const subject = {
				element: a,
				context: contextFor(container, container),
				tag: 'a',
				entry: describeElement('a'),
				parent: null,
				parentEntry: null,
			}
			expect(resolveReferencedTarget(subject)).toBe(target)
		})
	})

	describe('isHiddenNode', () => {
		it('is SELF-INCLUSIVE — the element itself carrying [hidden] is hidden', () => {
			// The discriminator vs. ancestor-only findFlatAncestor: the start
			// node IS tested.
			const node = el('div', { hidden: '' })
			container.appendChild(node)
			expect(isHiddenNode(node)).toBe(true)
		})

		it('a [hidden] flat ANCESTOR makes a descendant hidden', () => {
			const leaf = el('span')
			const wrapper = el('section', { hidden: '' }, [el('p', {}, [leaf])])
			container.appendChild(wrapper)
			expect(isHiddenNode(leaf)).toBe(true)
		})

		it('hidden=until-found is treated as hidden (conservative corpus reading)', () => {
			const node = el('div', { hidden: 'until-found' })
			container.appendChild(node)
			expect(isHiddenNode(node)).toBe(true)
		})

		it('a fully-visible chain is not hidden; walks the FLAT parent chain', () => {
			const leaf = el('span')
			container.appendChild(el('div', {}, [el('p', {}, [leaf])]))
			expect(isHiddenNode(leaf)).toBe(false)

			// Real shadow: a [hidden] host hides its shadow descendants via the
			// flat parent chain (light `closest` would miss it).
			const host = el('div', { hidden: '' })
			container.appendChild(host)
			const shadow = host.attachShadow({ mode: 'open' })
			const inner = document.createElement('span')
			shadow.appendChild(inner)
			expect(isHiddenNode(inner)).toBe(true)
		})
	})

	// ── presentation readers (real computed / inline style) ───────────────────

	describe('readStyleValue', () => {
		it('returns the trimmed lowercased REAL computed value', () => {
			const box = el('div') as HTMLElement
			box.style.display = 'flex'
			container.appendChild(box)
			const ctx = contextFor(container, box)
			expect(readStyleValue(ctx, 'display')).toBe('flex')
		})

		it('reflects a UA / cascade default (real CSSOM, not a parsed string)', () => {
			// `<bdo>` resolves `unicode-bidi` to an isolate-override via the UA
			// sheet — a non-trivial real computed value the presentation lens
			// reads. Assert it is a real resolved keyword, not empty.
			const bdo = el('bdo')
			bdo.textContent = 'x'
			container.appendChild(bdo)
			const value = readStyleValue(contextFor(container, bdo), 'unicode-bidi')
			expect(value.length).toBeGreaterThan(0)
			expect(value).toBe(value.toLowerCase())
		})
	})

	describe('readRoleTokens', () => {
		it('splits the role attribute into a lowercased token list', () => {
			expect(readRoleTokens(el('div', { role: 'Button   Link' }))).toEqual(['button', 'link'])
		})

		it('absent role → empty; whitespace-only → empty', () => {
			expect(readRoleTokens(el('div'))).toEqual([])
			expect(readRoleTokens(el('div', { role: '   ' }))).toEqual([])
		})
	})

	describe('readHiddenState', () => {
		it('distinguishes plain, until-found (ASCII case-insensitive), and absent', () => {
			expect(readHiddenState(el('div', { hidden: '' }))).toBe('plain')
			expect(readHiddenState(el('div', { hidden: 'hidden' }))).toBe('plain')
			expect(readHiddenState(el('div', { hidden: 'until-found' }))).toBe('until-found')
			expect(readHiddenState(el('div', { hidden: 'UNTIL-FOUND' }))).toBe('until-found')
			expect(readHiddenState(el('div'))).toBeNull()
		})
	})

	describe('isPopoverOpen', () => {
		it('false for a closed popover, true once shown (real :popover-open)', () => {
			const pop = el('div', { popover: '' }) as HTMLElement
			container.appendChild(pop)
			expect(isPopoverOpen(pop)).toBe(false)
			pop.showPopover()
			expect(isPopoverOpen(pop)).toBe(true)
			pop.hidePopover()
			expect(isPopoverOpen(pop)).toBe(false)
		})

		it('a non-popover element never matches :popover-open', () => {
			const plain = el('div')
			container.appendChild(plain)
			expect(isPopoverOpen(plain)).toBe(false)
		})
	})

	describe('readInlineStyle', () => {
		it('returns the element’s inline style declaration (author intent, not computed)', () => {
			const node = el('div') as HTMLElement
			node.style.color = 'rgb(1, 2, 3)'
			container.appendChild(node)
			const decl = readInlineStyle(node)
			expect(decl).not.toBeNull()
			// It is the INLINE declaration — only the explicitly-set property,
			// NOT a full computed cascade (the documented-boundary discriminator).
			expect(decl?.color).toBe('rgb(1, 2, 3)')
			expect(decl?.display).toBe('')
		})

		it('returns null for a non-HTMLElement (e.g. an SVG element)', () => {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
			expect(readInlineStyle(svg as unknown as Element)).toBeNull()
		})
	})

	// ── perturbation (seeded, reproducible, BITES) ────────────────────────────

	describe('perturbation — child-model verdicts are reproducible & bite', () => {
		it('seeded valid/invalid <picture> models: satisfiesChildModel matches the construction', () => {
			// A genuine cardinality exercise (all tags admissible — source/img):
			// valid = source* then ONE img; invalid = the required img MISSING.
			// Same seed ⇒ same tree ⇒ same verdict; the expected verdict is the
			// discriminator that fails if matchSegments/satisfiesCount is wrong.
			const model = describeElement('picture')?.childModel
			if (model === undefined) throw new Error('fixture: picture childModel missing')
			for (const seed of [3, 47, 911, 30303]) {
				const random = createRandom(seed)
				const valid = random() < 0.5
				const sources = Math.floor(random() * 3)

				const buildOnce = (): boolean => {
					const kids: Element[] = []
					for (let i = 0; i < sources; i += 1) kids.push(el('source'))
					if (valid) kids.push(el('img'))
					return satisfiesChildModel(kids, model)
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				expect(first).toBe(valid)
			}
		})

		it('seeded duplicate-leading-singular detection is reproducible & exact', () => {
			// `<details>` permits AT MOST ONE <summary> (resolveLeadingSingularTag
			// = 'summary'). dup ⇒ countLeadingTag > 1; the verdict the rule
			// layer keys off must track the seeded construction exactly.
			for (const seed of [8, 64, 808, 80808]) {
				const random = createRandom(seed)
				const duplicate = random() < 0.5

				const buildOnce = (): boolean => {
					const kids = duplicate
						? [el('summary'), el('summary'), el('p')]
						: [el('summary'), el('p')]
					const details = el('details', {}, kids)
					container.appendChild(details)
					const singular = resolveLeadingSingularTag(
						describeElement('details')?.childModel ?? {
							segments: [],
							closed: false,
							note: '',
						},
					)
					const over = singular !== null && countLeadingTag(details, singular) > 1
					details.remove()
					return over
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				expect(first).toBe(duplicate)
			}
		})

		it('seeded flat-ancestor link detection bites both directions', () => {
			// hasLinkAncestorWithHref discriminator: an <a href> ancestor ⇒
			// true; a bare <a> (no href) ⇒ false. Flip the construction, flip
			// the verdict — reproducible from the seed.
			for (const seed of [2, 26, 262, 20202]) {
				const random = createRandom(seed)
				const hasHref = random() < 0.5

				const buildOnce = (): boolean => {
					const img = el('img')
					const a = hasHref ? el('a', { href: '/p' }, [img]) : el('a', {}, [img])
					container.appendChild(a)
					const verdict = hasLinkAncestorWithHref(img)
					a.remove()
					return verdict
				}

				const first = buildOnce()
				const second = buildOnce()
				expect(first).toBe(second)
				expect(first).toBe(hasHref)
			}
		})
	})
})
