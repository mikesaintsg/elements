// ============================================================================
//  guides/**/*.md cross-reference parity.
//
//  Every guide carries inline markdown links into the codebase — to other
//  guides, to SCSS partials, to TS sources, to tests, to showcase pages.
//  When a referenced file is renamed, moved, or deleted, the doc still
//  reads as if the target exists. This test fails when any link in any
//  guide points to a path that no longer resolves.
//
//  What's checked:
//    - All `[label](relative/path)` links whose target starts with `./`,
//      `../`, `./`, or any nested-relative form — i.e. paths inside the
//      repository tree.
//    - URL fragments (`#anchor`) are stripped before the existence check.
//    - http(s)/mailto/protocol-prefixed links are skipped.
//
//  Loaded via `import.meta.glob(..., '?raw', { eager: true })` so the
//  glob runs at module-load time and the test stays synchronous.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve as resolvePath, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const guideSources = import.meta.glob('../../guides/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

// Workspace root — `guides/` and `src/` and `tests/` and `app/` are siblings
// under this directory. Computed from the test file's own URL so it
// survives any working-directory the runner is launched from.
const TEST_FILE_DIR = fileURLToPath(new URL('.', import.meta.url))
const WORKSPACE_ROOT = resolvePath(TEST_FILE_DIR, '../..')

// Match `](target)` where `target` starts with `.` (relative path inside
// the repo). Captures the target including any `#fragment`; the fragment
// is stripped before resolution.
const LINK_REGEX = /\]\((\.\.?\/[^)]+)\)/g

interface BrokenLink {
	readonly target: string
	readonly absolute: string
}

function brokenLinksIn(guidePath: string, source: string): readonly BrokenLink[] {
	const guideAbsolute = resolvePath(TEST_FILE_DIR, guidePath)
	const guideDir = dirname(guideAbsolute)
	const out: BrokenLink[] = []
	for (const match of source.matchAll(LINK_REGEX)) {
		if (!match[1]) continue
		const target = match[1].split('#')[0] ?? ''
		if (target === '') continue // pure-fragment link (e.g. `(#anchor)`) — same-file, skip
		const absolute = resolvePath(guideDir, target)
		// Stay inside the workspace — bail on paths that escape upward.
		if (!absolute.startsWith(WORKSPACE_ROOT)) continue
		if (!existsSync(absolute)) out.push({ target, absolute })
	}
	return out
}

describe('guides — every cross-reference resolves to a real file', () => {
	for (const [path, source] of Object.entries(guideSources)) {
		const guideName = path.split('/').pop() ?? path
		// On failure: the `broken` array prints each `[label](target)` whose
		// resolved absolute path doesn't exist. Either fix the link or
		// restore the target. Run `git mv` instead of `rm`+`create` when
		// renaming repository files so doc references can be updated in
		// the same change.
		it(`${guideName} — all relative links resolve`, () => {
			expect(brokenLinksIn(path, source)).toEqual([])
		})
	}
})
