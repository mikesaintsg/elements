// ============================================================================
//  guides/contribute.md ↔ the repository tree
//
//  contribute.md is the workflow document. It carries dozens of
//  concrete repo paths — in markdown links, in backtick-quoted prose,
//  and in the §9.2 file-map ASCII tree. `README.test.ts` already checks
//  every `](relative/path)` MARKDOWN LINK resolves; this driver checks
//  the OTHER reference shape: backtick-quoted `code` paths
//  (`` `src/browser/patterns.ts` ``, `` `tests/guides/patterns.test.ts` ``)
//  that point at a concrete repo file or directory.
//
//  Why this matters: the file-map + inline references drift silently
//  when files move (e.g. the test reorganization that collapsed
//  `tests/guides/patterns/contracts.test.ts` into `patterns.test.ts`
//  left a dozen stale backtick paths that no markdown-link check would
//  catch — they weren't links).
//
//  Template paths (`create{Entity}.ts`, `_{tag}.scss`), globs (`_*.scss`,
//  `Use*Page`), ellipses (`…`), and bare directory-ish tokens are
//  excluded — only fully-resolved concrete paths are asserted.
//
//  Pure node — node:fs.
// ============================================================================

import { existsSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const contributeDoc = readGuide('contribute')

// Repo roots a concrete path can start with. A backticked token that
// starts with one of these AND has no placeholder / glob / ellipsis is
// treated as a path assertion.
const REPO_ROOTS = ['src/', 'tests/', 'app/', 'guides/', 'configs/']

function concretePaths(doc: string): readonly string[] {
	const out = new Set<string>()
	// Backtick-quoted tokens. Strip a trailing `:NN` line suffix if present.
	const regex = /`([^`\s]+)`/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(doc)) !== null) {
		let token = match[1]
		if (!token) continue
		token = token.replace(/:\d+$/, '') // `file.ts:42` → `file.ts`
		if (!REPO_ROOTS.some((r) => token.startsWith(r))) continue
		// Skip template paths, globs, ellipses, and trailing-slash dirs
		// expressed with a wildcard segment.
		if (/[{}*…]/.test(token)) continue
		if (token.endsWith('/')) {
			// A directory reference like `src/styles/elements/` — keep it;
			// existsSync resolves directories too.
			out.add(token.replace(/\/$/, ''))
			continue
		}
		// Must look like a file (has an extension) OR a known dir token.
		// Bare `src/browser` (no extension, no trailing slash) is a dir.
		out.add(token)
	}
	return Array.from(out).sort()
}

const PATHS = concretePaths(contributeDoc)

describe('contribute — every concrete repo path referenced resolves', () => {
	it('discovers a meaningful number of path references', () => {
		// Sanity floor — if a refactor accidentally strips the file map,
		// this catches the empty-set false-pass.
		expect(PATHS.length).toBeGreaterThan(10)
	})

	for (const path of PATHS) {
		// On failure: `guides/contribute.md` references `${path}` (backtick-
		// quoted) but no such file/directory exists. Either the path is
		// stale (a file moved — update the reference) or it's a
		// template/glob that slipped the placeholder filter (add the
		// pattern token so it's excluded).
		it(`${path} exists`, () => {
			expect(existsSync(resolvePath(WORKSPACE_ROOT, path))).toBe(true)
		})
	}
})
