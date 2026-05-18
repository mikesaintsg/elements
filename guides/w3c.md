# W3C Content-Model Corpus

> The curated local cache of the WHATWG HTML spec (`guides/w3c/**`) and its frozen TypeScript mirror [`src/browser/schema.ts`](../src/browser/schema.ts). The corpus is the source-of-truth prose; the schema is the machine-consumable registry the semantic inspector resolves every content-model rule against. Source: <https://html.spec.whatwg.org/multipage/>.

## Surface

The corpus lives under [`guides/w3c/`](w3c/):

- [`categories.md`](w3c/categories.md) — §3.2.5 content-model vocabulary: the transparent model, the content categories with full element membership, palpable, paragraphs, inter-element whitespace. The linchpin every rule resolves against.
- [`elements/*.md`](w3c/elements/) — one carded entry per HTML element, grouped by spec chapter (`document`, `sections`, `groupings`, `texts`, `edits`, `embeddeds`, `tables`, `forms`, `interactives`). Each card carries the spec's **Categories** / **Contexts** / **Content model** / **Tag omission** / **Attributes** boxes verbatim.
- [`links.md`](w3c/links.md) — §4.6 link mechanics (no element cards by spec design).
- [`interactions.md`](w3c/interactions.md) — §6 interaction (hidden / inert / focus / tabindex / contenteditable / popover).
- [`renderings.md`](w3c/renderings.md) — §15 UA default rendering (the semantically load-bearing presentation the Phase-5 lens checks).
- [`aria.md`](w3c/aria.md) — the scoped implicit-ARIA-role appendix (used only where the HTML spec makes a role content-model-relevant).

The TypeScript mirror is [`src/browser/schema.ts`](../src/browser/schema.ts): a frozen `contentModel: readonly ContentModelEntry[]` authored through the typed `defineModel(...)` helper, pre-computed indices (`SCHEMA_BY_TAG`, `VOID_TAGS`, `TRANSPARENT_TAGS`, `CATEGORY_MEMBERS`), single-word predicate getters (`isKnownElement`, `isVoid`, `isTransparent`, `modelOf`, `categoriesOf`, `contextOf`, `describeElement`), and `contentModelContract` — the entry's `@elements/core` `ContractShape` run through `compileContract()` for a derived runtime guard + JSON Schema + seeded generator. Types are the single source of truth in [`src/browser/types.ts`](../src/browser/types.ts): `ContentCategory`, `ContentModel`, `ContentModelEntry`, `ContentConstraint`, `ChildModel`, `ChildSegment`, `AttributeRule`.

## Contract

The corpus is a curated cache of the canonical WHATWG spec; the schema mirrors the cache; the schema's contract is derived from `ContentModelEntry`, never duplicated. Three invariants hold:

1. **Card → schema.** Every element carded under `guides/w3c/elements/*.md` has a `contentModel` entry whose `categories`, `context`, and `model` shape agree with the card prose.
2. **Schema → card.** Every entry's `cite` (`{file}#the-{tag}-element`) resolves to a real card heading in the named corpus file; no entry exists without a card, and no card without an entry.
3. **Contract soundness.** The compiled `contentModelContract` guards every frozen row at module load (a drift is a programmer error, surfaced immediately) and round-trips its own seeded generator (`generator∘guard`).

When the cache and the canonical spec disagree, the spec wins and the cache is corrected. When a card and intuition disagree, the card wins.

## Patterns

- **The corpus is the source of truth; never invent a rule.** Encode only what a card states. New constraints come from a targeted multipage-spec fetch into the cache first, then the schema.
- **Discrete constraints are data, not code.** `no-self-nest`, `single-first-child`, `edge-child`, `parent-restricted`, `group-order`, `child-order` are encoded as `ContentConstraint` records so the Phase-3 rules stay generic.
- **The transparent model is resolved at walk time**, not encoded as a self-referential shape — the schema only records `model: 'transparent'`; the Phase-2 Walker resolves it over live ancestors.
- **Shape vs. corpus-binding are separated.** The contract guards the entry's shape; the `cite` anchor format is proven by the parity test, not the shape's regex (encoding it there would duplicate the proof and break generator soundness).
- **Mirrors [`taxonomy.ts`](../src/browser/taxonomy.ts) exactly** — frozen array via a typed row builder, pre-computed `ReadonlyMap`/`ReadonlySet` indices, single-word predicates.

## Tests

[`tests/guides/w3c.test.ts`](../tests/guides/w3c.test.ts) is the bidirectional parity driver (node env, `guides` project). It parses every element card (tolerating both the block `**Categories:**` and bulleted `- **Categories:**` corpus formats; expanding combined cards like `h1`–`h6` per tag) and asserts the three Contract invariants above plus registry-shape, index-integrity, predicate, and compiled-contract checks. Run it:

```
npx vitest run --project guides --reporter=dot tests/guides/w3c.test.ts
```

## See also

- [ROADMAP.md](../ROADMAP.md) — the Semantic HTML Inspector blueprint; Phase 0 reconciles the cache, Phase 1 builds the schema + this parity test.
- [elements.md](elements.md) — the framework's per-tag treatment (`taxonomy.ts`); the schema's tag set cross-checks against it.
- [shapers.md](shapers.md) · [compilers.md](compilers.md) — the `@elements/core` shape DSL and `compileContract()` the entry's contract is derived through.
- [AGENTS.md](../AGENTS.md) — the non-negotiable coding rules.
