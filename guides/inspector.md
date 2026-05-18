# Inspector

> The semantic-HTML inspector — a DOM-walking content-model analyzer. Walks a parsed `ParentNode`, evaluates the frozen rule registry against the W3C content-model corpus, returns severity-ranked `Finding`s with stable paths + spec citations. Package: `@elements/browser`. Source: [src/browser/inspector/](../src/browser/inspector/).

## Surface

The inspector is **pure orchestration over already-shipped first-party tooling** — it reinvents nothing. The DOM walk is [`traversals`](traversals.md) (`walkDescendantsGenerator()`, `getAncestors()`, the `is*` / `matchesTag` guards); the structured constraint data + the serializable `Finding` shape are [`@elements/core`](shapers.md) `ContractShape`s ([compilers.md](compilers.md) derives their guard + JSON Schema + generator); rule predicates compose [`@elements/core` validators](validators.md); attribute-value rules use the [`@elements/core` parsers](parsers.md). The frozen content-model registry it resolves against is the [`schema`](w3c.md) (the W3C corpus mirror). It consumes a **parsed** `ParentNode` — never a string; there is no regex HTML parsing.

Four classes ship through the sole barrel ([src/browser/inspector/index.ts](../src/browser/inspector/index.ts) → [src/browser/index.ts](../src/browser/index.ts)):

| Export           | Role                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Inspector`      | The root entity. `new Inspector()`; `Inspector.inspect(options?)` runs one pass and returns an `InspectionResult`; `Inspector.findings` is the query sub-entity; `Inspector.rules` is the frozen registry. |
| `FindingManager` | The query surface over one pass's collected findings — the §4.2.2 sub-entity `Inspector.findings` exposes.                                                                                                 |
| `Walker`         | The DOM-walk spine: a thin flat-tree layer (shadow / slot / `<template>` aware, `<svg>` / `<math>` pruned) over `traversals`, plus the per-node `RuleContext` resolver.                                    |
| `rules`          | The frozen `readonly RuleInterface[]` registry — every rule the inspector evaluates, in walk order.                                                                                                        |

### `Inspector`

`new Inspector()` takes no construction options — every pass is configured per call. `Inspector.inspect(options?)` walks `options.root` (default `document`; a `Document` resolves to its root element, an `Element` walks itself, anything else is a programmer-error `throw` per AGENTS §13), evaluates every frozen rule per yielded node, applies the optional `options.severity` / `options.lens` filters, and returns the value `InspectionResult` (`findings`, `counts`, `walked`, `duration`). It is re-runnable — each pass replaces `Inspector.findings` and emits a fresh `start` → `finding`\* → `done` `CustomEvent` sequence on the resolved root (the `INSPECTOR_EVENTS` names, the AGENTS §14 `emit` / `bindEventMap` plumbing — there is no `Emitter` object; subscribe with `addEventListener` / `listen` on the root or any ancestor since the events bubble). `options.on` wires the partial `InspectorEventMap` for exactly that pass.

### `FindingManager`

`Inspector.findings` is a `FindingManager` over the LAST pass. A finding's stable id is the deterministic `{rule}@{path}` composite (the `describePath()` serializable-path string). The query surface, modeled exactly on the in-repo `createTable` selection sub-domain:

| API                                 | Behavior                                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| `FindingManager.count`              | Findings currently held (post-filter; decremented by `clear`).       |
| `FindingManager.finding(id)`        | One finding by its `{rule}@{path}` id, or `undefined` (§9 singular). |
| `FindingManager.findings()`         | All held findings, in walk order.                                    |
| `FindingManager.findings(severity)` | Only that `FindingSeverity`.                                         |
| `FindingManager.findings(lens)`     | Only that `RuleLens`.                                                |
| `FindingManager.findings(root)`     | Only findings whose element `root` contains (subtree filter).        |
| `FindingManager.clear()`            | Drop ALL — §11 reset; never mutates the DOM.                         |
| `FindingManager.clear(id)`          | Drop ONE → `boolean` (held-and-dropped).                             |
| `FindingManager.clear(ids)`         | Drop LISTED → `boolean` (true iff every id succeeded).               |

`FindingManager.findings` is one single-word plural accessor, the discriminator overloaded (not compounded) by argument TYPE; `FindingManager.clear` is the §10 three-overload single verb (modeled on the in-repo `createTable` selection sub-domain's single-verb-many-overloads `select` precedent).

### `Walker`

`new Walker(root)` (a non-Element root throws — the canonical guard the inspector delegates to, never re-implements). `Walker.element` is the subtree root. `Walker.walk()` lazily yields every relevant element of the flat subtree depth-first in document order (descends `shadowRoot` / slotted elements / `<template>.content`; yields a foreign `<svg>` / `<math>` host but never its subtree); `Walker.nodes()` is the eager frozen snapshot (safe to iterate across DOM mutation, `traversals.md` §Contract 6). `Walker.context(element)` resolves the per-node `RuleContext`: the transparent-resolved `model` / `categories`, the `getAncestors()` parent chain, the inherited descendant `RuleRestrictions`, and a lazily-memoized `getComputedStyle` accessor (the structure lens never calls it; the presentation lens does).

### `rules`

`rules` is the frozen `readonly RuleInterface[]` — `Inspector.rules` exposes it read-only (the inspector adds none; it is orchestration only). Each `RuleInterface` is a pure, total `(element, context) => Finding | null`: a stable `id` (`{family}/{concern}`), a `severity`, a `lens`, and `evaluate`. The catalog, by family:

- **context** — `context/parent-model` (a child the parent's content model can never admit).
- **content** — `content/required` (the parent's ordered child model unsatisfied), `content/forbidden` (a forbidden descendant present), `content/category` (a child whose resolved categories the bare-category parent does not permit).
- **transparent** — `transparent/interactive-descendant`, `transparent/link-descendant`, `transparent/tabindex-descendant`, `transparent/nested-media` (the descendant restrictions a transparent ancestor propagates — `<a>` / `<button>` / `<canvas>` / `<audio>` / `<video>`).
- **structure** — `structure/parent-restricted`, `structure/single-first-child`, `structure/edge-child`, `structure/no-self-nest`, `structure/void-has-children`.
- **attribute** — `attribute/coupling`, `attribute/required`, `attribute/value`, `attribute/coupling-domain`, `attribute/integer`, `attribute/enum` (the parser-coerced attribute checks).
- **interaction** — `interaction/hidden-reference` (an `[hidden]` / referenced-element integrity break).
- **presentation** (`lens: 'presentation'`, computed-style) — `presentation/list-style`, `presentation/bidi`, `presentation/preformatted`, `presentation/hidden`, `presentation/focus`, `presentation/visibility`.

### Adapters

The Phase-2/4 seams are thin adapters over the shipped tooling, in [src/browser/helpers.ts](../src/browser/helpers.ts): `resolveModel` (transparent resolution — walks `getAncestors()` / `findClosest()`), `effectiveCategories`, `nodePath` (wraps `getPathToAncestor()`), `describePath()` (the serializable `{tag}:{index} > …` path string the `FindingManager` keys ids off), `flatChildren`, plus the §14 `emit()` / `listen()` / `bindEventMap()` CustomEvent plumbing. The `INSPECTOR_EVENTS` name map lives in [src/browser/constants.ts](../src/browser/constants.ts).

### The content-model schema

Every structure rule resolves against the frozen [`schema`](w3c.md) — one `ContentModelEntry` per element (its `categories`, `model`, ordered `childModel`, `forbidden`, `constraints`, and the corpus `cite`). Single-word predicates index it: `isVoid`, `isTransparent`, `isForeign`, `isKnownElement`, `modelOf()`, `categoriesOf()`, `contextOf()`, `describeElement()`. The `model` is one of `transparent` / `void` / `text` / `nothing` / `children`. Each entry's `cite` is a `{corpusFile}#{anchor}` string into [`guides/w3c/**`](w3c/); a finding carries it verbatim so every finding resolves back to the canonical WHATWG paragraph.

### The transparent content model

`<a>`, `<ins>`, `<del>`, `<object>`, `<video>`, `<audio>`, `<canvas>`, `<map>`, `<slot>` are **transparent** ([spec: `dom.html#transparent-content-models`](https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models)): their content model is their parent's. `resolveModel(node)` walks ancestors via `getAncestors()` / `findClosest()` — if the parent is itself transparent, recurse; otherwise the effective model is the one the nearest **non-transparent** ancestor imposes; a detached transparent root resolves to **flow** (the verbatim spec rule). Ancestor _restrictions_ propagate through (no interactive / no `<a>` / no `tabindex` descendant of `<a>`; no nested `<audio>` / `<video>`) — accumulated into `RuleContext.restrictions` and enforced by the `transparent` family. The recursive _guard_ form of a transparent / `ruby` / nested model is expressed with `@elements/core` `lazyOf` / `lazyShape` (the only sanctioned recursion boundary — acyclic, bounded-depth, cycle-safe, already proven).

### The two lenses

`RuleLens` is `'structure' | 'presentation'`. **structure** is schema-driven and never reads computed style — content-model / context / transparent / attribute / interaction. **presentation** pulls `RuleContext.style()` lazily and catches load-bearing computed-style overrides (a role-less `list-style: none` list, a reversed `direction`, a focusable element painted invisible). `Inspector.inspect({ lens })` and `FindingManager.findings(lens)` filter by it; the lens is a property of the RULE, stamped onto every `Finding` once at collection from `RuleInterface.lens` — never re-derived from the rule id.

### How to add a rule

Types-first (AGENTS §2 TTTDD), corpus-is-source-of-truth:

1. **Corpus first.** Add / verify the clause in [`guides/w3c/**`](w3c/) — the spec is the source of truth, never a rule's invention.
2. **Types.** Any new public shape lands in [src/browser/types.ts](../src/browser/types.ts) (the `RuleInterface` / `RuleContext` / `Finding` family).
3. **Schema.** Encode the constraint as DATA on the `ContentModelEntry` in [src/browser/schema.ts](../src/browser/schema.ts) (a `constraint` / `childModel` / `forbidden` field) with its `cite`; the bidirectional `w3c.test.ts` parity binds it to the corpus.
4. **Rule.** Add the pure `RuleInterface` to [src/browser/inspector/rules.ts](../src/browser/inspector/rules.ts) as a named `@elements/core` validator composition over the schema datum + the `RuleContext` — generic, never per-element hand-code — and register it in the frozen `rules` array.
5. **Fixture suite.** Add a real-DOM suite under [tests/src/browser/inspector/](../tests/src/browser/inspector/): valid-default → 0, valid-with-compensation → 0, genuine-violation → 1 (the false-positive guard), plus the whole-registry one-finding-per-violation / disjointness guard.
6. **Parity.** The schema↔corpus parity ([w3c.test.ts](../tests/guides/w3c.test.ts)) and this guide's doc↔source parity ([inspector.test.ts](../tests/guides/inspector.test.ts)) both stay green by the schema / doc being accurate — never weaken a gate.

## Contract

1. **DOC → SOURCE.** Every backticked call-form API here resolves to a real `export` reachable from `@elements/browser` (the inspector barrel ∪ [src/browser/helpers.ts](../src/browser/helpers.ts) ∪ [src/browser/constants.ts](../src/browser/constants.ts) — the composed surface).
2. **SOURCE → DOC.** Every export of the inspector barrel ([src/browser/inspector/index.ts](../src/browser/inspector/index.ts)) — `Inspector`, `FindingManager`, `Walker`, `rules` — is documented above. The surface is exhaustive.
3. **TYPES ARE THE SOURCE OF TRUTH.** `InspectorInterface`, `InspectorOptions`, `InspectionResult`, `Finding`, `FindingRecord`, `FindingSeverity`, `RuleLens`, `RuleInterface`, `RuleContext`, `RuleRestrictions`, `WalkerInterface`, `FindingManagerInterface`, `InspectorEventMap`, `ContentModelEntry`, `ContentCategory`, `ContentModel` are declared in [src/browser/types.ts](../src/browser/types.ts) — implementation matches the types, never the reverse.
4. **CORPUS IS THE SOURCE OF TRUTH.** Every rule cites a [`guides/w3c/**`](w3c/) clause; no rule invents a constraint. The schema ↔ corpus bond is parity-gated bidirectionally ([w3c.test.ts](../tests/guides/w3c.test.ts)).
5. **NO STRING / REGEX HTML PARSING.** The inspector consumes a parsed `ParentNode`; it walks via `traversals` and reads `tagName` / computed style. No `innerHTML`, no regex.
6. **NO REINVENTION.** The walk is `traversals`; the shapes/guards/generators are `@elements/core`; rule predicates are `validators`; attribute coercion is `parsers`. These are shipped, parity-gated first-party packages — composed, not rebuilt.
7. **PURE, TOTAL RULES.** Every `RuleInterface.evaluate` is side-effect-free and total (AGENTS §13): one `Finding` for a violation, `null` for a clean node, no throw, no shared mutable state. One finding per violation (no double-report).
8. **THE SELF-AUDIT GATE.** Every showcase page is mounted in isolation and run through the full inspector by [`tests/app/browser/semantics.test.ts`](../tests/app/browser/semantics.test.ts); it fails on any `error`-severity finding (warnings / advice reported, not failed). The inspector dogfoods the framework's own corpus permanently — the `/inspector` page ([app/browser/pages/InspectorPage.vue](../app/browser/pages/InspectorPage.vue)) is the live, interactive expression of the same property.

Enforced by [`tests/guides/inspector.test.ts`](../tests/guides/inspector.test.ts) (doc ↔ source parity, bidirectional) and [`tests/src/browser/inspector/`](../tests/src/browser/inspector/) (real-DOM behavior — Walker, every rule family, the registry disjointness guards, the `Inspector` / `FindingManager` orchestration).

## Patterns

```ts
import { Inspector } from '@elements/browser'

const inspector = new Inspector()
const result = inspector.inspect({
	root: document.body,
	severity: 'error',
	on: {
		start: () => console.time('inspect'),
		finding: (e) => console.warn(e.detail.finding.message),
		done: (e) => console.timeEnd('inspect') ?? e.detail.result.counts,
	},
})

result.counts.error // hard content-model violations in the subtree
inspector.findings.findings('error') // query just the errors
inspector.findings.finding(id) // one by its `{rule}@{path}` id
inspector.findings.clear() // reset the held collection (never the DOM)
```

The `/inspector` showcase page runs exactly this on the live document (the conform state) and on a deliberately-broken detached fixture (real findings), grouped by severity, each citing the spec.

## Tests

- [`tests/src/browser/inspector/`](../tests/src/browser/inspector/) — real-DOM behavior: `Walker.test.ts`, the per-family rule suites (`context` / `content` / `transparent` / `structure` / `attribute` / `interaction` / `presentation`), `registry.test.ts` (whole-registry one-finding-per-violation / disjointness), `Inspector.test.ts`.
- [`tests/guides/inspector.test.ts`](../tests/guides/inspector.test.ts) — doc ↔ source parity (bidirectional + types-are-truth).
- [`tests/guides/w3c.test.ts`](../tests/guides/w3c.test.ts) — schema ↔ W3C corpus bidirectional parity.
- [`tests/app/browser/semantics.test.ts`](../tests/app/browser/semantics.test.ts) — the standing self-audit gate (every showcase page, zero `error`).

## See also

- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
- [w3c.md](w3c.md) — the W3C content-model corpus + its frozen `schema.ts` mirror the inspector resolves every rule against.
- [traversals.md](traversals.md) — the DOM-walk / ancestor / path primitives the `Walker` composes.
- [validators.md](validators.md) · [parsers.md](parsers.md) · [shapers.md](shapers.md) · [compilers.md](compilers.md) — the `@elements/core` predicate / coercion / shape / pipeline surface the rules + the `Finding` contract compose.
