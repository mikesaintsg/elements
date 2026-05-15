# Showcase

> The framework's living documentation. [`app/browser/`](../app/browser/) builds + serves a Vue 3 SPA that demonstrates every shipped surface, doubles as an interactive smoke test, and ENFORCES the framework's authoring contract by example. Every page is hand-authored markup that a consumer could copy verbatim. Drift between the showcase and the framework is the framework's bug.

## Surface

The showcase is the framework's mirror — a consumer-side app that uses _only_ the framework's public API to build a 43-page documentation experience. It lives under [`app/browser/`](../app/browser/) as a self-contained SPA:

| Path                                                                    | Role                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`app/browser/index.html`](../app/browser/index.html)                   | Shell with the cache-defeat meta tags + inline-SVG favicon.                                              |
| [`app/browser/main.ts`](../app/browser/main.ts)                         | Entry. Imports `styles/main.css` (cascade-layer order + Tailwind + framework SCSS) and mounts `App.vue`. |
| [`app/browser/App.vue`](../app/browser/App.vue)                         | The shell: `<header>`, `<nav>` rail, `<main>` scroller, `<aside>` TOC, `<footer>`.                       |
| [`app/browser/router.ts`](../app/browser/router.ts)                     | Hash-based router + route catalog (one entry per page, grouped per `ROUTE_GROUPS`).                      |
| [`app/browser/types.ts`](../app/browser/types.ts)                       | `Route` / `RouteGroup` / `Group` / `Section` types + `ROUTE_GROUPS` canonical order.                     |
| [`app/browser/env.d.ts`](../app/browser/env.d.ts)                       | `__BUILD_ID__` declaration + `*.vue` module shim for IDEs.                                               |
| [`app/browser/pages/`](../app/browser/pages/)                           | 43 `*.vue` page files. One per surface area; bundled where the surface naturally groups.                 |
| [`app/browser/styles/main.css`](../app/browser/styles/main.css)         | Single CSS entry — declares `@layer`, imports Tailwind, imports the framework SCSS, sets `@source`.      |
| [`app/browser/styles/showcase.css`](../app/browser/styles/showcase.css) | Showcase-specific chrome. The only file in the showcase that authors CSS classes.                        |

### Route groups

[`ROUTE_GROUPS`](../app/browser/types.ts) declares the canonical sidebar order. Mirrors the framework topology:

| Group                           | Mirrors                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Getting started`               | Home (showcase entry point).                                                                   |
| `Foundations`                   | [tokens.md](tokens.md) + [modifiers.md](modifiers.md). Token palette, theme, modifier cascade. |
| `Elements — Interactive`        | [elements.md](elements.md) interactive ✅ cascade rows.                                        |
| `Elements — Content`            | [elements.md](elements.md) content ✅ cascade rows.                                            |
| `Components`                    | [components.md](components.md) shipped catalog.                                                |
| `Surfaces`                      | [surfaces.md](surfaces.md) shipped surfaces.                                                   |
| `Composables — Element-bound`   | [composables.md § Naming bucket 1](composables.md).                                            |
| `Composables — Attribute-bound` | [composables.md § Naming bucket 2](composables.md).                                            |
| `Composables — Primitives`      | [composables.md § Naming bucket 3](composables.md).                                            |

---

## Contract

These invariants hold across `app/browser/` ↔ `src/styles/` ↔ `src/browser/` ↔ this guide:

1. **Framework-first authoring.** Every page reaches for the most-semantic option in this priority order:
   1. **Bare HTML element.** `<article>` for cards, `<aside>` for sidebars, `<dialog>` for modals, `<menu>` for toolbars, `<details>` for disclosures, `<output popover>` for toasts. The framework's element baselines paint the chrome.
   2. **Framework modifier.** `.primary`, `.large`, `.subtle`, `.disabled`, `.top`, `.flush`, etc.
   3. **Element-local modifier.** `form.row`, `button.dropdown`, `details.flush`, `article.frame`.
   4. **Tailwind utility.** `flex-1`, `text-xs`, `font-mono`, `sr-only` — when the framework + element-local options don't cover a layout one-off.
   5. **Showcase custom class** in [`app/browser/styles/showcase.css`](../app/browser/styles/showcase.css). LAST RESORT. Every entry carries a one-paragraph comment explaining why no framework-side option fits.

2. **No inline styles for layout or chrome.** No `style="…"` attribute in `app/browser/pages/*.vue` for anything except:
   - Reactive `:style` bindings driving live state (e.g. `:style="{ '--icon': iconRef }"`).
   - Single-property dimensional one-offs (`style="width: 18ch"` — only when off Tailwind's scale).
   - Token demonstrations (`style="--icon: var(--set-icon-plus)"`, swatch `style="background-color: var(--color-primary)"`).

3. **Showcase logic stays in the showcase.** No file in `app/browser/` ever modifies anything under `src/styles/` or `src/browser/`. The showcase consumes the framework; it never extends it. New framework features are authored framework-side first, parity-tested, then demonstrated in the showcase.

4. **Showcase classes are namespaced.** Every class authored in `showcase.css` starts with `.showcase-` (e.g. `.showcase-sidebar`, `.showcase-tile-grid`, `.showcase-stat-value`). The namespace makes the boundary visible: a `.showcase-*` selector in a page file signals "this layout is showcase-only — a consumer copying the markup would substitute their own class here."

5. **Pages mirror the framework's example markup.** Each page demonstrates the canonical markup pattern a consumer would write. Avoid Vue-specific scaffolding that obscures the underlying HTML — `v-for` over a typed array is fine; deeply-nested component composition that hides the actual element tree is not.

6. **Route groups follow `ROUTE_GROUPS`.** Every route in `router.ts` carries a `group: RouteGroup` value from the canonical list in `types.ts`. The TypeScript type rejects misclassified groups at compile time.

7. **One showcase page per shipped surface area.** Every entry in `elements.ts` is represented (sometimes bundled into a family page — `HeadingsPage` covers `<h1>`–`<h6>`); every component in `COMPONENT_CONTRACTS` has a demonstration; every surface in `SURFACE_CONTRACTS` is exercised; every factory in `src/browser/factories/` has a `Use{Name}Page` (or is bundled into a shared page like `UseThemeButtonPage`).

These are codified for tests/app/browser/\* parity work — a future driver can iterate `ROUTE_GROUPS`, `COMPONENT_CONTRACTS`, `SURFACE_CONTRACTS`, and `readFactorySources()` to verify symmetry between what the framework ships and what the showcase demonstrates.

---

## Patterns

### The five-step authoring triage

Every time a page needs to express a layout / chrome decision, walk this triage before reaching for the next step down:

1. **Is there a semantic HTML element for this?** — `<article>` for cards, `<details>` for disclosures, `<output popover>` for toasts. Use the element. The framework baseline paints the chrome.
2. **Is there a framework modifier?** — `.primary`, `.large`, `.subtle`, `.disabled`, `.flush`. Combine with the element.
3. **Is there an element-local modifier?** — `form.row` for inline form layout, `article.frame` for edge-to-edge child fill, `details.flush` for accordion-item shape.
4. **Is there a Tailwind utility?** — for one-off layout / typography one or two pages away from a framework feature. Stay on Tailwind's scale.
5. **Is the pattern repeated 3+ times across pages, OR genuinely showcase-only chrome?** — author a `.showcase-*` class in `showcase.css` with a one-paragraph rationale comment.

Skipping a step always indicates a missed framework opportunity. If the answer to step 1 is "no" frequently, the framework is probably missing a primitive.

### When `.showcase-*` is the right answer

A custom class is justified when ALL of these hold:

- The pattern is showcase-specific (not framework-universal — would not benefit other consumers).
- The pattern repeats across multiple pages (extracting prevents drift).
- No combination of element + modifier + Tailwind utility composes cleanly to express it.

Examples that earned their place:

- `.showcase-sidebar` / `.showcase-sidebar-region` / `.showcase-sidebar-scroll` — the COMPOSED-MODE sidebar shape (pinned filter + scrolling list). The framework's default nav-rail is single-scroller; the showcase's docs-style sidebar is a consumer composition.
- `.showcase-tile-grid` — the equal-tile grid used across `AnchorPage`, `ButtonPage`, etc. Parameterized via custom properties for per-instance tuning.
- `.showcase-form-row` / `.showcase-form-row-label` / `.showcase-form-row-input` — the label-cell + input-cell row pattern used inside `FormControlsPage`'s flush form demo.
- `.showcase-stat-label` / `.showcase-stat-value` / `.showcase-stat-delta` — typography roles for the stat-card pattern.

Examples that would NOT be justified:

- `.showcase-card` (already `<article>`).
- `.showcase-modal` (already `<dialog>`).
- `.showcase-primary-button` (already `<button class="primary">`).
- Per-page one-offs that don't repeat across pages — those go inline as Tailwind utilities or, when truly one-off and dimensional, an `<element style="single-property: value">` (step 4 escape hatch).

### Adding a new showcase page

1. **Identify the surface area.** Which framework artifact does this page demonstrate? A factory in `src/browser/factories/`? A component partial? A surface? The page name follows: `UseDialogPage.vue` for `createDialog`, `ButtonPage.vue` for `<button>`, `PopoverSurfacesPage.vue` for the popover surface family.
2. **Pick the `RouteGroup`.** Choose from [`ROUTE_GROUPS`](../app/browser/types.ts). TypeScript will reject misspellings.
3. **Write the page using bare elements first.** Markup that a consumer could copy. Reach down the triage only as needed.
4. **Add the route to `router.ts`.** Import the page, declare the `Route` constant under the matching section banner, push onto the `routes` array.
5. **No inline styles for layout/chrome.** Walk the triage. If a recurring pattern emerges, extract to `showcase.css`.
6. **Smoke-test in dev.** `npm run dev`, visit the new route, walk every interactive surface. Verify variant / size / style modifiers compose. Test with `data-theme="dark"`. Test with `prefers-reduced-motion`.
7. **Document the row.** Add to the [Shipped pages catalog](#shipped-pages) below.

### Sidebar + TOC

The shell consists of:

- A `<nav>` rail (left) — composed-mode sidebar with three regions: drawer header band (mobile only), pinned filter (`<search>`), scrolling route list (`<details><summary><h6>{group}</h6></summary><menu><li><a>` per group).
- A `<main>` scroller — the active page.
- An `<aside>` rail (right) — TOC built from `<section[id]>` / `<h2[id]>` / `<h3[id]>` descendants of the page, tracked by `IntersectionObserver` for `aria-current="location"`.
- A `<header>` band and `<footer>` band — top app bar with theme toggle + nav/TOC toggles, bottom build-id strip.

**Sidebar groups are collapsible.** Each `RouteGroup` wraps its routes in a `<details class="flush" open>` so users can collapse the sections they're not currently interested in. The framework's `<details>` baseline paints the disclosure marker + cursor + animation; `.flush` strips the outer card chrome (border, radius, padding) so the disclosure sits inline with the rail's typography. State management:

- All groups start open on first load (initial discoverability).
- User manually collapses via summary click (native, no JS).
- On route change, `App.vue` ensures the active group's `<details>` carries `open` — auto-expand for direct navigation but never auto-collapse a user-collapsed group elsewhere.

**Mobile drawer pattern.** Below 960px, both rails opt into native popover mode via a `:popover="isMobile ? 'auto' : undefined"` binding. The framework's `:is(aside, nav)[popover]` drawer chrome (slide-from-edge, `::backdrop` scrim, Esc + click-out dismiss) handles the mobile experience uniformly with the `AsidePage` offcanvas demos.

### Theme + keyboard

- The header's theme toggle calls `useTheme().toggle()` — the framework's `data-theme` attribute drives light / dark / system flips.
- `/` keyboard shortcut focuses the sidebar filter (skipped if another input is focused).
- The framework's native popover API handles Esc-to-close on rail drawers; no JS Escape handling needed.

---

## Tests

The `tests/app/browser/` test project is queued; once it ships, the contract above is parity-tested. Planned coverage:

- **Route catalog parity** — every route's `group` is in `ROUTE_GROUPS`; every route id + title is unique; routes-per-group is non-empty.
- **Factory ↔ page pairing** — every `src/browser/factories/create{Name}.ts` resolves to a `Use{Name}Page.vue` OR appears in a documented bundled-pages allow-list.
- **Element ↔ page pairing** — every `elements.ts` key has a representation in some Element page (Element-Interactive or Element-Content group).
- **Component ↔ page pairing** — every `COMPONENT_CONTRACTS` entry appears in a Component or Surface page.
- **No inline-style violations** — `app/browser/pages/*.vue` MUST NOT carry `style="…"` for layout/chrome. Reactive `:style` bindings + dimensional one-offs + token demonstrations exempt per [Contract](#contract) §2.
- **Showcase class namespace** — every class authored in `showcase.css` starts with `.showcase-`.

These tests share the same setup-file stack as the guides project (`tests/setup.ts` + `tests/setupServer.ts`) — they're pure node-env introspection over the page source + framework registries.

---

## See also

- [contribute.md](contribute.md) — the framework workflow document; §5 covers showcase-page authoring procedure.
- [styles.md](styles.md) — cascade-layer order + the `@layer` order the showcase's `main.css` declares.
- [tokens.md](tokens.md) — the token palette the showcase consumes; `ThemePage` + `TokensPage` demonstrate.
- [modifiers.md](modifiers.md) — the modifier cascade; `ModifiersPage` + `PlacementsPage` demonstrate.
- [elements.md](elements.md) — the element catalog; every substantive entry has a page.
- [components.md](components.md) — the component catalog; every entry has a page.
- [surfaces.md](surfaces.md) — the surface catalog; bundled into three pages.
- [composables.md](composables.md) — the composable catalog; every factory has a `Use*Page`.
- [patterns.md](patterns.md) — the contract registries the future `tests/app/browser/` parity work iterates.
- [ROADMAP.md](../ROADMAP.md) — Phase 9 showcase work, including the collapsible-sidebar entry (§9.1) this guide formalizes.
