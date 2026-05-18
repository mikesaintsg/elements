# Coding Standards & LLM Instructions

> TypeScript · Types-first · Zero unsolicited dependencies · Single-word public APIs

These are the rules and conventions that govern every project. Follow them strictly. Nothing here is project-specific — do not import logic, names, or assumptions from any other codebase.

**Companion documents** (read in this order on a fresh session):

1. **This file** — the codified rules. Non-negotiable conventions, naming, layout patterns.
2. **[`guides/contribute.md`](guides/contribute.md)** — the **workflow** for humans and agents. How to add an element, a modifier, a composable, a showcase page. Quality bar. Step-by-step procedures with the exact parity-test commands to gate every change.
3. **[`ROADMAP.md`](ROADMAP.md)** — phase-by-phase blueprint and current work-in-progress roster.
4. **[`guides/elements.md`](guides/elements.md)** — every native HTML element + the framework's treatment of it. The first place to look before authoring a new element or class-component.
5. **[`guides/patterns.md`](guides/patterns.md)** — per-folder structural contracts for SCSS partials (layer wrapping, allowed selector kinds, token namespace policy). The first place to look before writing or refactoring an SCSS partial.
6. **[`guides/modifiers.md`](guides/modifiers.md)**, **[`guides/styles.md`](guides/styles.md)**, **[`guides/tokens.md`](guides/tokens.md)** — the specifications for the modifier surface, cascade architecture, and token namespace.

When in doubt about _how_ to do something, read `contribute.md`. When in doubt about _what_ to write, read the matching spec. Existing code is not ground truth — it is something to verify against the spec.

---

## 1. Non-Negotiable Rules

- **NEVER** use `any` — use `unknown` and narrow with type guards
- **NEVER** use `!` (non-null assertion) — use conditionals or optional chaining
- **NEVER** use `as` (type assertion) — narrow through validation
- **NEVER** use `@ts-nocheck`, `@ts-ignore`, `@ts-expect-error`, or `eslint-disable` — fix the underlying issue
- **NEVER** add npm packages unless explicitly requested — prefer native APIs
- **NEVER** remove a symbol to satisfy a linter — implement it or annotate `// TODO: [Feature] Brief purpose`
- **NEVER** undo user changes in `*/types.ts` — that file is the source of truth
- **NEVER** use `readonly` on parameters (`readonly` signals immutability to consumers, not producers)
- **NEVER** use the `private` keyword — use `#` private fields (runtime-enforced)
- **NEVER** use default exports (except where a framework strictly requires them, e.g. Vue SFCs, config files)
- **ALWAYS** use `readonly` for interface properties and public return types
- **ALWAYS** define reusable and public types in `*/types.ts` before implementation
- **ALWAYS** finish the implementation — no deferred logic, empty stubs, or hidden follow-up work
- **ALWAYS** match the existing naming and file-placement patterns exactly

---

## 2. Methodology — TTTDD (Types Then Tests Driven Development)

1. **Types drive the public API.** All interfaces and type aliases go in `*/types.ts` first. The types file is the single source of truth — implementation must match it, never the reverse.
2. **Implement to satisfy the types.** Write the class or function that fulfills the contract. Extract internals to the appropriate centralized file.
3. **Consolidate.** After implementation, deduplicate. Patterns that repeat across files get extracted to centralized files.
4. **Harden with tests.** Cover happy paths, edge cases, error conditions, and boundary values.
5. **Document.** Write guides so any reader (human or AI) can understand and extend the code.

### User Changes Override Everything

If the user modifies a type or interface mid-task, that change is **immediately authoritative**. Refactor all affected code to match. Failed tests after a type change indicate implementation that hasn't caught up — not bugs in the tests. Use `npm run check` (or equivalent) to find every site that needs updating.

---

## 3. Code Style

- Tabs for indentation
- No semicolons (except where required for ASI)
- Single quotes for strings
- Named exports only
- ESM imports with explicit `.js` extension: `import { x } from './foo.js'`
- `#` private fields, never the `private` keyword
- Import order: type imports first (`import type`), then internal modules
- No empty lines between consecutive imports of the same kind

---

## 4. Naming Conventions

> **Names are the public API.** They must be predictable enough that a consumer can guess the correct identifier without consulting documentation.

### 4.1 The Single-Word Principle (the load-bearing rule)

**Every property, method, option key, and event name on an entity should be a single descriptive word.** The entity it lives on supplies all the disambiguating context — the name does not need to repeat it.

This is not a stylistic preference. It is the foundation that the rest of this document depends on. If a name needs more than one word, that is almost always a signal that the **API shape is wrong**, not that the name is too short — see §4.2.

**The reasoning:**

- A property on `AgentInterface` is already an agent property. Calling it `agentId` adds nothing.
- A method on `ToolManager` is already a tool-manager method. Calling it `addTool` is redundant; `add()` is enough.
- An option in `DatabaseOptions` is already a database option. Calling it `databasePath` repeats the entity twice; `path` is enough.

**Scope of the rule — what it applies to (entity-scoped names):**

- Properties and getters on a class or interface
- Methods on a class or interface
- Option keys (the entity is the options interface itself)
- Event names inside an `EventMap` (the entity is the emitter that owns the map)

**What it does NOT apply to — see §4.3 for these:**

- Standalone helper functions at module scope (no entity context to lean on)
- Type identifiers (their role suffix is required — see §4.5)
- Constants (the qualifier is part of the meaning — `DEFAULT_TIMEOUT_MS`)

**Concrete examples from real interfaces:**

```ts
// AgentInterface — entire public surface in single words
interface AgentInterface {
	readonly emitter: EmitterInterface<AgentEventMap>
	readonly id: string
	readonly context: AgentContextInterface
	readonly status: AgentStatus
	generate(): Promise<string>
	stream(options?: AgentStreamOptions): AsyncGenerator<string, string>
	abort(): void
}

// IndexedList<T> — all members single words, intent obvious from container
interface IndexedList<T> {
	readonly size: number
	has(id: string): boolean
	item(id: string): T | undefined
	items(): readonly T[]
	append(id: string, item: T): void
	prepend(id: string, item: T): void
	insert(index: number, id: string, item: T): void
	remove(): void
	remove(id: string): boolean
	remove(ids: string[]): boolean
}
```

**Hard targets (for entity-scoped names):**

- Public properties: **one word**
- Public methods: **one word** (two only when no single verb captures the action)
- Option keys: **one word** when ungrouped; otherwise an entity name keying a nested object (see §4.2.1)
- Event names: **one word**, present-tense verb or noun
- Private methods: 2–3 words allowed — privacy reduces the cost of length

### 4.2 When a Single Word Is Not Enough — Split, Don't Compound

If you find yourself reaching for a prefix or suffix on an entity member to disambiguate (`addInstruction`, `removeDocument`, `databasePath`, `serverTimeout`), **stop**. The compound name is a symptom that the surface is doing too much. Three strategies, by shape:

#### 4.2.1 Options — Group by Entity as the Key

Flat option names with prefixes are wrong. Group related options into a nested object whose **key is the entity** they configure.

```ts
// ✗ Wrong — prefixes repeat the entity
interface ServerOptions {
	readonly serverPort?: number
	readonly serverTimeout?: number
	readonly databasePath?: string
	readonly databaseTimeout?: number
}

// ✓ Right — entity is the key, fields stay single-word
interface ServerOptions {
	readonly server?: { readonly port?: number; readonly timeout?: number }
	readonly database?: { readonly path?: string; readonly timeout?: number }
}
```

The shape now answers the question "which entity owns this setting?" structurally instead of through string prefixes. Every leaf is a single word. Adding a third option (`cache`) is a new key, not a new prefix family.

#### 4.2.2 Class Members — Split into a Sub-Entity Exposed as a Property

If a class accumulates verbs like `addX`, `removeX`, `addY`, `removeY`, those verbs do not belong on the parent class. Each prefix family is a separate entity. Extract it into its own class (typically a Manager) and expose it as a **single-word property** named after the domain noun (plural).

```ts
// ✗ Wrong — parent inflates with prefixed methods
interface AgentContextInterface {
	addInstruction(instruction: InstructionInput): InstructionInterface
	removeInstruction(id: string): boolean
	addDocument(document: DocumentInput): DocumentInterface
	removeDocument(id: string): boolean
	addTool(tool: ToolInput): ToolInterface
	removeTool(id: string): boolean
	// ... and on, and on
}

// ✓ Right — each domain is its own manager, exposed as a single-word property
interface AgentContextInterface {
	readonly instructions: InstructionManagerInterface
	readonly documents: DocumentManagerInterface
	readonly tools: ToolManagerInterface
	// callers reach functionality through the manager:
	//     context.instructions.add(input)
	//     context.documents.remove(id)
	//     context.tools.execute(call)
}
```

This is the dominant composition pattern. Every domain noun on a parent entity is a single-word property pointing to its own Manager class. The Manager owns the verbs (`add`, `remove`, `clear`, etc.) and those verbs stay single-word because their context comes from the Manager, not the parent.

#### 4.2.3 Functions — Split Variants Instead of Dispatching by Parameter

If a function takes a discriminator parameter to choose between behaviors (`parse(format, input)` where `format` is `'json' | 'yaml' | 'toml'`), split it into separate named functions. Each variant lives independently and the call site reads naturally.

```ts
// ✗ Wrong — discriminator parameter dispatches between behaviors
function parse(input: string, format: 'json' | 'yaml' | 'toml'): unknown {
	/* big switch */
}
// callers: parse(text, 'json'), parse(text, 'yaml')

// ✓ Right — each variant is its own function
function parseJson(input: string): unknown {
	/* ... */
}
function parseYaml(input: string): unknown {
	/* ... */
}
function parseToml(input: string): unknown {
	/* ... */
}
// callers: parseJson(text), parseYaml(text)
```

Note these resulting names are multi-word — that is correct. Helpers live at module scope with no entity context, so they need enough words to be self-descriptive at the call site (see §4.3). The principle being enforced here is **"split variants into named functions"**, not "make the names single-word." A discriminator parameter folds multiple behaviors behind one name; splitting exposes them honestly.

If a family of related functions starts to feel like it deserves a shared context, that's a signal to promote it into a class or interface and let §4.2.2 take over.

### 4.3 Helpers Are Different — Module Scope Has No Entity Context

Standalone helper functions exported from `helpers.ts` (or any module) are called bare at the consumer site:

```ts
import { computeHash, extractColumns, normalizePath } from './helpers.js'

const hash = computeHash(content)
const cols = extractColumns(definition)
const path = normalizePath(input)
```

There is no parent class or interface providing context. The helper name is the **entire** signal the reader gets at the call site. So helpers default to a self-descriptive `{verb}{Noun}` form and need enough words to make the action clear without ambiguity.

**Default form:** `{verb}{Noun}` — `generateId`, `computeHash`, `extractColumns`, `derivePhaseStatus`, `inferLanguage`, `normalizePath`, `sanitizeFilename`, `matchesGlobPattern`, `belongsTo`, `hasMany`.

**Single-word helpers are allowed** only when the verb alone is fully unambiguous and the helper takes obvious arguments — `delay(ms)`, `clamp(n, bounds)`, `tokenize(input)`, `similarity(a, b)`. If you have to think about what `process(x)` or `handle(x)` does, the name is too short.

**The same identical-verb-means-identical-thing rule still applies** (§4.4, §4.8). Across the project, every helper that starts with `extract*` extracts something from a structure; every `infer*` derives a value from another value; every `compute*` runs a deterministic calculation; every `matches*` is a predicate. Pick a verb prefix per concept and use it everywhere.

**When a helper family grows,** that is a signal it might want to be promoted to a class — see §4.2.2. Five `extract*Foo` helpers operating on the same shape probably belong on a `FooReader` class with single-word methods.

### 4.4 General Rules

- Names describe **what a thing is**, not how it works internally
- Prefer short, common English words — avoid jargon, abbreviations, acronyms (unless universally understood: URL, ID, HTML)
- One concept = one word, used everywhere (always `count`, never `length`/`size`/`total` interchangeably)
- If two names feel synonymous, pick one and use it project-wide
- Properties are **nouns** — `count`, not `getCount`
- Methods are **verbs** — `abort`, not `aborter`
- Booleans read as **assertions** — `aborted`, `exhausted`, `expired`
- No `get`/`set` prefixes — accessors use bare nouns
- Identical verbs across the project mean identical things — see Lifecycle Vocabulary (§11)

### 4.5 Type-Level Identifiers (PascalCase + Role Suffix)

Type names are the one place suffixes are required — they encode the type's **role**, which the consumer cannot infer from context alone.

| Kind                 | Suffix               | Pattern                    | Purpose                                   |
| -------------------- | -------------------- | -------------------------- | ----------------------------------------- |
| Behavioral interface | `Interface`          | `{Entity}Interface`        | Contract for a class                      |
| Options / config     | `Options`            | `{Entity}Options`          | Input bag for creating/configuring        |
| Creation input       | `Input`              | `{Entity}Input`            | Minimal data needed to create an instance |
| Outcome / output     | `Result`             | `{Entity}Result`           | Structured return value                   |
| Execution context    | `Context`            | `{Entity}Context`          | Ambient state passed through a call chain |
| Event map            | `EventMap`           | `{Entity}EventMap`         | Map of event names → arg tuples           |
| Union / enum-like    | `{Noun}`             | `{Entity}{Noun}`           | Constrained set of literal values         |
| Plain data / value   | _(none)_             | `{Entity}`                 | Records or events with no behavior        |
| Function type        | `Handler`/`Function` | `{Entity}Handler`          | Function type invoked by the framework    |
| Manager interface    | `ManagerInterface`   | `{Entity}ManagerInterface` | Collection contract w/ lookup + lifecycle |

### 4.6 Value-Level Identifiers

| Kind             | Casing           | Pattern                   | Examples                                               |
| ---------------- | ---------------- | ------------------------- | ------------------------------------------------------ |
| Class            | PascalCase       | `{Entity}`                | `Agent`, `Scope`, `Timeout`                            |
| Manager class    | PascalCase       | `{Entity}Manager`         | `ToolManager`, `ScopeManager`                          |
| Factory function | camelCase        | `create{Entity}`          | `createAgent`, `createToolManager`                     |
| Type guard       | camelCase        | `is{Condition}`           | `isRecord`, `isOk`, `isErr`                            |
| Helper function  | camelCase        | `{verb}{Noun}` (see §4.3) | `generateId`, `computeHash`, `extractColumns`, `delay` |
| Constant         | UPPER_SNAKE_CASE | `{QUALIFIER}_{NOUN}`      | `DEFAULT_TIMEOUT_MS`, `MAX_ITERATIONS`                 |
| Property / field | camelCase        | bare noun (single word)   | `count`, `signal`, `status`, `context`                 |
| Method           | camelCase        | bare verb (single word)   | `abort()`, `start()`, `execute()`, `stream()`          |
| Boolean          | camelCase        | adjective/past-participle | `aborted`, `paused`, `expired`                         |

### 4.7 File & Folder Naming

| Kind           | Pattern                        | Examples                       |
| -------------- | ------------------------------ | ------------------------------ |
| Domain folder  | lowercase plural of the entity | `agents/`, `tools/`, `scopes/` |
| Implementation | PascalCase entity name         | `Agent.ts`, `ToolManager.ts`   |
| Test file      | PascalCase entity + `.test`    | `Agent.test.ts`                |
| Docs           | lowercase domain + `.md`       | `agents.md`                    |

### 4.8 Anti-Patterns

- Don't compound when you can split — see §4.2 (the dominant failure mode)
- Don't prefix interfaces with `I` — use `Interface` suffix (`AgentInterface`, not `IAgent`)
- Don't use generic words — `data`, `info`, `item`, `thing`, `obj` are too vague
- Don't encode types in names — `nameString`, `countNumber` are redundant
- Don't mix synonyms — pick one term per concept (don't use `cancel` for `abort`, `reset` for `clear`, `run` for `execute`)
- Don't use `Handler` suffix on classes — `Handler` is for function types only
- Don't abbreviate — `config` not `cfg`, `document` not `doc`, `message` not `msg`
- Don't pluralize type names — `MessageRole`, not `MessageRoles`
- Don't mark methods `@internal` in TSDoc — make them `#` private instead
- Don't write `getX` / `setX` accessors — use bare nouns

---

## 5. Project Structure & Centralized File Pattern

| Content          | Location                 | Notes                                    |
| ---------------- | ------------------------ | ---------------------------------------- |
| Types/interfaces | `*/types.ts`             | **SOURCE OF TRUTH** — no types elsewhere |
| Helpers/guards   | `*/helpers.ts`           | Type guards, internal utilities          |
| Constants        | `*/constants.ts`         | UPPER_SNAKE_CASE values                  |
| Errors           | `*/errors.ts`            | Error classes and type guards            |
| Implementations  | `*/[domain]/[Entity].ts` | One class per file                       |
| Tests            | `tests/`                 | Mirrors source structure                 |
| Public barrel    | `*/index.ts`             | **Sole** public export surface           |

**Implementation files contain ONLY** class implementations with `#` private fields and imports. They must **NOT** contain interface definitions, type aliases, constants, or helpers — extract those to the appropriate centralized file.

**Purpose of the centralized files:** deduplicate and consolidate. When a helper appears in two files, extract it. When a constant is used across modules, centralize it.

### Shared / Core Layer

When multiple packages or surfaces exist, shared logic belongs in a central core/shared layer. Every cross-surface concept consolidates here. Other surfaces import from core; core never imports from them.

### 5.1 Project Layout (this repo)

This is a CSS framework over semantic HTML elements layered on Tailwind v4. The project is dual-distribution: a SCSS bundle and a TypeScript public API that mirrors every CSS identifier consumers programmatically reach for.

| Path                     | Holds                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/browser/`           | TypeScript public API. Frozen object trees + derived string-literal-union types. Files: `tokens.ts`, `modifiers.ts`, `elements.ts`, `events.ts`, `index.ts` (sole barrel).                                                                                                                                                                 |
| `src/styles/`            | SCSS source. `_tokens.scss`, `_theme.scss`, `_mixins.scss`, `index.scss`, plus four subfolders: `elements/`, `modifiers/`, `components/`, `surfaces/`.                                                                                                                                                                                     |
| `src/styles/elements/`   | One partial per HTML tag (e.g. `_button.scss`, `_a.scss`, `_p.scss`). Most are comment-only placeholders — only ship a rule when Tailwind preflight + UA defaults aren't enough.                                                                                                                                                           |
| `src/styles/modifiers/`  | One partial per modifier dimension: `_variants.scss`, `_sizes.scss`, `_styles.scss`, `_states.scss`. Each declares `.{name}` rules that set `--set-{dimension}-*` tokens.                                                                                                                                                                  |
| `src/styles/components/` | Composed widgets built from elements (future).                                                                                                                                                                                                                                                                                             |
| `src/styles/surfaces/`   | Pseudo-element / attribute / at-rule surfaces — `[popover]`, `::backdrop`, `::placeholder`, view transitions, scrollbars, anchor positioning (future).                                                                                                                                                                                     |
| `app/browser/`           | Vue 3 showcase app. `app/browser/styles/main.css` is the integration point: layer-order declaration → `@import 'tailwindcss'` → framework SCSS import.                                                                                                                                                                                     |
| `tests/`                 | Test suite. `tests/setup.css` (Tailwind import + `@source` paths), `tests/setupBrowser.ts`, `tests/setupStyles.ts` (CSS-aware helpers), and `tests/src/{browser,styles}/` mirroring source.                                                                                                                                                |
| `guides/`                | Long-form architecture documentation: `README.md` (pointer), `styles.md`, `tokens.md`, `modifiers.md`, `mixins.md`, `elements.md`, `components.md`, `composables.md`, `surfaces.md`, `patterns.md`, `showcase.md`, `contribute.md`. The roadmap (`ROADMAP.md`) lives at the workspace root. Update these whenever the architecture shifts. |

**TS ↔ SCSS parity is enforced by tests.** Every TS leaf in `src/browser/*.ts` must have a matching CSS rule / custom property declaration in `src/styles/`, and vice versa. The parity tests in `tests/src/browser/*.test.ts` use `?raw` SCSS imports + `findRule()` introspection to enforce the contract bidirectionally. See §21 for the full SCSS conventions.

---

## 6. Barrel Export Rules

- `*/index.ts` is the **sole** public barrel — all public API flows through it
- **NEVER** re-export from any non-index file — only `index.ts` may `export *`
- **NEVER** re-export a symbol from another package — update imports at the consumer site to point to the originating package
- Each implementation file exports its class directly; `index.ts` re-exports with `export *`
- Use `export type *` for types and `export *` for values
- When a symbol moves between packages, update every import site — do not leave re-exports as shims

---

## 7. Class Implementation Structure

Order inside every class:

1. `#` private fields — context, options, status, result, child managers
2. Constructor — initialize context and options; instantiate child managers
3. Public API — getters and methods implementing the interface (single-word names per §4.1)
4. `#` private helper methods

Child managers (the §4.2.2 pattern) are stored as `#` private fields and exposed through `readonly` getters that return their interface type.

---

## 8. Options Design

This is the §4.2.1 strategy applied. Every options interface follows it.

- Top-level option keys are single words.
- Settings that need grouping live under a nested object whose **key is the entity** (`server`, `database`, `cache`), never a flat name with a prefix.
- Each leaf field is a single word (`port`, `timeout`, `path`).
- The `on` key is reserved everywhere for `EmitterHooks` (initial event listeners) — do not use it for anything else.

```ts
interface ServerOptions {
	readonly on?: EmitterHooks<ServerEventMap>
	readonly server?: { readonly port?: number; readonly timeout?: number }
	readonly database?: { readonly path?: string }
}
```

Document each option's meaning under `@remarks`, not via long names.

---

## 9. Manager Accessor Pattern

Managers expose items via **singular** and **plural** accessors named after the domain noun. Both names are single words, both backed by the parent's context.

| Accessor      | Returns                        | Purpose            |
| ------------- | ------------------------------ | ------------------ |
| `entity(key)` | `EntityInterface \| undefined` | Look up ONE by key |
| `entities()`  | `readonly EntityInterface[]`   | List ALL in order  |

Example: `TimeoutManager` exposes `timeout(id)` and `timeouts()`. `AgentManager` exposes `agent(id)` and `agents()`. The Manager class itself is the entity context — the methods do not need a `Timeout`/`Agent` prefix.

---

## 10. Batch Operation Pattern

Verbs that act on collections take three overload shapes — **same single-word verb**, different parameters.

| Signature       | Returns   | Behavior                                      |
| --------------- | --------- | --------------------------------------------- |
| `method()`      | `void`    | Applies to ALL items                          |
| `method(id)`    | `boolean` | Applies to ONE item                           |
| `method(ids[])` | `boolean` | Applies to LISTED items (true if all succeed) |

Never split this into `methodAll`, `methodOne`, `methodMany` — the verb stays single-word and overloads carry the variation.

---

## 11. Lifecycle Vocabulary (No Synonyms)

| Verb      | Meaning                                    |
| --------- | ------------------------------------------ |
| `start`   | Begin or restart an operation              |
| `stop`    | End an operation permanently               |
| `pause`   | Suspend an operation (resumable)           |
| `resume`  | Continue a paused operation                |
| `skip`    | Mark as intentionally not executed         |
| `abort`   | Cancel with signal propagation             |
| `clear`   | Reset state without destroying the entity  |
| `destroy` | Tear down the entity and release resources |
| `execute` | Run the primary work to completion         |

Do not introduce synonyms (`cancel` for `abort`, `reset` for `clear`, `run` for `execute`). Every lifecycle verb is single-word and has exactly one meaning across the entire codebase.

---

## 12. Immutability

- Never mutate inputs — copy-on-write for internal state
- Public getters return copies or readonly views, never mutable references
- Use `readonly T[]`, `ReadonlyMap<K,V>`, `ReadonlySet<T>` for return types and properties
- **NEVER** use `readonly` on parameters

---

## 13. Error Handling

| Condition                            | Strategy                     |
| ------------------------------------ | ---------------------------- |
| Programmer error / invalid arguments | `throw Error`                |
| External operation (I/O, network)    | `Result<T, E>` or throw      |
| Optional lookup that may not exist   | Return `undefined`           |
| Inside a type guard                  | Return `false` — never throw |

### Result Type

For operations that can succeed or fail without throwing:

```ts
interface Success<T> {
	readonly success: true
	readonly value: T
}
interface Failure<E> {
	readonly success: false
	readonly error: E
}
type Result<T, E = Error> = Success<T> | Failure<E>
```

Narrow with `if (result.success)` — never use `as` or `!`.

---

## 14. Emitter Pattern (For Stateful Entities With Observable Events)

Observable events are DOM `CustomEvent`s dispatched on the entity's host `Element`. There is no `Emitter` class: the host element **is** the emitter, `addEventListener` **is** the subscription, and the bubbling `CustomEvent` **is** the message. An entity (a `create{Name}` closure factory or a one-class-per-file `{Entity}` class) emits a typed `CustomEvent` on its bound element via the `emit` / `dispatch` helpers in `helpers.ts`; consumers observe with native `addEventListener` (or the `listen` helper) on that element or any ancestor. This is the idiom every `create*` factory already uses (`createTable`, `createDialog`, …).

**The helpers (`src/browser/helpers.ts`):**

- `emit(el, name, detail?)` — `el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: false, detail }))`. A post-transition / notification event (`open`, `close`, `change`, `done`).
- `dispatch(el, name, detail?) → boolean` — the cancelable form (`cancelable: true`); returns `false` when a listener called `event.preventDefault()`. Use for pre-transition gates (`show`, `hide`, `slide`).
- `listen(el, name, handler) → () => void` — typed `CustomEvent` listener; returns a teardown that removes it.
- `bindEventMap(el, EVENT_NAME_MAP, on) → () => void` — wires every key in `on` that has a matching name in the event-name map, returning one composite teardown. This is how `{Entity}Options.on` is applied at construction.

**The event-name registry (`src/browser/constants.ts` + `events.ts`):**

Every event name is a string constant of the form `elements:{source}:{verb}`, declared once in a frozen `{SOURCE}_EVENTS = { … } as const` map in `constants.ts` (the authority). `{source}` is an HTML element or entity noun; `{verb}` is one spelled-out present-tense lifecycle word, one meaning across the framework (§11). The **composable / component** event maps are additionally mirrored into the public, CSS-parity `events` tree in `events.ts` (so consumers can write `events.{source}.{verb}` and the `tests/guides/composables.test.ts` parity gate binds the closed composable lifecycle vocabulary). A non-composable stateful entity (e.g. a dev-tool analyzer) declares its own `{SOURCE}_EVENTS` constant in `constants.ts` and uses the same `emit` / `bindEventMap` idiom, but is **not** registered into the `events.ts` composable tree — that tree and its vocabulary gate are the composable/component public surface, not a universal emitter registry.

**Structure:**

1. Add the frozen `{SOURCE}_EVENTS = { {verb}: 'elements:{source}:{verb}', … } as const` map to `constants.ts`. If the entity is a composable / component, also register it in the `events` tree in `events.ts` (the public CSS-parity surface — its `{verb}`s must be in the documented composable lifecycle vocabulary). A non-composable entity keeps its constant in `constants.ts` only.
2. Define `{Entity}EventMap` in `*/types.ts` as `{ readonly {verb}: (event: CustomEvent<{Detail}>) => void }` — one handler member per event, the value typed to the event's detail. Per-event detail records (`{Entity}{Verb}Detail`) live in `types.ts` too.
3. `{Entity}Options` has `readonly on?: Partial<{Entity}EventMap>` — the partial map of initial listeners (the `on` key is reserved for exactly this everywhere — see §8).
4. The entity emits each transition with `emit(host, {SOURCE}_EVENTS.{verb}, detail)` (or `dispatch(...)` for a cancelable gate) on its host element.
5. Initial listeners are wired once at construction with `bindEventMap(host, {SOURCE}_EVENTS, options.on)`; the returned teardown is released when the entity tears down. There is no `emitter` property and no `#emitter` field — subscription is `addEventListener` on the host (or the `listen` helper), and teardown is `removeEventListener` (the `listen` / `bindEventMap` teardown closures).
6. Choose the host element faithfully to the factory precedent (the element the entity is bound to / operates on) and document the choice in the entity's TSDoc so consumers know what to `addEventListener` on.

The host element is the only emitter; events bubble, so a consumer may also listen on a common ancestor (`document`). No inheritance, no delegation boilerplate, no emitter object.

**Event naming:**

- Each event name's `{verb}` is a **single present-tense lifecycle verb**. For a composable / component it MUST come from the closed `events.ts` vocabulary the `composables.test.ts` parity gate binds (`show`/`hide`, `open`/`close`, `start`/`stop`, `change`, `select`, …); a non-composable entity (e.g. the inspector — not registered in the `events.ts` tree, per the exemption above) uses any present-tense lifecycle verb that names its transition (e.g. its `start` / `finding` / `done`).
- **Never** use a generic `status` event that passes the value as a parameter — each transition is its own named event
- 4–8 events per entity

---

## 15. Comments & Documentation

- Comments explain **WHY**, not **WHAT** — self-explanatory code needs no comments
- Full TSDoc on public exports: description, `@param`, `@returns`, `@example`
- Options objects: single `@param`, list fields under `@remarks` (this is where short field names earn their long descriptions)
- Private/overloads: single-line `//` comments only
- Avoid comments describing future product behavior unless requested

---

## 16. Testing

- **Structure:** test files mirror source structure (`tests/[domain]/[Entity].test.ts`)
- **Deterministic:** same inputs → same outputs
- **Fast:** short timers (10–50ms), no network calls
- **No mocks:** use real implementations and small scenarios — only mock genuine third-party calls
- **Coverage:** happy path + edge cases (NaN, +0/-0, cycles, Map/Set order, empty inputs)
- **No placeholders:** use `it.todo()` for unimplemented tests, never empty passing tests
- **Test only behavior** — do NOT create test files for: `constants.ts`, `index.ts` barrels, `errors.ts` definitions, or `types.ts`
- **Centralize test helpers** in `tests/setup*.ts`
- **Never run the full suite casually** — target specific test projects to avoid long waits

### 16.1 Test Helper Pattern

Test helpers are shared infrastructure, not local clutter. If a fixture, event factory, async wait, recorder, renderer, or DOM builder appears in more than one test file, extract it to the nearest setup file.

- Put general helpers in `tests/setup.ts`
- Put environment-specific helpers in environment-specific setup files such as `tests/setupBrowser.ts`, `tests/setupServer.ts`, or equivalent local names
- Setup files must export every reusable helper, fixture type, factory, constant, and guard they define
- Test files should import helpers from setup files rather than defining local fixture factories
- Helper names follow §4.3: `createRecorder`, `createElement`, `appendItems`, `renderRows`, `waitForDelay`, `extractDetail`
- Prefer small factory functions that seed a real scenario over inline setup blocks repeated across tests

Use a recorder helper instead of test-framework spy functions when the test only needs to count calls or inspect arguments. A recorder is a real callback with recorded calls; it is not a mock of behavior.

```ts
interface TestRecorderInterface<TArgs extends readonly unknown[]> {
	readonly calls: readonly TArgs[]
	readonly count: number
	readonly handler: (...args: TArgs) => void
	clear(): void
}
```

Use a single delay helper instead of inline `setTimeout` promises:

```ts
export function waitForDelay(ms = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
```

### 16.2 Browser Tests

Browser tests run in a real browser. Treat that as a feature, not something to fake away.

- Do not mock or replace browser APIs such as DOM events, storage, observers, viewports, layout methods, or pointer/drag primitives unless the browser truly lacks the API
- Prefer real DOM nodes, real events, real layout styles, and real browser observers
- Centralize browser event factories: `createPointerEvent`, `createDragEvent`, `typeInput`, `fireTransitionEnd`
- Centralize DOM fixture builders: `createButtonElement`, `createDropdownElements`, `createModalElement`, etc.
- Assert observable behavior: DOM state, emitted events, callback records, focus, classes, attributes, and public API state
- Avoid asserting implementation details such as internal timers, private state, or framework scheduler internals

Use fake timers only for deterministic timer-driven behavior where waiting in real time would make the suite slower or flaky. Do not use fake timers as a substitute for testing real browser interactions.

### 16.3 Test Runner Configuration

Keep test runner configuration boring and minimal. Add special provider, browser, teardown, timeout, parallelism, cache, or launch settings only when there is a measured problem and a targeted setting fixes it.

- Prefer defaults until there is evidence they are wrong
- Keep provider setup in one helper or one shared config block
- Avoid long launch-flag lists unless each flag has a current, verified purpose
- Avoid persistent browser contexts unless a test genuinely needs persisted browser state
- If browser teardown is slow, first check test cleanup, open handles, file parallelism, and per-file browser context churn before adding launch flags
- Remove exploratory configuration once the real cause is fixed
- Comments in config should explain the current reason for a setting, not the history of failed attempts

---

## 17. Quality Gates

All must pass before commit:

```
npm run check    # lint + typecheck
npm run format   # autoformat
npm run build    # build all targets
npm test         # run targeted tests
```

---

## 18. Development Process

### Step 1 — Understand

Clarify scope. Identify entities (the core nouns). Read `*/types.ts` first.

### Step 2 — Design Types (ALWAYS FIRST)

Open `*/types.ts`. Apply §4.1 — every entity-scoped name (property, method, option key, event) gets a single word. If you can't name it in one word, apply §4.2 and split. Helpers in `helpers.ts` follow §4.3 — `{verb}{Noun}` form. Mark all properties `readonly`. Run typecheck to validate.

### Step 3 — Implement

Create the file in the appropriate domain folder. Import types from `../types.js`. Implement the class to match the interface exactly. Use `#` private fields. Extract helpers, constants, factories, etc. to centralized files. Add `export *` to `*/index.ts`.

### Step 4 — Consolidate

Look for duplicated logic across implementation files. Extract shared patterns. Simplify internals while preserving the public API.

### Step 5 — Test

Create test file mirroring structure. Import from source using `.js` extensions. Cover happy path + edge cases + errors. Run targeted test project — never the full suite.

### Step 6 — Document

Update the relevant guide `.md` file with new types, methods, and behavior.

---

## 19. Error Recovery

### Type Errors

1. Read the full error message
2. Check `*/types.ts` — does the implementation match the interface?
3. Common fixes: missing `readonly`, wrong return type, missing method
4. Re-run typecheck after each fix

### Unused Code (Linter Warning)

1. **STOP** — do NOT delete it
2. Check `*/types.ts` — is it defined there?
3. If defined → implement it
4. If blocked → annotate `// TODO: [Feature] Brief purpose`
5. Never remove a symbol just to satisfy the linter

### Compound Names Showing Up

1. **STOP** — a compound name on an **entity member** (property, method, option key, event name) is a design signal, not a naming problem
2. Apply §4.2 — split into nested options, a sub-entity property, or separate functions
3. Update `*/types.ts` first, then refactor implementation to match
4. Note: this does NOT apply to standalone helpers in `helpers.ts` — those default to `{verb}{Noun}` per §4.3

---

## 20. Architecture Rules

- `*/types.ts` is the source of truth for the public API — never contradict it
- Implementation must match types exactly
- Entity members (properties, methods, options, events) are single-word per §4.1; if you can't, you split per §4.2 — there is no third option
- Standalone helpers default to `{verb}{Noun}` per §4.3 — they are not bound by the single-word rule because they have no entity context
- Do not expand the public API without concrete multi-site need
- Centralize shared logic — if two surfaces need it, it belongs in core
- Deduplicate aggressively — if a pattern appears twice, extract it
- Keep everything generic and reusable
- Do not bring in logic from unrelated projects
- Do not remove structural files just because they are currently empty
- Prefer the smallest valid implementation that preserves the intended architecture
- **Taxonomy first.** When adding a new styled element or class-component, update [`guides/elements.md`](guides/elements.md) §3 and [`src/browser/taxonomy.ts`](src/browser/taxonomy.ts) BEFORE writing the SCSS or TS token surface. The parity test at `tests/guides/elements.test.ts` enforces this order — drift between taxonomy, `elements.ts`, the SCSS partial inventory, and the factory directory fails the gate.
- **Token-group uniformity.** Elements that share a logical role expose the same minimum token surface. The groups + required suffixes are declared in [`taxonomy.ts § TOKEN_GROUPS`](src/browser/taxonomy.ts) and enforced by `tests/guides/elements.test.ts`. Membership is a public contract — adding a tag to a group commits to declaring every required token.
- **Single-word file naming inside `src/styles/`.** SCSS partial names are single words unless the file names a specific multi-word entity (CSS feature like `_view-transition.scss` / `_anchor-position.scss`, ARIA role like `_role-group.scss`, HTML tag range like `_h1-h6.scss`). Descriptive multi-word names like `_element-scoped.scss` are not allowed — pick a single descriptive word (`_local.scss`).
- **Workflow first.** Before authoring a non-trivial change, read [`guides/contribute.md`](guides/contribute.md). The five most common shapes of work (new element, new modifier, new element-local modifier, new composable, new showcase page) are laid out step-by-step with the exact parity-test command to gate each.

---

## 21. Sass / SCSS Conventions

The styles layer mirrors the TypeScript centralization principles. Every rule here has a TypeScript analogue — read the parallel section first to understand the intent.

This framework is layered on **Tailwind v4**. Tailwind owns the palette (`--color-blue-500`, …), scales (`--spacing-*`, `--radius-*`, `--text-*`), the reset, and utility classes. The framework owns element baselines, semantic modifiers, composed widgets, browser-surface styles, and a TS-mirrored API for everything it authors. The compile pipeline is **Sass → PostCSS** with the `@tailwindcss/postcss` plugin (not the Vite plugin) so Tailwind sees the post-Sass CSS and tree-shakes correctly.

**Per-folder structural contract is codified.** Every SCSS partial under `src/styles/{elements,modifiers,surfaces,components,composables}/` is held to a layered contract in [`src/browser/patterns.ts`](src/browser/patterns.ts):

- **`FOLDER_CONTRACTS`** — per-folder cascade layer + allowed/forbidden root selector kinds + state-selector requirement + token namespace policy + comment-only policy. Enforced by [`tests/guides/patterns/contracts.test.ts`](tests/guides/patterns/contracts.test.ts).
- **`FILE_EXCEPTIONS`** — named overrides for known-good outliers (`composables/_aside.scss` chrome-free, `components/_aside.scss` multi-namespace, `surfaces/_anchor-position.scss` tokenPrefix=anchor, etc.).
- **`MODIFIER_DIMENSION_TOKENS`** — per-modifier-dimension required context tokens (variant: 8 tokens, size: 4, style: 4; state + placement emit direct CSS by design). Enforced by [`tests/src/styles/modifiers/_index.test.ts`](tests/src/styles/modifiers/_index.test.ts).
- **`SURFACE_CONTRACTS`** — per-surface required token namespace + selector-head kinds + animated flag + reduced-motion mixin discipline. Enforced by [`tests/src/styles/surfaces/_index.test.ts`](tests/src/styles/surfaces/_index.test.ts).
- **`COMPONENT_CONTRACTS`** — per-component required token namespace + animated flag + reduced-motion mixin discipline. Enforced by [`tests/src/styles/components/_index.test.ts`](tests/src/styles/components/_index.test.ts).
- **`COMPOSABLE_CONTRACTS`** — per-composable required tokens + state-selector vocabulary + factory pairing + animated flag. Enforced by [`tests/src/styles/composables/_index.test.ts`](tests/src/styles/composables/_index.test.ts).
- **`INTERACTIVE_ELEMENTS`** — closed set of native tags that paint interaction chrome. Each member is held to forced-colors + `:focus-visible` discipline. Enforced by [`tests/guides/patterns/interactive.test.ts`](tests/guides/patterns/interactive.test.ts).
- **Scope-discipline helpers** (`hasChainedTagNots`, `hasScopingFunction`, `classQualifiers`) — flag the specificity-inflation anti-pattern (`:not(t1):not(t2):not(t3)` → `:not(:where(t1, t2, t3))`) and the unscoped-cross-cutting anti-pattern. Enforced by [`tests/guides/patterns/scope.test.ts`](tests/guides/patterns/scope.test.ts).

The prose explanation across all eight contracts lives in [`guides/patterns.md`](guides/patterns.md) — read that BEFORE writing or refactoring a partial, and consult it when classifying an outlier as a real-drift signal vs. a legitimate exception.

### 21.1 Centralized files (the §5 analogue for SCSS)

| TypeScript                    | SCSS                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `helpers.ts` — pure functions | `_mixins.scss` — `@function` (returns a value) and `@mixin` (emits CSS)            |
| `constants.ts` — UPPER_SNAKE  | `_tokens.scss` — framework `--set-*` custom properties + cascade-layer ordering    |
| `*/index.ts` — sole barrel    | `index.scss` — sole compilation barrel                                             |
| _(no analogue)_               | `_theme.scss` — default `@theme` block registering semantic variants with Tailwind |

`_mixins.scss` is the **mixin / function registry**. It emits no top-level CSS — every consumer writes `@use '../mixins' as *;` and then calls `transition(...)` / reads `$variants`. Never `@use 'mixins'` from `index.scss`.

`_tokens.scss` declares the cascade layer order at the top of the compiled output and ships the small set of `--set-*` defaults Tailwind doesn't cover. Adding a new token there is allowed; renaming or removing one is a breaking change to the public API (it's mirrored in `src/browser/tokens.ts` and policed by parity tests).

`_theme.scss` registers semantic variant colors with Tailwind via `@theme { --color-primary: …; }`. Theme overrides ship inline oklch literals, not `var(--color-blue-500)` references — Tailwind would tree-shake unused palette swatches before our `_theme.scss` is processed.

### 21.2 Architectural layout

```
┌────────────────────────────────────────────────────────────────┐
│ Tailwind v4 (external)                                         │
│   palette · scales · preflight · utilities · @theme machinery  │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │ semantic variants we register via @theme
                              │ become utilities Tailwind generates for us
┌────────────────────────────────────────────────────────────────┐
│ Framework (this repo, src/styles/)                             │
│   _tokens.scss   → @layer order + :root --set-* defaults       │
│   _theme.scss    → @theme { --color-{variant}: oklch(...) }    │
│   _mixins.scss   → $variants/$sizes/$styles/$states + helpers  │
│   elements/      → one _{tag}.scss per HTML element            │
│   modifiers/     → _variants.scss · _sizes.scss · _styles.scss │
│                    · _states.scss                              │
│   components/    → composed widgets (future)                   │
│   surfaces/      → pseudo-elements, [popover], etc. (future)   │
└────────────────────────────────────────────────────────────────┘
```

### 21.3 The token namespace pattern

**Pattern**: `--set-[scope-]property[-modifier]` — three slots, last segment is a real CSS property key whenever one exists.

| Slot       | Source                                             | Examples                                                                                                         |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `scope`    | empty (global) · element name · modifier dimension | `button`, `input`, `variant`, `size`, `style`, `focus`                                                           |
| `property` | a real CSS property key whenever one applies       | `color`, `background-color`, `border-radius`, `padding-inline`, `font-size`, `box-shadow`, `transition-duration` |
| `modifier` | scale step / state                                 | `hover`, `active`, `disabled`                                                                                    |

The `--set-*` namespace is reserved for what the framework authors. **Never** redeclare what Tailwind already exports — no `--set-color-blue-500`, no `--set-spacing-4`. Tailwind's tokens are referenced under their native names.

| Token shape                          | Owner    | Where declared                                |
| ------------------------------------ | -------- | --------------------------------------------- |
| `--color-blue-500`, `--spacing-4`, … | Tailwind | (consumer entry imports `tailwindcss`)        |
| `--color-{variant}` (semantic)       | Us       | `_theme.scss` `@theme { … }`                  |
| `--set-{scope}-{property}` global    | Us       | `_tokens.scss` `:root { … }`                  |
| `--set-{element}-{property}`         | Us       | `elements/_{tag}.scss` element selector       |
| `--set-{dimension}-{property}`       | Us       | `modifiers/_{dimension}.scss` `.{name}` rules |

### 21.4 The five modifier dimensions (plus the local file)

The cross-cutting modifier system is closed: five orthogonal dimensions, each living in its own partial under `src/styles/modifiers/`. The Sass list constants in `_mixins.scss` (`$variants`, `$sizes`, `$styles`, `$states`) match the dimension names exactly so loops read uniformly.

| Dimension | Values                                                                                                            | Partial            | Sets context tokens                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| variant   | `primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `information`                                 | `_variants.scss`   | FILLED + SUBTLE + ON-CANVAS tiers: 8 tokens per variant — see `guides/modifiers.md` §3                                                |
| size      | `small`, `large` (default size is bare-element)                                                                   | `_sizes.scss`      | `--set-size-padding-inline`, `--set-size-padding-block`, `--set-size-font-size`, `--set-size-border-radius`                           |
| style     | `subtle`, `filled` (no `outline` — Tailwind owns it; no `ghost` — failed WCAG AA on 4 of 7 variants in dark mode) | `_styles.scss`     | `--set-style-color`, `--set-style-background-color`, `--set-style-border-color`, `--set-style-border-width`                           |
| state     | `disabled`, `active`, `loading`                                                                                   | `_states.scss`     | (typically toggles existing element rules; no dedicated context tokens)                                                               |
| placement | `top`, `bottom`, `start`, `end`, `top-start`, `top-end`, `bottom-start`, `bottom-end`                             | `_placements.scss` | Maps to CSS `position-area` keywords plus paired `align-self` / `justify-self`. Scoped to `[popover]:not(aside):not(nav):not(output)` |

**Element-local modifiers** (rules of the form `{tag}.{name}` that only make sense on one element type — `form.row`, `button.dropdown`, `details.flush`) live in [`src/styles/modifiers/_local.scss`](src/styles/modifiers/_local.scss). They're modifier-layer because they ARE deliberate consumer signals; they're file-scoped to `_local.scss` because they're not cross-cutting. The parity test at `tests/src/styles/modifiers/_local.test.ts` enforces the charter (selector must be compound, name must not collide with the cross-cutting vocabulary or Tailwind utilities).

**No `shapes` dimension.** Corner roundness flows through `--set-radius-factor` at `:root`. Per-call shape changes use Tailwind's `.rounded-*` utilities. The names `.rounded`, `.pill`, `.square` are off-limits.

Naming rules: spelled out, never abbreviated (`information` not `info`, `large` not `lg`, `background-color` not `bg`); singular adjectives or nouns; values distinct across dimensions; no collision with Tailwind utilities. The `tests/guides/modifiers.test.ts` parity test enforces all of these.

### 21.5 Cascade layer order (load-bearing)

Layer order is declared once in the consumer's entry CSS — `tests/setup.css` and `app/browser/styles/main.css` — **before** `@import 'tailwindcss'`:

```css
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
@import 'tailwindcss';
@import '../../../src/styles/index';
```

Eight layers. Layers later in the list win. Tailwind's own `@layer theme, base, components, utilities` declaration merges as a no-op against this wider order. The practical consequences:

- **Element rules wrap in `@layer elements { … }`** — otherwise an unlayered rule would beat any utility, defeating Tailwind composition.
- **Component rules wrap in `@layer components`** — element compositions (the card via `<article>`, the sidebar via `body > aside`, the form layout, the badge, …).
- **Surfaces wrap in `@layer surfaces`** — pseudo-elements + attribute selectors: `[popover]`, `::backdrop`, `::placeholder`, `::marker`, `::selection`, scrollbar, anchor-position, view-transition.
- **Composables wrap in `@layer composables`** — chrome that's only painted when a `use{Name}` composable has gated it on. The composables layer sits AFTER surfaces so a `useDialog`-scrollable dialog beats the popover surface default geometry. Every partial in `src/styles/composables/` MUST gate on a composable-state selector (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`) — enforced by `tests/src/styles/composables/_charter.test.ts`.
- **Modifier classes sit in `@layer modifiers`**, beating composables so `.primary` reliably tints a `<dialog>` even when the composable set a position-specific background.
- **Utilities always win** when the consumer writes `<button class="primary m-4 shadow-lg">`.

The `tests/src/styles/_charters.test.ts` parity test enforces: every partial in `<folder>/` wraps in `@layer <folder>` (with the exception of pure `:root` token blocks), AND no partial declares rules in a foreign layer.

### 21.6 The element-rule philosophy

`src/styles/elements/` contains one partial per HTML tag (~93 files). The triage between substantive / reset / passthrough is declared in [`guides/elements.md`](guides/elements.md) §3 and mirrored programmatically in [`src/browser/taxonomy.ts`](src/browser/taxonomy.ts). The parity test at `tests/guides/elements.test.ts` enforces both directions:

- A taxonomy entry marked `substantive` or `composable` must declare at least one `--set-{tag}-*` token somewhere in `src/styles/` (elements/ or components/).
- A taxonomy entry marked `composable` must reference a real factory key (`use{Name}` ↔ `create{Name}.ts` in `src/browser/factories/`).
- A partial in `elements/` must have a matching taxonomy row.
- A tag in [`src/browser/elements.ts`](src/browser/elements.ts) (substantive baselines specifically living in `elements/_*.scss`) must also be enumerated in the taxonomy.

When promoting an element from passthrough to substantive, the workflow is laid out in [`contribute.md` §5.1](guides/contribute.md). Taxonomy first, then `tokens.ts`, then SCSS, then the parity gate.

The substantive partial pattern (button is the reference):

```scss
@use '../mixins' as *;

@layer elements {
	button {
		/* element-scoped tokens — fallback chain: style → variant → element default */
		--set-button-color: var(--set-style-color, var(--set-variant-color, currentColor));
		--set-button-background-color: var(
			--set-style-background-color,
			var(--set-variant-background-color, transparent)
		);
		/* …rest of token resolution… */

		/* baseline rules consume the tokens */
		color: var(--set-button-color);
		background-color: var(--set-button-background-color);
		@include transition(
			(color var(--set-transition-duration), background-color var(--set-transition-duration))
		);
	}
}
```

Modifier classes are **token-setters only** — they declare `--set-{dimension}-*` values. The element file consumes them through `var(…, fallback)` chains. This is what makes `<button class="primary large filled">` work with zero per-element variant/size/style code.

The "substantive partial" marker is **declares at least one `--set-{tag}-*` token**. The TS↔SCSS parity test for elements (`tests/guides/elements.test.ts`) uses this marker to determine which partials must appear in `src/browser/elements.ts`.

### 21.7 The `_mixins.scss` registry

| Member                                  | Kind      | Purpose                                                                                                                    |
| --------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `$variants`                             | Sass list | `(primary, secondary, tertiary, success, warning, danger, information)` — drives `@each` and `palette-each`                |
| `$sizes`                                | Sass list | `(small, large)`                                                                                                           |
| `$styles`                               | Sass list | `(subtle, filled)`                                                                                                         |
| `$states`                               | Sass list | `(disabled, active, loading)`                                                                                              |
| `reduced-motion`                        | mixin     | Wraps `@content` in `@media (prefers-reduced-motion: reduce)`                                                              |
| `transition($value)`                    | mixin     | Emits `transition: $value` plus the matching `reduced-motion { transition: none; }` guard                                  |
| `focus-ring($alpha)`                    | mixin     | Emits the canonical focus `box-shadow:` consuming `--set-variant-background-color`                                         |
| `forced-colors`                         | mixin     | Wraps `@content` in `@media (forced-colors: active)`                                                                       |
| `truncate`                              | mixin     | Single-line text truncation (overflow / text-overflow / white-space)                                                       |
| `size-container($name, $type)`          | mixin     | Mark element as a size-aware container for `@container` queries                                                            |
| `floater-bounds($component, $width)`    | mixin     | Pair design max-size against the framework's viewport budget                                                               |
| `floater-side-insets($component, $var)` | mixin     | Emit the four side-inset tokens for a floating panel (max of placement padding and `env(safe-area-inset-*)`)               |
| `floater-edge($edge)`                   | mixin     | Anchor a fixed-position element to a single viewport edge (drawer territory)                                               |
| `floater-fullscreen`                    | mixin     | Fill the viewport on both axes with `inset: 0` and dynamic-viewport units                                                  |
| `palette-each($exclude)`                | mixin     | Iterate over `$variants` for `@content using ($variant)` — REPLACES hand-rolled `&.primary { … } &.secondary { … }` blocks |

Each list constant is `!default` so a downstream consumer can override it before `@use`. The list names match the modifier-dimension partial names exactly (`$variants` ↔ `_variants.scss` ↔ `modifiers.variant` in TS).

**Always use `palette-each` for variant iteration.** Hand-rolled `.X.primary { … } .X.secondary { … } …` blocks are the canonical anti-pattern — they duplicate work the cascade already does and force every variant addition to touch every consumer. The `tests/guides/modifiers.test.ts` parity test fails when three or more `.X.{variant}` compound rules appear in one non-modifier file.

### 21.8 The transition + reduced-motion contract

Every `transition:` declaration must be paired with a `prefers-reduced-motion: reduce` opt-out. Use `@include transition($value)` — it emits both lines. Hand-writing the pair is a code smell — the mixin owns the boilerplate.

Animations (`animation:`) use `@include reduced-motion { animation: none; }` directly — the `transition` mixin only handles transitions.

### 21.9 The TS ↔ SCSS parity contract

`src/browser/{tokens,modifiers,elements,taxonomy,events}.ts` are public-API mirrors of the CSS-side surface. Every leaf is a frozen string literal; every group is a frozen object; every union type is derived. The contract is enforced bidirectionally by parity tests in `tests/src/browser/` and `tests/src/styles/`:

**Public-API parity** (TS surface vs cascade output):

| TS file        | Test file                             | Asserts                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens.ts`    | `tests/src/browser/tokens.test.ts`    | Each leaf resolves at runtime via `getComputedStyle()` (`:root`, on a button, or on a modifier-classed element). Each `--set-*` declared in any SCSS partial appears as a TS leaf. Each `--color-{variant}` in `_theme.scss`'s `@theme` block appears in `tokens.color`. |
| `modifiers.ts` | `tests/src/browser/modifiers.test.ts` | Each leaf has a `.{name}` rule in the loaded cascade. Each `.{name}` declared in `modifiers/_*.scss` appears as a TS leaf.                                                                                                                                               |
| `elements.ts`  | `tests/guides/elements.test.ts`       | Each TS key has an `elements/_{tag}.scss` partial that declares at least one `--set-{tag}-*` token.                                                                                                                                                                      |
| `taxonomy.ts`  | `tests/guides/elements.test.ts`       | TS-side shape, predicate getters, group definitions. Cross-file SCSS ↔ TS parity lives in `tests/guides/elements.test.ts`.                                                                                                                                               |
| `events.ts`    | `tests/guides/composables.test.ts`    | Each value matches `elements:{source}:{verb}` per §11.                                                                                                                                                                                                                   |

**Internal parity** (styles-folder discipline — surfaces drift the audit caught at the _interior_ of `src/styles/`):

| Test file                                       | Asserts                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/src/styles/_charters.test.ts`            | Every partial in `<folder>/` wraps its rules in `@layer <folder>`. No partial declares rules in a foreign layer.                                                                                                                                                 |
| `tests/guides/elements.test.ts`                 | `taxonomy.ts` ↔ `elements/_{tag}.scss` ↔ `components/_{tag}.scss` ↔ `elements.ts` ↔ `factories/create{Name}.ts` all mirror each other.                                                                                                                           |
| `tests/guides/modifiers.test.ts`                | No partial outside `modifiers/` hand-rolls three or more compound `.X.{variant}` rules. Use `@include palette-each` instead.                                                                                                                                     |
| `tests/guides/modifiers.test.ts`                | Modifier-vocabulary class names from `$variants ∪ $sizes ∪ $styles ∪ $states` are only declared as bare rules in `modifiers/`. No collision between modifier names and the Tailwind single-token utility set.                                                    |
| `tests/guides/tokens.test.ts`                   | Every `--set-*` token matches the kebab-case shape. No token segment matches the abbreviation black-list (`bg`, `fg`, `lg`, `sm`, `info`, `btn`, …) in `taxonomy.ts § FORBIDDEN_TOKEN_SEGMENTS`.                                                                 |
| `tests/guides/elements.test.ts`                 | Every member of every `TOKEN_GROUPS` entry (`form-control`, `page-shell`, `card-region`, `floating-surface`, `inline-chip`, `disclosure`) declares every required token suffix. Customizability uniformity contract.                                             |
| `tests/src/styles/_docs.test.ts`                | `guides/modifiers.md` §1 dimension table lists the same values as `modifiers.ts` — bidirectional.                                                                                                                                                                |
| `tests/src/styles/modifiers/_local.test.ts`     | Every rule in `_local.scss` is compound (`{tag}.{name}`); `{tag}` is a known taxonomy entry; `{name}` does not collide with cross-cutting modifiers or Tailwind utilities.                                                                                       |
| `tests/src/styles/composables/_charter.test.ts` | Every partial in `composables/` wraps in `@layer composables` and gates on a composable-state selector (`[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open`). Every composables/\_{name}.scss has a matching `use{Name}` factory. |

When a CSS-side identifier changes, the TS mirror **must** be updated in the same change. The parity tests fail loudly when drift occurs — that is the system working as designed, not a test to suppress.

### 21.10 Naming summary

| Kind             | Casing                | Pattern                             | Examples                                                        |
| ---------------- | --------------------- | ----------------------------------- | --------------------------------------------------------------- |
| Function         | lowercase, kebab-case | `{verb}` or `{noun}`                | (none currently — registry is mixin-heavy)                      |
| Mixin            | lowercase, kebab-case | verb / verb-noun                    | `reduced-motion`, `transition`, `focus-ring`                    |
| Sass `$variable` | lowercase, kebab-case | dimension name (plural)             | `$variants`, `$sizes`, `$styles`, `$states`                     |
| Custom property  | `--set-*` namespace   | `--set-[scope-]property[-modifier]` | `--set-button-padding-inline`, `--set-variant-background-color` |
| Modifier class   | bare adjective/noun   | `.{name}` (no dimension prefix)     | `.primary`, `.large`, `.filled`, `.disabled`                    |
| Element rule     | bare HTML tag         | wrapped in `@layer elements { … }`  | `button { … }`                                                  |

### 21.11 Anti-patterns

Mirrors §20 in spirit:

- **Never redeclare a Tailwind-owned token.** No `--set-color-blue-500`, no `--set-spacing-4`. Reference Tailwind's tokens directly: `var(--color-blue-500)`, `var(--spacing-4)`.
- **Never invent a modifier class name that clashes with a Tailwind utility.** Tailwind already ships `.rounded`, `.outline`, `.inline`, `.block`, `.hidden`, `.shadow`, `.ring`, `.border`, `.truncate`, etc. — those names are off-limits as modifiers. The collision watch list lives in `tests/setupStyles.ts § TAILWIND_SINGLE_TOKEN_UTILITIES` and is enforced by `tests/guides/modifiers.test.ts`.
- **Never invent a new `--set-*` token without checking `_tokens.scss` and the relevant element/modifier partial first.** New global tokens go in `_tokens.scss`; new element-scoped tokens go on the element selector inside `elements/_{tag}.scss` (or `components/_{tag}.scss` when the element's substantive baseline lives in components/).
- **Never wrap `var(...)` references inside `_theme.scss`'s `@theme` block.** Tailwind processes `@theme` before tree-shaking its palette — `var(--color-blue-500)` references will resolve to nothing. Use inline `oklch(...)` literals tuned to match the palette.
- **Never write an unlayered rule.** `@layer elements { … }` is required for element baselines so utilities win. Same for components, surfaces, composables, modifiers — each partial wraps in its own folder's layer. `tests/src/styles/_charters.test.ts` enforces this.
- **Never write a literal hex/rgb color in a partial.** Colors flow through tokens — `var(--color-{variant})`, `var(--set-{scope}-color)`, or a `color-mix()` of those.
- **Never duplicate logic across partials.** If a pattern appears in two partials, lift it to `_mixins.scss`. If three or more `.X.{variant}` compound rules appear in one file, use `@include palette-each`. The `handrolled.test.ts` parity test fails on this.
- **Never `@extend` across partials.** Sass `@extend` collapses selectors at compile time; sharing flows through tokens and mixins, not Sass inheritance.
- **Never abbreviate** dimension or modifier names (`info` → `information`, `lg` → `large`, `bg` → `background-color`). The `tests/guides/tokens.test.ts` parity test fails on any token name segment that matches `taxonomy.ts § FORBIDDEN_TOKEN_SEGMENTS`.
- **Never add a TS leaf without a CSS counterpart, or a CSS rule without a TS leaf.** The parity tests will fail; that's the contract.
- **Never declare a bare `.{modifier-name}` rule outside `modifiers/`.** Cross-cutting modifier-vocabulary class rules belong in the dimension partials. Element-local modifiers (`form.row`, `button.dropdown`) live in `modifiers/_local.scss` and must be compound selectors. The `isolation.test.ts` parity test enforces this.
- **Never put composable-state chrome in `components/`.** Rules gated on `[data-*]`, `[aria-*=…]`, `[role=…]`, `[open]`, `:popover-open`, `:modal`, `:open` belong in `composables/_{name}.scss`. The `composables/_charter.test.ts` parity test enforces that every composable partial uses at least one state selector.

### 21.12 Build pipeline note

Tailwind v4 ships two integrations: the Vite plugin (`@tailwindcss/vite`) and the PostCSS plugin (`@tailwindcss/postcss`). The Vite plugin only processes `.css` files reachable from the entry. We use the **PostCSS plugin** so Tailwind runs on the post-Sass output and sees every `var(--text-sm)` reference our modifiers emit. Switching back to the Vite plugin will tree-shake those references away. `@source` directives in the entry CSS (`tests/setup.css`, `app/browser/styles/main.css`) tell Tailwind which files to scan for utility class names.

---

## 22. Communication Style

- Short summary in chat — no walls of text
- Show exact changes using diff format
- Do the work — don't ask permission to do something obvious
