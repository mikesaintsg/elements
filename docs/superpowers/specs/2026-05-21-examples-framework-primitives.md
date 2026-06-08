# Spec — framework primitives to make the examples Tailwind-free / inline-free

> Goal: the example pages should be expressible with **only** framework elements
>
> - modifiers — no Tailwind utilities, no inline `style`, no inline tokens, no
>   scoped CSS. This document catalogs every non-framework dependency the eight
>   examples currently use, proposes the framework primitives needed to replace
>   them, and flags the architectural decision the effort forces.

Status: **planning** (no code yet). Decision required — see §5.

---

## 1. Why this is bigger than it looks

The framework is explicitly layered **on top of Tailwind v4** (AGENTS §21):
Tailwind owns the palette, the spacing/size/radius scales, the reset, and the
**utility classes**; the framework owns element baselines, semantic modifiers,
composed components, a handful of layout primitives (`stack` / `cluster` /
`tiles` / `frame`), and atoms (`badge` / `avatar` / `tag` / `dot` / `spinner`).

Two of the framework's own anti-patterns (AGENTS §21.11) are directly in
tension with "no Tailwind in the examples":

- **"Never redeclare a Tailwind-owned token."**
- **"Never invent a modifier class name that clashes with a Tailwind utility."**
  (`.grid`, `.flex`, `.hidden`, `.truncate`, `.w-full`, `.rounded`, … are on the
  collision watch list in `tests/setupStyles.ts` and fail
  `tests/guides/modifiers.test.ts`.)

So replacing Tailwind in the examples cannot mean re-shipping Tailwind's
utilities under the same names. Any new primitive needs a **non-colliding name**
and must earn its place as a _semantic_ framework concept, not a raw utility
alias. That constrains how much of the catalog below can be cleanly absorbed.

---

## 2. Catalog — every non-framework dependency (8 examples)

### 2.1 Inline styles

| Concern            | Inline form                                       | Count         | Framework-domain?                    |
| ------------------ | ------------------------------------------------- | ------------- | ------------------------------------ |
| Icon glyph         | `style="--icon: var(--set-icon-X)"`               | ~40           | **Yes** — icons are framework tokens |
| Muted text         | `style="color: var(--color-text-subtle)"`         | 36            | **Yes** — framework owns the color   |
| Variant text       | `style="color: var(--color-primary)"`, `…success` | 2             | **Yes** — framework owns the color   |
| Tiles tuning       | `style="--set-tiles-min: 18rem"`                  | 2             | Sanctioned token API (debatable)     |
| Bar height (chart) | `style="height: N%"`                              | ~24 (Console) | Data-driven; legitimately inline     |
| Drag cursor        | `style="cursor: grab"`                            | 1             | Could be a `useDrag` affordance      |
| Nudge              | `style="margin-block-start: …"`                   | 1             | Restructure away                     |

### 2.2 Tailwind utility classes (by concern)

| Bucket                | Utilities seen                                                                                                                                                                            | Frequency | Framework equivalent today                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| **Flex layout**       | `flex`, `flex-col`, `flex-nowrap`, `flex-wrap`, `flex-1`, `items-center/start/end/baseline`, `justify-between/center/end`, `gap-1/2/3/4/6/8`, `ms-auto`, `mt-auto`, `my-auto`, `shrink-0` | very high | partial — `cluster`/`stack`/`frame` bake some defaults; **no** fine control                         |
| **Grid layout**       | `grid`, `grid-cols-1/2`, `sm/lg/xl:grid-cols-*`, `lg:grid-cols-[22rem_minmax(0,1fr)]`, `gap-x/y-*`                                                                                        | high      | `tiles` (auto-fit only) — **no** fixed columns / asymmetric splits                                  |
| **Width / size**      | `w-full` (32!), `w-72`, `max-w-md/lg`, `min-w-0`, `h-40`, `lg:h-full`, `lg:max-h-[…]`                                                                                                     | high      | form controls full-width; `nav.fill` — **no** general width/height                                  |
| **Responsive**        | `sm: md: lg: xl:` on flex/grid/hidden/inline/overflow/sticky/top                                                                                                                          | pervasive | **none** (deferred to Tailwind by design)                                                           |
| **Typography**        | `text-center/start`, `text-xs…5xl`, `uppercase`, `tracking-wide`, `leading-tight`, `m-0`, `text-balance`                                                                                  | high      | heading scale only; **no** utility type/transform/margin                                            |
| **Overflow/position** | `overflow-x-auto`, `lg:overflow-y-auto`, `lg:overflow-hidden`, `lg:sticky`, `lg:top-0`, `lg:self-start`                                                                                   | medium    | `scrollable` (overflow only)                                                                        |
| **Misc**              | `no-underline`, `list-none`, `truncate`, `sr-only`, `rounded-t-sm`                                                                                                                        | medium    | `.flat`/`.flush` drop underline; `menu` resets lists; `truncate` mixin exists (class name collides) |

---

## 3. Proposed framework primitives

Grouped by how cleanly they fit the framework's identity. Names are **proposals**
— each must be checked against `TAILWIND_SINGLE_TOKEN_UTILITIES` before use.

### 3.1 Tier A — clearly framework-domain (build these)

1. **Named icon classes** — `<i class="icon close">` / `icon plus` / `icon menu` …
   Generate one bare class per `--set-icon-*` token (the icon set is closed, ~24
   glyphs). Each sets `--icon: var(--set-icon-{name})` internally. Kills ~40
   inline tokens. Parity: add an `icons` tree to a TS mirror + a parity test that
   every `--set-icon-*` has a class and vice-versa. Dynamic usage becomes
   `:class="\`icon ${item.icon}\`"`.
   - Risk: glyph names colliding with modifiers (`close`, `plus`, `menu`,
     `success`, `warning`, `danger`, `information`, `check`, `sort`, `filter`,
     `system`, `more`, `external`, `sun`, `moon`, `search`). **`success` /
     `warning` / `danger` / `information` collide with variant classes.** Resolve
     by scoping icon classes to `i.icon.{name}` (compound, element-local) so they
     don't collide with bare variant classes — like the `_local.scss` charter.

2. **Text-tone modifier** — `.muted` (subtle/secondary text). Sets
   `color: var(--color-text-subtle)`. Cross-cutting text color → most naturally a
   new small atom or an element-local set. Kills 36 inline colors. Confirm
   `.muted` is not on the Tailwind watch list (it is not a default Tailwind
   utility).

3. **Variant text tone** — for `color: var(--color-primary)` etc. Either reuse
   the variant on-canvas tier via a tone modifier, or `.accent`. Low count (2);
   may fold into Tier A item 2's mechanism.

### 3.2 Tier B — semantic layout the framework can legitimately own

4. **Split / pane primitive** — `div.split` (or `div.panes`): a two-track layout
   for sidebar+content and list+reading (the in-`main` splits the body-shell
   doesn't cover). Tokened ratio (`--set-split-aside-size`) + a single-column
   collapse below a tokened breakpoint via container query (so it is responsive
   **without** Tailwind `lg:` prefixes). Replaces the `grid-cols-[22rem_…]` +
   `lg:` usages in Mail / Editorial / Console.

5. **Cluster/stack alignment + gap controls** — extend the existing primitives
   with tokened conveniences instead of raw `items-center`/`justify-between`/
   `gap-N`: e.g. `cluster` already centers cross-axis; add `div.cluster.between`
   (space-between), `div.cluster.tight`/`.loose` (gap steps) via element-local
   modifiers. Replaces most `items-center` + `justify-between` + `gap-*`.

6. **Fill / span** — `.fill` generalized (currently nav-only) to mean
   "inline-size: 100%" for buttons/inputs in a stack; and a `.grow` for `flex-1`.
   Replaces `w-full` (32×) + `flex-1` (20×). Names must dodge the watch list
   (`w-full` is Tailwind; `.fill` / `.grow` are not).

### 3.3 Tier C — would re-implement Tailwind (recommend NOT building)

- Responsive breakpoint prefixes, the type scale (`text-xs…5xl`), `uppercase` /
  `tracking` / `leading`, arbitrary `gap-N` / `max-w-*` / heights, `m-0`.
  Re-deriving these under alias names is precisely the anti-pattern AGENTS
  §21.11 forbids and would fork Tailwind badly. `m-0` is usually **redundant**
  (the reset already zeroes margins) and can simply be deleted. `text-center`
  has no clean semantic home; `sr-only` collides with Tailwind and is an
  accessibility utility better left to Tailwind.

---

## 4. Phasing

- **Phase 1 (Tier A):** named icon classes + `.muted` text tone. Removes ~78 of
  the inline-style occurrences. Self-contained, parity-testable, clearly
  framework. Rewrite examples to drop those inline styles.
- **Phase 2 (Tier B):** `div.split` + cluster/stack alignment modifiers + `.fill`
  / `.grow`. Removes the bulk of the flex/grid/width Tailwind. Container-query
  responsiveness replaces `lg:` splits.
- **Phase 3 (decision):** decide the boundary for Tier C. Recommended: **keep
  Tailwind for raw typography/spacing/responsive** OR accept simplified,
  less-responsive examples. Re-implementing Tailwind is not recommended.

Each phase: types/tokens first → SCSS → `tokens.ts`/mirror parity → guide → tests
(`npm run check` + targeted) → rewrite the relevant example slices → visual
verify desktop + mobile → commit.

---

## 5. Decision required

Tier A + Tier B are buildable and genuinely framework-domain. **Tier C is the
open question**: fully eliminating Tailwind means re-implementing its
typography/spacing/responsive utilities under non-colliding names, which the
framework's own charter forbids and which forks Tailwind.

Recommended boundary (clean, not a hack): **build Tier A + B; for Tier C, either
keep a documented Tailwind-layout exception or accept simplified examples** —
rather than re-deriving Tailwind. Confirm the boundary before Phase 1 so the
example rewrite targets a stable vocabulary.
