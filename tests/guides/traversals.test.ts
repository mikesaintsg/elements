// guides/traversals.md ↔ src/browser/{traversals,helpers}.ts
// Bidirectional parity:
//   1. DOC → SOURCE — every backticked call-form API named in the guide
//      resolves to a real src/browser export (traversals.ts ∪ helpers.ts).
//   2. SOURCE → DOC — every export in traversals.ts is documented
//      (backticked, in call or bare form) in the guide. Makes the guide's
//      advertised "the surface is exhaustive" contract real.
//
// `traversals.ts` exports a generator (`export function* walkDescendantsGenerator`)
// — the regex captures `export function`, `export async function`,
// `export function*`, and `export const`, so the generator lands in the
// EXPORTS set and DOC → SOURCE accepts `walkDescendantsGenerator(`.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const doc = readGuide('traversals')

function exportedNames(file: string): readonly string[] {
	const src = readFileSync(resolvePath(WORKSPACE_ROOT, `src/browser/${file}.ts`), 'utf8')
	const out: string[] = []
	const regex = /^export\s+(?:async\s+)?function\s*\*?\s+([A-Za-z][A-Za-z0-9]*)|^export\s+const\s+([A-Za-z][A-Za-z0-9]*)/gm
	let m: RegExpExecArray | null
	while ((m = regex.exec(src)) !== null) {
		const name = m[1] ?? m[2]
		if (name) out.push(name)
	}
	return out
}

function documentedApis(source: string): readonly string[] {
	const out = new Set<string>()
	const regex = /`([a-z][A-Za-z0-9]*)\(/g
	let m: RegExpExecArray | null
	while ((m = regex.exec(source)) !== null) if (m[1]) out.add(m[1])
	return Array.from(out)
}

// Every backticked identifier in the guide, in EITHER call form `` `name(` ``
// OR bare form `` `name` `` — some real exports are referenced in callouts /
// prose without a trailing `(`, so both forms count as "documented".
function documentedNames(source: string): ReadonlySet<string> {
	const out = new Set<string>()
	let m: RegExpExecArray | null
	const bare = /`([A-Za-z_$][\w$]*)`/g
	while ((m = bare.exec(source)) !== null) if (m[1]) out.add(m[1])
	const call = /`([A-Za-z_$][\w$]*)\(/g
	while ((m = call.exec(source)) !== null) if (m[1]) out.add(m[1])
	return out
}

// The guide also documents a fixed node-type / matching / focus guard set
// that lives in helpers.ts (helpers.ts additionally exports composable
// plumbing the guide rightly does NOT cover, so SOURCE → DOC is scoped to
// traversals.ts only — mirroring how parsers.test.ts scopes its SOURCE set).
const TRAVERSAL_GUARDS = [
	'isElement', 'isHTMLElement', 'isTextNode', 'isTagType', 'matchesTag',
	'hasClass', 'hasClasses', 'hasId', 'hasAttribute', 'createMatcher',
	'isFocusable', 'findFocusableElements', 'findFirstFocusable', 'findLastFocusable',
] as const

const TRAVERSAL_EXPORTS = new Set(exportedNames('traversals'))
const HELPER_EXPORTS = new Set(exportedNames('helpers'))
const ALL_EXPORTS = new Set([...TRAVERSAL_EXPORTS, ...HELPER_EXPORTS])

describe('traversals — every documented API resolves to a src/browser export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/traversals.md but is
		// not exported by src/browser/traversals.ts or src/browser/helpers.ts.
		// Fix the doc or restore the export.
		it(`${name}() is a real src/browser export`, () => {
			expect(ALL_EXPORTS.has(name)).toBe(true)
		})
	}
})

describe('traversals — every traversals.ts export is documented in traversals.md', () => {
	const DOCUMENTED = documentedNames(doc)
	for (const name of TRAVERSAL_EXPORTS) {
		// On failure: `${name}` is an export of src/browser/traversals.ts but
		// is not backticked anywhere in guides/traversals.md. Document it (the
		// guide advertises an exhaustive surface). If it is intentionally an
		// internal not-for-doc export, that is itself a signal the symbol
		// should not be a public export — do not allowlist it here.
		it(`${name} is documented in guides/traversals.md`, () => {
			expect(DOCUMENTED.has(name)).toBe(true)
		})
	}
})

describe('traversals — the documented guard/focus set resolves in helpers.ts', () => {
	for (const name of TRAVERSAL_GUARDS) {
		// On failure: the guide documents `${name}` as part of the traversal
		// surface but it is not a real helpers.ts/traversals.ts export.
		it(`${name} is a real src/browser export`, () => {
			expect(ALL_EXPORTS.has(name)).toBe(true)
		})
	}
})
