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

import { afterEach, describe, expect, it } from 'vitest'
import {
	BODY_LOCKED_ATTR,
	TABLE_ARIA_ROWCOUNT,
	TABLE_ARIA_ROWINDEX,
	TABLE_EXPANSION_ATTR,
	alignmentOf,
	areaForPopoverPlacement,
	applyRowCount,
	applyRowIndex,
	assertElement,
	attachListeners,
	bindEventMap,
	cleanTableSelection,
	compareCellValues,
	createMatcher,
	cssEscape,
	dispatch,
	emit,
	entry,
	extractProperty,
	extractRow,
	extractRowId,
	extractRows,
	extractTypes,
	fieldName,
	findDetailRow,
	focusableItems,
	generateId,
	hasAttribute,
	hasClass,
	hasClasses,
	hasId,
	indexOfRow,
	isDragDropDetail,
	isDragOverDetail,
	isDragStartDetail,
	isDragTapDetail,
	isDropPosition,
	isElement,
	isEventHandler,
	isFormFieldElement,
	isHTMLElement,
	isMouseEvent,
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
	matchesTag,
	normalizeIndex,
	readFormData,
	readFormErrors,
	readFormFields,
	readFormNames,
	readTableCells,
	readTableColumns,
	readTableData,
	readTableFooter,
	readTableHeaders,
	readTableRows,
	resolvePopoverSide,
	rove,
	runTransition,
	selfsForPopoverPlacement,
	sideOf,
	splitTopLevel,
	tableBody,
	tableFooterRow,
	tableHeaderRow,
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
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		)
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
		expect(() =>
			assertElement(document.createElement('div'), 'dialog', 'useDialog'),
		).toThrow(TypeError)
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
		expect(
			isDragOverDetail({ index: 2, position: 'nope', target, pointer, types: [] }),
		).toBe(false)
		expect(
			isDragOverDetail({ index: 2, position: 'before', target: {}, pointer, types: [] }),
		).toBe(false)
		expect(
			isDragOverDetail({ index: 2, position: 'before', target, pointer, types: [1] }),
		).toBe(false)
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
		expect(
			isDragDropDetail({ index: 0, position: 'after', target, pointer, types: 'x' }),
		).toBe(false)
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
		expect(areaForPopoverPlacement('nonsense' as never)).toBe(
			areaForPopoverPlacement('bottom'),
		)
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
