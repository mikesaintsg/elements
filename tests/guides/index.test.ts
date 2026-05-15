// ============================================================================
//  guides/README.md ↔ guides/*.md — structural uniformity + cross-reference parity.
//
//  Two contract surfaces in one driver:
//
//    1. UNIFORMITY  — every `guides/*.md` opens with `# Title` on line 1 and
//                     carries a `> blockquote` subtitle on line 3. The
//                     pointer file (`guides/README.md`) must link to every
//                     other guide so the map stays complete. Every
//                     `tests/guides/{name}.test.ts` driver corresponds to
//                     a real `guides/{name}.md`.
//
//    2. CROSS-REFS  — every `[label](relative/path)` link in every guide
//                     resolves to a file that exists. URL fragments
//                     (`#anchor`) are stripped before the existence check;
//                     `http(s)`, `mailto`, and protocol-prefixed links are
//                     skipped.
//
//  Pure node — `node:fs` reads the markdown sources directly (Vite's CSS
//  pipeline isn't active in the guides project).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve as resolvePath, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_FILE_DIR = fileURLToPath(new URL('.', import.meta.url))
const WORKSPACE_ROOT = resolvePath(TEST_FILE_DIR, '../..')
const GUIDES_DIR = resolvePath(WORKSPACE_ROOT, 'guides')
const TESTS_GUIDES_DIR = resolvePath(WORKSPACE_ROOT, 'tests/guides')

interface GuideFile {
	readonly name: string // 'tokens' (no extension)
	readonly path: string // absolute
	readonly source: string
}

const guides: readonly GuideFile[] = readdirSync(GUIDES_DIR)
	.filter((f) => f.endsWith('.md'))
	.map((f) => {
		const path = resolvePath(GUIDES_DIR, f)
		return {
			name: f.replace(/\.md$/, ''),
			path,
			source: readFileSync(path, 'utf8'),
		}
	})

// ── 1. Uniformity — every guide opens with the same shape ─────────────────

describe('guides — every guide opens with `# Title`', () => {
	for (const guide of guides) {
		// On failure: `guides/${guide.name}.md` does not begin with a `# ` H1
		// heading on line 1. The pointer file + scanning agents both rely on
		// the H1 to identify the doc.
		it(`guides/${guide.name}.md — line 1 is an H1`, () => {
			const firstLine = guide.source.split('\n')[0] ?? ''
			expect(/^#\s+\S/.test(firstLine)).toBe(true)
		})
	}
})

describe('guides — every guide carries a `>` blockquote subtitle', () => {
	for (const guide of guides) {
		// On failure: `guides/${guide.name}.md` has no `> ` blockquote within
		// the first 5 lines. The blockquote is the one-line abstract that
		// shows up in the pointer file table and in IDE previews.
		it(`guides/${guide.name}.md — has a blockquote subtitle near the top`, () => {
			const head = guide.source.split('\n').slice(0, 5).join('\n')
			expect(/^>\s+\S/m.test(head)).toBe(true)
		})
	}
})

// ── 2. Pointer-file coverage — guides/README.md links every other guide ───

describe('guides — pointer file links every other guide', () => {
	const indexGuide = guides.find((g) => g.name === 'README')
	const indexSource = indexGuide?.source ?? ''

	it('guides/README.md exists', () => {
		expect(indexGuide).toBeDefined()
	})

	for (const guide of guides) {
		if (guide.name === 'README') continue
		// On failure: `guides/README.md` does not reference `${guide.name}.md`
		// anywhere. The pointer file is the entry point — every spec guide
		// must be reachable from it.
		it(`guides/README.md references guides/${guide.name}.md`, () => {
			const pattern = new RegExp(`\\(${guide.name}\\.md(?:#[^)]*)?\\)`)
			expect(pattern.test(indexSource)).toBe(true)
		})
	}
})

// ── 3. Test ↔ guide parity — every test driver maps to a real guide ───────

describe('guides — every tests/guides/*.test.ts has a matching guide', () => {
	const guideNames = new Set(guides.map((g) => g.name))

	const testFiles = readdirSync(TESTS_GUIDES_DIR)
		.filter((f) => f.endsWith('.test.ts'))
		.map((f) => f.replace(/\.test\.ts$/, ''))

	for (const name of testFiles) {
		if (name === 'index') continue // this file itself (pairs with guides/README.md, not guides/index.md)
		// On failure: `tests/guides/${name}.test.ts` exists but
		// `guides/${name}.md` is missing. Either restore the guide or
		// rename the test to match an existing guide.
		it(`tests/guides/${name}.test.ts → guides/${name}.md exists`, () => {
			expect(guideNames.has(name)).toBe(true)
		})
	}
})

// ── 4. Cross-reference parity — every relative link resolves ──────────────

const LINK_REGEX = /\]\((\.\.?\/[^)]+)\)/g

interface BrokenLink {
	readonly target: string
	readonly absolute: string
}

function brokenLinksIn(guide: GuideFile): readonly BrokenLink[] {
	const guideDir = dirname(guide.path)
	const out: BrokenLink[] = []
	for (const match of guide.source.matchAll(LINK_REGEX)) {
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
	for (const guide of guides) {
		// On failure: the `broken` array prints each `[label](target)` whose
		// resolved absolute path doesn't exist. Either fix the link or
		// restore the target. Run `git mv` instead of `rm`+`create` when
		// renaming repository files so doc references can be updated in
		// the same change.
		it(`guides/${guide.name}.md — all relative links resolve`, () => {
			expect(brokenLinksIn(guide)).toEqual([])
		})
	}
})
