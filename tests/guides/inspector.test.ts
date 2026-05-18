// guides/inspector.md ↔ src/browser/inspector/** + the composed surface
// Bidirectional parity (the SAME contract the five tooling guides exemplify
// — traversals.test.ts / validators.test.ts):
//
//   1. DOC → SOURCE — every backticked call-form API named in the guide
//      resolves to a real `@elements/browser` export. The inspector is
//      pure composition over already-shipped tooling, so the resolvable
//      surface is the inspector barrel ∪ helpers.ts ∪ traversals.ts ∪
//      schema.ts ∪ constants.ts (exactly the `@elements/browser` files the
//      inspector composes — the analogue of traversals.test.ts resolving
//      against `traversals ∪ helpers`).
//   2. SOURCE → DOC — every export of the inspector barrel
//      (`src/browser/inspector/index.ts` → Walker / rules / FindingManager
//      / Inspector) is documented (backticked, call or bare form) in the
//      guide. Makes the guide's "the surface is exhaustive" claim real.
//   3. TYPES ARE THE SOURCE OF TRUTH — the inspector's public interfaces
//      are declared in `src/browser/types.ts`.
//
// It genuinely BITES: a guide that backticks a `fooBar(` that is not a real
// export fails (1); an undocumented public inspector export fails (2); a
// renamed/removed public type fails (3).
//
// The inspector's public surface is CLASS-based (`export class Inspector`),
// so the export regex captures `class` in addition to
// `function` / `function*` / `const` / `async function` (the sibling
// guides' surfaces are function/const-only, so their regex omits `class`;
// omitting it here would make SOURCE → DOC vacuous — symptom-hiding the
// owner rejects).
//
// Pure node — `node:fs` reads via `tests/setupServer.ts` helpers, the same
// `readGuide` + parse helpers the sibling guide tests use (no duplicated
// fs/parse logic).
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rules } from '@elements/browser'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const doc = readGuide('inspector')

// The `@elements/browser` files the inspector is composed from — the
// surface a backticked call-form API in the guide may resolve to.
const SOURCES = [
	'inspector/Walker',
	'inspector/rules',
	'inspector/FindingManager',
	'inspector/Inspector',
	'helpers',
	'traversals',
	'schema',
	'constants',
] as const

// The inspector barrel's own exports — the SOURCE → DOC set the guide must
// document exhaustively.
const BARREL_SOURCES = [
	'inspector/Walker',
	'inspector/rules',
	'inspector/FindingManager',
	'inspector/Inspector',
] as const

function exportedNames(file: string): readonly string[] {
	const src = readFileSync(resolvePath(WORKSPACE_ROOT, `src/browser/${file}.ts`), 'utf8')
	const out: string[] = []
	// `export function` / `export function*` / `export async function` /
	// `export const` / `export class` (the inspector ships classes).
	const regex =
		/^export\s+(?:async\s+)?(?:function\s*\*?\s+|const\s+|class\s+)([A-Za-z][A-Za-z0-9]*)/gm
	let m: RegExpExecArray | null
	while ((m = regex.exec(src)) !== null) if (m[1]) out.push(m[1])
	return out
}

// Lowercase-initial backticked call-form APIs — `` `name(` ``. (Method
// calls in the guide are written qualified — `Inspector.inspect()`,
// `FindingManager.findings()` — so they start uppercase and are NOT in
// this set; only genuine top-level lowercase exports like `describePath(`
// / `resolveModel(` are checked, exactly as traversals.test.ts scopes its
// DOC → SOURCE set.)
function documentedApis(source: string): readonly string[] {
	const out = new Set<string>()
	const regex = /`([a-z][A-Za-z0-9]*)\(/g
	let m: RegExpExecArray | null
	while ((m = regex.exec(source)) !== null) if (m[1]) out.add(m[1])
	return Array.from(out)
}

// Every backticked identifier in the guide, in EITHER call form `` `name(` ``
// OR bare form `` `name` `` — class exports (`Inspector`, `FindingManager`,
// `Walker`) and the const `rules` are referenced bare in prose/tables, so
// both forms count as "documented".
function documentedNames(source: string): ReadonlySet<string> {
	const out = new Set<string>()
	let m: RegExpExecArray | null
	const bare = /`([A-Za-z_$][\w$]*)`/g
	while ((m = bare.exec(source)) !== null) if (m[1]) out.add(m[1])
	const call = /`([A-Za-z_$][\w$]*)\(/g
	while ((m = call.exec(source)) !== null) if (m[1]) out.add(m[1])
	// Member references (`Inspector.inspect(`, `FindingManager.findings(`)
	// document the OWNING class — fold the leading segment in so a qualified
	// method mention still counts the class as documented.
	const member = /`([A-Za-z_$][\w$]*)\.[\w$]/g
	while ((m = member.exec(source)) !== null) if (m[1]) out.add(m[1])
	return out
}

const ALL_EXPORTS = new Set(SOURCES.flatMap(exportedNames))
const BARREL_EXPORTS = new Set(BARREL_SOURCES.flatMap(exportedNames))

describe('inspector — every documented API resolves to a @elements/browser export', () => {
	for (const name of documentedApis(doc)) {
		// On failure: `${name}(` is documented in guides/inspector.md but is
		// not exported by any of the inspector's composed `@elements/browser`
		// files. Fix the doc or restore the export.
		it(`${name}() is a real @elements/browser export`, () => {
			expect(ALL_EXPORTS.has(name)).toBe(true)
		})
	}
})

describe('inspector — every inspector-barrel export is documented in inspector.md', () => {
	const DOCUMENTED = documentedNames(doc)
	for (const name of BARREL_EXPORTS) {
		// On failure: `${name}` is an export of the inspector barrel
		// (src/browser/inspector/index.ts) but is not backticked anywhere in
		// guides/inspector.md. Document it (the guide advertises an
		// exhaustive surface). If it is intentionally an internal
		// not-for-doc export, that is itself a signal it should not be a
		// public export — do not allowlist it here.
		it(`${name} is documented in guides/inspector.md`, () => {
			expect(DOCUMENTED.has(name)).toBe(true)
		})
	}
})

// The `{family}/{concern}` rule ids the guide's `### rules` catalog
// documents (backticked). The catalog is the ONLY place a `family/concern`
// id appears backticked in the guide, so this match IS the documented-id
// set — no duplicated parse of the prose. Mirrors `documentedApis` /
// `documentedNames`: one anchored regex over the guide source, deduped.
function documentedRuleIds(source: string): ReadonlySet<string> {
	const out = new Set<string>()
	const regex = /`([a-z][a-z-]*\/[a-z][a-z-]*)`/g
	let m: RegExpExecArray | null
	while ((m = regex.exec(source)) !== null) if (m[1]) out.add(m[1])
	return out
}

const REGISTRY_RULE_IDS = new Set(rules.map((r) => r.id))
const CATALOG_RULE_IDS = documentedRuleIds(doc)

describe('inspector — the rule catalog is bidirectional parity with the shipped `rules` registry', () => {
	// DOC → SOURCE: every `{family}/{concern}` id the guide's catalog
	// backticks resolves to a real id in the shipped frozen `rules`
	// registry. A renamed / removed / typo'd catalog id fails here (the
	// guide cannot advertise a rule that does not ship) — the same
	// real-parity bite as "every documented API resolves to an export".
	for (const id of CATALOG_RULE_IDS) {
		it(`catalog id \`${id}\` is a real rule in the \`rules\` registry`, () => {
			expect(REGISTRY_RULE_IDS.has(id)).toBe(true)
		})
	}

	// SOURCE → DOC: every id in the shipped `rules` registry is documented
	// in the guide's catalog. A new/renamed rule (`content/cardinality` was
	// just added; future rules) that the guide does not list fails here —
	// makes the catalog's "every rule the inspector evaluates" claim real,
	// exactly as the barrel SOURCE → DOC guard makes the surface claim real.
	// No allowlist: an undocumented shipped rule is fixed by documenting it,
	// never by exempting it.
	for (const id of REGISTRY_RULE_IDS) {
		it(`registry rule \`${id}\` is documented in the inspector.md catalog`, () => {
			expect(CATALOG_RULE_IDS.has(id)).toBe(true)
		})
	}
})

describe('inspector — the public type surface lives in src/browser/types.ts', () => {
	const types = readFileSync(resolvePath(WORKSPACE_ROOT, 'src/browser/types.ts'), 'utf8')
	const declared = (name: string): boolean =>
		new RegExp(`^export\\s+(?:interface|type)\\s+${name}\\b`, 'm').test(types)

	// The TYPES-ARE-TRUTH set the guide's §Contract 3 binds. Each must be a
	// real `export interface` / `export type` in types.ts — a rename/removal
	// fails here (the guide cannot claim a type that does not ship).
	for (const name of [
		'InspectorInterface',
		'InspectorOptions',
		'InspectionResult',
		'Finding',
		'FindingRecord',
		'FindingSeverity',
		'RuleLens',
		'RuleInterface',
		'RuleContext',
		'RuleRestrictions',
		'WalkerInterface',
		'FindingManagerInterface',
		'InspectorEventMap',
		'ContentModelEntry',
		'ContentCategory',
		'ContentModel',
	] as const) {
		it(`${name} is declared in src/browser/types.ts`, () => {
			expect(declared(name)).toBe(true)
		})
		it(`${name} is documented in guides/inspector.md`, () => {
			expect(documentedNames(doc).has(name)).toBe(true)
		})
	}
})
