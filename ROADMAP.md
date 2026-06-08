# ROADMAP — Refactor to Strict Semantic Scope

> The plan of record for re-drawing the element ↔ component boundary. The framework keeps its semantic-HTML soul, but tightens one rule: **a bare HTML tag earns styling only for behaviour that is true of _every_ instance of that tag. Everything contextual — a card, a sidebar, a modal band, an app shell — opts in through a platform signal or a named class.** Each phase is a self-contained, shippable unit with its own checklist and exit criteria. Build them in order; land one green before starting the next.
>
> This file says _what_ we are changing and _in what sequence_. The architecture guides under [`guides/`](guides/) own the _why_ of each concept and are updated as phases land. Where the two disagree during the refactor, this file owns the target and the guide is the work item.

---

## The decision

Three choices set the direction (resolved 2026-06-08):

1. **Strict everywhere.** Bare-tag combination selectors (`parent > child` where both sides are plain tags) are limited to the ~30 HTML-mandated `spec` pairings, in **every** layer — not just `elements/`. The ~45 author-invented `slot` / `reset` / `context` pairings are no longer allowed as bare-tag rules.
2. **Strip baselines to universal-only.** A bare tag with no class gets only styling that is true for every instance of it (UA repair, platform-stripped affordances, the element's single fixed meaning, and `spec` pairings). Product chrome that _promotes_ a tag into a contextual role (`<article>`→card, `<aside>`→sidebar, `<nav>`→rail, `<output>`→toast) is removed from the bare tag.
3. **Signal first, class fallback.** A promoted composition opts in through an **unambiguous platform signal** where one exists and means the behaviour is always intended (`[role="tablist"]`, `[popover]`, `aside[role="alert"]`, `dialog:modal`, `[open]`), and through a **named class** only where no natural signal exists (`.card`, `.shell`).

### The one-line rule

> **Style the tag for what it _always_ is. Style a class or a signal for what it _sometimes_ becomes. Combine two bare tags only when HTML itself mandates the pairing.**

### What this reverses

This deliberately rolls back [styles.md](guides/styles.md) principle #6's clause _"descendant context disambiguates dual-role tags"_ (`article > header` = card header, `body > aside` = sidebar). Ancestry will no longer silently disambiguate a tag's role. The role is declared — by a class or a platform signal — never inferred from where the tag happens to sit. The semantic ergonomics that survive are the ones where the signal _is_ the platform's own (`[popover]`, `[role]`, `[open]`, `:modal`).

### The payoff (why decisions #1 and #2 reinforce each other)

Most of the non-spec pairings are `reset` rules that exist **only to clean up after product chrome the bare-tag baseline adds** — `article > h1..h6 { margin: 0 }` exists because the bare `<article>` baseline introduced a `gap`; `main > section { padding-block: 0 }` exists because the bare `<section>` baseline added padding. Strip the baseline (decision #2) and the cleanup combination (decision #1's casualty) **evaporates** — there is nothing left to reset. The bulk of the work is _deletion_, not migration.

---

## The two rules this refactor enforces

### Rule 1 — Element baselines are universal-only

An `elements/_{tag}.scss` rule is justified only if it passes the **universality test**: _is this true for every instance of this tag, in every document, regardless of context?_ Four things pass; one thing no longer does.

| Justification                                         | Passes?  | Examples                                                                                                                                                                                                           |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UA-quirk repair**                                   | ✅ keep  | `<fieldset>` `min-inline-size: 0`; `<mark>` system colors; `<address>` italic reset; `<hr>` token rule; `<img>` `display: block`                                                                                   |
| **Platform-stripped affordance**                      | ✅ keep  | `<a>` underline; `<abbr>` `cursor: help`; `<p> + <p>` rhythm; heading scale; list/`<dl>` margins                                                                                                                   |
| **The element's single fixed meaning**                | ✅ keep  | form controls (`button`, `input`, `select`, `textarea`, `label`, `fieldset`, `legend`) and their modifier cascade; inline chips (`code`, `kbd`, `samp`, `var`); media `max-inline-size`; `progress`/`meter` gauges |
| **`spec` strict pairing**                             | ✅ keep  | `details > summary`, `table` internals, `dl > dt/dd`, `select > option`, `ul/ol/menu > li`                                                                                                                         |
| **Contextual promotion** (tag → role it isn't always) | 🚫 strip | `<article>`→card, `<aside>`→sidebar/callout, `<nav>`→rail, `<menu>`→toolbar, `<output>`→toast, `<header>`/`<footer>`→bands, `<section>`→padded region, `<main>`→content well, `<body>`→app grid                    |

> The test is "_always_," not "_usually_." An `<article>` is _usually_ card-like, but not _always_ (it may be a bare blog post in a feed). "Usually" is exactly the presumption this refactor removes — it becomes `.card`.

### Rule 2 — Bare-tag combinations are spec-only; compositions opt in

A combination selector is **allowed** when any of these holds:

- **(a)** it is a `spec` pairing (HTML mandates the nesting — `tr > td`, `details > summary`); or
- **(b)** the parent or child compound is **scoped by a class** (`.card > header`, `button.reveal > span`); or
- **(c)** the parent or child compound is **scoped by an unambiguous platform signal** (`[role="tablist"] > [role="tab"]`, `dialog:modal > header`, `[popover] > menu`, `nav[aria-label] > ol`).

A combination selector is **forbidden** when it is a non-spec `parent > child` with **both sides bare tags** (`article > header`, `nav > ol`, `main > section`, `body > aside`). These are the refactor targets.

> Why the scoping exemption is sound: a class is a deliberate author opt-in, and a platform signal (`[popover]`, `:modal`, `[role]`, `[open]`) means the role is _already declared on the element_ — so the combination only fires when the behaviour is genuinely intended. That satisfies "the default is for when they're always meant to behave a certain way."

**Signal vs. class, decided per composition:** prefer a signal when the platform gives one that _means_ the role (a `<dialog>` that is `:modal` always wants modal band chrome; an element with `[popover]` always wants top-layer chrome). Fall back to a class when the role has no platform marker (a "card" is not an HTML concept; `<article class="card">` is the honest opt-in).

---

## How the layers change

The layer order itself is **unchanged** — it already encodes the right precedence:

```css
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
@import 'tailwindcss';
```

What changes is the _content discipline_ of three of them, and the contracts that police them.

| Layer                                                 | Before                                                                                                                                                                         | After                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `elements`                                            | bare-tag baselines **including contextual promotions** (`article` card surface, `nav` rail tokens) and non-spec combos (`dialog` `:has()` bands, list-group, section-collapse) | universal-only baselines + `spec` pairings. No promotions, no non-spec combos.                                                   |
| `components`                                          | element compositions via **bare-tag ancestry** (`article > header`, `body > aside`, `nav > ol`)                                                                                | compositions via **class root** (`.card`, `.shell`) or **platform signal** (`[role]`, `[popover]`). No bare-tag non-spec combos. |
| `composables`                                         | state-gated chrome (already signal-driven)                                                                                                                                     | unchanged in spirit; absorbs signal-gated chrome relocated out of `elements`/`components`.                                       |
| `surfaces`, `modifiers`, `theme`, `base`, `utilities` | —                                                                                                                                                                              | unchanged.                                                                                                                       |

### The contract changes that make it stick

This project enforces its architecture with machine-checked contracts in [`src/browser/patterns.ts`](src/browser/patterns.ts) + [`tests/guides/patterns.test.ts`](tests/guides/patterns.test.ts). The refactor is **contract-first**: tighten the contract so every violation lights up red, then make the tree green.

- **`STRUCTURAL_PAIRINGS`** — remove every `slot` / `reset` / `context` entry; keep only `spec`. The `StructuralPairingKind` enum narrows to `'spec'` (the other kinds become illegal to author).
- **The pairing test** (`extractTagPairs` + driver) — confirm and, if needed, adjust so a `parent > child` pair is flagged **only when neither side carries a scoping class/role/attribute**. (Class- and signal-headed compounds already produce no tag-pair; verify tag-headed-but-qualified compounds like `dialog:modal > header` are treated as scoped, mirroring the existing scope-discipline exemption.)
- **`FOLDER_CONTRACTS['elements']`** — already forbids `class` and `data-attribute` heads. Add a note (and, where testable, a check) that element partials carry no contextual-promotion chrome — the universality test from Rule 1.
- **`taxonomy.ts`** — tags that lose their bare-tag promotion (`article`, `aside`, `nav`, `menu`, `output`, `header`, `footer`, `main`, `section`, `search`) move from `substantive` toward `reset`/`passthrough`; their product tokens migrate to class-component contracts. `SUBSTANTIVE_TAGS` / `RESET_TAGS` / `PASSTHROUGH_TAGS` indices and `TOKEN_GROUPS` (`page-shell`, `card-region`) re-home accordingly.
- **`COMPONENT_CONTRACTS`** — gains the new class-component roots (`.card`, `.shell`, …) with their required-token sets.

---

## Current state (where we start)

From the pre-refactor audit (all of `elements/`, `components/`, `composables/`, `surfaces/`, `modifiers/`):

- **`composables/`, `surfaces/`, `modifiers/` are already at target.** Zero bare-tag non-spec combinations, zero cross-layer leakage, zero token-literal issues across all 25 files. Every combination is scoped by a class, role, attribute, or platform signal. They need no structural change — only two forward-coordination notes (the `surfaces/_popover.scss` `body:has(main) > :is(nav, aside)` scrollbar-gutter rule and the `composables/_dialog.scss` flex rules follow the `.shell` / dialog-band relocations).
- **`elements/` is ~95% already clean.** Most overlapping tags (`article`, `aside`, `nav`, `header`, `footer`, `form`, `menu`, `output`, `search`, `div`) are no-op stubs in `elements/` that defer to `components/`. The real in-`elements/` violations are concentrated in a handful of files.
- **`components/` is where the work is** — two large ancestry-inference clusters (app-shell, card) plus minor combos. See the table below.
- **Token discipline is clean** — no raw hex anywhere; `px` usage is idiomatic (hairlines, forced-colors outlines, pill radii). This is **not** a token refactor.
- **The conflicts the user flagged are real but few** — a harmless `body` canvas/text duplication, and a `form` vs `fieldset` `inline-size: 100%` rule duplicated across layers.

### In-`elements/` violations (Phase 2 targets)

| File                                                                 | Violation                                                                              | Disposition                                                                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `elements/_dialog.scss`                                              | extensive `:has()`-gated `dialog > header/footer/form/section/h*/p` modal-band chrome  | signal-gate on `dialog:modal` / `[open]` → relocate to `composables/` or `components/`                                                                                   |
| `elements/_table.scss`                                               | `.striped`/`.bordered`/`.sticky`/`.{variant}` + `[data-table-*]` expansion/resize grid | class/composable component (`useTable`) → relocate; keep only bare `table` + spec internals                                                                              |
| `elements/_li.scss`, `elements/_ul.scss`                             | `ul.group`/`ol.group` list-group: `:has(> a)`, `> a/button`, `+ li`, `[aria-*]` rows   | class-component (`.group` is already a class — relocate the block to `components/`)                                                                                      |
| `elements/_section.scss`                                             | `main/article/nav/aside/dialog > section` nesting-collapse                             | **delete** — section baseline padding is stripped, nothing to collapse                                                                                                   |
| `elements/_fieldset.scss`                                            | `fieldset > label > input` form-layout chrome (dup of `components/_form.scss`)         | consolidate into the form composition                                                                                                                                    |
| `elements/_details.scss`, `elements/_p.scss`, `elements/_label.scss` | `details + details`, `p + p`, `fieldset:disabled label`                                | `p + p` keeps (universal rhythm); `details + details` → accordion class/signal; `fieldset:disabled label` keeps (single-element state, `:disabled` is a platform signal) |

> Note: single-element attribute-state selectors that don't cross elements — `button[aria-pressed]`, `a[aria-disabled]`, `input[role="switch"]` — are **not** violations of Rule 2 (they refine one tag, not a combination). They stay unless a later cleanup pass wants them gone.

### In-`components/` violations (Phase 3/4 targets)

Four clusters. The signal-gated and class-based rules in `components/` are **already compliant and stay** (see the migration triage); these are the ones that move.

| Cluster                       | Files                                                             | What violates                                                                                                                                                                         | Disposition                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **A — app-shell ancestry**    | `_body`, `_main`, `_header`, `_footer`, `_nav`, `_aside`, `_menu` | `body:has(main)` grid + `body:has(main) > {header,nav,aside,footer,main}` placement + descendants (`> nav menu`, `> aside menu`, `> :where(nav,aside) h6`, drawer-header sticky pins) | → `.shell` class-gated grid (Phase 4)                                                                         |
| **B — card/article ancestry** | `_article`, `_aside`, `_menu`                                     | bare `article` card surface; `article > header/footer/img/picture/ul.group`; `article aside` (callout); `article menu` (card actions); `article > h*/p` resets                        | → `.card` class-gated, element slots (Phase 4)                                                                |
| **C — plain bare-tag combos** | `_nav`                                                            | `nav > ol`, `nav > ul` (marker strip)                                                                                                                                                 | → fold into the `nav[aria-label]` opt-in, or drop                                                             |
| **D — form/search layout**    | `_form`, `_search`                                                | `form > label`, `form > label > input`, `form > input/textarea/select`, `search > input/label`                                                                                        | → strip; compose via element-agnostic `.stack`/`.cluster` (combos removed; `useForm` validation chrome stays) |

**Already compliant in `components/` (stay as-is):** signal-gated — `aside[role="alert"]`, `:is(aside,nav)[popover]`, `[role="tablist"]`, `nav[aria-label="…"] > ol`, `menu[popover]`, `[role="status"][popover]`/`div[role="status"]`, `[role="group"]`/`[role="toolbar"]`; class-based — all of `_div.scss` (the `.stack`/`.cluster`/`.frame`/`.tiles`/`.split`/`.panes` family — the _model_ for new class components) and the atoms `.badge`/`.tag`/`.dot`/`.avatar`/`.skeleton`/`.spinner`.

### Class vocabulary (decided)

The governing principle from the mailbox comparison: **adopt mailbox's root class NAMES; keep elements' MECHANICS** (element slots, signal-gating, modifier-composition) wherever they're already compliant — and wire everything to `--set-*`, never `--bs-*`. The "must support `--set-*` tokens" constraint forces this for variants: mailbox bakes color into the class (`.tag-solid-primary`), elements composes orthogonal modifiers (`.tag.primary.filled`) that set `--set-*` tokens; keeping elements' composition preserves the token system.

Confirmed decisions:

| Area                                              | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Card**                                          | `.card` root with **element slots** — `.card > header`, `.card > footer`; content flows directly (no `.card-body`). Class-scoped combos (compliant); tokens in `--set-card-*`.                                                                                                                                                                                                                                                                                      |
| **App-shell**                                     | `.shell` **element-slot grid** on `<body class="shell">` — `.shell > header/nav/main/aside/footer` placed by grid-area (keeps `display:contents` mount-wrapper support). Consistent with the `.panes`/`.split` family; lighter than mailbox's `.sidebar`. Not adopting `.container-shell`/`.sidebar`. Tokens in `--set-shell-*`.                                                                                                                                    |
| **List-group**                                    | Keep `ul.group` + bare `li` (the `.group` class scopes the parent; `ul > li` is a spec pairing). No `.list-group-item` per-row class.                                                                                                                                                                                                                                                                                                                               |
| **Layout primitives**                             | **Un-scope** `.stack`/`.cluster`/`.frame`/`.tiles`/`.split` from `div` → element-agnostic (like `.fill`/`.fluid`/`.muted` already are), so any stripped semantic element opts back into layout: `<form class="stack">`, `<fieldset class="stack">`, `<label class="stack">`. The old `div`-scoping rationale (don't shadow an element's own gap) dies with the stripped baselines.                                                                                  |
| **Form / search (cluster D)**                     | **Strip** — bare `<form>`/`<search>` get no flex layout; compose via the primitives (`<form class="stack">`, `<search class="cluster">`). Control-fill comes free from the stack's stretch (or `.fill`); label-on-top is `<label class="stack">`. All `form > label` / `form > input` / `search > input` combos removed. `useForm` validation chrome (`form[data-form-validated] …`) stays (signal-gated).                                                          |
| **Atoms** (badge/tag/dot/avatar/skeleton/spinner) | Keep the mailbox-aligned root names; keep elements modifiers (`.primary`/`.small`/`.filled`). Optional additions wired to new tokens: `.avatar-group` → `--set-avatar-group-*`; `.dot.ring` → `--set-dot-ring`; `.spinner` grow variant.                                                                                                                                                                                                                            |
| **Nav / breadcrumb / pagination**                 | Keep elements' **signal-driven** approach (`nav[aria-label]`, `[role="tab"]`) — already mailbox-parity mechanics; matches the signal-first decision. Not adopting `.nav-link`/`.breadcrumb-item`/`.page-link`/`.navbar*`. The blanket `nav > ol`/`nav > ul` marker-strip (cluster C) is dropped — recognized nav patterns strip markers via the `nav[aria-label]` opt-in; a generic unlabeled `<nav><ul>` keeps UA markers. Only the rail chrome moves to `.shell`. |
| **Token namespace**                               | Each new class root declares its own `--set-{class}-*` (`.card` → `--set-card-*`, `.shell` → `--set-shell-*`, `.callout` → `--set-callout-*`), per the namespace contract (prefix = selector basename). De-promoted element token sets (`--set-article-*` etc.) shrink to whatever the minimal bare-tag baseline still needs (often none).                                                                                                                          |
| **In-article aside**                              | `.callout` (replaces `article aside`); **card action row** → `.card menu`.                                                                                                                                                                                                                                                                                                                                                                                          |

---

## The phases

| #   | Phase                                                                              | Builds                                                             | Depends on |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| 0   | [Lock the contract](#phase-0--lock-the-contract-red-first)                         | tightened `STRUCTURAL_PAIRINGS` + pairing/universality tests (RED) | —          |
| 1   | [Triage every composition](#phase-1--triage-every-composition)                     | the per-pairing migration table (signal vs class)                  | 0          |
| 2   | [Purify element baselines](#phase-2--purify-element-baselines)                     | universal-only `elements/`; in-layer violations gone               | 0, 1       |
| 3   | [Re-home signal-gated compositions](#phase-3--re-home-signal-gated-compositions)   | promotions with a platform signal                                  | 1, 2       |
| 4   | [Introduce class-gated compositions](#phase-4--introduce-class-gated-compositions) | `.card`, `.shell`, … for the no-signal cases                       | 1, 2       |
| 5   | [De-conflict & prove the cascade](#phase-5--de-conflict--prove-the-cascade)        | zero element↔composition conflicts; precedence proofs              | 2, 3, 4    |
| 6   | [Sync registries, mirrors & guides](#phase-6--sync-registries-mirrors--guides)     | `taxonomy.ts`/`elements.ts`/`tokens.ts` + guide parity             | 2–5        |
| 7   | [Verify & refresh the map](#phase-7--verify--refresh-the-map)                      | full suite green; showcase + inspector self-audit; MAP.md          | all        |

Jump to the [migration triage](#appendix--migration-triage), the [preserved invariants](#invariants-we-preserve-not-rebuilding), the [master checklist](#the-master-checklist), and the [sequencing rationale](#sequencing-rationale).

### How to read this plan

- **Phases are ordered by dependency.** The riskiest, most-depended-on decision (the contract) goes first, deliberately and in isolation.
- **A checkbox is a contract.** `[ ]` is not done; `[x]` means it shipped _and_ its exit criteria passed. Don't check a box to mean "mostly."
- **Contract-first, then green.** Phase 0 makes the tests reject the old shape. Every later phase is "make the tree green again under the new rule."

---

## Phase 0 — Lock the contract (RED first)

**Goal.** Encode the new rule in the test suite so every violation is visible before a single partial moves. After this phase the suite is **red on purpose** — the red set _is_ the work list for Phases 2–4.

**Why first.** The contract is the one decision every later phase depends on. Writing it once, up front, turns the refactor from a judgment call into a checklist: a partial is done when its contract test passes.

### Work

- [ ] **Narrow `STRUCTURAL_PAIRINGS`** in [`src/browser/patterns.ts`](src/browser/patterns.ts): delete every `slot`, `reset`, and `context` entry, leaving only `spec`. Update the `StructuralPairingKind` docstring to state that non-spec bare-tag pairings are no longer authorable.
- [ ] **Confirm the pairing detector's scoping exemption.** Read `extractTagPairs` and the pairings driver. Verify a `parent > child` pair is emitted **only** when neither compound carries a class / role / attribute / pseudo scope. If a tag-headed-but-qualified compound (`dialog:modal > header`, `article.card > header`) currently emits a pair, extend the exemption so a scoping qualifier on either side suppresses it — aligning with the existing scope-discipline treatment of `nav[aria-label] > ol > li.active`.
- [ ] **Add a universality assertion for `elements/`** (Rule 1) where mechanically checkable: an `elements/_{tag}.scss` rule body must not declare the contextual-promotion property cluster that belongs to a class-component (e.g. grid-template-areas on `body`, card band padding on `article`). At minimum, encode the keep/strip disposition per tag as data the test reads, so a stripped tag re-growing chrome fails.
- [ ] **Write the red baseline.** Run `npm run test:guides` (the `patterns` driver) and capture the failing set. Record it as the Phase 1 input. A failure here is expected and good.
- [ ] **Do not fix anything yet.** Phase 0 only changes contracts and tests.

### Constraints

- The layer order and token namespace are **not** touched — this refactor is about selector scope, not values.
- No `spec` pairing is removed. The HTML-mandated set is sacrosanct.

### Exit criteria

- [ ] `STRUCTURAL_PAIRINGS` contains only `spec` entries; the TS compiles and the registry shape test passes.
- [ ] The pairings test **fails** on exactly the known non-spec bare-tag combinations (the audit list), and **passes** class/signal-scoped compounds.
- [ ] The red set is captured and triaged into Phase 1.

---

## Phase 1 — Triage every composition

**Goal.** Turn the red set into an explicit per-pairing decision table: for each non-spec composition, does it **evaporate** (was only cleaning up stripped chrome), become **signal-gated**, or become **class-gated**? After this phase, every later edit is mechanical.

**Why now.** Phases 2–4 each consume one column of this table. Deciding the disposition once, in one place, prevents per-file improvisation and keeps the showcase coverage honest.

### Work

- [ ] **Classify each entry** removed from `STRUCTURAL_PAIRINGS` into one of: `evaporate`, `signal`, `class`. Seed from the [migration triage appendix](#appendix--migration-triage) below; reconcile against the actual compiled selectors.
- [ ] **Name the class-gated roots.** Confirm `.card`, `.shell`, and any others against the existing collision guards — Tailwind single-token utilities (`TAILWIND_SINGLE_TOKEN_UTILITIES` in [`tests/setup.ts`](tests/setup.ts)), the modifier vocabulary, and `classNameIsSanctioned`. Single-word roots only, per the class-root naming convention.
- [ ] **Pick the signal per signal-gated composition** and confirm it is unambiguous (a real `[role]`/`[popover]`/`:modal`/`[open]`, not a freeform string the consumer might not set — flag `nav[aria-label='Breadcrumb']` for a keep-aria-label-vs-`.breadcrumb` decision).
- [ ] **Record the showcase impact.** Each disposition that changes consumer markup (a card now needs `class="card"`) gets a showcase-page edit noted, so Phase 7's self-audit has a target.

### Exit criteria

- [ ] Every non-spec pairing has a recorded disposition (`evaporate` / `signal` / `class`) with a one-line reason.
- [ ] Every proposed class root passes the collision guards.
- [ ] The table is committed (replacing the scratch notes) as the source of truth for Phases 2–4.

---

## Phase 2 — Purify element baselines

**Goal.** Make every `elements/_{tag}.scss` pass the universality test and carry no non-spec combination. After this phase, a classless document is styled only by what is universally true of its tags + HTML-mandated pairings.

### Work

- [ ] **Strip contextual promotions to minimal.** For `article`, `aside`, `nav`, `menu`, `output`, `header`, `footer`, `main`, `section`, `search`, `body`: remove the product chrome from the bare-tag rule, leaving only universal repair/affordance styling (often: nothing, i.e. a passthrough stub). Their tokens move to the class/signal component in Phase 3/4.
- [ ] **Delete the evaporating combinations.** Remove the nesting-collapse and zero-margin-in-container rules whose reason was cleaning up now-stripped chrome (`elements/_section.scss` collapse block; `article/header/footer/dialog/form > h*`/`p` resets that no longer have a baseline to fight).
- [ ] **Relocate the concentrated violations** named in the [current-state table](#in-elements-violations-phase-2-targets): the `_dialog.scss` band chrome, the `_table.scss` grid, the `_li.scss`/`_ul.scss` list-group, the `_fieldset.scss` form-layout dup. Move each to its Phase-3/4 home (don't just delete — these carry real chrome).
- [ ] **Keep the universal baselines untouched** — form controls, inline chips, media, gauges, UA repairs, `spec` pairings, `p + p`, `fieldset:disabled label`.
- [ ] **Update `elements/index.scss`** if any partial becomes a pure stub.

### Constraints

- A stripped baseline becomes a documented passthrough stub (the `elements/` contract allows comment-only partials) — record _why_ the framework now has no bare-tag opinion.
- No chrome is silently lost: every removed promotion is accounted for by a Phase 3/4 destination in the triage table.

### Exit criteria

- [ ] No `elements/_*.scss` rule fails the universality test.
- [ ] The pairings test passes for every `elements/` selector (only `spec` combinations remain).
- [ ] A classless render of the showcase's raw-HTML page still reads cleanly (universal baselines intact); promoted patterns now render plain (expected — they get their chrome back in 3/4).

---

## Phase 3 — Re-home signal-gated compositions

**Goal.** Restore every promotion that has an unambiguous platform signal, gated on that signal, in `components/` or `composables/`. After this phase, drawers, tabs, alerts, modals, toolbars, toasts, breadcrumbs render correctly — triggered by the platform marker, not by ancestry.

### Work

- [ ] **Drawer / off-canvas** — `:is(aside, nav)[popover]` chrome + bands (`> header`/`> footer` become scoped under the `[popover]` parent). Verify against `composables/_aside.scss` + `components/_aside.scss`.
- [ ] **Tabs / toolbars / groups** — `[role="tablist"]`/`[role="tab"]`/`[role="tabpanel"]`, `[role="toolbar"]`/`[role="group"]` (already in `components/_role-group.scss` + `_nav.scss`; confirm no bare-tag combos remain).
- [ ] **In-flow banners** — `aside[role="alert"]` / `[role="status"]`.
- [ ] **Modal bands** — `dialog:modal` / `dialog[open]` scoped header/footer/section/heading rhythm (relocated from `elements/_dialog.scss`).
- [ ] **Dropdown / menu panels** — `[popover] > menu`, `li > menu`, `li > h6` dropdown groups (the `li`-scoped child rows are spec-or-signal-gated).
- [ ] **Toast** — the `[role="status"][popover]` deck + its band/dismiss rows.
- [ ] **Breadcrumb / pagination** — `nav[aria-label] > ol/ul` (parent attr-scoped ⇒ exempt), pending the Phase-1 aria-label-vs-class decision.
- [ ] **Each relocation re-uses `@include transition()` / `@include forced-colors`** and keeps its required-token set per `COMPONENT_CONTRACTS` / `COMPOSABLE_CONTRACTS`.

### Constraints

- Open/closed gating discipline holds: any `display`/`position: fixed`/large `transform` gates on the open-state signal.
- A signal-gated rule must reference a signal the platform sets natively (or a composable provably toggles) — never a freeform value a consumer might omit.

### Exit criteria

- [ ] Every signal-gated composition renders correctly when its signal is present and is inert when absent.
- [ ] No signal-gated rule reaches its chrome through a bare-tag ancestry path.
- [ ] The relevant `composables/`/`components/` contract tests pass (required tokens, animated-mixin discipline).

---

## Phase 4 — Introduce class-gated compositions

**Goal.** Restore the promotions that have **no** natural platform signal as explicit named classes. After this phase, `<article class="card">`, the app shell, and any other class roots from Phase 1 render their full chrome.

### Work

- [ ] **`.card`** (`--set-card-*`) — the former bare-`<article>` card: surface + `.card > header`/`.card > footer` bands + `.card > img`/`picture` hero + `.card menu` action row + embedded `ul.group` list. Class head ⇒ exempt from the pairing rule.
- [ ] **`.shell`** (`--set-shell-*`) — the former `body:has(main)` app grid, on `<body class="shell">`: `.shell > header`/`nav`/`main`/`aside`/`footer` grid-area placement (keep the `display:contents` mount-wrapper match `.shell > * > nav` etc.).
- [ ] **`.callout`** (`--set-callout-*`) — the former `article aside`.
- [ ] **Un-scope the layout primitives** — `.stack`/`.cluster`/`.frame`/`.tiles`/`.split` become element-agnostic in `components/_div.scss` (drop the `div` qualifier), so semantic elements compose layout.
- [ ] **Strip form/search to primitives** — remove the `form`/`search` flex defaults and all `form > label`/`form > input`/`search > input` combos; the idiom becomes `<form class="stack">` / `<search class="cluster">` / `<label class="stack">`, control-fill via stack-stretch or `.fill`. Keep the signal-gated `form[data-form-validated] …` validation chrome.
- [ ] **Register each** root in `COMPONENT_CONTRACTS` with its `--set-{class}-*` required tokens; mirror tokens in [`src/browser/tokens.ts`](src/browser/tokens.ts); add the class to the sanctioned set.
- [ ] **Keep slots as elements, not slot-classes** — `.card > header` (element slot under a class root), per the "element-driven slot" convention; no `.card-header` class unless an element slot can't express it.

### Constraints

- Single-word class roots; no collision with Tailwind or the modifier vocabulary.
- A class root carries _composition_ chrome only — variant/size/style still come from the modifier cascade via the `--set-*` fallback chain, never hand-rolled `.card.primary`.

### Exit criteria

- [ ] Every class-gated composition renders its full former chrome with the class applied, and renders as a plain element without it.
- [ ] Each new root passes its `COMPONENT_CONTRACTS` required-token check and TS token parity.
- [ ] No class-gated rule reintroduces a bare-tag non-spec combination.

---

## Phase 5 — De-conflict & prove the cascade

**Goal.** Guarantee the user's "no conflicting styles" requirement: a bare-tag baseline and an opt-in composition never set the same property to fighting values, and precedence is proven, not assumed.

### Work

- [ ] **Resolve the known duplications** — the `body` canvas/text pair (drop the redundant copy), the `form` vs `fieldset` `inline-size: 100%` rule (single owner in the form composition).
- [ ] **Sweep element↔composition overlaps** — for every tag that has both a universal baseline and a class/signal composition, confirm the composition only _adds_ or cleanly _overrides_ (later layer wins); no property is set to conflicting values within the same layer.
- [ ] **Prove precedence** — keep/extend the layer-order proofs: a `utilities` rule beats a composition without `!important`; a composition (later layer) beats the element baseline; an un-layered consumer rule beats everything.
- [ ] **Confirm the modifier cascade still reaches** the relocated chrome (a `.primary` still tints `.card`, a `dialog:modal`, an `[role="tablist"]`).

### Exit criteria

- [ ] No two framework rules set the same property to different values for the same element within one layer.
- [ ] The precedence proofs pass (utility > composition > element baseline; consumer un-layered > all).
- [ ] Variant/size/style modifiers compose correctly over every relocated composition.

---

## Phase 6 — Sync registries, mirrors & guides

**Goal.** Bring the TypeScript mirrors, taxonomy, and prose guides back into parity with the new shape, so the dual-distribution contract and the doc-parity tests hold.

### Work

- [ ] **`taxonomy.ts`** — re-treat the de-promoted tags (`substantive` → `reset`/`passthrough`); move `TOKEN_GROUPS` `page-shell`/`card-region` membership to the class components; refresh `SUBSTANTIVE_TAGS`/`RESET_TAGS`/`PASSTHROUGH_TAGS`/`MODIFIABLE_TAGS`.
- [ ] **`elements.ts`** — drop tags that no longer declare bare-tag `--set-{tag}-*` tokens; keep universal baselines.
- [ ] **`tokens.ts`** — re-home moved `--set-*` tokens; maintain bidirectional SCSS↔TS parity.
- [ ] **Guides** — update [styles.md](guides/styles.md) (principle #6 rewrite), [components.md](guides/components.md) (element-driven → class/signal-driven compositions), [elements.md](guides/elements.md) (treatment table), [patterns.md](guides/patterns.md) (`STRUCTURAL_PAIRINGS` spec-only + scoping-exemption), [modifiers.md](guides/modifiers.md) if any modifier moves. The guide-parity tests are the checklist.

### Exit criteria

- [ ] `npm run test:src:browser` (TS↔SCSS parity) is green.
- [ ] Every guide-parity driver under `tests/guides/` is green.
- [ ] No guide still documents bare-tag ancestry disambiguation as the mechanism.

---

## Phase 7 — Verify & refresh the map

**Goal.** Prove the whole system end-to-end and update the living comparison.

### Work

- [ ] **Full suite green** — `npm test` across all projects.
- [ ] **Inspector self-audit** — every showcase page mounts and `Inspector.inspect()` reports zero `error` findings (the semantics page-gate), and the style-matrix gate over `STRUCTURAL_PAIRINGS` × modifiers passes under the new pairing set.
- [ ] **Showcase render check** — pages updated for the new opt-in markup (cards carry `.card`, shells carry `.shell`) render correctly in the browser; verify the proof surface visually.
- [ ] **Refresh [MAP.md](MAP.md)** — the elements column now reflects class/signal-driven compositions where it previously implied bare-tag ancestry. Update affected rows as the work lands ("MAP.md as we go").

### Exit criteria

- [ ] Every test project passes.
- [ ] The inspector finds zero `error`-severity issues across all showcase pages.
- [ ] MAP.md accurately reflects the post-refactor elements model.

---

## Appendix — migration triage

The non-spec pairings removed from `STRUCTURAL_PAIRINGS`, grouped by disposition. Phase 1 turns this into the committed per-pairing table; this is the starting classification.

### Keep as bare-tag (spec — unchanged, ~30)

`details>summary` · `fieldset>legend` · `picture>source` · `picture>img` · `select>option` · `select>optgroup` · `optgroup>option` · `table>{thead,tbody,tfoot,caption,colgroup,tr}` · `{thead,tbody,tfoot}>tr` · `tr>td` · `tr>th` · `colgroup>col` · `ol>li` · `ul>li` · `menu>li` · `dl>dt` · `dl>dd`

### Evaporate (delete — was only cleaning up stripped chrome)

- **Nesting-collapse:** `main>section`, `section>section`, `article>section`, `nav>section`, `aside>section`, `dialog>section`, `form>section` — section adds no default padding-block, so nothing collapses.
- **Zero-margin-in-container:** `article>{h1..h6,p}`, `header>{h1..h6,p}`, `footer>{h1..h6,p}`, `dialog>{h1..h6,p}`, `form>{h1..h6,p}` — rhythm is owned by `gap` on the (now class/signal-gated) container; any residual reset becomes a scoped descendant of `.card` / `dialog:modal` (non-bare-tag head ⇒ exempt) or is unneeded.

### Signal-gated (platform marker means "always this")

| Composition                    | Signal                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Drawer / off-canvas + bands    | `:is(aside, nav)[popover]`                                                                                                            |
| In-flow alert / status banner  | `aside[role="alert"]` / `[role="status"]`                                                                                             |
| Tabs                           | `[role="tablist"]` / `[role="tab"]` / `[role="tabpanel"]`                                                                             |
| Toolbar / group                | `[role="toolbar"]` / `[role="group"]`                                                                                                 |
| Modal bands + body rhythm      | `dialog:modal` / `dialog[open]`                                                                                                       |
| Dropdown / menu panel + groups | `[popover] > menu`, `li > menu`, `li > h6`                                                                                            |
| Toast deck + bands             | `[role="status"][popover]`                                                                                                            |
| Breadcrumb / pagination        | `nav[aria-label="Breadcrumb"]` / `nav[aria-label="Pagination"] > ol/ul` — **stays signal-driven** (decided); not converted to a class |
| Reveal label slot              | `button.reveal > span` (class-scoped)                                                                                                 |
| Menu / nav command rows        | `li > a`, `li > button` under a nav/menu signal                                                                                       |

### Class-gated (no natural signal — new named root, element slots)

Root names follow mailbox; slots and modifiers follow elements' mechanics (element slots + `--set-*` modifier composition).

| Composition                | Class                                                              | Replaces                                                             |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Card + bands + hero + list | `.card` (slots: `.card > header`, `.card > footer`, `.card > img`) | bare `article` surface + `article > header/footer/img/picture/ul/ol` |
| App shell grid             | `.shell` (slots: `.shell > header/nav/main/aside/footer`)          | `body:has(main)` + `body > header/nav/main/aside/footer`             |
| Callout (in-article aside) | `.callout`                                                         | `article aside`                                                      |
| Card action row            | `.card menu` (under `.card`)                                       | `article menu`                                                       |

Atoms keep their mailbox-aligned names and elements modifiers (no new root); optional opt-in features that need a token: `.avatar-group` → `--set-avatar-group-*`, `.dot.ring` → `--set-dot-ring`.

---

## Invariants we preserve (not rebuilding)

These are already correct and must stay green throughout — the refactor must not regress them:

- **Token discipline.** Primitive → semantic → component tiers; `--set-*` namespace; no literals where a token exists; `oklch` palette + `color-mix`/relative-color derivations. (Clean today.)
- **Accessibility & motion.** Every transition pairs with a `prefers-reduced-motion` path via `@include transition()`; every `INTERACTIVE_ELEMENTS` member ships `:focus-visible` + `@include forced-colors`; no bare `:focus`; no color-only meaning.
- **Theming.** `data-mode` / `data-theme` redeclare tokens only; default by absence (OS-follow). No painting rules in theme blocks.
- **Dual-distribution parity.** Every CSS identifier mirrors a TS leaf; bidirectional parity tests stay green.
- **Surfaces stay native.** `:focus-visible`, `::backdrop`, Popover API, anchor positioning — styled, never reimplemented.

---

## The master checklist

- [ ] **Phase 0 — Lock the contract.** `STRUCTURAL_PAIRINGS` spec-only; pairing test enforces the scoping exemption; universality data encoded; red baseline captured.
- [ ] **Phase 1 — Triage.** Every non-spec pairing classified `evaporate`/`signal`/`class`; class roots pass collision guards; table committed.
- [ ] **Phase 2 — Purify elements.** Universal-only baselines; evaporating combos deleted; concentrated violations relocated; classless render still reads.
- [ ] **Phase 3 — Signal-gated.** Drawers/tabs/alerts/modals/toolbars/toasts/breadcrumbs render off their platform signal; no bare-tag ancestry path.
- [ ] **Phase 4 — Class-gated.** `.card`/`.shell`/… render full chrome with the class, plain without; registered + token-mirrored.
- [ ] **Phase 5 — De-conflict.** Zero same-layer property conflicts; precedence proven; modifiers still compose.
- [ ] **Phase 6 — Sync.** Taxonomy/`elements.ts`/`tokens.ts` re-homed; all guide-parity drivers green.
- [ ] **Phase 7 — Verify.** `npm test` green; inspector zero errors; showcase renders; MAP.md refreshed.

---

## Sequencing rationale

The build climbs from the one decision everything depends on to the validation that it held:

```
0 Contract ─▶ 1 Triage ─▶ 2 Purify elements ─┬▶ 3 Signal-gated ─┐
                                              └▶ 4 Class-gated  ─┴▶ 5 De-conflict ─▶ 6 Sync ─▶ 7 Verify
```

- **0 is the contract** — tighten the test first so the work list is generated, not guessed. Changing it later would re-shuffle every later decision.
- **1 decides dispositions once** so Phases 2–4 are mechanical, not improvised per file.
- **2 strips before 3/4 restore** — deleting the bare-tag promotions first means most cleanup combinations evaporate, shrinking what 3/4 must rebuild.
- **3 and 4 are parallel** — signal-gated and class-gated migrations are independent; either can land first.
- **5 proves no-conflict** once everything is in its final home and precedence can be measured end-to-end.
- **6 re-establishes parity** (TS, taxonomy, guides) after the selectors settle.
- **7 validates** with the suite, the inspector self-audit, and the refreshed map.

Build one phase, pass its exit criteria, then start the next. The contract test and the inspector self-audit are the two signals that the system is coherent at every step.
