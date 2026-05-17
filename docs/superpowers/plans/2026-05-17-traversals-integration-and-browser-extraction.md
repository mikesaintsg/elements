# Traversals Integration + Maximalist `src/browser` Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the brought-over `traversals` trio native to the repo, sweep every non-exported top-level symbol in `src/browser` into the centralized files, add comprehensive helper tests, then consolidate.

**Architecture:** Behavior-preserving relocations in dependency order: (1) clean `traversals.ts` + relocate its types/guards + resolve the `isElement` collision via an `isElement`→`isTagged` rename; (2) extract pure constants/helpers across all impl files; (3) extract the theme singleton into a new `theme.ts` service module; (4) author `tests/src/browser/helpers.test.ts`; (5) consolidate near-duplicates; (6) rewrite `guides/traversals.md` to the spec skeleton + add its parity driver + README map. Each batch is verified (`npm run check` + targeted vitest + `npm run build`) and committed.

**Tech Stack:** TypeScript (strict, no `any`/`!`/`as`), Vitest (projects `src:browser`, `guides`), Vue `@vue/reactivity`, Sass, the repo's AGENTS.md conventions.

Spec: [docs/superpowers/specs/2026-05-17-traversals-integration-and-browser-extraction-design.md](../specs/2026-05-17-traversals-integration-and-browser-extraction-design.md)

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/browser/traversals.ts` | DOM traversal utilities only (exported fns) | Rewrite header/style; remove `!`/`as`; remove relocated guards/types |
| `src/browser/types.ts` | Source of truth for types | Add `ElementPredicate`, `MatcherOptions` |
| `src/browser/helpers.ts` | Framework-agnostic guards/utilities | Receive relocated guards/fns; rename `isElement`→`isTagged`; receive `isSetting`, `cssEscape`, `compareCellValues`/`sortCollator`, `entry`, selector parsers, `toStringList` |
| `src/browser/constants.ts` | UPPER_SNAKE values | Receive relocated selector/attr constants, `EMPTY_*`, `PLACEMENT_*`, `SEGMENT` |
| `src/browser/theme.ts` | **NEW** theme singleton service | Receive `createTheme.ts` singleton + `resetTheme` |
| `src/browser/factories/createTheme.ts` | Thin per-caller wrapper | Reduced to wrapper over `theme.ts` |
| `src/browser/{patterns,taxonomy,createAlert,createDrag,createForm,createSelect,createTable}.ts` + `composables/{useTable,useForm,useDrag}.ts` | Class/factory only | Lose relocated symbols; `PAIRING_INDEX` exported |
| `src/browser/index.ts` | Sole barrel | Add `export * from './theme.js'` |
| `tests/src/browser/traversals.test.ts` | Traversals behavior | Fix labels/weak assertions; align names |
| `tests/src/browser/helpers.test.ts` | **NEW** helper behavior | Comprehensive coverage |
| `guides/traversals.md` | Spec guide | Rewrite to mandatory skeleton |
| `tests/guides/traversals.test.ts` | **NEW** doc↔source parity driver | Bijection requirement |
| `guides/README.md` | Pointer map | Add traversals + theme.ts entries |

---

## Conventions every task must hold (AGENTS.md)

- No `any`, no `!`, no `as`, no `@ts-*`/`eslint-disable`. Tabs, single quotes, no semicolons, `.js` import extensions, `import type` first.
- Verify command per batch: `npm run check` (lint+typecheck), then the targeted vitest project, then `npm run build`.
- Targeted test runs only: `npx vitest run --project src:browser <file>` and `npx vitest run --project guides <file>`. Never the full suite.
- Commit at the end of each task with the staged files listed explicitly (never `git add -A`; the pre-existing `traversals` trio is already partially staged — only stage what each step changed).

---

## Task 1: Clean `traversals.ts` — header, style, `!`/`as` removal

**Files:**
- Modify: `src/browser/traversals.ts`

- [ ] **Step 1: Replace the file header (lines 1-29)**

Replace lines 1-29 (the `low*` header + the two non-exported type declarations) with project-voice TSDoc and nothing else (types move in Task 2, so leave a single blank line where they were — they'll be imported in Task 2):

```ts
// ============================================================================
//  DOM traversal utilities — native-API-backed, type-safe, allocation-aware.
//
//  Simple lookups (`findDescendantByClass`, `findAncestorByTag`, …) delegate
//  to native `querySelector` / `closest` / `getElementsBy*` for C++-level
//  speed. Predicate-based traversals (`findDescendant`, `findAncestor`, …)
//  use stack/queue iteration so arbitrary matching logic stays O(depth)
//  without recursion limits or interim array allocations.
//
//  Every symbol here is a pure DOM operation: no Vue, no framework state.
// ============================================================================

import type { ElementPredicate, MatcherOptions } from './types.js'
import {
	createMatcher,
	hasAttribute,
	hasClass,
	hasClasses,
	hasId,
	isElement,
	isFormFieldElement,
	isHTMLElement,
	isTagType,
	isTextNode,
	matchesTag,
} from './helpers.js'
```

(The imported names are the guards relocated in Task 2 + the helpers `createMatcher`. Until Task 2 lands they will not resolve — Task 1 and Task 2 commit together as batch 1; run `npm run check` only at the end of Task 2.)

- [ ] **Step 2: Delete the now-relocated declarations from `traversals.ts`**

Delete these blocks (they move to `helpers.ts`/`types.ts` in Task 2):
- `type ElementPredicate` and `interface MatchCriteria` (old lines 19-29)
- `function isElement` (35-37), `function isHTMLElement` (42-44), `function isTextNode` (50-52), `function isTagType` (58-63), `function isFormElement` (68-74)
- `function matchesTag` (83-85), `function hasClass` (90-92), `function hasClasses` (97-106), `function hasId` (111-113), `function hasAttribute` (118-123)
- `export function createMatcher` (139-170) — moves to `helpers.ts` (it consumes `MatcherOptions`)

Keep every other `export function`.

- [ ] **Step 3: Remove every `!` non-null assertion**

Replace each `const current = stack.pop()!` pattern. Canonical replacement (applies in `findDescendant`, `findAllDescendants`, `findDescendantsWithLimit`, `walkDescendants`, `walkDescendantsGenerator`):

```ts
while (stack.length > 0) {
	const current = stack.pop()
	if (current === undefined) break
	// …existing body using `current`…
}
```

For `walkDescendantsGenerator` keep `yield current` after the `undefined` guard.

- [ ] **Step 4: Remove every `as` type assertion**

- `findClosestByTag`: replace `return current as HTMLElementTagNameMap[K]` — use `isTagType(current, tagName)` (the relocated guard) to narrow, then `return current`. Signature stays `HTMLElementTagNameMap[K] | null`.
- `findNextSiblingByTag` / `findPreviousSiblingByTag`: same — narrow with `isTagType(current, tagName)` instead of `current as …`.
- `delegate`: replace `event.target as Element | null` with a guard:

```ts
const listener = (event: Event): void => {
	const start = event.target
	let target: Element | null = start instanceof Element ? start : null
	while (target !== null && target !== container) {
		if (predicate(target)) {
			if (event instanceof event.constructor) handler(target, event as never)
			return
		}
		target = target.parentElement
	}
}
```

Do NOT use `as` — instead type `handler` against the resolved event by changing the internal listener to call `handler(target, event)` with `event` typed `HTMLElementEventMap[K]` via an `instanceof`-free contract: keep the public overloads, and inside the implementation type the handler parameter as `Event` and let the public overload signatures provide the typed surface to callers. Concretely, change the implementation signature's `handler` param to `(target: Element, event: Event) => void` and the two public overloads keep `HTMLElementEventMap[K]`. Remove the `as EventListener` casts by typing `listener` as `(event: Event) => void` and passing it directly to `addEventListener`/`removeEventListener` (DOM lib accepts `(event: Event) => void` for `EventListener`).
- `getElementById`: drop the generic `<T>` + `as T`. New signature: `export function getElementById(id: string, doc: Document = document): HTMLElement | null { return doc.getElementById(id) }`.
- `clone`: drop `as T`. New: `export function clone<T extends Node>(element: T, deep = true): T { const copy = element.cloneNode(deep); return copy instanceof element.constructor ? copy : element.cloneNode(deep) }` — simplest correct form without `as`: `cloneNode` returns `Node`; narrow with `instanceof`:

```ts
export function clone<T extends Element>(element: T, deep = true): T {
	const copy = element.cloneNode(deep)
	if (copy instanceof Element && copy.tagName === element.tagName) return copy as never
	throw new TypeError('clone: cloneNode did not return an Element')
}
```

`as never` is still an assertion — instead, accept the structural reality: `cloneNode` is typed `Node`. Use the DOM's own typed clone by constraining `T extends Element` and returning via a typed helper: change `clone` to delegate to `Node.prototype.cloneNode` through a generic that the TS DOM lib already types — i.e. keep `element.cloneNode(deep)` and assign to a `Node`, then re-query is wrong. **Final decision:** narrow with a user-defined type guard added in `helpers.ts` (Task 2) `isElement`, and return `element` reconstructed is impossible. Accept TS DOM typing: `cloneNode<T>` is not generic in lib.dom. Therefore implement `clone` without a generic:

```ts
export function clone(element: Element, deep = true): Element {
	const copy = element.cloneNode(deep)
	if (!(copy instanceof Element)) {
		throw new TypeError('clone: expected an Element clone')
	}
	return copy
}
```

Update `tests/src/browser/traversals.test.ts` clone tests accordingly (Task 8) — they only assert `.innerHTML`/`.children`, so `Element` return is sufficient.

- [ ] **Step 5: Fix spacing artifacts**

Search the file for the `. ` artifacts introduced by the import (`element. childElementCount`, `criteria. id`, `current. parentElement`, `child. previousElementSibling`, `stack. push`, etc.) and remove the stray space after the dot. These are mechanical (`. ` → `.` only inside member access — be careful not to touch ellipses or prose in TSDoc).

- [ ] **Step 6: Defer verification to Task 2**

`traversals.ts` now imports relocated guards that don't exist yet. Do not run `npm run check` until Task 2 completes. No commit yet.

---

## Task 2: Relocate types → `types.ts`, guards/`createMatcher` → `helpers.ts`, rename `isElement`→`isTagged`

**Files:**
- Modify: `src/browser/types.ts`, `src/browser/helpers.ts`, plus every `isElement(`/`isElement<` call site

- [ ] **Step 1: Add the two types to `types.ts`**

Append a new section before the per-composable blocks (after line 142, near "Misc cross-cutting details"):

```ts
// ─────────────────────────────────────────────────────────────────────────
// DOM traversal primitives
// ─────────────────────────────────────────────────────────────────────────

/** Predicate over an element — the matching contract for the `find*`
 *  / `walk*` traversal helpers. */
export type ElementPredicate = (element: Element) => boolean

/** Criteria bag consumed by `createMatcher` to build an `ElementPredicate`. */
export interface MatcherOptions {
	readonly tag?: string
	readonly id?: string
	readonly class?: string
	readonly classes?: readonly string[]
	readonly attributes?: Readonly<Record<string, string | undefined>>
}
```

- [ ] **Step 2: Rename existing `isElement` → `isTagged` in `helpers.ts`**

In `src/browser/helpers.ts` lines 159-167, rename `export function isElement<T extends HTMLElement>(…)` to `export function isTagged<T extends HTMLElement>(…)`. Body unchanged. Update its TSDoc first line to "Boolean variant of {@link assertElement}." (already references assertElement).

- [ ] **Step 3: Update all `isElement` call sites to `isTagged`**

Run `npx tsc --noEmit` is deferred; instead grep-and-replace. Search `src/browser/**` for `isElement(` and `isElement<` and the import lists. Replace identifier `isElement` → `isTagged` ONLY where it refers to the helpers symbol (composables/factories importing from `../helpers.js`). The traversals/test `isElement` (node guard) is a different symbol — do not touch those.

Command to find sites:

```
Grep pattern: \bisElement\b   path: src/browser
```

Expected sites: `helpers.ts` self, and any composable/factory importing `isElement` from `./helpers.js`/`../helpers.js`. Update import specifiers and call sites to `isTagged`.

- [ ] **Step 4: Move the traversals guards into `helpers.ts`**

Add a new section to `helpers.ts` (after section 1 "Identity / narrowing", before "Semantic-element gating") containing the relocated, AGENTS-clean guards. `isElement` here is the **node-type** guard (canonical name):

```ts
// ── DOM node-type guards ────────────────────────────────────────────────────

/** Narrow a node to an `Element`. */
export function isElement(node: Node | null): node is Element {
	return node !== null && node.nodeType === Node.ELEMENT_NODE
}

/** Narrow a node to an `HTMLElement`. */
export function isHTMLElement(node: Node | null): node is HTMLElement {
	return node instanceof HTMLElement
}

/** Narrow a node to a `Text` node. */
export function isTextNode(node: Node | null): node is Text {
	return node !== null && node.nodeType === Node.TEXT_NODE
}

/** Narrow an element to a specific tag. */
export function isTagType<K extends keyof HTMLElementTagNameMap>(
	element: Element | null,
	tagName: K,
): element is HTMLElementTagNameMap[K] {
	return element !== null && element.tagName === tagName.toUpperCase()
}

/** Check an element's tag name (case-insensitive). */
export function matchesTag(element: Element, tagName: string): boolean {
	return element.tagName === tagName.toUpperCase()
}

/** Check a single class. */
export function hasClass(element: Element, className: string): boolean {
	return element.classList.contains(className)
}

/** Check every class in `classNames` is present. */
export function hasClasses(element: Element, classNames: readonly string[]): boolean {
	for (const className of classNames) {
		if (!element.classList.contains(className)) return false
	}
	return true
}

/** Check an element id. */
export function hasId(element: Element, id: string): boolean {
	return element.id === id
}

/** Check attribute presence, or exact value when `value` is given. */
export function hasAttribute(element: Element, name: string, value?: string): boolean {
	return value === undefined ? element.hasAttribute(name) : element.getAttribute(name) === value
}

/** Build an `ElementPredicate` from a `MatcherOptions` criteria bag. */
export function createMatcher(criteria: MatcherOptions): ElementPredicate {
	return (element: Element): boolean => {
		if (criteria.tag !== undefined && element.tagName !== criteria.tag.toUpperCase()) return false
		if (criteria.id !== undefined && element.id !== criteria.id) return false
		if (criteria.class !== undefined && !element.classList.contains(criteria.class)) return false
		if (criteria.classes !== undefined && !hasClasses(element, criteria.classes)) return false
		if (criteria.attributes !== undefined) {
			for (const name in criteria.attributes) {
				const expected = criteria.attributes[name]
				if (expected === undefined) {
					if (!element.hasAttribute(name)) return false
				} else if (element.getAttribute(name) !== expected) {
					return false
				}
			}
		}
		return true
	}
}
```

Add `ElementPredicate, MatcherOptions` to the `import type { … } from './types.js'` block at the top of `helpers.ts`.

Note: traversals' old `isFormElement` is intentionally NOT recreated (consolidated away — see Task 9). `traversals.ts` will use `isFormFieldElement` (already in helpers.ts) wherever it needs a form-control check.

- [ ] **Step 5: Run batch-1 verification**

Run: `npm run check`
Expected: PASS (no lint/type errors; `traversals.ts` resolves its imports; no `!`/`as`).

Run: `npx vitest run --project src:browser tests/src/browser/traversals.test.ts`
Expected: import resolution OK; failures only where Task 8 will fix the test (labels/weak assertions/clone signature) — note them, do not fix here.

- [ ] **Step 6: Commit batch 1**

```bash
git add src/browser/traversals.ts src/browser/types.ts src/browser/helpers.ts
git commit -m "refactor(browser): integrate traversals — relocate types/guards, isElement→isTagged, drop !/as"
```

(Also stage any composable/factory files whose `isElement`→`isTagged` call sites changed in Step 3 — list them explicitly in the `git add`.)

---

## Task 3: Extract pure constants → `constants.ts`

**Files:**
- Modify: `src/browser/constants.ts` (add), and `factories/createAlert.ts`, `factories/createDrag.ts`, `factories/createForm.ts`, `factories/createTable.ts`, `taxonomy.ts`, `helpers.ts`, `composables/useTable.ts`, `composables/useForm.ts`, `composables/useDrag.ts` (remove + import)

- [ ] **Step 1: Append the relocated constants to `constants.ts`**

Add a new section at the end of `constants.ts`:

```ts
// ── Relocated impl-file constants ───────────────────────────────────────────

/** `createAlert` dismiss-trigger selector. */
export const ALERT_DISMISS_SELECTOR = '[data-alert-dismiss]'

/** Classes `createDrag` toggles on the dragged row. */
export const DRAG_ROW_CLASSES: readonly string[] = [
	// (copy the exact array body from factories/createDrag.ts lines 17-…)
]

/** `createForm` validated-state marker. */
export const FORM_VALIDATED_ATTR = 'data-form-validated'

/** `createTable` expansion-panel marker + selector. */
export const PANEL_ATTR = 'data-table-expansion-panel'
export const PANEL_SELECTOR = `[${PANEL_ATTR}]`

/** `createTable` column-resize handle marker + selector. */
export const RESIZE_HANDLE_ATTR = 'data-table-resize-handle'
export const RESIZE_HANDLE_SELECTOR = `thead th [${RESIZE_HANDLE_ATTR}]`

/** `aria-sort` value per sort direction. */
export const ARIA_SORT_VALUE: Readonly<Record<TableSortDirection, string>> = {
	// (copy the exact map body from factories/createTable.ts line 78-…)
}

/** Token-name regex segment (taxonomy). */
export const SEGMENT = '[a-z][a-z0-9]*'

/** `position-area` value per popover `Placement`. */
export const PLACEMENT_AREAS: Readonly<Record<Placement, string>> = {
	// (move verbatim from helpers.ts lines 728-741)
}

/** `[alignSelf, justifySelf]` per popover `Placement`. */
export const PLACEMENT_SELFS: Readonly<Record<Placement, readonly [string, string]>> = {
	// (move verbatim from helpers.ts lines 757-770)
}

/** Stable-identity empty sentinels (referential stability for reactivity). */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([])
export const EMPTY_SET: ReadonlySet<never> = Object.freeze(new Set<never>()) as ReadonlySet<never>
```

`as ReadonlySet<never>` is an assertion — replace with: `export const EMPTY_SET: ReadonlySet<never> = new Set<never>()` (no freeze needed; never mutated). Keep `EMPTY_ARRAY` as `readonly never[] = []`. Typed element-specific empties are introduced in Task 9's consolidation; for Task 3, the per-file `EMPTY_*` consts are simply imported from here once Task 9 unifies them — in Task 3 only move the trivially-pure constants (selectors/attrs/SEGMENT/PLACEMENT_*). Defer `EMPTY_*` relocation to Task 9 (they need type-specific identities and a consolidation decision).

Add `import type { Placement, TableSortDirection } from './types.js'` to `constants.ts` (type import block).

- [ ] **Step 2: Update each source file to import instead of declare**

For each file, delete the local declaration and add an import from `../constants.js` (factories/composables) or `./constants.js` (taxonomy, helpers):
- `factories/createAlert.ts`: delete `const ALERT_DISMISS_SELECTOR` (line 9), import it.
- `factories/createDrag.ts`: delete `const DRAG_ROW_CLASSES` (line 17), import it.
- `factories/createForm.ts`: delete `const FORM_VALIDATED_ATTR` (line 29), import it.
- `factories/createTable.ts`: delete `PANEL_ATTR`/`PANEL_SELECTOR`/`RESIZE_HANDLE_ATTR`/`RESIZE_HANDLE_SELECTOR`/`ARIA_SORT_VALUE` (lines 74-78+), import them.
- `taxonomy.ts`: delete `const SEGMENT` (line 315), import it from `./constants.js`. Confirm `TOKEN_NAME_ELEMENT`/`TOKEN_NAME_CONTEXT` still compile referencing the imported `SEGMENT`.
- `helpers.ts`: delete `const PLACEMENT_AREAS` (728-741) and `const PLACEMENT_SELFS` (757-770); import both from `./constants.js`. `areaForPopoverPlacement`/`selfsForPopoverPlacement` now read the imported constants.

- [ ] **Step 3: Verify + commit (batch 2a)**

Run: `npm run check`
Expected: PASS.

Run: `npx vitest run --project src:browser`
Expected: PASS (behavior unchanged; constants are referentially identical strings/objects).

```bash
git add src/browser/constants.ts src/browser/helpers.ts src/browser/taxonomy.ts src/browser/factories/createAlert.ts src/browser/factories/createDrag.ts src/browser/factories/createForm.ts src/browser/factories/createTable.ts
git commit -m "refactor(browser): centralize selector/attr/placement constants into constants.ts"
```

---

## Task 4: Extract pure helpers → `helpers.ts`; export `PAIRING_INDEX`

**Files:**
- Modify: `src/browser/helpers.ts`, `factories/createTable.ts`, `factories/createSelect.ts`, `taxonomy.ts`, `patterns.ts`

- [ ] **Step 1: Move `cssEscape`, `compareCellValues`, `sortCollator` from `createTable.ts` to `helpers.ts`**

Cut `function cssEscape` (createTable.ts:1654), `const sortCollator` (1666), `function compareCellValues` (1670) verbatim into a new `helpers.ts` section "── Table sort/escape primitives ──". Make all three `export`. In `createTable.ts` import them from `../helpers.js`.

- [ ] **Step 2: Move taxonomy `entry` builder to `helpers.ts`**

Cut `function entry(` (taxonomy.ts:70) into `helpers.ts` as `export function entry(`. It returns a `TaxonomyEntry` — add `import type { TaxonomyEntry } from './types.js'`? `TaxonomyEntry` is currently declared/exported from `taxonomy.ts`, not `types.ts`. AGENTS §5: types belong in `types.ts`. Move `interface TaxonomyEntry`, `type ElementCategory`, `type ElementTreatment` from `taxonomy.ts` to `types.ts` (export), and have both `taxonomy.ts` and `helpers.ts` import them. Update `taxonomy.ts` to import `entry` from `./helpers.js`.

- [ ] **Step 3: Move patterns selector parsers to `helpers.ts`; export `PAIRING_INDEX`**

Cut `splitTopLevel` (patterns.ts:2373), `leadingTagsOfCompound` (2397), `trailingTagsOfCombinatorChain` (2410), `tagsInHead` (2420) into `helpers.ts` as `export function`s ("── SCSS selector parsing ──" section). `patterns.ts` imports them from `./helpers.js`. Change `const PAIRING_INDEX` (patterns.ts:2319) to `export const PAIRING_INDEX` (matches the exported-derived-index precedent of `TAXONOMY_BY_TAG`/`GROUPS_BY_TAG`); it stays in `patterns.ts`.

- [ ] **Step 4: Move `createSelect.ts` `normalize` → `helpers.ts` as `toStringList`**

Cut `function normalize(input: string | readonly string[] | undefined): readonly string[]` (createSelect.ts:483) into `helpers.ts` as `export function toStringList(input: string | readonly string[] | undefined): readonly string[]`. Update `createSelect.ts` call sites `normalize(` → `toStringList(` and import from `../helpers.js`.

- [ ] **Step 5: Verify + commit (batch 2b)**

Run: `npm run check`
Expected: PASS.

Run: `npx vitest run --project src:browser` and `npx vitest run --project guides tests/guides/patterns.test.ts tests/guides/elements.test.ts`
Expected: PASS (taxonomy/patterns parity unaffected — only symbol location changed; `PAIRING_INDEX` now exported is additive).

```bash
git add src/browser/helpers.ts src/browser/types.ts src/browser/taxonomy.ts src/browser/patterns.ts src/browser/factories/createTable.ts src/browser/factories/createSelect.ts
git commit -m "refactor(browser): centralize pure helpers (cssEscape, entry, selector parsers, toStringList); export PAIRING_INDEX"
```

---

## Task 5: Extract the theme singleton → new `src/browser/theme.ts`

**Files:**
- Create: `src/browser/theme.ts`
- Modify: `src/browser/factories/createTheme.ts`, `src/browser/helpers.ts`, `src/browser/index.ts`, `guides/README.md`

- [ ] **Step 1: Move `isSetting` to `helpers.ts`**

Cut `const isSetting` (createTheme.ts:33-34) into `helpers.ts` as:

```ts
import type { ThemeSetting } from './types.js'

/** Narrow an unknown value to a `ThemeSetting`. */
export function isSetting(value: unknown): value is ThemeSetting {
	return value === 'light' || value === 'dark' || value === 'system'
}
```

- [ ] **Step 2: Create `src/browser/theme.ts` with the singleton**

Create `src/browser/theme.ts`. Move verbatim from `createTheme.ts`: the singleton refs/lets (`setting`, `systemDark`, `mode`, `bootstrapped`, `mediaQuery`, `mediaListener`, `stopApply`, `storageKey`), `loadStored`, `writeAttribute`, `writeStorage`, `fireChange`, `bootstrap`, and `resetTheme`. Export `setting` (as `readonly`-wrapped via `themeSetting()`), `mode`, `bootstrap`, `resetTheme`, and a `themeState` accessor. Concrete module:

```ts
import type { ComputedRef, WatchHandle } from '@vue/reactivity'
import type { CreateThemeOptions, ThemeMode, ThemeSetting } from './types.js'
import { computed, ref, watch } from '@vue/reactivity'
import { STORAGE_KEY_THEME, THEME_EVENTS } from './constants.js'
import { emit, isSetting } from './helpers.js'

// One theme per page. Multiple callers share these refs.
const setting = ref<ThemeSetting>('system')
const systemDark = ref<boolean>(false)
const mode: ComputedRef<ThemeMode> = computed(() =>
	setting.value === 'system' ? (systemDark.value ? 'dark' : 'light') : setting.value,
)

let bootstrapped = false
let mediaQuery: MediaQueryList | null = null
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null
let stopApply: WatchHandle | null = null
let storageKey: string | null = STORAGE_KEY_THEME

const loadStored = (key: string): ThemeSetting | null => {
	try {
		const raw = localStorage.getItem(key)
		if (!raw) return null
		const head = raw.split(':')[0] ?? ''
		return isSetting(head) ? head : null
	} catch {
		return null
	}
}

const writeAttribute = (next: ThemeSetting): void => {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (next === 'system') root.removeAttribute('data-theme')
	else root.setAttribute('data-theme', next)
}

const writeStorage = (key: string | null, next: ThemeSetting): void => {
	if (!key) return
	try {
		localStorage.setItem(key, next)
	} catch {
		// Storage unavailable — silent no-op.
	}
}

const fireChange = (): void => {
	if (typeof document === 'undefined') return
	emit(document.documentElement, THEME_EVENTS.change, {
		mode: mode.value,
		setting: setting.value,
	})
}

/** Bootstrap the page-global theme singleton (idempotent). */
export function bootstrapTheme(options: CreateThemeOptions): void {
	if (bootstrapped) return
	bootstrapped = true
	const key = options.storage === false ? null : (options.storage?.key ?? STORAGE_KEY_THEME)
	storageKey = key
	const stored = key && typeof window !== 'undefined' ? loadStored(key) : null
	setting.value = stored ?? options.initial ?? 'system'
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		systemDark.value = mediaQuery.matches
		mediaListener = (event) => {
			systemDark.value = event.matches
		}
		mediaQuery.addEventListener('change', mediaListener)
	}
	stopApply = watch(
		() => setting.value,
		(next) => {
			writeAttribute(next)
			writeStorage(storageKey, next)
			fireChange()
		},
		{ immediate: true },
	)
}

/** Shared reactive theme state for `createTheme` wrappers. */
export function themeState(): {
	readonly setting: typeof setting
	readonly mode: typeof mode
} {
	return { setting, mode }
}

/** Reset all singleton state. Test-only. */
export function resetTheme(): void {
	if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener)
	mediaQuery = null
	mediaListener = null
	stopApply?.()
	stopApply = null
	storageKey = STORAGE_KEY_THEME
	bootstrapped = false
	setting.value = 'system'
	systemDark.value = false
}
```

- [ ] **Step 3: Reduce `createTheme.ts` to the wrapper**

Rewrite `createTheme.ts` to consume `theme.ts`:

```ts
import type { CreateThemeInstance, CreateThemeOptions, ThemeSetting } from '../types.js'
import { readonly } from '@vue/reactivity'
import { THEME_EVENTS } from '../constants.js'
import { isSetting, listen } from '../helpers.js'
import { bootstrapTheme, themeState } from '../theme.js'

export function createTheme(options: CreateThemeOptions = {}): CreateThemeInstance {
	bootstrapTheme(options)
	const { setting, mode } = themeState()

	let offChange: (() => void) | null = null
	if (typeof document !== 'undefined' && options.on?.change) {
		offChange = listen(document.documentElement, THEME_EVENTS.change, options.on.change)
	}

	const set = (next: ThemeSetting): void => {
		if (!isSetting(next)) return
		if (setting.value === next) return
		setting.value = next
	}
	const toggle = (): void => {
		set(mode.value === 'dark' ? 'light' : 'dark')
	}
	let destroyed = false
	const destroy = (): void => {
		if (destroyed) return
		destroyed = true
		offChange?.()
		offChange = null
	}

	return { setting: readonly(setting), mode: readonly(mode), set, toggle, destroy }
}
```

Keep the long explanatory TSDoc block from the original `createTheme` (lines 126-143) above the function. `resetTheme` is now imported from `../theme.js` by consumers (it was `export const resetTheme` in `createTheme.ts`; remove it there).

- [ ] **Step 4: Update the barrel + any `resetTheme` importers**

`src/browser/index.ts`: add `export * from './theme.js'` (alphabetical-ish, after `./taxonomy.js`). `tests/setupBrowser.ts` imports `resetTheme` from `@elements/browser` — still resolves via the barrel (now from `theme.ts`). The old `factories/index.ts` may `export *` createTheme — confirm `resetTheme` no longer expected from there (it now comes from `theme.ts` through the root barrel; `@elements/browser` re-exports both, so `import { resetTheme } from '@elements/browser'` is unchanged).

- [ ] **Step 5: Update `guides/README.md` src/browser table**

Add a row to the `### \`src/browser/\`` table:

```
| [`theme.ts`](../src/browser/theme.ts)         | Page-global theme singleton service (`bootstrapTheme`, `themeState`, `resetTheme`); `createTheme.ts` is the per-caller wrapper. |
```

- [ ] **Step 6: Verify + commit (batch 3)**

Run: `npm run check`
Expected: PASS.

Run: `npx vitest run --project src:browser tests/src/browser/factories/createTheme.test.ts tests/src/browser/composables/useTheme.test.ts`
Expected: PASS (singleton behavior identical; `resetTheme` still resets between tests via `setupBrowser.ts`).

```bash
git add src/browser/theme.ts src/browser/factories/createTheme.ts src/browser/helpers.ts src/browser/index.ts guides/README.md
git commit -m "refactor(browser): extract theme singleton into theme.ts service module"
```

---

## Task 6: Create `tests/src/browser/helpers.test.ts` (comprehensive)

**Files:**
- Create: `tests/src/browser/helpers.test.ts`

- [ ] **Step 1: Scaffold the file with the full export surface under test**

Create `tests/src/browser/helpers.test.ts`. Import every behavioral helper from `@elements/browser` (NOT constants/types). Cover, at minimum, one happy + one edge/error per helper. Concrete starter (extend to every export — `generateId`, `extractProperty`, `isStringArray`, `isEventHandler`, `isMouseEvent`, `extractTypes`, `assertElement`, `isTagged`, `isElement`, `isHTMLElement`, `isTextNode`, `isTagType`, `matchesTag`, `hasClass`, `hasClasses`, `hasId`, `hasAttribute`, `createMatcher`, `dispatch`, `emit`, `listen`, `bindEventMap`, `attachListeners`, `runTransition`, `waitForFrame`, `lockBodyScroll`, `unlockBodyScroll`, drag/drop guards, form/table helpers, popover placement, `focusableItems`, `rove`, `cssEscape`, `compareCellValues`, `entry`, `splitTopLevel`, `leadingTagsOfCompound`, `trailingTagsOfCombinatorChain`, `tagsInHead`, `toStringList`, `isSetting`):

```ts
import { afterEach, describe, expect, it } from 'vitest'
import {
	assertElement,
	createMatcher,
	cssEscape,
	emit,
	generateId,
	hasAttribute,
	hasClass,
	hasClasses,
	hasId,
	isElement,
	isHTMLElement,
	isSetting,
	isStringArray,
	isTagType,
	isTagged,
	isTextNode,
	listen,
	matchesTag,
	rove,
	toStringList,
} from '@elements/browser'

describe('helpers — node-type guards', () => {
	it('isElement narrows element nodes', () => {
		expect(isElement(document.createElement('div'))).toBe(true)
		expect(isElement(document.createTextNode('x'))).toBe(false)
		expect(isElement(null)).toBe(false)
	})
	it('isHTMLElement narrows HTMLElements', () => {
		expect(isHTMLElement(document.createElement('span'))).toBe(true)
		expect(isHTMLElement(null)).toBe(false)
	})
	it('isTextNode narrows text nodes', () => {
		expect(isTextNode(document.createTextNode('x'))).toBe(true)
		expect(isTextNode(document.createElement('p'))).toBe(false)
	})
	it('isTagType matches by tag', () => {
		expect(isTagType(document.createElement('button'), 'button')).toBe(true)
		expect(isTagType(document.createElement('button'), 'div')).toBe(false)
		expect(isTagType(null, 'div')).toBe(false)
	})
})

describe('helpers — isTagged (renamed from isElement)', () => {
	it('asserts a host matches one of the expected tags', () => {
		expect(isTagged(document.createElement('dialog'), 'dialog')).toBe(true)
		expect(isTagged(document.createElement('div'), ['ul', 'ol', 'menu'])).toBe(false)
		expect(isTagged(null, 'dialog')).toBe(false)
	})
})

describe('helpers — assertElement', () => {
	it('throws TypeError on tag mismatch', () => {
		expect(() => assertElement(document.createElement('div'), 'dialog', 'useDialog')).toThrowError(
			TypeError,
		)
	})
	it('passes a matching element', () => {
		expect(() => assertElement(document.createElement('ul'), ['ul', 'ol'], 'useMenu')).not.toThrow()
	})
})

describe('helpers — matching utilities', () => {
	it('matchesTag / hasClass / hasClasses / hasId / hasAttribute', () => {
		const el = document.createElement('div')
		el.className = 'a b'
		el.id = 'x'
		el.setAttribute('data-k', 'v')
		expect(matchesTag(el, 'DIV')).toBe(true)
		expect(hasClass(el, 'a')).toBe(true)
		expect(hasClasses(el, ['a', 'b'])).toBe(true)
		expect(hasClasses(el, ['a', 'z'])).toBe(false)
		expect(hasId(el, 'x')).toBe(true)
		expect(hasAttribute(el, 'data-k', 'v')).toBe(true)
		expect(hasAttribute(el, 'data-k', 'no')).toBe(false)
		expect(hasAttribute(el, 'absent')).toBe(false)
	})
	it('createMatcher composes criteria', () => {
		const el = document.createElement('div')
		el.id = 'x'
		el.className = 'a'
		el.setAttribute('data-t', 'v')
		expect(createMatcher({ tag: 'div', id: 'x', class: 'a' })(el)).toBe(true)
		expect(createMatcher({ attributes: { 'data-t': 'v' } })(el)).toBe(true)
		expect(createMatcher({ attributes: { 'data-t': undefined } })(el)).toBe(true)
		expect(createMatcher({ tag: 'span' })(el)).toBe(false)
	})
})

describe('helpers — misc pure', () => {
	it('generateId returns unique ids and honors prefix', () => {
		const a = generateId()
		const b = generateId('p')
		expect(a).not.toBe(generateId())
		expect(b.startsWith('p-')).toBe(true)
	})
	it('isStringArray / isSetting', () => {
		expect(isStringArray(['a', 'b'])).toBe(true)
		expect(isStringArray(['a', 1])).toBe(false)
		expect(isSetting('dark')).toBe(true)
		expect(isSetting('nope')).toBe(false)
	})
	it('toStringList normalizes', () => {
		expect(toStringList(undefined)).toEqual([])
		expect(toStringList('x')).toEqual(['x'])
		expect(toStringList(['x', 'y'])).toEqual(['x', 'y'])
	})
	it('cssEscape escapes selector-hostile chars', () => {
		expect(typeof cssEscape('a.b#c')).toBe('string')
		expect(cssEscape('a.b#c')).not.toContain('.')
	})
	it('rove computes roving index', () => {
		const items = [document.createElement('button'), document.createElement('button')]
		expect(rove(items, 'Home', 1)).toBe(0)
		expect(rove(items, 'End', 0)).toBe(1)
		expect(rove(items, 'ArrowDown', 0)).toBe(1)
		expect(rove(items, 'ArrowUp', 0)).toBe(1)
	})
})

describe('helpers — event plumbing', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})
	it('emit + listen round-trip', () => {
		const el = document.createElement('div')
		document.body.appendChild(el)
		let seen = 0
		const off = listen(el, 'elements:test:ping', () => {
			seen++
		})
		emit(el, 'elements:test:ping')
		off()
		emit(el, 'elements:test:ping')
		expect(seen).toBe(1)
	})
})
```

Continue the file: add a `describe` block per remaining helper group — `extractProperty` (own-prop only, non-object → undefined), `isEventHandler`, `isMouseEvent` (undefined → true, mouse pointer → true), `extractTypes`, `dispatch` (cancelable; preventDefault → false), `bindEventMap`, `attachListeners` (composite teardown removes all), `runTransition` (fires on `transitionend` + fallback timeout; returns canceller), `waitForFrame`, `lockBodyScroll`/`unlockBodyScroll` (counter clamps at 0; `BODY_LOCKED_ATTR` toggled), every drag/drop guard (`isDropPosition`, `isDragTapDetail`, `isDragStartDetail`, `isDragOverDetail`, `isDragDropDetail`), `extractRow`/`indexOfRow`/`extractRows`, form helpers (`isFormFieldElement`, `isValidityElement`, `readFormFields`, `readFormNames`, `readFormData`, `readFormErrors`, `fieldName`), table helpers (`writeTableCell`, `writeTableRow`, `readTableCells`, `keyOfTableCell`, `normalizeIndex`, `isTableCellTarget`, `isTableRangeTarget`, `readTableRows`, `extractRowId`, `findDetailRow`, `applyRowIndex`, `applyRowCount`, `tableBody`, `tableHeaderRow`, `tableFooterRow`, `writeTableHeaderRow`, `writeTableFooterRow`, `cleanTableSelection`, `markTableUnselectedRows`, `readTableHeaders`, `readTableFooter`, `readTableData`, `readTableColumns`), popover (`isSide`, `sideOf`, `alignmentOf`, `makePlacement`, `areaForPopoverPlacement`, `selfsForPopoverPlacement`, `resolvePopoverSide`), roving (`focusableItems`), selector parsers (`splitTopLevel`, `leadingTagsOfCompound`, `trailingTagsOfCombinatorChain`, `tagsInHead`), `compareCellValues`, `entry`. Each: ≥1 happy + ≥1 edge (empty/NaN/null/order). Use real DOM nodes (no mocks). For `runTransition` use a real `transitionend` `dispatchEvent` and a short fallback.

- [ ] **Step 2: Run the suite**

Run: `npx vitest run --project src:browser tests/src/browser/helpers.test.ts`
Expected: PASS (all helpers behave as specified).

- [ ] **Step 3: Commit (batch 4)**

```bash
git add tests/src/browser/helpers.test.ts
git commit -m "test(browser): comprehensive helpers.ts coverage"
```

---

## Task 7: Consolidation pass

**Files:**
- Modify: `src/browser/constants.ts`, `src/browser/helpers.ts`, `composables/useTable.ts`, `composables/useForm.ts`, `composables/useDrag.ts`

- [ ] **Step 1: Unify the `EMPTY_*` sentinels**

In `constants.ts` keep `EMPTY_ARRAY` (`readonly never[] = []`) and `EMPTY_SET` (`new Set<never>()`). Replace each per-file empty:
- `composables/useTable.ts` lines 27-32 (`EMPTY_DATA`, `EMPTY_STRINGS`, `EMPTY_HEADER_CELLS`, `EMPTY_BODY_ROWS`, `EMPTY_SORT_ENTRIES`, `EMPTY_COLUMNS`) — these are read as typed empties. Replace each declaration with `const EMPTY_DATA = EMPTY_ARRAY` etc. is wrong (type mismatch on `readonly never[]` vs `readonly TableRow[]` is assignable since `never[]` is assignable to any `readonly T[]`). Verify TS accepts `const x: readonly TableRow[] = EMPTY_ARRAY` — it does (`never` is bottom). So delete the local consts and import `EMPTY_ARRAY` from `../constants.js`, using it directly wherever `EMPTY_DATA`/`EMPTY_STRINGS`/etc. were referenced. For the `Set`-typed ones (`EMPTY_TOUCHED`, `useDrag` `EMPTY_SET`) use the shared `EMPTY_SET`.
- `composables/useForm.ts` lines 15-19 (`EMPTY_ENTRIES`, `EMPTY_FIELDS`, `EMPTY_NAMES`, `EMPTY_ERRORS`, `EMPTY_TOUCHED`) — same: replace with shared `EMPTY_ARRAY`/`EMPTY_SET`.
- `composables/useDrag.ts` line 6 (`EMPTY_SET`) — import shared `EMPTY_SET`.

Referential stability is preserved because all consumers now share the single frozen `EMPTY_ARRAY`/`EMPTY_SET` identity.

- [ ] **Step 2: Confirm `isFormElement` removal is complete**

Grep `src/browser` for `isFormElement` — expect zero matches (Task 2 already dropped it; traversals uses `isFormFieldElement`). If any remain, switch them to `isFormFieldElement`.

- [ ] **Step 3: Fold `focusableItems` onto traversals' focus utilities**

`helpers.ts` `focusableItems(root, selector)` filters `root.querySelectorAll(selector)` by `tabIndex >= 0`. `traversals.ts` exports `isFocusable`/`findFocusableElements`. Keep `focusableItems` (it is selector-scoped, distinct from the predicate-walk `findFocusableElements`) but make it reuse `isFocusable` for the focusability test instead of the bare `tabIndex >= 0` check, to remove the duplicated focusability heuristic:

```ts
import { isFocusable } from './traversals.js'
export function focusableItems(root: HTMLElement | null, selector: string): HTMLElement[] {
	if (!root) return []
	return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => isFocusable(el))
}
```

Confirm no import cycle: `traversals.ts` imports guards from `helpers.ts`; `helpers.ts` importing `isFocusable` from `traversals.ts` creates a cycle. Avoid it: instead move `isFocusable`/`findFocusableElements`/`findFirstFocusable`/`findLastFocusable` from `traversals.ts` into `helpers.ts` (they are focusability primitives, not traversal; this also lets `createFocus` reuse them) and keep `traversals.ts` free of focus logic. Update the guide/test surface accordingly (Task 8/10).

- [ ] **Step 4: Verify + commit (batch 5)**

Run: `npm run check`
Expected: PASS.

Run: `npx vitest run --project src:browser`
Expected: PASS.

```bash
git add src/browser/constants.ts src/browser/helpers.ts src/browser/traversals.ts src/browser/composables/useTable.ts src/browser/composables/useForm.ts src/browser/composables/useDrag.ts
git commit -m "refactor(browser): consolidate EMPTY_* sentinels and focusability primitives"
```

---

## Task 8: Clean `tests/src/browser/traversals.test.ts`

**Files:**
- Modify: `tests/src/browser/traversals.test.ts`

- [ ] **Step 1: Fix the mislabeled describe/it**

Line 796 `it('areSiblings should check sibling relationship'…)` tests `isSiblingOf` — rename the label to `'isSiblingOf should check sibling relationship'`.

- [ ] **Step 2: Strengthen weak assertions**

The visibility block (lines 723-755) asserts only `typeof result === 'boolean'`/`'number'`. Replace with real assertions: build an element with explicit geometry via `getBoundingClientRect` is read-only — instead assert the contract that holds in the test browser: `getViewportVisibility` returns `0` for an element positioned at `top:-10000px` (already covered), and `100` for an element scrolled into view; `isInViewport`/`isPartiallyInViewport` return `false` for the off-screen element and the boolean shape otherwise. Keep boolean-shape checks only where the headless viewport genuinely can't guarantee layout.

- [ ] **Step 3: Align import names**

Imports come from `@elements/browser`. Confirm `isElement` (node guard), `isHTMLElement`, `isTextNode`, `isTagType`, `matchesTag`, `hasClass`, `hasClasses`, `hasId`, `hasAttribute`, `createMatcher` all still import (now sourced from `helpers.ts` via the barrel). Remove `isFormElement` from the import list and its test (`isFormElement should identify form elements`, lines 151-157) — the symbol was consolidated away; replace with an `isFormFieldElement` test if form-control coverage is desired (already covered in `helpers.test.ts`, so delete here to avoid duplication).

- [ ] **Step 4: Fix the `clone` tests for the new signature**

`clone` is now `(element: Element, deep = true): Element`. The existing tests (lines 1148-1165) cast nothing and assert `.innerHTML`/`.children.length` — they pass as-is. Confirm no `as` is used in the test; if `original as HTMLElement` appears, replace with `const original = container.firstElementChild` and guard `if (!(original instanceof HTMLElement)) throw …`.

- [ ] **Step 5: Verify + commit**

Run: `npx vitest run --project src:browser tests/src/browser/traversals.test.ts`
Expected: PASS (all describe blocks green; labels accurate).

```bash
git add tests/src/browser/traversals.test.ts
git commit -m "test(browser): correct traversals test labels and strengthen assertions"
```

---

## Task 9: Rewrite `guides/traversals.md` to the spec skeleton

**Files:**
- Modify: `guides/traversals.md`

- [ ] **Step 1: Replace the entire file with the skeleton**

The file MUST be: line 1 `# Traversals`, line 3 a `>` blockquote, then `## Surface`, `## Contract`, `## Patterns`, `## Tests`, `## See also`. Every backticked `name(` must be a real export of `traversals.ts` or `helpers.ts` (the parity driver in Task 10 enforces both directions). Authoritative content:

```markdown
# Traversals

> Native-API-backed DOM traversal utilities — ancestor / descendant / sibling / child walks, relationship checks, batch mutation, event delegation, and keyed lookup. Package: `@elements/browser`. Source: [src/browser/traversals.ts](../src/browser/traversals.ts).

## Surface

Pure DOM operations. Simple lookups delegate to native `querySelector` / `closest` / `getElementsBy*`; predicate walks use stack/queue iteration (O(depth), no recursion limits). The node-type / matching guards (`isElement`, `isHTMLElement`, `isTextNode`, `isTagType`, `matchesTag`, `hasClass`, `hasClasses`, `hasId`, `hasAttribute`, `createMatcher`) live in [src/browser/helpers.ts](../src/browser/helpers.ts) and are documented here because they form the traversal surface.

### Guards & matching

| API | Behavior |
| --- | --- |
| `isElement()` | `Node \| null` → `node is Element`. |
| `isHTMLElement()` | `Node \| null` → `node is HTMLElement`. |
| `isTextNode()` | `Node \| null` → `node is Text`. |
| `isTagType()` | `(element, tag)` → `element is HTMLElementTagNameMap[tag]`. |
| `matchesTag()` | Case-insensitive tag check. |
| `hasClass()` / `hasClasses()` | Single / all-of class check. |
| `hasId()` / `hasAttribute()` | Id / attribute (optional exact value) check. |
| `createMatcher()` | Build an `ElementPredicate` from `MatcherOptions`. |

### Ancestor

`findAncestor()`, `findAncestorByTag()`, `findAncestorByClass()`, `findAncestorById()`, `getAncestors()`, `findCommonAncestor()`, `findClosest()`, `findClosestByTag()`, `findClosestByClass()`, `findClosestById()`.

### Child

`getChildCount()`, `hasChildren()`, `isEmpty()`, `getFirstChild()`, `getLastChild()`, `getChildAt()`, `getChildren()`, `findChild()`, `findChildByTag()`, `findChildByClass()`, `findChildById()`, `findChildren()`, `findChildrenByTag()`, `findChildrenByClass()`.

### Sibling

`getNextSibling()`, `getPreviousSibling()`, `getSiblingIndex()`, `getSiblings()`, `getNextSiblings()`, `getPreviousSiblings()`, `findNextSibling()`, `findNextSiblingByTag()`, `findNextSiblingByClass()`, `findPreviousSibling()`, `findPreviousSiblingByTag()`, `findPreviousSiblingByClass()`, `getParent()`.

### Descendant

`findDescendant()`, `findDescendantByTag()`, `findDescendantByClass()`, `findDescendantById()`, `findAllDescendants()`, `findDescendantsWithLimit()`, `walkDescendants()`, `walkDescendantsGenerator()`, `walkDescendantsBreadthFirst()`, `getDescendantsByTag()`, `getDescendantsByClass()`, `getFirstDescendantByTag()`, `getFirstDescendantByClass()`.

### Document & relationships

`getElementById()`, `getElementsByTag()`, `getElementsByClass()`, `getElementsByName()`, `isDescendantOf()`, `isAncestorOf()`, `isSiblingOf()`, `isBefore()`, `isAfter()`, `contains()`, `getTreeDistance()`, `getPathToAncestor()`.

### Visibility, collections, batch, delegation, focus, keyed

`isInViewport()`, `isPartiallyInViewport()`, `isRendered()`, `getViewportVisibility()`, `toArray()`, `findInCollection()`, `filterCollection()`, `append()`, `prepend()`, `insertBefore()`, `insertAfter()`, `replace()`, `clear()`, `remove()`, `move()`, `swap()`, `clone()`, `delegate()`, `isFocusable()`, `findFocusableElements()`, `findFirstFocusable()`, `findLastFocusable()`, `findByKey()`, `getAllKeyed()`.

## Contract

1. **DOC → SOURCE.** Every backticked call-form API here is a real `export` in `src/browser/traversals.ts` or `src/browser/helpers.ts`.
2. **SOURCE → DOC.** Every traversal export is documented above — the surface is exhaustive.
3. **TYPES ARE THE SOURCE OF TRUTH.** `ElementPredicate` and `MatcherOptions` are declared in [src/browser/types.ts](../src/browser/types.ts).
4. **NO ASSERTIONS.** No `!` / `as` / `any` — every narrowing is a guard.
5. **PURE DOM.** No Vue, no framework state; safe to import standalone.

Enforced by [`tests/guides/traversals.test.ts`](../tests/guides/traversals.test.ts) (doc↔source parity) and [`tests/src/browser/traversals.test.ts`](../tests/src/browser/traversals.test.ts) (behavior).

## Patterns

```ts
import { findAncestorByClass, findChildren, delegate, hasClass } from '@elements/browser'

const card = findAncestorByClass(button, 'card')
const items = findChildren(list, (el) => hasClass(el, 'item'))
const off = delegate(list, 'click', 'button', (el) => console.log(el))
off()
```

## Tests

- [`tests/src/browser/traversals.test.ts`](../tests/src/browser/traversals.test.ts) — per-helper DOM behavior.
- [`tests/guides/traversals.test.ts`](../tests/guides/traversals.test.ts) — doc ↔ source parity (bidirectional).

## See also

- [README.md](README.md) — the pointer file; full repository map.
- [composables.md](composables.md) — the Vue/factory layer that builds on these primitives.
```

If Task 7 Step 3 moved `isFocusable`/`findFocusableElements`/`findFirstFocusable`/`findLastFocusable` into `helpers.ts`, that's fine — the Contract says exports may live in `traversals.ts` **or** `helpers.ts`; the driver checks both.

- [ ] **Step 2: Commit**

```bash
git add guides/traversals.md
git commit -m "docs(guides): rewrite traversals.md to the spec-guide skeleton"
```

---

## Task 10: Create `tests/guides/traversals.test.ts` + update `guides/README.md`

**Files:**
- Create: `tests/guides/traversals.test.ts`
- Modify: `guides/README.md`

- [ ] **Step 1: Write the parity driver (models `tests/guides/parsers.test.ts`, two sources)**

Create `tests/guides/traversals.test.ts`:

```ts
// guides/traversals.md ↔ src/browser/{traversals,helpers}.ts
// Bidirectional parity: every documented call-form API resolves to a real
// export; every traversal/guard export is documented.
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readGuide, WORKSPACE_ROOT } from '../setupServer'

const doc = readGuide('traversals')

function exportedNames(file: string): readonly string[] {
	const src = readFileSync(resolvePath(WORKSPACE_ROOT, `src/browser/${file}.ts`), 'utf8')
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

function documentedNames(source: string): ReadonlySet<string> {
	const out = new Set<string>()
	let m: RegExpExecArray | null
	const bare = /`([A-Za-z_$][\w$]*)`/g
	while ((m = bare.exec(source)) !== null) if (m[1]) out.add(m[1])
	const call = /`([A-Za-z_$][\w$]*)\(/g
	while ((m = call.exec(source)) !== null) if (m[1]) out.add(m[1])
	return out
}

// Only the traversal/guard surface — helpers.ts also exports composable
// plumbing that traversals.md does NOT document, so SOURCE→DOC is scoped to
// traversals.ts plus the named guard set documented in the guide.
const TRAVERSAL_GUARDS = new Set([
	'isElement', 'isHTMLElement', 'isTextNode', 'isTagType', 'matchesTag',
	'hasClass', 'hasClasses', 'hasId', 'hasAttribute', 'createMatcher',
	'isFocusable', 'findFocusableElements', 'findFirstFocusable', 'findLastFocusable',
])
const TRAVERSAL_EXPORTS = new Set(exportedNames('traversals'))
const HELPER_EXPORTS = new Set(exportedNames('helpers'))
const ALL_EXPORTS = new Set([...TRAVERSAL_EXPORTS, ...HELPER_EXPORTS])

describe('traversals — every documented API resolves to a real export', () => {
	for (const name of documentedApis(doc)) {
		it(`${name}() is a real src/browser export`, () => {
			expect(ALL_EXPORTS.has(name)).toBe(true)
		})
	}
})

describe('traversals — every traversals.ts export is documented', () => {
	const DOCUMENTED = documentedNames(doc)
	for (const name of TRAVERSAL_EXPORTS) {
		it(`${name} is documented in guides/traversals.md`, () => {
			expect(DOCUMENTED.has(name)).toBe(true)
		})
	}
})

describe('traversals — documented guard set resolves in helpers.ts', () => {
	for (const name of TRAVERSAL_GUARDS) {
		it(`${name} is a real helpers/traversals export`, () => {
			expect(ALL_EXPORTS.has(name)).toBe(true)
		})
	}
})
```

- [ ] **Step 2: Update `guides/README.md`**

Three edits:
1. Add to the "By concept" section a new block (after "Core"):

```markdown
### Traversals — native DOM walk/match primitives

Pure DOM traversal + node-type guards. No Vue, no framework state.

| Role | File |
| --- | --- |
| Spec | [`guides/traversals.md`](traversals.md) |
| TS source | [`src/browser/traversals.ts`](../src/browser/traversals.ts) + guards in [`helpers.ts`](../src/browser/helpers.ts) |
| Behavior tests | [`tests/src/browser/traversals.test.ts`](../tests/src/browser/traversals.test.ts), [`tests/src/browser/helpers.test.ts`](../tests/src/browser/helpers.test.ts) |
| Doc parity | [`tests/guides/traversals.test.ts`](../tests/guides/traversals.test.ts) |
```

2. Add a row to the `### \`guides/\`` table: `| [\`traversals.md\`](traversals.md) | Native DOM traversal + node-type guard surface. |`
3. Add a row to the `### \`src/browser/\`` table for `traversals.ts` (theme.ts row already added in Task 5):

```
| [`traversals.ts`](../src/browser/traversals.ts) | Native-API DOM traversal utilities. Node-type / matching guards live in `helpers.ts`. |
```

(The pointer-link requirement in `README.test.ts` is satisfied by the `(traversals.md)` links above.)

- [ ] **Step 3: Verify the guide gate is green (batch 6)**

Run: `npx vitest run --project guides tests/guides/traversals.test.ts tests/guides/README.test.ts`
Expected: PASS — skeleton present, bijection satisfied (`guides/traversals.md` ⇔ `tests/guides/traversals.test.ts`), pointer links resolve, every documented API resolves, every `traversals.ts` export documented.

- [ ] **Step 4: Full targeted regression + final commit**

Run: `npm run check`
Run: `npx vitest run --project src:browser`
Run: `npx vitest run --project guides`
Run: `npm run build`
Expected: all PASS.

```bash
git add tests/guides/traversals.test.ts guides/README.md
git commit -m "test(guides): add traversals doc↔source parity driver; map traversals + theme.ts in README"
```

---

## Self-Review

**1. Spec coverage**

- Spec §3 (traversals cleanup) → Task 1. §4 (collision table, `isElement`→`isTagged`, `MatchCriteria`→`MatcherOptions`, `isFormElement` drop) → Task 2 + Task 8 Step 3 + Task 7 Step 2. §5 constants → Task 3; helpers + `PAIRING_INDEX` export → Task 4; `theme.ts` → Task 5. §6 consolidation (`EMPTY_*`, focus folding) → Task 7. §7 tests (`helpers.test.ts` create, `traversals.test.ts` clean) → Task 6 + Task 8. §8 guide + driver + README → Task 9 + Task 10. §9 batch order → Tasks map 1:1 to batches 1-6.
- Gap check: spec §4 `isHTMLElement` "keep" — covered (Task 2 Step 4 re-declares it cleanly in helpers.ts). Spec §5 `taxonomy SEGMENT` → Task 3. Spec risk "EMPTY_* referential stability" → Task 7 Step 1 explicitly preserves a single shared identity. No uncovered requirement.

**2. Placeholder scan**

- Task 3 Step 1 / `ARIA_SORT_VALUE` / `DRAG_ROW_CLASSES` / `PLACEMENT_*` use "(copy the exact … body from <file:line>)" — these are verbatim-move directives with exact source coordinates, not vague TODOs; acceptable because reproducing the literal bodies here would risk drift from source. Every NEW artifact (theme.ts, helpers.test.ts scaffold, parity driver, guide) has complete literal content.
- No "add error handling"/"similar to Task N"/"TBD" present.

**3. Type consistency**

- `isTagged` (Task 2) used consistently in Tasks 6/8. `isElement` = node guard everywhere post-Task-2. `MatcherOptions`/`ElementPredicate` defined in Task 2 Step 1, consumed by `createMatcher` (Task 2 Step 4), documented in Task 9, checked in Task 10. `bootstrapTheme`/`themeState`/`resetTheme` defined in Task 5 Step 2, consumed in Task 5 Step 3. `toStringList` defined Task 4 Step 4, tested Task 6. `EMPTY_ARRAY`/`EMPTY_SET` defined Task 3 (corrected: no `as`), unified Task 7. Consistent.
- Resolved internal contradiction: Task 7 Step 3 flagged a `helpers.ts ↔ traversals.ts` import cycle and resolves it by relocating the four focus primitives into `helpers.ts`; Task 9/Task 10 Contract + driver already allow guard/focus exports to live in `helpers.ts`, so no downstream inconsistency.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-traversals-integration-and-browser-extraction.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
