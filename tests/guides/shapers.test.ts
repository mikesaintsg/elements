// guides/shapers.md ↔ src/core/shapers.ts (+ validateBounds from helpers.ts)
// Bidirectional parity:
//   1. DOC → SOURCE — every backticked call-form API named in the guide
//      resolves to a real src/core export.
//   2. SOURCE → DOC — every export function/const in shapers.ts (plus the
//      single helpers.ts export validateBounds — the shape-builders' bounds
//      check, documented here by user decision) is documented (backticked, in
//      call or bare form) in the guide. Makes the guide's advertised "the
//      documented surface is exhaustive" contract real.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const SOURCES = ['shapers'] as const
// validateBounds lives in helpers.ts but is documented in shapers.md (it is
// the shape-builders' bounds check); every OTHER helpers.ts export is
// documented in compilers.md. Including it here keeps the union of the
// shapers + compilers bijection sets exactly equal to the old contracts set
// ({shapers} ∪ {compilers} ∪ {helpers}) with each export in exactly one home.
const EXTRA_DOCUMENTED_EXPORTS = ['validateBounds'] as const
const doc = readGuide('shapers')

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

const EXPORTS = new Set([...SOURCES.flatMap(exportedNames), ...EXTRA_DOCUMENTED_EXPORTS])

describe('shapers — every documented API resolves to a src/core export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/shapers.md but is
		// not exported by src/core/shapers.ts (nor is it validateBounds from
		// src/core/helpers.ts). Fix the doc or restore the export.
		it(`${name}() is a real src/core export`, () => {
			expect(EXPORTS.has(name)).toBe(true)
		})
	}
})

describe('shapers — every src/core export is documented in shapers.md', () => {
	const DOCUMENTED = documentedNames(doc)
	for (const name of EXPORTS) {
		// On failure: `${name}` is an export of src/core/shapers.ts (or the
		// validateBounds helper documented here) but is not backticked
		// anywhere in guides/shapers.md. Document it (the guide advertises an
		// exhaustive surface). If it is intentionally an internal not-for-doc
		// export, that is itself a signal the symbol should not be a public
		// export — do not allowlist it here.
		it(`${name} is documented in guides/shapers.md`, () => {
			expect(DOCUMENTED.has(name)).toBe(true)
		})
	}
})
