// guides/compilers.md ↔ src/core/compilers.ts (+ helpers.ts minus validateBounds)
// Bidirectional parity:
//   1. DOC → SOURCE — every backticked call-form API named in the guide
//      resolves to a real src/core export.
//   2. SOURCE → DOC — every export function/const in compilers.ts, plus every
//      helpers.ts export EXCEPT validateBounds (which is the shape-builders'
//      bounds check, documented in shapers.md), is documented (backticked, in
//      call or bare form) in the guide. Makes the guide's advertised "the
//      documented surface is exhaustive" contract real.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const SOURCES = ['compilers'] as const
// validateBounds lives in helpers.ts but is documented in shapers.md (it is
// the shape-builders' bounds check). Every OTHER helpers.ts export is
// documented HERE. Excluding exactly validateBounds keeps the union of the
// shapers + compilers bijection sets exactly equal to the old contracts set
// ({shapers} ∪ {compilers} ∪ {helpers}) with each export in exactly one home.
const HELPERS_EXCLUDED = new Set<string>(['validateBounds'])
const doc = readGuide('compilers')

function exportedNames(file: string): readonly string[] {
	const src = readFileSync(resolvePath(WORKSPACE_ROOT, `src/core/${file}.ts`), 'utf8')
	const out: string[] = []
	const regex = /^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z][A-Za-z0-9]*)/gm
	let m: RegExpExecArray | null
	while ((m = regex.exec(src)) !== null) if (m[1]) out.push(m[1])
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

const HELPERS_DOCUMENTED_HERE = exportedNames('helpers').filter(
	(name) => !HELPERS_EXCLUDED.has(name),
)
const EXPORTS = new Set([...SOURCES.flatMap(exportedNames), ...HELPERS_DOCUMENTED_HERE])

describe('compilers — every documented API resolves to a src/core export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/compilers.md but is
		// not exported by src/core/compilers.ts or src/core/helpers.ts
		// (validateBounds is documented in shapers.md, not here).
		// Fix the doc or restore the export.
		it(`${name}() is a real src/core export`, () => {
			expect(EXPORTS.has(name)).toBe(true)
		})
	}
})

describe('compilers — every src/core export is documented in compilers.md', () => {
	const DOCUMENTED = documentedNames(doc)
	for (const name of EXPORTS) {
		// On failure: `${name}` is an export of src/core/compilers.ts (or a
		// src/core/helpers.ts export other than validateBounds) but is not
		// backticked anywhere in guides/compilers.md. Document it (the guide
		// advertises an exhaustive surface). If it is intentionally an
		// internal not-for-doc export, that is itself a signal the symbol
		// should not be a public export — do not allowlist it here.
		it(`${name} is documented in guides/compilers.md`, () => {
			expect(DOCUMENTED.has(name)).toBe(true)
		})
	}
})
