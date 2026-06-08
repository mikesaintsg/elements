# ROADMAP — Building the Styling System

> A sequenced, layer-by-layer build plan for a CSS architecture grounded in semantic HTML, cascade layers, and design tokens. Each phase is a self-contained, shippable unit with its own checklist and exit criteria. Build them in order; land one green before starting the next.

This file is the **plan of record** — what to build and in what sequence. The accompanying architecture write-up explains *why* each idea exists; this file says *how* and *when* to build it. Where the two disagree, the architecture write-up owns the concepts and this file owns the sequence.

### The phases

| # | Phase | Builds | Depends on |
| --- | --- | --- | --- |
| 0 | [Foundation](#phase-0--foundation-the-layer-contract-and-the-build-skeleton) | the layer order, entry file, minimal reset | — |
| 1 | [Tokens](#phase-1--tokens-the-value-layer) | the tiered token/value system | 0 |
| 2 | [Elements](#phase-2--elements-the-semantic-baselines) | bare semantic-tag baselines | 1 |
| 3 | [Components](#phase-3--components-named-product-patterns) | named, class-based product patterns | 1, 2 |
| 4 | [Modifiers + Behavior](#phase-4--variation-and-state-modifiers-and-behavior) | variation (tokens) and runtime state | 2, 3 |
| 5 | [Surfaces](#phase-5--surfaces-the-browser-owned-seams) | focus, selection, backdrop, popover, anchoring | 1, 3 |
| 6 | [Accessibility + Motion](#phase-6--accessibility-and-motion-hardening-cross-cutting) | reduced-motion, forced-colors, contrast (sweep) | 4, 5 |
| 7 | [Utilities](#phase-7--utilities-the-escape-hatch) | single-concern escape-hatch classes | all paint layers |
| 8 | [Theming](#phase-8--theming-variation-as-data) | mode + theme as token redeclarations | 1–7 |
| 9 | [Verification](#phase-9--verification-prove-the-contracts-hold) | automated contract checks + proof surface | all |

Jump also to the [master checklist](#the-master-checklist-at-a-glance) and the [sequencing rationale](#sequencing-rationale-why-this-order-briefly).

---

## How to read this plan

- **Phases are ordered by dependency.** A later phase assumes everything before it is in place. The riskiest, most-depended-on work (the layer order and the token contract) comes first, deliberately.
- **Each phase has:** a goal, the work broken into checkable items, the constraints it must honor, and explicit **exit criteria** that must all be true before moving on.
- **A checkbox is a contract.** `[ ]` is not done; `[x]` means it shipped *and* its exit criteria passed. Don't check a box to mean "mostly."
- **Nothing here is tied to a toolchain.** The plan works with plain CSS, a preprocessor, or a utility framework. Where a choice is open, it says so and names the trade-off rather than deciding for you.

### The browser baseline this plan assumes (verified current)

Every feature below is **Baseline / widely available** as of 2026 and is used without a polyfill. Where a feature has a known sharp edge, the relevant phase calls it out.

| Feature | Status | Used for |
| --- | --- | --- |
| Cascade layers (`@layer`) | Baseline since 2022 | the entire layering model (Phase 0) |
| Custom properties (`--var`, `var()`) | Baseline | every token (Phase 1) |
| `oklch()` color | Baseline (~95% of users, early 2026) | the color palette (Phase 1) |
| `color-mix()` | Baseline · widely available | deriving tints/shades and states (Phase 1) |
| Relative color syntax (`from`) | Baseline (CSS Color 5) | deriving variant states from one base (Phase 1) |
| `:focus-visible` | Baseline | the focus surface (Phase 5) |
| Popover API + `:popover-open` | Baseline (2025) | overlay surfaces (Phase 5) |
| `<dialog>` + `::backdrop` | Baseline since 2022 | modal surfaces (Phase 5) |
| CSS anchor positioning | Baseline (late 2025) | positioning overlays (Phase 5) |
| `@starting-style` + `interpolate-size` | Baseline | entry/exit animation (Phase 6) |
| `@scope` | Baseline (end 2025) | optional component scoping (Phase 3) |

> Provide an sRGB hex fallback immediately before any `oklch()` declaration only if a non-evergreen browser is in scope; otherwise rely on the baseline.

---

## The principles this plan is built on

These are the non-negotiables every phase serves. They are stated in full in the architecture write-up; here they are in one breath, because every checklist item traces back to one of them.

1. **The platform owns native semantics and surfaces.** Style what HTML and the browser already define; never re-invent it.
2. **Name product patterns explicitly.** A class, not a guessed structural selector, owns any pattern specific to the product.
3. **Every value flows through a token.** No literals where a token exists; a theme is just a different set of token values.
4. **Layer order makes "who wins" predictable.** Every shipped rule lives in a declared layer, so an un-layered consumer rule always wins without `!important`.
5. **CSS owns appearance; code owns timing.** They meet only at a state-class name and a transition token.

### The target layer order (locked in Phase 0, used by everything after)

```css
@layer reset, elements, components, surfaces, behavior, modifiers, utilities;
```

| Layer | Built in | Owns |
| --- | --- | --- |
| `reset` | Phase 0 | minimal normalization; yields to everything above it |
| `elements` | Phase 2 | bare semantic-tag baselines |
| `components` | Phase 3 | named, class-based product patterns |
| `surfaces` | Phase 5 | browser-rendered seams (focus, selection, backdrop, popover) |
| `behavior` | Phase 4 | state-driven rules toggled at runtime |
| `modifiers` | Phase 4 | variation axes that set tokens (variant, size, …) |
| `utilities` | Phase 7 | single-purpose, last-word one-offs |

> Tokens (Phase 1) are not a paint layer — they declare custom properties consumed by every layer. They live at the root (and under theme selectors), outside the painting layers.

> **Why this order:** layer precedence is resolved *before* specificity, so a `utilities` rule beats a `components` rule no matter how the selectors compare. `modifiers` sits just below `utilities` so a chosen variant re-colors a component, but a deliberate one-off utility still has the final say. `behavior` sits below `modifiers` because a runtime state changes the look but shouldn't outrank an explicit variant choice. Adjust names if you like — but lock the order before writing any rule, because changing it later silently re-shuffles every conflict.

---

## Phase 0 — Foundation: the layer contract and the build skeleton

**Goal.** Stand up the empty skeleton: the declared layer order, the entry file every consumer imports, and the reset layer. After this phase, nothing is styled yet — but the *structure* that every later phase plugs into exists and is proven to work.

**Why first.** The layer order is the one decision every other rule depends on. Declaring it once, up front, in a single place, is what makes the rest of the system predictable. Build it first and in isolation.

### Work

- [ ] **Declare the layer order in exactly one place** — the entry stylesheet, as the very first statement, before any rule or import: `@layer reset, elements, components, surfaces, behavior, modifiers, utilities;`
- [ ] **Create the single entry file** every consumer (app, docs, tests) imports. It declares the layer order, then pulls in each layer's source. No consumer composes the layers themselves.
- [ ] **Decide how third-party CSS enters a layer** (if any is used) — e.g. `@import url(vendor.css) layer(reset)` — so vendor styles never escape the order.
- [ ] **Build the `reset` layer** as a *minimal* normalization, wrapped in `@layer reset { … }`. Modern guidance is "intelligent baseline, not a nuke": keep the browser's useful defaults and only bridge gaps. Include at most:
  - `box-sizing: border-box` on all elements
  - remove default `margin` (then restore intentional rhythm in `elements`)
  - `img, picture, video, canvas, svg { display: block; max-width: 100% }`
  - `input, button, textarea, select { font: inherit }`
  - `h1–h6, p { overflow-wrap: break-word }`, `p { text-wrap: pretty }`, `h1–h6 { text-wrap: balance }`
  - a root stacking context if the app mounts into a known root node
- [ ] **Do not** put colors, component chrome, or design decisions in the reset. It is structure only; everything visual comes later through tokens.
- [ ] **Set up a way to see the output** — any page that imports the entry file and renders a spread of raw semantic HTML (headings, lists, a table, a form, links). This becomes the living proof surface for every later phase.

### Constraints

- Every rule the system will ever ship must live inside one of the declared layers. This phase establishes that discipline; never break it later.
- The reset is the lowest layer on purpose: it must yield to everything. If a reset rule ever needs `!important` to hold, the architecture is wrong.

### Exit criteria

- [ ] The entry file imports cleanly and the proof page renders raw HTML readably (if plainly).
- [ ] A throwaway test proves the order works: a rule placed in `utilities` overrides a conflicting rule in `reset` **with lower specificity**, and an **un-layered** rule overrides both. If either fails, the order is mis-declared — stop and fix it.
- [ ] No rule outside a layer ships from the system itself.

---

## Phase 1 — Tokens: the value layer

**Goal.** Define every value the system uses as a custom property, in a tiered structure, so that appearance is data. After this phase, no later rule ever writes a literal color, space, radius, or duration — it references a token.

**Why second.** Tokens are referenced by every painting layer. Defining them before any element or component is styled means those layers are built correctly (token-referencing) from their first line, instead of being retrofitted.

### The three tiers (the standard model)

Adopt the widely-used **primitive → semantic → component** structure. Two tiers (primitive + semantic) are enough for a simple system; add the third (component) only where a component genuinely needs to diverge.

| Tier | Holds | References | Example |
| --- | --- | --- | --- |
| **primitive** | raw values, context-free | nothing | `--blue-500: oklch(0.6 0.15 250)` · `--space-4: 1rem` |
| **semantic** | design *intent* | primitives | `--color-accent: var(--blue-500)` · `--color-text`, `--color-surface`, `--color-border` |
| **component** *(optional)* | one component's needs | semantics | `--card-padding: var(--space-4)` — lives on the component, see Phase 3 |

> Applications consume **semantic** tokens, not primitives. Primitives are the palette; semantics are the vocabulary the rest of the system speaks. The one sanctioned exception is a context that genuinely has no semantic meaning (e.g. data-visualization colors).

### Work

- [ ] **Build the primitive palette in `oklch`.** Curate a small set of named hue ramps (each hue at several lightness steps) plus a neutral/gray ramp. oklch is chosen because equal lightness steps *look* equally bright across hues — ramps stay consistent without manual tuning (the HSL problem this avoids).
- [ ] **Define the semantic color tokens** that the system actually speaks in: at minimum `--color-text`, `--color-surface`, `--color-canvas`, `--color-border`, and a set of roles (`--color-primary`, `--color-success`, `--color-warning`, `--color-danger`, plus any others the product needs). Each is an alias onto a primitive.
- [ ] **Derive state and treatment colors with `color-mix()` / relative color syntax**, not by hand-picking. From one role base, derive its hover, active, subtle-background, and disabled forms. This is what lets one base-color change ripple through every state automatically.
  - Example pattern: `--color-primary-hover: oklch(from var(--color-primary) calc(l - 0.05) c h)`
  - Mix *in oklab/oklch* so the blend is perceptually even: `color-mix(in oklab, var(--color-primary), var(--color-surface) 85%)`
- [ ] **Define the non-color scales** as primitives + semantics: spacing, radius, font-size/line-height, border-width, shadow/elevation, z-index, and motion durations.
- [ ] **Define the global "factor" knobs** (optional but recommended): a single multiplier each for density (spacing), radius (roundness), and motion. Other tokens multiply through them, so one value retunes the whole system. If the factors should *animate* across a theme change, register them with `@property` so they interpolate.
- [ ] **Decide token naming and write it down.** Pick one convention (`--{category}-{role}-{state}`, e.g. `--color-text-muted`) and apply it everywhere. The name set is a public API from this point on.

### Constraints

- **No literal values anywhere a token exists.** This rule starts here and holds for the whole rest of the build.
- **Adding a token is safe; renaming or removing one is a breaking change.** Treat the names with interface-level care.
- **Global tokens are for shared values only.** A value private to one component does not go in the global set — it lives on that component's own root (Phase 3).
- **Keep the primitive tier hidden from consumers by convention.** They reference semantics; primitives can change underneath without breaking intent.

### Exit criteria

- [ ] Every semantic color resolves to a visible swatch on the proof page, in a palette/token gallery.
- [ ] Changing a single primitive (e.g. the accent hue) visibly re-colors everything that references it, with **zero** rule edits.
- [ ] Flipping a factor knob (e.g. density) visibly retunes spacing across the proof page, with zero rule edits.
- [ ] A grep/scan of the token file finds no raw color literals in the semantic tier (only primitive references), and no later phase will introduce literals.

---

## Phase 2 — Elements: the semantic baselines

**Goal.** Make raw, classless semantic HTML look good on its own. After this phase, a document with no classes is already readable and well-proportioned, painted entirely from tokens.

**Why now.** Elements are the floor that components build on. They depend on tokens (Phase 1) and nothing else. Getting them right means the proof page — and any consumer's plain content — looks finished before a single component exists.

### Assign every element a treatment

Go through the elements you actually use and give each **exactly one** treatment. Track the assignment in a simple table or registry so it can be reviewed and so nothing is missed.

| Treatment | Meaning | What the partial does |
| --- | --- | --- |
| **styled** | real visual/interactive presence | declares its own tokens, paints a full baseline from tokens |
| **repair** | browser default needs a small fix | one or two normalizing declarations |
| **passthrough** | browser default is fine | nothing — recorded as intentionally bare |
| **non-visual** | never renders | nothing, ever |

### Work

- [ ] **List the elements in scope** and assign each a treatment. Don't style elements the product never uses.
- [ ] **Style the text and document elements** (`styled`/`repair`): headings with a real scale, paragraphs with rhythm, lists, `blockquote`, `code`/`pre`, `hr`, links with a clear non-color affordance (not color alone — an underline or similar), `table` and its parts.
- [ ] **Style the form controls** (`styled`): `button`, `input`, `select`, `textarea`, `label`, `fieldset`/`legend`. These carry the most native behavior — lean on it; don't rebuild it.
- [ ] **Style the native interactive/disclosure elements** (`styled`): `details`/`summary`, and the base look of `dialog`.
- [ ] **Style only the platform-defined relationships directly** (see constraint below): `details > summary`, `figure > figcaption`, `fieldset > legend`, `table` internals, `dl > dt/dd`, list `> li`, `select > option`.
- [ ] **Wrap every rule in `@layer elements`.**
- [ ] **Render every styled element on the proof page** so each baseline is visible and reviewable.

### Constraints

- **A baseline gives a good default; it never installs product chrome.** The moment a rule starts adding the named parts of a pattern (a "header bar," a "card edge"), it has become a component — move it to Phase 3.
- **Style a parent→child relationship only when HTML defines it.** `details > summary` is fine (the platform owns that pairing). `article > header` is *not* — that grouping is your invention and belongs to a component class.
- **Never style by ARIA.** A `[role]` or `aria-*` may be recommended on markup, but visual rules don't target it.
- **Every element that earns the `styled` treatment declares at least one of its own tokens.** This is the lightweight check that a baseline is genuinely token-driven, not hard-coded. A `styled` partial with no element-scoped token is mis-classified.

### Exit criteria

- [ ] The proof page, with **no classes anywhere**, reads as a finished, well-proportioned document.
- [ ] Every element's assigned treatment is recorded and matches what shipped.
- [ ] Flipping mode or theme (the tokens from Phase 1) re-themes every baseline correctly, with no element rule edited.
- [ ] No element baseline installs a product pattern; no rule targets ARIA; no relationship is styled that HTML doesn't define.

---

## Phase 3 — Components: named product patterns

**Goal.** Build the application's specific, reusable UI patterns as explicit classes — the things that are *not* native HTML. After this phase, the product's recurring chrome (cards, alerts, badges, and so on) exists as named, composable classes.

**Why now.** Components sit on top of element baselines and consume tokens. They are the first layer that expresses *product* identity rather than platform defaults, so they come after the platform layers are solid.

### Decide what is a component

A pattern earns a component when it has any of: named sub-parts ("slots"), product-specific chrome, an ambiguous or interchangeable host element, reuse across the app, or structure a bare element wouldn't imply. If it's none of those, it's probably an element baseline or a modifier instead.

### Work

- [ ] **Inventory the patterns** the product needs and confirm each one truly is a component (not an element baseline, not a one-off utility). Resist inventing patterns the product doesn't use yet.
- [ ] **Choose one part-naming convention and lock it** — e.g. `.card` / `.card-header` / `.card-body`, or a BEM-style `.card__header`, or a data-attribute scheme. Pick once; never mix dialects for the same concept.
- [ ] **Build each component as a class root plus its parts**, wrapped in `@layer components`. The root declares the component's *own* tokens (its private values), referencing semantic tokens.
- [ ] **Recommend a semantic host, but style by the class.** An alert is naturally `<aside role="alert" class="alert">` — the role is good for accessibility, but the `.alert` class is what paints it.
- [ ] **Make components degrade gracefully.** A missing optional part (no footer, no icon) must not break the component. Don't require a rigid nesting structure as a precondition.
- [ ] **Consider `@scope`** for components whose descendant rules risk leaking, to bound them without raising specificity. Optional; use only where it earns its keep.
- [ ] **Render each component on the proof page**, including the graceful-degradation cases (with and without optional parts).

### Constraints

- **The class owns the contract — never substitute a guessed selector** (`article > header`) for it.
- **Component-private values are component tokens on the component root**, not new entries in the global token set.
- **Lean on the browser's natural groupings.** Where a component wraps native structure (a table, a disclosure), style that structure as it exists; don't force the consumer to re-nest markup.
- **No literals; tokens only** — including the component's own tokens, which reference semantics.

### Exit criteria

- [ ] Every component renders correctly on the proof page, including its degraded (missing-optional-part) forms.
- [ ] Theme and mode flips re-skin every component with no component rule edited (because everything reads tokens).
- [ ] No component is painted via a structural-ancestry selector or an ARIA selector.
- [ ] Each component's private values live on its own root, not in the global token set.

---

## Phase 4 — Variation and state: modifiers and behavior

This phase has two halves that share a boundary: **modifiers** (static variation, set by class) and **behavior** (dynamic state, toggled by code). Build modifiers first — behavior reuses their state vocabulary.

### Phase 4a — Modifiers: variation as tokens

**Goal.** Let one element or component take on variants, sizes, and treatments through classes that *only set tokens*. After this, `.primary`, `.large`, `.subtle` work on anything whose token chain reads them — with no per-combination rules.

#### Work

- [ ] **Wire the fallback chain into elements and components first** (this is the mechanism modifiers depend on). Each styleable property reads a chain, most-specific token first: `color: var(--btn-style-color, var(--btn-variant-color, var(--color-text)))`. A bare element is neutral; a modifier that merely *sets* a chain token re-routes it.
- [ ] **Build the variant axis** — `.primary`, `.success`, `.danger`, … — each setting `--…-variant-*` context tokens (color, on-color, border) and nothing else.
- [ ] **Build the emphasis axis** — e.g. `.solid` / `.subtle` / `.outline` — each setting style-treatment tokens that sit *above* variant tokens in the chain.
- [ ] **Build the size axis** — `.small` / `.large` — setting padding/gap/font-size/radius tokens.
- [ ] **Build any portable state look** — `.disabled` / `.loading` — as token setters too, where the look is purely visual.
- [ ] **Wrap modifiers in `@layer modifiers`** (just below utilities, so a variant re-colors a component but a utility still wins).
- [ ] **Render the matrix on the proof page**: a bare element vs. the same element with combinations (`.primary.large.subtle`), and the same variant applied across different components to prove it composes.

#### Constraints

- **A modifier sets context tokens and does not know who reads them.** Never write `button.primary { background: … }` — that couples the modifier to one host and forces a rule per component. Set `--variant-*`; let the host's chain consume it.
- **A genuinely host-specific tweak is scoped to that host's root** (`table.fixed`) and kept local — never given a global modifier name that only works in one place.
- **No literals; modifiers set token values, which reference semantics.**

#### Exit criteria

- [ ] A bare element is neutral; adding `.primary` (etc.) re-colors it purely through the token chain, with no rule that names both the modifier and the host.
- [ ] The same variant class works, unmodified, across several different components.
- [ ] Combinations stack correctly (variant + size + emphasis) with no per-combination rule.

### Phase 4b — Behavior: state that changes at runtime

**Goal.** Define how dynamic states *look* in CSS, and let driving code toggle them — meeting only at a class name and a transition token. After this, panels open, items drag, controls disable, with appearance and timing cleanly separated.

#### Work

- [ ] **Settle the state-class vocabulary** — a small fixed set: `open`, `active`, `disabled`, `selected`, `dragging`, `loading`, … — and document what each means. Reuse the names across the whole system.
- [ ] **Write the look of each state in CSS**, wrapped in `@layer behavior`: e.g. `.panel:not(.open) { opacity: 0 }`, plus the transition that animates between states, timed by a motion token: `.panel { transition: opacity var(--motion) }`.
- [ ] **Define the CSS↔code handshake explicitly**: CSS owns the look of `.open`; code owns *when* `.open` is present. Nothing else crosses.
- [ ] **Write the driving code (in whatever language/framework)** to toggle classes and set attributes on existing elements only. It decides *when*, never *how it looks*.
- [ ] **Give every state class exactly one owner.** Document which piece of code writes each class.
- [ ] **Make teardown complete and idempotent.** Whatever a behavior turns on (listeners, timers, classes, attributes) it can turn off, and doing so twice is harmless.

#### Constraints

- **CSS owns appearance; code owns timing.** No colors/spacing/layout decisions in the driving code; no "when is this true" logic baked into CSS beyond reading the state class.
- **The code creates no markup the styles don't expect** — it toggles state on elements that already exist; it doesn't invent DOM for styles to chase.
- **One writer per state class.** Two independent pieces of code writing the same class is a race.
- **Always pair a transition with a reduced-motion path** (formalized in Phase 6, but honor it here): no animation without a `prefers-reduced-motion` opt-out.

#### Exit criteria

- [ ] A state change (open/close, enable/disable) animates correctly, driven by toggling a class — with appearance defined entirely in CSS.
- [ ] Restyling a transition requires no code change; changing *when* a state flips requires no CSS change.
- [ ] Tearing a behavior down removes every class, listener, timer, and attribute it added, and running teardown twice is harmless.
- [ ] Every state class has a single, documented writer.

---

## Phase 5 — Surfaces: the browser-owned seams

**Goal.** Tune the parts of the UI the *browser itself* renders — focus rings, selection, the modal backdrop, popovers — rather than rebuilding them. After this, native overlays and indicators look like the system, while keeping all the accessibility the platform gives for free.

**Why now.** Surfaces are orthogonal to components but should override generic chrome, which is why the layer sits above `components`. They depend on tokens and benefit from the components being in place to style against.

### Work

- [ ] **Focus** — style `:focus-visible` with a token-driven ring (color, width, offset). Use `:focus-visible`, not `:focus`, so the ring shows for keyboard users without firing on every mouse click. This is an accessibility surface — make it clearly visible.
- [ ] **Selection** — style `::selection` (background and text color from tokens).
- [ ] **Placeholders and markers** — style `::placeholder` and `::marker` where the defaults need tuning.
- [ ] **Scrollbars** — style scrollbars from tokens where the product wants it, with sensible cross-engine fallbacks.
- [ ] **Modal backdrop** — style `<dialog>`'s native `::backdrop`. Use the native backdrop; do not stack a hand-made overlay behind the dialog.
- [ ] **Popovers / overlays** — adopt the Popover API for non-modal overlays (menus, tooltips-as-content): `popover` + `popovertarget` give show/hide, light-dismiss, Escape, and top-layer rendering for free. Style `:popover-open` for the shown state and `::backdrop` if a backdrop is wanted.
- [ ] **Positioning** — position overlays with CSS anchor positioning (`anchor-name` / `position-anchor` / `anchor()`), with `@position-try` fallbacks so an overlay flips when it would overflow the viewport. A popover and its invoker get an implicit anchor reference — use it.
- [ ] **Wrap everything in `@layer surfaces`.**
- [ ] **Demonstrate each surface on the proof page**: a focusable control, selectable text, an open dialog with a styled backdrop, an anchored popover that flips near an edge.

### Constraints

- **Style the seam, not "the seam of a component."** A focus ring rule styles focus, not "the focus ring of a card."
- **Use the native seam; don't rebuild it.** The platform's backdrop, top layer, and focus management come with accessibility built in — replacing them with hand-rolled DOM throws that away.
- **Don't fight the platform's visibility model.** A closed popover/dialog is hidden by the UA; never add a rule that forces it visible. Keep show/hide in the platform's hands.
- **Known sharp edge — backdrop exit animation.** A `::backdrop` cannot animate on *close*: the element is removed immediately, so there is nothing left to animate out. Plan entry animation only, or animate the dialog content rather than the backdrop on exit.

### Exit criteria

- [ ] Keyboard focus shows a clear, token-styled ring via `:focus-visible`; mouse clicks don't trigger it spuriously.
- [ ] A native dialog opens with a styled backdrop and full focus-trapping/Escape behavior, with no JS reimplementing those.
- [ ] A popover opens, light-dismisses, and is positioned by anchor positioning, flipping correctly near a viewport edge.
- [ ] No surface rule infers product identity from its host, and no closed overlay is forced visible.

---

## Phase 6 — Accessibility and motion hardening (cross-cutting)

**Goal.** Make every animated or custom-painted thing respect user preferences, and add the modern niceties that need a guard. This phase sweeps *across* the layers already built rather than adding a new one.

**Why now.** It needs the animated surfaces and behaviors (Phases 4–5) to exist before it can harden them. Doing it as a dedicated pass ensures nothing is missed.

### Work

- [ ] **Reduced motion** — for every transition/animation in the system, provide a `@media (prefers-reduced-motion: reduce)` path that removes or tames it. Standardize this (a mixin/helper if the toolchain has one) so authors can't forget it. Note: `(prefers-reduced-motion)` alone evaluates as the reduce case — be explicit with `reduce`.
- [ ] **Entry/exit animation done right** — where elements animate in from `display: none` or the top layer (popovers, dialogs), use `@starting-style` for the entry state and a `transition-behavior: allow-discrete` where a discrete property (like `display`) is involved.
- [ ] **Animate to/from intrinsic sizes** where wanted (e.g. a disclosure expanding to `height: auto`) using `interpolate-size: allow-keywords`, gated under `prefers-reduced-motion: no-preference`.
- [ ] **Forced colors / high contrast** — for any surface or component that paints its own colors (especially focus rings, borders that carry meaning, custom controls), provide a `forced-colors` fallback that maps to system colors so meaning survives in high-contrast mode.
- [ ] **Color contrast** — verify text/background pairings from the token palette meet the contrast target. oklch's perceptually-uniform lightness makes this checkable by keeping a sufficient lightness gap between paired tokens.
- [ ] **Non-color affordances** — confirm meaning is never carried by color alone (links, states, variants all have a second cue).

### Constraints

- **No animation ships without a reduced-motion opt-out.** Make this structurally hard to skip.
- **No meaning carried by color alone**, anywhere.
- **Forced-colors fallbacks are required** for self-painted color, not optional polish.

### Exit criteria

- [ ] Enabling "reduce motion" at the OS level tames or removes every animation in the system.
- [ ] Popovers/dialogs animate in cleanly via `@starting-style` and don't break on exit.
- [ ] In forced-colors mode, focus rings, meaningful borders, and custom controls remain perceivable.
- [ ] Every text/background token pairing meets the contrast target, and no state/variant is distinguished by color alone.

---

## Phase 7 — Utilities: the escape hatch

**Goal.** Provide (or adopt) the small, single-purpose, highest-priority classes for genuine one-offs. After this, an author has a clean way to make a last-mile adjustment without writing a component or reaching for `!important`.

**Why last among the painting layers.** Utilities win over everything in the system, so they are built once the things they might need to override exist. They are deliberately the final word *inside* the system (an un-layered consumer rule still beats them).

### Work

- [ ] **Decide: adopt an existing utility framework, or ship a minimal in-house set.** If adopting one, let it own the `utilities` layer entirely (import it into that layer) and don't duplicate its classes with framework classes.
- [ ] **If in-house, keep utilities single-concern**: layout (`flex`, `grid`, `gap-*`), spacing one-offs, display (`hidden`), text alignment — each doing exactly one thing.
- [ ] **Wrap utilities in `@layer utilities`** so they sit at the top of the order.
- [ ] **Route utility values through tokens** where a token exists (a `gap-*` reads a spacing token), so utilities theme along with everything else.

### Constraints

- **One concern per utility.** A growing cluster of related declarations is a component, not a utility.
- **No baked-in values that should be tokens.** A one-off margin is fine; a brand color frozen into a utility is a theming leak.
- **Utilities are the escape hatch, not the default.** Reach for element/component/modifier first.
- **Don't re-create framework utilities** with your own classes if you've adopted a framework for this layer.

### Exit criteria

- [ ] A utility overrides a component's property without `!important` (proving the layer order).
- [ ] An un-layered consumer rule overrides a utility (proving the consumer-wins contract still holds at the top of the stack).
- [ ] No utility bakes in a value that should be a token.

---

## Phase 8 — Theming: variation as data

**Goal.** Prove the payoff of the token discipline: switch the whole system's look by changing token *values* under a selector — no painting rule touched. After this, mode (light/dark) and theme (palette identity) are independent, attribute-driven, and complete.

**Why now.** Theming is the validation that Phases 1–7 were built correctly. If a theme flip needs per-component rules, a token was missed — this phase surfaces that.

### The two independent axes

| Axis | Question | Hook | Default |
| --- | --- | --- | --- |
| **mode** | light or dark? | `data-mode` on the root | absent = follow the OS |
| **theme** | which palette/identity? | `data-theme` on the root | absent = base palette |

### Work

- [ ] **Build the mode axis by redeclaring tokens only.** A `[data-mode="dark"]` block (and a `@media (prefers-color-scheme: dark)` block scoped to *no explicit mode*, so OS-follow works by default) override **semantic token values** — never add component rules. Derive cross-mode values with `color-mix`/relative syntax where it helps.
- [ ] **Build the theme axis as alternative palettes**, each a `[data-theme="…"]` block that remaps semantic roles onto different primitives (and optionally dials the factor knobs). A theme is *just* a different set of token values.
- [ ] **Keep the two axes orthogonal** — any theme must work in both light and dark, because mode and theme touch different tokens.
- [ ] **Build the switch UI in driving code** (a control that sets/removes `data-mode` and `data-theme` on the root). Setting mode to "system" *removes* the attribute so CSS owns OS-follow. Persist the choice if wanted; keep persistence in code, defaults in CSS.
- [ ] **Animate factor changes** across a theme switch if desired — the `@property`-registered factors (Phase 1) interpolate.
- [ ] **Demonstrate live switching on the proof page** across every element, component, surface, and state.

### Constraints

- **Themes and modes redeclare tokens only — never add painting rules.** If a mode/theme needs a component rule, the value wasn't fully tokenized; fix the token, not the component.
- **Default by absence.** No attribute means the sensible default (OS mode, base theme), so the default path needs no script.

### Exit criteria

- [ ] Toggling `data-mode` re-themes the entire proof page (every layer) with no painting rule edited.
- [ ] Switching `data-theme` re-skins everything, and every theme works correctly in both light and dark.
- [ ] Removing both attributes falls back to OS mode + base theme with no scripting required.
- [ ] No theme/mode block contains a painting rule — only token redeclarations.

---

## Phase 9 — Verification: prove the contracts hold

**Goal.** Lock in the invariants so they can't silently rot. After this, the architecture's promises are checked, not just asserted.

**Why last.** It verifies the whole system end to end. Some checks can be stood up earlier (the layer-order proof belongs in Phase 0); this phase ensures the full set exists.

### Work

- [ ] **Layer-order checks** — automated or scripted: a `utilities` rule beats a `components` rule at lower specificity; an un-layered rule beats everything; no shipped rule lives outside a layer.
- [ ] **Token checks** — no raw color literals in semantic/component tiers; changing a primitive ripples without rule edits; every documented token name resolves.
- [ ] **Element-treatment checks** — every `styled` element declares ≥1 of its own tokens; the treatment registry matches what shipped.
- [ ] **Boundary checks** — no painting rule targets ARIA; no product pattern is painted via a structural-ancestry selector; no `modifier.host`-coupled rules.
- [ ] **Behavior checks** — every state class has one writer; teardown is idempotent and complete.
- [ ] **Theming checks** — a mode flip and a theme flip both leave painting rules untouched; every text/background pairing meets contrast.
- [ ] **Motion/contrast checks** — every transition has a reduced-motion path; self-painted color has a forced-colors fallback.
- [ ] **A living proof surface** — keep the proof page (grown across every phase) as the canonical demonstration, and treat a missing demo for a shipped feature as a defect.

### Exit criteria

- [ ] Every check above runs and passes.
- [ ] The proof page demonstrates every layer, in both modes, across at least one alternate theme.
- [ ] The invariants are enforced by a check, not by reviewer memory.

---

## The master checklist (at a glance)

A condensed pass/fail view of the whole build. Each line is "done" only when its phase's exit criteria all pass.

- [ ] **Phase 0 — Foundation.** Layer order declared once; entry file; minimal reset; order proven (utility > reset, un-layered > all).
- [ ] **Phase 1 — Tokens.** Primitive/semantic (+ optional component) tiers; oklch palette; states derived via color-mix/relative syntax; non-color scales; factor knobs; naming locked; no literals.
- [ ] **Phase 2 — Elements.** Every element assigned a treatment; classless HTML reads as finished; styled elements declare own tokens; only platform relationships styled directly; no ARIA targeting.
- [ ] **Phase 3 — Components.** Real product patterns as classes; one part-naming convention; component-private tokens on the root; graceful degradation; class owns the contract.
- [ ] **Phase 4a — Modifiers.** Fallback chains wired; variant/emphasis/size/state axes set tokens only; compose across components; no `modifier.host` coupling.
- [ ] **Phase 4b — Behavior.** State vocabulary settled; CSS owns look, code owns timing; one writer per class; idempotent teardown.
- [ ] **Phase 5 — Surfaces.** `:focus-visible` ring; native dialog/`::backdrop`; Popover API; anchor positioning with flip fallbacks; seam-not-host; visibility left to the platform.
- [ ] **Phase 6 — Accessibility & motion.** Reduced-motion path everywhere; `@starting-style` entry; forced-colors fallbacks; contrast met; no color-only meaning.
- [ ] **Phase 7 — Utilities.** Single-concern escape-hatch classes (or adopted framework) in the top layer; values via tokens; consumer-wins still holds above them.
- [ ] **Phase 8 — Theming.** Mode and theme as independent, attribute-driven token redeclarations; default by absence; live switch; no painting rules in theme blocks.
- [ ] **Phase 9 — Verification.** Every contract checked automatically; living proof surface; invariants enforced, not remembered.

---

## Sequencing rationale (why this order, briefly)

The build climbs from the most foundational and most-depended-on to the most dependent:

```
0 Foundation ──▶ 1 Tokens ──▶ 2 Elements ──▶ 3 Components ──▶ 4 Modifiers+Behavior
                                                                      │
                                  ┌───────────────────────────────────┘
                                  ▼
                            5 Surfaces ──▶ 6 A11y+Motion ──▶ 7 Utilities ──▶ 8 Theming ──▶ 9 Verify
```

- **0 and 1 are the contracts** everything else assumes (the layer order, the token values). They go first, in isolation, because changing either one later re-shuffles everything.
- **2 → 3** is platform-then-product: bare elements look good first, then product patterns build on them.
- **4** adds variation and state once there's something to vary.
- **5** tunes the browser's own surfaces, sitting above components in the cascade.
- **6** is a hardening sweep that needs the animated things (4–5) to already exist.
- **7** is the escape hatch, built once the things it might override exist.
- **8** is the validation of the token discipline; **9** locks every contract so it can't rot.

Build one phase, pass its exit criteria, then start the next. The proof surface grows with every phase and is the single best signal that the system is coherent.
