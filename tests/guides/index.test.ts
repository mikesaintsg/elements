// ============================================================================
//  guides/README.md ↔ guides/*.md — structural uniformity + cross-reference parity.
//
//  Three contract surfaces in one driver:
//
//    1. UNIFORMITY (every guide). Every `guides/*.md` opens with `# Title`
//       on line 1 and carries a `> blockquote` subtitle on line 3. The
//       pointer file (`guides/README.md`) must link to every other guide
//       so the map stays complete. Every `tests/guides/{name}.test.ts`
//       driver corresponds to a real `guides/{name}.md`.
//
//    2. SPEC-GUIDE SKELETON. Every spec guide (anything other than the
//       process docs `README` and `contribute`) ships the unified
//       Skeleton: `# Title` → `> blockquote` → `## Surface` → `## Contract`
//       → `## Patterns` → `## Tests` → `## See also`. Agents and humans
//       can land on any spec guide and find the same anchor names.
//
//    3. CROSS-REFS. Every `[label](relative/path)` link in every guide
//       resolves to a file that exists. URL fragments (`#anchor`) are
//       stripped before the existence check; `http(s)`, `mailto`, and
//       protocol-prefixed links are skipped.
//
//  Pure node — `node:fs` reads via `tests/setupServer.ts` helpers.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { resolve as resolvePath, dirname } from 'node:path'
import { readAllGuides, WORKSPACE_ROOT } from '../setupServer'

const GUIDES_DIR = resolvePath(WORKSPACE_ROOT, 'guides')
const TESTS_GUIDES_DIR = resolvePath(WORKSPACE_ROOT, 'tests/guides')

interface GuideFile {
	readonly name: string // 'tokens' (no extension)
	readonly path: string // absolute
	readonly source: string
}

const guides: readonly GuideFile[] = Object.entries(readAllGuides()).map(([name, source]) => ({
	name,
	path: resolvePath(GUIDES_DIR, `${name}.md`),
	source,
}))

// Process docs intentionally deviate from the spec-guide skeleton — they're
// task-oriented (workflow + navigation), not specs. Skeleton enforcement
// skips them; cross-ref + uniformity checks still apply.
const PROCESS_DOCS: ReadonlySet<string> = new Set(['README', 'contribute'])

const SKELETON_HEADINGS = ['Surface', 'Contract', 'Patterns', 'Tests', 'See also'] as const

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

// ── 2. Spec-guide skeleton — uniform `## {section}` anchors ──────────────

describe('guides — every spec guide ships the unified skeleton', () => {
	for (const guide of guides) {
		if (PROCESS_DOCS.has(guide.name)) continue
		for (const heading of SKELETON_HEADINGS) {
			// On failure: `guides/${guide.name}.md` is a spec guide but is
			// missing the `## ${heading}` section. The skeleton (`# Title` →
			// `> blockquote` → `## Surface` → `## Contract` → `## Patterns`
			// → `## Tests` → `## See also`) is the contract every spec guide
			// holds to. Process docs (`README.md`, `contribute.md`) deviate
			// by design — they're listed in PROCESS_DOCS at the top of this
			// driver. Add a top-level `## ${heading}` section, or — if this
			// guide is genuinely process-oriented — add it to PROCESS_DOCS.
			it(`guides/${guide.name}.md — declares ## ${heading}`, () => {
				const pattern = new RegExp(`^## ${heading.replace(/\s/g, '\\s+')}\\s*$`, 'm')
				expect(pattern.test(guide.source)).toBe(true)
			})
		}
	}
})

// ── 3. Pointer-file coverage — guides/README.md links every other guide ──

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

// ── 4. Test ↔ guide parity — bidirectional ───────────────────────────────
//
// Every guide gets a dedicated parity-test driver, and every driver
// maps back to a real guide. The ONE mapping exception: `README.md`
// (the pointer file) is driven by THIS file (`index.test.ts`) — the
// meta-driver IS its test (skeleton + cross-ref + pointer-coverage
// checks above). So `README` maps to `index`, not `readme`.
//
// `readAllGuides()` only reads top-level `guides/*.md`, so nested
// reference directories (e.g. `guides/w3c/`) never enter the `guides`
// list and are skipped by construction — they are reference material,
// not spec guides, and need no parity driver.

const testFiles = new Set(
	readdirSync(TESTS_GUIDES_DIR)
		.filter((f) => f.endsWith('.test.ts'))
		.map((f) => f.replace(/\.test\.ts$/, '')),
)

/** The guide → expected-test-driver mapping. README is the documented
 *  exception: its driver is this very file (`index.test.ts`). */
const driverFor = (guideName: string): string =>
	guideName === 'README' ? 'index' : guideName

describe('guides — every guide has a dedicated test driver', () => {
	for (const guide of guides) {
		const driver = driverFor(guide.name)
		// On failure: `guides/${guide.name}.md` has no
		// `tests/guides/${driver}.test.ts`. Every guide is parity-tested
		// against its implementation — author the missing driver. (If the
		// guide is genuinely process-only with no testable surface, the
		// driver can be a thin cross-reference / structural check; see
		// `tests/guides/contribute.test.ts` for the pattern.) README maps
		// to `index.test.ts` by design — see the block comment above.
		it(`guides/${guide.name}.md → tests/guides/${driver}.test.ts exists`, () => {
			expect(testFiles.has(driver)).toBe(true)
		})
	}
})

describe('guides — every tests/guides/*.test.ts maps to a real guide', () => {
	const guideNames = new Set(guides.map((g) => g.name))

	for (const name of testFiles) {
		if (name === 'index') continue // the meta-driver (pairs with README.md)
		// On failure: `tests/guides/${name}.test.ts` exists but
		// `guides/${name}.md` is missing. Either restore the guide or
		// rename the test to match an existing guide.
		it(`tests/guides/${name}.test.ts → guides/${name}.md exists`, () => {
			expect(guideNames.has(name)).toBe(true)
		})
	}
})

// ── 5. Cross-reference parity — every relative link resolves ─────────────

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
