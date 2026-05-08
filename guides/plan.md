# Implementation Plan & Status

> Living tracker of what's built, what's next, and what's deferred. Update with every meaningful change. The companion guides ([styles.md](styles.md), [tokens.md](tokens.md), [modifiers.md](modifiers.md), [mixins.md](mixins.md), [elements.md](elements.md), [components.md](components.md), [surfaces.md](surfaces.md)) describe the architecture; this file tracks how much of it has actually shipped.

The architectural plan-of-record lives at `~/.claude/plans/i-want-to-make-nifty-quill.md`. This file mirrors its current state of execution.

---

## Foundation phase — complete

| Concern                                                                                                                             | Status | File(s)                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tailwind v4 dependency + Vite plugin                                                                                                | ✅     | [package.json](../package.json), [vite.config.ts](../vite.config.ts)                                                                                   |
| `@layer` order declared (`theme, base, elements, components, surfaces, modifiers, utilities`)                                       | ✅     | [tests/setup.css](../tests/setup.css), [app/browser/styles/main.scss](../app/browser/styles/main.scss)                                                 |
| Token surface (`--set-*` + `@theme` variants)                                                                                       | ✅     | [src/styles/\_tokens.scss](../src/styles/_tokens.scss), [src/styles/\_theme.scss](../src/styles/_theme.scss)                                           |
| Mixins registry (`reduced-motion`, `transition`, `focus-ring`, `$variants`/`$sizes`/`$shapes`/`$styles`/`$states`)                  | ✅     | [src/styles/\_mixins.scss](../src/styles/_mixins.scss)                                                                                                 |
| Modifier system — four dimensions (variant / size / style / state)                                                                  | ✅     | [src/styles/modifiers/](../src/styles/modifiers/)                                                                                                      |
| Element baseline — button                                                                                                           | ✅     | [src/styles/elements/\_button.scss](../src/styles/elements/_button.scss)                                                                               |
| Element baseline — anchor                                                                                                           | ✅     | [src/styles/elements/\_a.scss](../src/styles/elements/_a.scss)                                                                                         |
| Element baseline — input                                                                                                            | ✅     | [src/styles/elements/\_input.scss](../src/styles/elements/_input.scss)                                                                                 |
| Element baseline — textarea                                                                                                         | ✅     | [src/styles/elements/\_textarea.scss](../src/styles/elements/_textarea.scss)                                                                           |
| Element baseline — select                                                                                                           | ✅     | [src/styles/elements/\_select.scss](../src/styles/elements/_select.scss)                                                                               |
| Element baseline — dialog (+ `::backdrop` surface)                                                                                  | ✅     | [src/styles/elements/\_dialog.scss](../src/styles/elements/_dialog.scss), [src/styles/surfaces/\_backdrop.scss](../src/styles/surfaces/_backdrop.scss) |
| Element baseline — table & friends                                                                                                  | ✅     | [src/styles/elements/\_table.scss](../src/styles/elements/_table.scss)                                                                                 |
| Empty barrels for `components/` and `surfaces/`                                                                                     | ✅     | [src/styles/components/index.scss](../src/styles/components/index.scss), [src/styles/surfaces/index.scss](../src/styles/surfaces/index.scss)           |
| TS contract layer (4 files)                                                                                                         | ✅     | [src/browser/](../src/browser/)                                                                                                                        |
| Bidirectional parity tests (tokens, modifiers, elements, events)                                                                    | ✅     | merged into [tests/src/browser/](../tests/src/browser/) shape tests — one test file per surface                                                        |
| Modifier behavior tests                                                                                                             | ✅     | [tests/src/styles/modifiers/](../tests/src/styles/modifiers/)                                                                                          |
| Button cascade tests                                                                                                                | ✅     | [tests/src/styles/elements/\_button.test.ts](../tests/src/styles/elements/_button.test.ts)                                                             |
| Tailwind interop test                                                                                                               | ✅     | [tests/src/styles/integration.test.ts](../tests/src/styles/integration.test.ts)                                                                        |
| Showcase app — HomePage placeholder, ButtonPage / AnchorPage / InputPage / TextareaPage / SelectPage / DialogPage / TablePage demos | ✅     | [app/browser/pages/](../app/browser/pages/)                                                                                                            |

**Verification (run `npm test && npm run check` to reproduce):**

- 303/303 tests pass across `src:core`, `src:browser`, `src:styles`, `app:core`, `app:browser`.
- 0 oxlint warnings/errors.
- 0 vue-tsc errors.

---

## Next-up — element coverage

The five planned modifier-shaped elements (`<input>`, `<select>`, `<textarea>`, `<dialog>` + `::backdrop`, `<table>` & friends) are all up. The same modifier cascade that works on `<button>` works on any element that consumes the context-token chain — bringing up additional elements means refactoring its `_{tag}.scss` to use the cascade, adding the tag to [`src/browser/elements.ts`](../src/browser/elements.ts), and writing its element test.

The 80+ remaining elements are tracked as **pure-reset** in [elements.md](elements.md) and don't warrant individual planning slots — most need only a UA-normalization comment. The checklist there is the single source of truth for status.

---

## Deferred / later

Items the foundation-phase deliberately doesn't include. Each becomes its own plan when its time comes.

- **Composables** (`useVariant`, `useSize`, `usePopover`, `useDialog`, …). [`src/browser/events.ts`](../src/browser/events.ts) ships empty with the naming convention locked in (`elements:{source}:{verb}` + a fixed lifecycle vocabulary). First composable is what makes that surface non-trivial.
- **Components** — composed widgets (card, alert, modal, dropdown, …). Folder + barrel exist; no entries yet. Convention is documented in [components.md](components.md).
- **Surfaces** — `[popover]`, `::backdrop`, `::placeholder`, `::marker`, view transitions, scroll-driven animations. Folder + barrel exist; no entries yet. Catalog of candidate Chromium-shipped surfaces lives in [surfaces.md](surfaces.md).
- **Theming beyond default** — additional `[data-theme="…"]` blocks or `[data-core="…"]` palettes. The `--color-*` and `--set-*` namespaces are theme-friendly today; specific themes are content, not architecture.
- **Distribution polish** — published-package guidance for consumers in [styles.md](styles.md) §Distribution remains a sketch until we publish a real version.
- **`@source` ergonomics** — Tailwind v4's tree-shake means scale tokens like `--text-sm` and `--radius-lg` aren't on `:root` unless their utility class is generated. Modifier files currently use rem literals (see [tokens.md](tokens.md) §"Tailwind tree-shake"). Worth revisiting if Tailwind ships a `@theme static` opt-out.

---

## Update protocol

Every commit that materially advances the framework updates **two** places:

1. The matching guide (token surface change → `tokens.md`; new element → `elements.md`; new mixin → `mixins.md`; etc.).
2. This file's tables, so the at-a-glance status is current.

Don't wait for a "doc pass" — out-of-date status is worse than missing status.
