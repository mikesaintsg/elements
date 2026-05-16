// guides/contracts.md ↔ src/core/{shapers,compilers,factories,helpers}.ts
// Every API documented with a backticked call form resolves to a real export.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const SOURCES = ['shapers', 'compilers', 'factories', 'helpers'] as const
const doc = readGuide('contracts')

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

const EXPORTS = new Set(SOURCES.flatMap(exportedNames))

describe('contracts — every documented API resolves to a src/core export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/contracts.md but is
		// not exported by any of src/core/{shapers,compilers,factories,helpers}.ts.
		// Fix the doc or restore the export.
		it(`${name}() is a real src/core export`, () => {
			expect(EXPORTS.has(name)).toBe(true)
		})
	}
})
