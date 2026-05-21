// ============================================================================
//  guides/patterns.md ↔ src/browser/patterns.ts ↔ src/styles/
//
//  Single-file driver for every patterns-guide parity check. Sections map
//  to patterns.md:
//
//    1. TS surface shape           — FOLDER_CONTRACTS, FILE_EXCEPTIONS,
//                                    STYLE_LAYERS, INTERACTIVE_ELEMENTS.
//    2. Classification helpers     — classifyHeadSelector, hasStateSelector,
//                                    hasPseudoElement, BARE_FOCUS_REGEX,
//                                    hasBareFocusRule, mixin regexes,
//                                    hasChainedTagNots, hasScopingFunction,
//                                    classQualifiers.
//    3. Path helpers               — partialFolder, partialBasename,
//                                    allowedTokenPrefixes,
//                                    hasFreeTokenNamespace, exceptionFor.
//    4. Folder structural contract — every partial wraps in its layer, has
//                                    an allowed rule head, gates composables
//                                    on state selectors, declares only
//                                    namespaced tokens, and pairs each
//                                    composable with a create{Name} factory.
//    5. Structural pairings        — every `parent > child` tag pair in
//                                    compiled selectors is on the
//                                    STRUCTURAL_PAIRINGS allowlist; plus
//                                    extractTagPairs unit checks.
//    6. Scope discipline           — no chained :not(tag) / :not([attr]);
//                                    cross-cutting modifier rules carry an
//                                    explicit `:not(:where(...))` /
//                                    `:is(...)` scope.
//    7. Interactive minimum        — every INTERACTIVE_ELEMENTS member
//                                    invokes @include forced-colors and
//                                    declares :focus-visible chrome; no
//                                    partial under src/styles/ uses bare
//                                    :focus.
//
//  Pure node — SCSS sources read via node:fs (`tests/setupServer.ts`).
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	BARE_FOCUS_REGEX,
	FILE_EXCEPTIONS,
	FOLDER_CONTRACTS,
	FORCED_COLORS_INCLUDE_REGEX,
	INTERACTIVE_ELEMENTS,
	STATE_SELECTOR_REGEX,
	STRUCTURAL_PAIRINGS,
	STYLE_LAYERS,
	TRANSITION_INCLUDE_REGEX,
	allowedTokenPrefixes,
	classQualifiers,
	classifyHeadSelector,
	exceptionFor,
	extractTagPairs,
	hasBareFocusRule,
	hasChainedTagNots,
	hasFreeTokenNamespace,
	hasPseudoElement,
	hasScopingFunction,
	hasStateSelector,
	isAllowedTagPair,
	isInteractive,
	modifiers,
	pairingFor,
	partialBasename,
	partialFolder,
	type SelectorKind,
	type StyleLayer,
} from '@elements/browser'
import {
	extractRuleOpeners,
	extractSetTokenDeclarations,
	findLayerDirectives,
	leaves,
	relativeStylesPath,
	stripComments,
	tagFromPath,
} from '../setup'
import { readAllStyleSources, readFactorySources, readScssPartials } from '../setupServer'

const sources = readAllStyleSources()

// ============================================================================
//  1. TS surface shape
// ============================================================================

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
			expect(contract.head.allowed.length).toBeGreaterThan(0)
		}
	})

	it('every forbidden head kind carries a non-empty recommendation', () => {
		for (const contract of Object.values(FOLDER_CONTRACTS)) {
			for (const forbidden of contract.head.forbidden) {
				expect(forbidden.recommendation.length).toBeGreaterThan(10)
			}
		}
	})

	it('allowed and forbidden head kinds do not overlap', () => {
		for (const [folder, contract] of Object.entries(FOLDER_CONTRACTS)) {
			const allowed = new Set(contract.head.allowed)
			const overlap = contract.head.forbidden.filter((f) => allowed.has(f.kind))
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
			([, contract]) => contract.state.required,
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

describe('patterns — INTERACTIVE_ELEMENTS registry', () => {
	it('is a non-empty closed set of single-word tag names', () => {
		expect(INTERACTIVE_ELEMENTS.size).toBeGreaterThan(0)
		for (const tag of INTERACTIVE_ELEMENTS) {
			expect(tag).toMatch(/^[a-z][a-z0-9-]*$/)
		}
	})

	it('includes the documented interactive tags', () => {
		// These ten are the framework's intentional interaction surface. If
		// the set drifts (someone adds / removes a tag), this test surfaces
		// it so the change is deliberate.
		const expected = [
			'a',
			'button',
			'details',
			'dialog',
			'fieldset',
			'input',
			'label',
			'select',
			'summary',
			'textarea',
		]
		for (const tag of expected) {
			expect(INTERACTIVE_ELEMENTS.has(tag), `INTERACTIVE_ELEMENTS missing '${tag}'`).toBe(true)
		}
	})

	it('isInteractive() mirrors the set', () => {
		for (const tag of INTERACTIVE_ELEMENTS) {
			expect(isInteractive(tag)).toBe(true)
		}
		// Passive elements never count as interactive.
		expect(isInteractive('p')).toBe(false)
		expect(isInteractive('section')).toBe(false)
		expect(isInteractive('article')).toBe(false)
		expect(isInteractive('h1')).toBe(false)
		expect(isInteractive('not-a-tag')).toBe(false)
	})
})

// ============================================================================
//  2. Classification helpers
// ============================================================================

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

describe('patterns — BARE_FOCUS_REGEX', () => {
	const bareFocus: readonly string[] = [
		':focus',
		'&:focus',
		':focus,',
		':focus {',
		'a:focus',
		'input:focus',
	]
	const focusVisible: readonly string[] = [
		':focus-visible',
		'&:focus-visible',
		':focus-within',
		':focus-visible, :focus-within',
		'button:focus-visible',
	]

	it.each(bareFocus)('%s — matches bare :focus', (input) => {
		expect(BARE_FOCUS_REGEX.test(input)).toBe(true)
	})

	it.each(focusVisible)('%s — does NOT match bare :focus', (input) => {
		expect(BARE_FOCUS_REGEX.test(input)).toBe(false)
	})
})

describe('patterns — hasBareFocusRule strips functional-pseudo bodies', () => {
	it('flags bare :focus rule selectors as drift', () => {
		expect(hasBareFocusRule('button:focus { color: red; }')).toBe(true)
		expect(hasBareFocusRule('&:focus { outline: 2px; }')).toBe(true)
	})

	it('exempts :focus inside :not() / :is() / :where() / :has() functional pseudos', () => {
		expect(hasBareFocusRule(':not(:focus) { color: gray; }')).toBe(false)
		expect(hasBareFocusRule(':is(:focus, :hover) { … }')).toBe(false)
		expect(hasBareFocusRule(':where(:focus) { … }')).toBe(false)
		expect(hasBareFocusRule(':has(:focus) { background: white; }')).toBe(false)
		expect(
			hasBareFocusRule(
				'input:invalid:not(:placeholder-shown):not(:focus) { border: 1px solid red; }',
			),
		).toBe(false)
	})

	it('catches bare :focus even when surrounding text has functional pseudos elsewhere', () => {
		expect(hasBareFocusRule('input:focus { color: red; } /* unrelated */ :is(.a, .b) { … }')).toBe(
			true,
		)
	})

	it('preserves :focus-visible / :focus-within as non-drift', () => {
		expect(hasBareFocusRule(':focus-visible { outline: 2px; }')).toBe(false)
		expect(hasBareFocusRule('&:focus-within { background: tint; }')).toBe(false)
	})
})

describe('patterns — mixin-invocation regexes', () => {
	it('FORCED_COLORS_INCLUDE_REGEX matches the mixin', () => {
		expect(FORCED_COLORS_INCLUDE_REGEX.test('@include forced-colors {')).toBe(true)
		expect(FORCED_COLORS_INCLUDE_REGEX.test('@include forced-colors;')).toBe(true)
		expect(FORCED_COLORS_INCLUDE_REGEX.test('@include transition(...)')).toBe(false)
	})

	it('TRANSITION_INCLUDE_REGEX matches the mixin', () => {
		expect(TRANSITION_INCLUDE_REGEX.test('@include transition(color)')).toBe(true)
		expect(TRANSITION_INCLUDE_REGEX.test('@include transition((color, bg))')).toBe(true)
		expect(TRANSITION_INCLUDE_REGEX.test('@include forced-colors {')).toBe(false)
	})
})

describe('patterns — scope-discipline helpers', () => {
	it('hasChainedTagNots flags 2+ sequential :not(tag) or :not([attr]) qualifiers', () => {
		expect(hasChainedTagNots('[popover]:not(aside):not(nav)')).toBe(true)
		expect(hasChainedTagNots(':not(a):not(b):not(c)')).toBe(true)
		expect(
			hasChainedTagNots('input:not([type=checkbox]):not([type=radio]):not([type=range])'),
		).toBe(true)
	})

	it('hasChainedTagNots accepts single :not() or flattened :not(:where(...))', () => {
		expect(hasChainedTagNots(':not(aside)')).toBe(false)
		expect(hasChainedTagNots(':not(:where(aside, nav, output))')).toBe(false)
		expect(hasChainedTagNots('[popover].top')).toBe(false)
	})

	it('hasChainedTagNots exempts pseudo-class chains (state / position)', () => {
		expect(hasChainedTagNots(':not(:first-child):not(:last-child)')).toBe(false)
		expect(hasChainedTagNots('input:not(:placeholder-shown):not(:focus)')).toBe(false)
		expect(hasChainedTagNots('button:not(:disabled):not(.loading)')).toBe(false)
	})

	it('hasScopingFunction recognizes :where() and :is() functional pseudos', () => {
		expect(hasScopingFunction(':where(aside, nav)')).toBe(true)
		expect(hasScopingFunction(':is(button, a)')).toBe(true)
		expect(hasScopingFunction(':not(:where(aside, nav, output))')).toBe(true)
	})

	it('hasScopingFunction rejects unscoped / bare selectors', () => {
		expect(hasScopingFunction('[popover].top')).toBe(false)
		expect(hasScopingFunction('button.dropdown')).toBe(false)
		expect(hasScopingFunction(':not(button)')).toBe(false)
	})

	it('classQualifiers returns class-name qualifiers in source order', () => {
		expect(classQualifiers('[popover].top')).toEqual(['top'])
		expect(classQualifiers('.badge.primary.large')).toEqual(['badge', 'primary', 'large'])
		expect(classQualifiers(':is(button, a)[popover].drawer.subtle')).toEqual(['drawer', 'subtle'])
		expect(classQualifiers('h1')).toEqual([])
		expect(classQualifiers('::backdrop')).toEqual([])
	})
})

// ============================================================================
//  3. Path helpers + namespace policy
// ============================================================================

describe('patterns — path helpers', () => {
	const cases: ReadonlyArray<{
		readonly path: string
		readonly folder: StyleLayer | null
		readonly basename: string
	}> = [
		{ path: 'src/styles/elements/_button.scss', folder: 'elements', basename: 'button' },
		{ path: 'src/styles/elements/_h1-h6.scss', folder: 'elements', basename: 'h1-h6' },
		{
			path: 'src/styles/components/_role-group.scss',
			folder: 'components',
			basename: 'role-group',
		},
		{ path: 'src/styles/modifiers/_local.scss', folder: 'modifiers', basename: 'local' },
		{
			path: 'src/styles/surfaces/_anchor-position.scss',
			folder: 'surfaces',
			basename: 'anchor-position',
		},
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

	it('components/_div.scss → [div, stack, cluster, tiles] (exception adds stack, cluster, tiles)', () => {
		const prefixes = allowedTokenPrefixes('src/styles/components/_div.scss')
		expect(prefixes).toEqual(['div', 'stack', 'cluster', 'tiles'])
	})

	it('composables/_dialog.scss → wildcard (composables are free namespace)', () => {
		expect(hasFreeTokenNamespace('src/styles/composables/_dialog.scss')).toBe(true)
	})
})

describe('patterns — exceptionFor', () => {
	it('composables/_aside.scss exception exists and skips state-selector check', () => {
		const exception = exceptionFor('src/styles/composables/_aside.scss')
		expect(exception).not.toBeNull()
		expect(exception?.state?.required).toBe(false)
		expect(exception?.comments?.allowed).toBe(true)
	})

	it('elements/_button.scss has no exception', () => {
		expect(exceptionFor('src/styles/elements/_button.scss')).toBeNull()
	})

	it('components/_aside.scss exception extends namespace with callout + alert', () => {
		const exception = exceptionFor('src/styles/components/_aside.scss')
		expect(exception?.tokens?.extras).toContain('callout')
		expect(exception?.tokens?.extras).toContain('alert')
	})
})

// ============================================================================
//  4. Folder structural contract — every partial obeys its FOLDER_CONTRACTS entry
// ============================================================================

function tokenPrefixOf(name: string): string {
	const stripped = name.replace(/^--set-/, '')
	const dash = stripped.indexOf('-')
	if (dash === -1) return stripped
	return stripped.slice(0, dash)
}

function tokenAllowed(name: string, prefixes: readonly string[]): boolean {
	if (prefixes.includes('*')) return true
	for (const prefix of prefixes) {
		if (name === `--set-${prefix}`) return true
		if (name.startsWith(`--set-${prefix}-`)) return true
	}
	return false
}

function splitSelectorBranches(selector: string): readonly string[] {
	const out: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < selector.length; i += 1) {
		const ch = selector[i]
		if (ch === '(' || ch === '[') depth += 1
		else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
		else if (ch === ',' && depth === 0) {
			const branch = selector.slice(start, i).trim()
			if (branch.length > 0) out.push(branch)
			start = i + 1
		}
	}
	const last = selector.slice(start).trim()
	if (last.length > 0) out.push(last)
	return out
}

interface Partial {
	readonly path: string
	readonly relative: string
	readonly folder: StyleLayer
	readonly basename: string
	readonly source: string
	readonly stripped: string
}

const partials: readonly Partial[] = Object.entries(sources)
	.map(([path, source]): Partial | null => {
		const normalised = path.replace(/\\/g, '/')
		const folder = partialFolder(normalised)
		if (folder === null) return null
		const basename = partialBasename(normalised)
		if (basename === '' || basename === 'index') return null
		const relative = relativeStylesPath(normalised)
		return {
			path: normalised,
			relative,
			folder,
			basename,
			source,
			stripped: stripComments(source),
		}
	})
	.filter((p): p is Partial => p !== null)

describe('contracts — every partial wraps rules in its folder layer', () => {
	for (const partial of partials) {
		const contract = FOLDER_CONTRACTS[partial.folder]
		const exception = exceptionFor(partial.path)
		const commentOnlyAllowed = exception?.comments?.allowed ?? contract.comments.allowed
		const layers = findLayerDirectives(partial.stripped)
		const hasRules = /[^\s]\s*\{/.test(partial.stripped)

		// On failure:
		//   - comment-only stub: `${partial.relative}` is comment-only but
		//     the `${partial.folder}/` folder forbids stubs.
		//   - has rules: `${partial.relative}` has rules but no
		//     `@layer ${partial.folder}` wrapper.
		it(`${partial.relative} → wraps in @layer ${partial.folder} (or is a documented comment-only stub)`, () => {
			const ok = hasRules ? layers.includes(partial.folder) : commentOnlyAllowed
			expect(ok).toBe(true)
		})
	}
})

describe('contracts — no partial writes into a foreign layer', () => {
	const layerNames = new Set<string>(STYLE_LAYERS)

	for (const partial of partials) {
		const layers = findLayerDirectives(partial.stripped)
		const foreign = layers.filter(
			(name) => layerNames.has(name as StyleLayer) && name !== partial.folder,
		)
		// On failure: the `foreign` array prints the foreign @layer names.
		it(`${partial.relative} → no foreign @layer directives`, () => {
			expect(foreign).toEqual([])
		})
	}
})

describe('contracts — every rule head is one of the folder allowed selector kinds', () => {
	for (const partial of partials) {
		const contract = FOLDER_CONTRACTS[partial.folder]
		const allowed = new Set(contract.head.allowed)
		const forbidden = new Map(contract.head.forbidden.map((f) => [f.kind, f.recommendation]))
		const openers = extractRuleOpeners(partial.source)

		// On failure: the `violations` array prints each disallowed rule head.
		it(`${partial.relative} → every rule head is allowed in ${partial.folder}/`, () => {
			const violations: string[] = []
			for (const selector of openers) {
				for (const branch of splitSelectorBranches(selector)) {
					const kind = classifyHeadSelector(branch)
					if (allowed.has(kind)) continue
					if (forbidden.has(kind)) {
						violations.push(`'${branch}' (kind: ${kind}) — ${forbidden.get(kind)}`)
						continue
					}
					if (kind === 'unknown') continue
					violations.push(`'${branch}' (kind: ${kind}) — not in the ${partial.folder}/ allow-list`)
				}
			}
			expect(violations).toEqual([])
		})
	}
})

describe('contracts — composables/ partials gate on composable-state selectors', () => {
	for (const partial of partials) {
		if (partial.folder !== 'composables') continue
		const exception = exceptionFor(partial.path)
		if (exception?.state?.required === false) continue
		// On failure: `${partial.relative}` has no [data-*] / [aria-*=…] /
		// [role=…] / [open] / :popover-open / :modal / :open selector —
		// rules belong in components/ or elements/ unless gated on
		// composable state.
		it(`${partial.relative} → at least one rule references a composable-state selector`, () => {
			expect(hasStateSelector(partial.stripped)).toBe(true)
		})
	}
})

describe('contracts — every --set-* declaration matches the folder token namespace', () => {
	for (const partial of partials) {
		if (hasFreeTokenNamespace(partial.path)) continue
		const allowed = allowedTokenPrefixes(partial.path)
		const tokens = extractSetTokenDeclarations(partial.stripped)

		// On failure: the `violations` array prints each out-of-namespace
		// token. Allowed prefixes for this folder: `${allowed.join(', ')}`.
		it(`${partial.relative} → declares only --set-{${allowed.join('|')}}-* tokens`, () => {
			const violations: string[] = []
			for (const token of tokens) {
				if (tokenAllowed(token, allowed)) continue
				violations.push(`${token} (prefix '${tokenPrefixOf(token)}' not allowed)`)
			}
			expect(violations).toEqual([])
		})
	}
})

describe('contracts — every composables/_{name}.scss has a matching use{Name} factory', () => {
	const factorySources = readFactorySources()

	const factoryNames = new Set(
		Object.keys(factorySources).map((p) => {
			const match = p.match(/create([A-Z][A-Za-z]+)\.ts$/)
			return match?.[1]?.toLowerCase() ?? ''
		}),
	)

	for (const partial of partials) {
		if (partial.folder !== 'composables') continue
		const factoryName = `create${partial.basename[0]!.toUpperCase() + partial.basename.slice(1)}.ts`
		it(`${partial.relative} → matching ${factoryName} factory exists`, () => {
			expect(factoryNames.has(partial.basename)).toBe(true)
		})
	}
})

describe('contracts — folder inventory sanity', () => {
	for (const folder of STYLE_LAYERS) {
		const folderPartials = partials.filter((p) => p.folder === folder)
		it(`${folder}/ has at least one partial`, () => {
			expect(folderPartials.length).toBeGreaterThan(0)
		})
	}
})

// ============================================================================
//  5. Structural pairings — every `parent > child` tag pair is allowlisted
// ============================================================================

describe('pairings — every `parent > child` tag pair must be on the allowlist', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = relativeStylesPath(path)
		const openers = extractRuleOpeners(source)

		const offenders: { selector: string; parent: string; child: string }[] = []
		for (const selector of openers) {
			for (const { parent, child } of extractTagPairs(selector)) {
				if (!isAllowedTagPair(parent, child)) {
					offenders.push({ selector, parent, child })
				}
			}
		}

		// On failure: the `offenders` array prints each `parent > child` pair
		// not in STRUCTURAL_PAIRINGS. Each entry is element-hardcoding inside
		// containment — either:
		//   (a) add the pairing to STRUCTURAL_PAIRINGS in src/browser/patterns.ts
		//       with a justification (spec / slot / reset / context), OR
		//   (b) refactor the rule onto a wrapper class.
		// See guides/patterns.md § "Structural pairings" for the rationale.
		it(`${relative} uses only allowlisted parent > child tag pairs`, () => {
			expect(offenders).toEqual([])
		})
	}
})

describe('pairings — allowlist entries are well-formed', () => {
	// On failure: the `bad` array prints each malformed STRUCTURAL_PAIRINGS entry.
	it('every STRUCTURAL_PAIRINGS entry has parent + child + kind + reason', () => {
		const bad = STRUCTURAL_PAIRINGS.filter(
			(p) => !p.parent || !p.child || !p.kind || !p.reason || p.reason.length < 10,
		)
		expect(bad).toEqual([])
	})

	it('`pairingFor` returns the entry for an allowlisted pair', () => {
		expect(pairingFor('article', 'header')?.kind).toBe('slot')
		expect(pairingFor('tr', 'td')?.kind).toBe('spec')
		expect(pairingFor('nav', 'ul')?.kind).toBe('reset')
		expect(pairingFor('header', 'button')?.kind).toBe('context')
		expect(pairingFor('nav', 'search')).toBeNull() // the removed violation
	})
})

describe('extractTagPairs — unit checks', () => {
	it('extracts bare child combinators', () => {
		expect(extractTagPairs('nav > header')).toEqual([{ parent: 'nav', child: 'header' }])
	})

	it('flattens :is(...) on the parent side', () => {
		expect(extractTagPairs(':is(nav, aside) > header')).toEqual([
			{ parent: 'nav', child: 'header' },
			{ parent: 'aside', child: 'header' },
		])
	})

	it('flattens :where(...) on the child side', () => {
		expect(extractTagPairs('article > :where(header, footer)')).toEqual([
			{ parent: 'article', child: 'header' },
			{ parent: 'article', child: 'footer' },
		])
	})

	it('handles multi-step chains', () => {
		expect(extractTagPairs('body > nav > header')).toEqual([
			{ parent: 'body', child: 'nav' },
			{ parent: 'nav', child: 'header' },
		])
	})

	it('skips universal heads (`*`)', () => {
		expect(extractTagPairs('body > * > nav')).toEqual([])
	})

	it('skips pieces with no tag head (classes, attributes, pseudos)', () => {
		expect(extractTagPairs('.foo > .bar')).toEqual([])
		expect(extractTagPairs('[popover] > header')).toEqual([])
	})

	it('ignores descendant combinators (no `>` between)', () => {
		expect(extractTagPairs('nav menu')).toEqual([])
	})

	it('takes the LAST compound before `>` from a descendant chain', () => {
		expect(extractTagPairs('body:has(main) menu > li')).toEqual([{ parent: 'menu', child: 'li' }])
	})

	it('respects pseudo qualifiers on the child compound', () => {
		expect(extractTagPairs('article > header:first-child')).toEqual([
			{ parent: 'article', child: 'header' },
		])
	})

	it('splits selector lists', () => {
		expect(extractTagPairs('nav > ol, nav > ul')).toEqual([
			{ parent: 'nav', child: 'ol' },
			{ parent: 'nav', child: 'ul' },
		])
	})
})

// ============================================================================
//  6. Scope discipline — no chained :not(tag), explicit cross-cutting scope
// ============================================================================

const MODIFIER_VOCABULARY: ReadonlySet<string> = new Set(leaves(modifiers))

/**
 * True when the selector is a "cross-cutting modifier compound": broad
 * head (attr/pseudo) AND at least one modifier-vocabulary class. Tag-
 * headed rules are already element-scoped and don't bleed.
 */
function isCrossCuttingModifierRule(selector: string): boolean {
	const branches = splitSelectorBranches(selector)
	const broadKinds: ReadonlySet<string> = new Set([
		'attribute',
		'data-attribute',
		'aria-attribute',
		'role-attribute',
		'pseudo-element',
		'pseudo-class',
		'universal',
	])
	const allBroad = branches.every((branch) => broadKinds.has(classifyHeadSelector(branch)))
	if (!allBroad) return false

	const classes = classQualifiers(selector)
	return classes.some((c) => MODIFIER_VOCABULARY.has(c))
}

describe('scope — chained :not(tag) / :not([attr]) qualifiers are forbidden', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = relativeStylesPath(path)
		const openers = extractRuleOpeners(source)
		const offenders = openers.filter(hasChainedTagNots)

		// On failure: the `offenders` array prints each chained-:not selector.
		// Collapse to `:not(:where(t1, t2, ...))` so the exception list
		// contributes 0 to specificity. Pseudo-class :not() chains like
		// `:not(:first-child):not(:last-child)` are exempt.
		it(`${relative} uses no chained :not(tag) / :not([attr]) patterns`, () => {
			expect(offenders).toEqual([])
		})
	}
})

describe('scope — cross-cutting modifier rules must enumerate their scope', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = relativeStylesPath(path)

		// _local.scss is the home for element-local modifiers — every rule
		// there is already tag-scoped (`form.row`, `button.dropdown`), so
		// the cross-cutting compound pattern never appears there.
		if (relative.endsWith('modifiers/_local.scss')) continue

		const openers = extractRuleOpeners(source).filter(isCrossCuttingModifierRule)

		for (const selector of openers) {
			// On failure: cross-cutting modifier rule `${selector}` has no
			// explicit scope. Add either:
			//   - a :not(:where(t1, t2, ...)) blocklist (narrow exceptions), or
			//   - an :is(t1, t2, ...) allowlist (bounded element sets).
			// Unscoped cross-cutting rules bleed into every host of the attribute.
			it(`${relative} → '${selector}' has explicit scope (\`:not(:where(...))\` or \`:is(...)\`)`, () => {
				expect(hasScopingFunction(selector)).toBe(true)
			})
		}
	}
})

describe('scope — accepted patterns', () => {
	it('isCrossCuttingModifierRule recognizes the canonical popover-placement form', () => {
		expect(isCrossCuttingModifierRule('[popover].top')).toBe(true)
		expect(isCrossCuttingModifierRule('[popover]:not(:where(aside, nav, output)).top')).toBe(true)
	})

	it('isCrossCuttingModifierRule excludes tag-headed rules (already element-scoped)', () => {
		expect(isCrossCuttingModifierRule('form.row')).toBe(false)
		expect(isCrossCuttingModifierRule('button.dropdown')).toBe(false)
		expect(isCrossCuttingModifierRule('dialog.scrollable[open]')).toBe(false)
		expect(isCrossCuttingModifierRule('output[popover].drawer')).toBe(false)
		expect(isCrossCuttingModifierRule("nav[aria-label='Breadcrumb'] > ol > li.active")).toBe(false)
	})

	it('isCrossCuttingModifierRule excludes attribute-only rules (no modifier class)', () => {
		expect(isCrossCuttingModifierRule('[popover]')).toBe(false)
		expect(isCrossCuttingModifierRule('[data-toast-stack]')).toBe(false)
	})

	it('isCrossCuttingModifierRule excludes mixed-head selector lists with a tag branch', () => {
		expect(isCrossCuttingModifierRule('[popover].top, output.toast')).toBe(false)
	})
})

// ============================================================================
//  7. Interactive minimum — forced-colors + :focus-visible coverage
// ============================================================================

interface ElementPartial {
	readonly tag: string
	readonly path: string
	readonly relative: string
	readonly stripped: string
}

const elementSources = readScssPartials('src/styles/elements')

const elementPartials: readonly ElementPartial[] = Object.entries(elementSources)
	.map(([path, source]) => {
		const normalised = path.replace(/\\/g, '/')
		const tag = tagFromPath(normalised)
		if (tag === 'index') return null
		return {
			tag,
			path: normalised,
			relative: relativeStylesPath(normalised),
			stripped: stripComments(source),
		}
	})
	.filter((p): p is ElementPartial => p !== null)

describe('interactive — registry coverage', () => {
	it('every member has a matching elements/_{tag}.scss partial', () => {
		const partialTags = new Set(elementPartials.map((p) => p.tag))
		const missing = Array.from(INTERACTIVE_ELEMENTS).filter((tag) => !partialTags.has(tag))
		expect(missing).toEqual([])
	})

	it('every interactive element declares at least one --set-{tag}-* token', () => {
		const offenders: string[] = []
		for (const tag of INTERACTIVE_ELEMENTS) {
			const partial = elementPartials.find((p) => p.tag === tag)
			if (!partial) {
				offenders.push(`${tag} (no partial)`)
				continue
			}
			const hasToken = new RegExp(`--set-${tag}-[a-z0-9-]+\\s*:`).test(partial.stripped)
			if (!hasToken) offenders.push(`${tag} (no --set-${tag}-* token)`)
		}
		expect(offenders).toEqual([])
	})
})

describe('interactive — forced-colors coverage', () => {
	for (const partial of elementPartials) {
		if (!isInteractive(partial.tag)) continue
		// On failure: `${partial.relative}` is an interactive element but
		// doesn't invoke `@include forced-colors`. Windows High Contrast
		// mode strips author colors — the partial must paint a system-token
		// fallback via the mixin from `_mixins.scss`.
		it(`${partial.relative} invokes @include forced-colors`, () => {
			expect(FORCED_COLORS_INCLUDE_REGEX.test(partial.stripped)).toBe(true)
		})
	}
})

describe('interactive — every interactive element declares a :focus-visible rule', () => {
	for (const partial of elementPartials) {
		if (!isInteractive(partial.tag)) continue
		// `_summary.scss` focuses through its parent `<details>`;
		// `_label.scss` inherits `:focus-within` from its associated
		// control. Both legitimately have no own `:focus-visible` rule.
		if (partial.tag === 'summary' || partial.tag === 'label') continue
		// On failure: `${partial.relative}` doesn't declare a
		// `:focus-visible` rule. The focus contract requires every
		// interactive element to paint a focus ring via `:focus-visible`.
		it(`${partial.relative} declares :focus-visible chrome`, () => {
			expect(/:focus-visible/.test(partial.stripped)).toBe(true)
		})
	}
})

describe('interactive — no partial uses bare :focus rule (always :focus-visible)', () => {
	for (const [path, source] of Object.entries(sources)) {
		const relative = relativeStylesPath(path)
		const stripped = stripComments(source)
		// On failure: `${relative}` declares a bare `:focus` rule. Bare
		// `:focus` fires on mouse click (visual noise) — use
		// `:focus-visible`. Bare `:focus` inside `:not(:focus)`,
		// `:is(:focus, …)`, `:where(:focus)`, `:has(:focus)` is exempt.
		it(`${relative} uses :focus-visible, never bare :focus`, () => {
			expect(hasBareFocusRule(stripped)).toBe(false)
		})
	}
})
