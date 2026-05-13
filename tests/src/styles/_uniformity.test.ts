// ============================================================================
//  Token uniformity within logical groups.
//
//  The framework's customizability contract: elements in the same logical
//  group MUST expose the same minimum token surface. A consumer who wants
//  to retune "every form control" can do so by overriding one token per
//  member; if `<input>` ships `--set-input-color` but `<select>` does not
//  ship `--set-select-color`, that contract breaks silently.
//
//  Groups + required token suffixes are declared in
//  src/browser/taxonomy.ts § TOKEN_GROUPS. This test asserts that every
//  member of every group declares each required suffix.
//
//  The check reads the raw SCSS (not the computed cascade) so a token
//  declared via a fallback chain (`--set-X-color: var(--set-style-color,
//  …)`) counts — the declaration exists on the element. The runtime
//  cascade test at tests/src/styles/_tokens.test.ts complements this by
//  asserting each token actually resolves.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { TOKEN_GROUPS, type TokenGroup } from '@elements/browser'

const sources = import.meta.glob('../../../src/styles/{elements,components}/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function tagOfPath(path: string): string {
	const match = path.match(/_([a-z][a-z0-9-]*)\.scss$/)
	if (!match || !match[1]) throw new Error(`Cannot extract tag from ${path}`)
	return match[1]
}

const byTag: ReadonlyMap<string, readonly string[]> = (() => {
	const map = new Map<string, string[]>()
	for (const [path, source] of Object.entries(sources)) {
		const tag = tagOfPath(path)
		const list = map.get(tag) ?? []
		list.push(source)
		map.set(tag, list)
	}
	return map
})()

function declaresSuffix(tag: string, suffix: string): boolean {
	const sources = byTag.get(tag) ?? []
	const regex = new RegExp(`--set-${tag}-${suffix.replace(/-/g, '\\-')}\\s*:`)
	return sources.some((source) => regex.test(source))
}

describe('uniformity — every group member declares the required tokens', () => {
	for (const [name, definition] of Object.entries(TOKEN_GROUPS) as readonly [
		TokenGroup,
		(typeof TOKEN_GROUPS)[TokenGroup],
	][]) {
		describe(`${name} group`, () => {
			for (const member of definition.members) {
				for (const suffix of definition.required) {
					it(`${member} declares --set-${member}-${suffix}`, () => {
						expect(
							declaresSuffix(member, suffix),
							`${member} is in the ${name} group but does not declare --set-${member}-${suffix}. ` +
								`The group contract is in src/browser/taxonomy.ts § TOKEN_GROUPS.`,
						).toBe(true)
					})
				}
			}
		})
	}
})
