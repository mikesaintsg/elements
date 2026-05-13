// ============================================================================
//  Style-folder pattern surface — TS shape + invariants.
//
//  Asserts that FOLDER_CONTRACTS, FILE_EXCEPTIONS, the SelectorKind type,
//  and the classification helpers form a coherent, self-consistent surface.
//  The cross-folder cascade assertions live in
//  tests/src/styles/_contracts.test.ts (the test that consumes this data).
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	FILE_EXCEPTIONS,
	FOLDER_CONTRACTS,
	STATE_SELECTOR_REGEX,
	STYLE_LAYERS,
	allowedTokenPrefixes,
	classifyHeadSelector,
	exceptionFor,
	hasFreeTokenNamespace,
	hasPseudoElement,
	hasStateSelector,
	partialBasename,
	partialFolder,
	type SelectorKind,
	type StyleLayer,
} from '@elements/browser'

// ── 1. Shape ───────────────────────────────────────────────────────────────

describe('patterns — FOLDER_CONTRACTS shape', () => {
	it('declares one contract per style layer', () => {
		const keys = Object.keys(FOLDER_CONTRACTS).sort()
		expect(keys).toEqual(['components', 'composables', 'elements', 'modifiers', 'surfaces'])
	})

	it('every contract carries a non-empty description', () => {
		for (const contract of Object.values(FOLDER_CONTRACTS)) {
			expect(contract.description.length).toBeGreaterThan(20)
		}
	})

	it('every contract has at least one allowed head kind', () => {
		for (const contract of Object.values(FOLDER_CONTRACTS)) {
			expect(contract.allowedHeadKinds.length).toBeGreaterThan(0)
		}
	})

	it('every forbidden head kind carries a non-empty recommendation', () => {
		for (const contract of Object.values(FOLDER_CONTRACTS)) {
			for (const forbidden of contract.forbiddenHeadKinds) {
				expect(forbidden.recommendation.length).toBeGreaterThan(10)
			}
		}
	})

	it('allowed and forbidden head kinds do not overlap', () => {
		for (const [folder, contract] of Object.entries(FOLDER_CONTRACTS)) {
			const allowed = new Set(contract.allowedHeadKinds)
			const overlap = contract.forbiddenHeadKinds.filter((f) => allowed.has(f.kind))
			expect(
				overlap,
				`${folder}/: kinds appear in both allow + forbid lists: ${overlap.map((f) => f.kind).join(', ')}`,
			).toEqual([])
		}
	})

	it('STYLE_LAYERS enumerates the same set as FOLDER_CONTRACTS', () => {
		expect([...STYLE_LAYERS].sort()).toEqual(Object.keys(FOLDER_CONTRACTS).sort())
	})

	it('exactly one folder requires a state selector (composables)', () => {
		const required = Object.entries(FOLDER_CONTRACTS).filter(
			([, contract]) => contract.requireStateSelector,
		)
		expect(required.map(([f]) => f)).toEqual(['composables'])
	})
})

describe('patterns — FILE_EXCEPTIONS shape', () => {
	it('every exception path matches the {folder}/_{name}.scss pattern', () => {
		const valid = /^(elements|modifiers|surfaces|components|composables)\/_[a-z][a-z0-9-]*\.scss$/
		for (const key of Object.keys(FILE_EXCEPTIONS)) {
			expect(key, `${key} does not match {folder}/_{name}.scss`).toMatch(valid)
		}
	})

	it('every exception carries a non-empty note', () => {
		for (const [key, exception] of Object.entries(FILE_EXCEPTIONS)) {
			expect(exception.note.length, `${key} note is too short`).toBeGreaterThan(20)
		}
	})

	it('exceptions only reference real folders', () => {
		const folders = new Set(STYLE_LAYERS as readonly string[])
		for (const key of Object.keys(FILE_EXCEPTIONS)) {
			const folder = key.split('/')[0]!
			expect(folders.has(folder), `${key} references unknown folder ${folder}`).toBe(true)
		}
	})
})

// ── 2. Classification helpers ──────────────────────────────────────────────

describe('patterns — classifyHeadSelector', () => {
	const cases: ReadonlyArray<{
		readonly selector: string
		readonly expected: SelectorKind
		readonly note?: string
	}> = [
		{ selector: 'button', expected: 'tag' },
		{ selector: 'dialog.scrollable[open]', expected: 'tag', note: 'head is the tag' },
		{ selector: 'button.dropdown::after', expected: 'tag', note: 'pseudo on a tag head' },
		{ selector: 'body:has(main) > main', expected: 'tag', note: 'descendant after head' },
		{ selector: '.badge', expected: 'class' },
		{ selector: '.badge.primary', expected: 'class', note: 'compound class' },
		{ selector: '.stack', expected: 'class' },
		{ selector: '::backdrop', expected: 'pseudo-element' },
		{ selector: '::marker', expected: 'pseudo-element' },
		{ selector: '::view-transition-old(root)', expected: 'pseudo-element' },
		{ selector: ':root', expected: 'root' },
		{ selector: ':root, body', expected: 'root' },
		{ selector: ':focus-visible', expected: 'pseudo-class' },
		{ selector: ':popover-open', expected: 'pseudo-class' },
		{ selector: '*', expected: 'universal' },
		{ selector: '*::before', expected: 'universal' },
		{ selector: '[popover]', expected: 'attribute' },
		{ selector: '[open]', expected: 'attribute' },
		{ selector: '[data-toast-stack]', expected: 'data-attribute' },
		{ selector: "[aria-selected='true']", expected: 'aria-attribute' },
		{ selector: "[role='tablist']", expected: 'role-attribute' },
		{ selector: '&.primary', expected: 'nested' },
		{ selector: '&:hover', expected: 'nested' },
		{ selector: '@media (max-width: 960px)', expected: 'at-rule' },
		{ selector: '', expected: 'unknown' },
		// Functional pseudos peer into the inner subject:
		{ selector: ':where(h1, h2, h3)', expected: 'tag', note: 'inner head' },
		{ selector: ':is(aside, nav)', expected: 'tag', note: 'inner head' },
		{ selector: ':not(dialog)', expected: 'tag', note: 'inner head' },
		{ selector: ':is(.foo, .bar)', expected: 'class', note: 'inner head' },
		{ selector: ':where([popover])', expected: 'attribute', note: 'inner head' },
	]

	it.each(cases)('classifies $selector as $expected', ({ selector, expected }) => {
		expect(classifyHeadSelector(selector)).toBe(expected)
	})
})

describe('patterns — hasStateSelector', () => {
	const stateful: readonly string[] = [
		'[data-toast-stack]',
		'[data-form-validated] input',
		"[aria-selected='true']",
		"[aria-expanded='true']",
		"[role='tablist']",
		'dialog[open]',
		'[popover]:popover-open',
		'output[popover]:popover-open',
		'dialog:modal',
		'details[open]',
	]

	const stateless: readonly string[] = [
		'button',
		'.badge',
		'.stack > *',
		'button.dropdown',
		'::backdrop',
		':focus-visible',
		'body:has(main) > main',
	]

	it.each(stateful)('%s contains a state selector', (s) => {
		expect(hasStateSelector(s)).toBe(true)
	})

	it.each(stateless)('%s does not contain a state selector', (s) => {
		expect(hasStateSelector(s)).toBe(false)
	})

	it('STATE_SELECTOR_REGEX is referenced consistently', () => {
		// Smoke-check that the exported regex matches the helper's behaviour.
		expect(STATE_SELECTOR_REGEX.test('[data-toast-stack]')).toBe(true)
		expect(STATE_SELECTOR_REGEX.test('button')).toBe(false)
	})
})

describe('patterns — hasPseudoElement', () => {
	it.each([
		['::backdrop', true],
		['button::after', true],
		['summary::before', true],
		['::view-transition-old(root)', true],
		['button', false],
		[':hover', false],
		[':focus-visible', false],
		['.badge', false],
	] as const)('%s → %s', (selector, expected) => {
		expect(hasPseudoElement(selector)).toBe(expected)
	})
})

// ── 3. Path helpers ────────────────────────────────────────────────────────

describe('patterns — path helpers', () => {
	const cases: ReadonlyArray<{
		readonly path: string
		readonly folder: StyleLayer | null
		readonly basename: string
	}> = [
		{ path: 'src/styles/elements/_button.scss', folder: 'elements', basename: 'button' },
		{ path: 'src/styles/elements/_h1-h6.scss', folder: 'elements', basename: 'h1-h6' },
		{ path: 'src/styles/components/_role-group.scss', folder: 'components', basename: 'role-group' },
		{ path: 'src/styles/modifiers/_local.scss', folder: 'modifiers', basename: 'local' },
		{ path: 'src/styles/surfaces/_anchor-position.scss', folder: 'surfaces', basename: 'anchor-position' },
		{ path: 'src/styles/composables/_dialog.scss', folder: 'composables', basename: 'dialog' },
		{ path: 'src/styles/_tokens.scss', folder: null, basename: 'tokens' },
		// index.scss has no `_` prefix → partialFolder + partialBasename both return null/'' by design;
		// the helpers strictly target `_{name}.scss` partials, not barrel files.
		{ path: 'src/styles/elements/index.scss', folder: null, basename: '' },
	]

	for (const { path, folder, basename } of cases) {
		it(`${path} → folder ${folder ?? 'null'}, basename '${basename}'`, () => {
			expect(partialFolder(path)).toBe(folder)
			expect(partialBasename(path)).toBe(basename)
		})
	}
})

// ── 4. Token namespace policy ──────────────────────────────────────────────

describe('patterns — allowedTokenPrefixes resolves per folder + filename + exceptions', () => {
	it('elements/_button.scss → [button]', () => {
		expect(allowedTokenPrefixes('src/styles/elements/_button.scss')).toEqual(['button'])
	})

	it('elements/_h1-h6.scss → [h1-h6, heading] (exception adds heading)', () => {
		expect(allowedTokenPrefixes('src/styles/elements/_h1-h6.scss')).toEqual(['h1-h6', 'heading'])
	})

	it('modifiers/_variants.scss → [variant, size, style, state, placement]', () => {
		const prefixes = allowedTokenPrefixes('src/styles/modifiers/_variants.scss')
		expect(prefixes).toContain('variant')
		expect(prefixes).toContain('size')
		expect(prefixes).toContain('style')
		expect(prefixes).toContain('state')
		expect(prefixes).toContain('placement')
	})

	it('surfaces/_popover.scss → [popover, popover-hint, anchor] (exception adds popover-hint, anchor)', () => {
		const prefixes = allowedTokenPrefixes('src/styles/surfaces/_popover.scss')
		expect(prefixes).toEqual(['popover', 'popover-hint', 'anchor'])
	})

	it('components/_div.scss → [div, stack, cluster] (exception adds stack, cluster)', () => {
		const prefixes = allowedTokenPrefixes('src/styles/components/_div.scss')
		expect(prefixes).toEqual(['div', 'stack', 'cluster'])
	})

	it('composables/_dialog.scss → wildcard (composables are free namespace)', () => {
		expect(hasFreeTokenNamespace('src/styles/composables/_dialog.scss')).toBe(true)
	})
})

// ── 5. Exception lookup ────────────────────────────────────────────────────

describe('patterns — exceptionFor', () => {
	it('composables/_aside.scss exception exists and skips state-selector check', () => {
		const exception = exceptionFor('src/styles/composables/_aside.scss')
		expect(exception).not.toBeNull()
		expect(exception?.skipStateSelectorCheck).toBe(true)
		expect(exception?.allowCommentOnly).toBe(true)
	})

	it('elements/_button.scss has no exception', () => {
		expect(exceptionFor('src/styles/elements/_button.scss')).toBeNull()
	})

	it('components/_aside.scss exception extends namespace with callout + alert', () => {
		const exception = exceptionFor('src/styles/components/_aside.scss')
		expect(exception?.additionalTokenPrefixes).toContain('callout')
		expect(exception?.additionalTokenPrefixes).toContain('alert')
	})
})
