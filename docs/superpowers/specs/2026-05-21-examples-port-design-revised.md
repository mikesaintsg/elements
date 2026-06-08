# Examples port — lessons learned, revised pattern

**Date:** 2026-05-21
**Status:** approved (revises 2026-05-20-examples-port-design.md after the Dashboard slice landed)
**Supersedes (in pattern):** the original spec's architecture for examples — the body-shell-sibling restructure replaces the original `.examples-stage` wrapper approach.
**Next:** plan + implementation for Mail / Marketing / Auth / CRM.

## What the Dashboard slice taught us

The original spec assumed an example would be a self-contained component rendered inside App.vue's `<main>` scroller, with its own internal grid layout. That landed and worked, but it forced ~370 lines of scoped CSS in `DashboardExample.vue` replicating the framework's body-shell chrome — sidebar inline-size, drawer popover mode, nav-rail menu chrome, header band, main padding. The framework's chrome selectors are all of the form `body:has(main) > nav` or `body:has(main) > * > nav`; a deeply-nested `<nav>` inside `.dashboard-shell > .examples-stage > main > #app > body` doesn't match.

After restructuring so the example's `<nav>`, `<header>`, `<main>` render as Vue-fragment siblings (no wrapping element) at body-shell position (effective grandchildren of `<body>` via `#app`'s `display: contents`), the framework chrome paints automatically and the scoped CSS shrinks to ~140 lines covering only genuinely app-specific glue (initials marks, stat typography, SVG chart fill, timeline rail).

This is the pattern every remaining example follows.

## Revised architecture

### File shape (unchanged from original spec)

```
app/browser/examples/
  examples.ts                 # readonly metadata registry: id, title, tagline, icon
  ExamplesShell.vue           # toolbar + view-source dialog; shared by every example
  <Name>Example.vue           # the example app
  <Name>ExamplePage.vue       # thin: wraps <Name>Example in ExamplesShell with ?raw source

tests/app/browser/examples/
  <Name>ExamplePage.test.ts   # page-level render smoke + landmark asserts
  <Name>Example.test.ts       # example-specific framework-usage asserts
```

### Body-shell sibling pattern (the load-bearing change)

**App.vue** renders example routes WITHOUT its docs `<main>` wrapper:

```vue
<main v-if="!isExample" ref="scrollerRef">
  <component :is="page" />
</main>
<component v-else :is="page" />
```

**ExamplesShell.vue** uses a Vue fragment (no wrapping element) so the slotted example's siblings sit at the same level as its toolbar + dialog:

```vue
<template>
	<slot />
	<menu class="examples-toolbar" role="toolbar">…</menu>
	<Teleport to="body"><dialog>…</dialog></Teleport>
</template>
```

**Example components** render their body-shell elements as a Vue fragment:

```vue
<template>
	<nav
		id="<example>-sidebar"
		:popover="isMobile ? 'auto' : undefined"
		class="start"
		aria-label="Primary"
	>
		<header>…brand band…</header>
		<menu>…nav items…</menu>
		<footer>…account row…</footer>
	</nav>

	<header>…topbar…</header>

	<main
		style="--set-main-padding-inline: 1rem; --set-main-padding-block: 1rem; --set-main-gap: 1rem"
	>
		…content…
	</main>

	<aside v-if="isMobile" id="<example>-actions" popover class="end" aria-label="Actions">…</aside>
</template>
```

The framework's `body:has(main) > * > nav` / `> header` / `> main` / `> aside` selectors match through the single `#app` `display: contents` hop and paint:

- `<nav>` sidebar inline-size, border, popover drawer chrome
- `<nav> > <header>` drawer/rail brand band
- `<nav> > <footer>` drawer/rail account band (pinned to bottom via `margin-block-start: auto`)
- `<menu>` nav-rail column + link chrome (hover, `aria-current="page"`)
- `<header>` body-shell band (height, border-block-end, background)
- `<main>` scroll, overflow, padding tokens
- `<aside class="end">` slide-from-right drawer on mobile

### Conventions learned

- **Use `<nav>` not `<aside>`** for primary navigation rails. `<aside>` is for tangential content; the framework drawer chrome paints both equally, but `<nav>` is semantically correct for "primary nav."
- **`<nav popover>` needs no composable.** The framework's CSS drawer chrome + native `popovertarget` buttons handle everything. (`useAside` was an unnecessary import; `useNav` is the scroll-spy composable, not a drawer composable.)
- **Mobile breakpoint: 960px.** Match the docs shell (`MOBILE_QUERY = '(max-width: 960px)'`) so example drawer behavior is consistent with the rest of the framework.
- **`--set-main-padding-*` tokens** are the canonical way to override the framework's `<main>` baseline padding (clamp(1rem, 5vw, 2.5rem)) for app-screen density. Set on the `<main>` inline style; the framework's page-shell token group documents this surface (taxonomy.ts § `TOKEN_GROUPS.page-shell`).
- **`--set-aside-drawer-padding-inline: 0`** on a sidebar-style `<nav>` overrides the framework's 16px drawer gutter when the nav items already own their own padding-inline.
- **Sidebar drawer body — override the flex-grow.** The framework rule `:is(aside, nav)[popover] > :not(:where(header, footer)) { flex: 1 1 auto }` stretches body children, which scatters items in a multi-section nav. Pin them to natural height:
  ```css
  nav#<example > -sidebar > :where(menu, h6) {
  	flex: 0 0 auto;
  }
  ```
  Footer's `margin-block-start: auto` then pushes the account row to the bottom (Slack/Discord/Linear shape).
- **Right-drawer for mobile actions.** When the topbar has more actions than a phone width can fit, move them into `<aside v-if="isMobile" popover class="end">` at body-shell position. Show one trigger button in the topbar (`popovertarget="<example>-actions"`).
- **Cards = `<article>`.** Framework's flagship "element IS component" — `<article>` ships with card chrome; `<article> > <header>` auto-bands as card header; `<article> > <footer>` auto-bands as card footer. `.small` tightens padding; `.frame` zeroes outer inset for edge-to-edge children.
- **`<menu role="toolbar">`** for any horizontal cluster of action buttons (action rails, range pickers, sub-toolbars). Parity test recognizes this via `ATTR_ROOTED.role-group`.
- **Search forms responsive.** `class="hidden md:flex"` to hide below md.
- **Primary CTA on mobile.** Wrap the text label in `<span class="hidden md:inline">…</span>` so the button collapses to icon-only on small viewports.

### Translation table (unchanged from original spec)

| Mailbox idiom                              | Elements port                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `.btn`, `.btn-primary`                     | `<button class="primary">`                                               |
| `.btn-group[role=toolbar]`                 | `<menu role="toolbar">`                                                  |
| `.dropdown` + `.dropdown-menu`             | `useMenu` + `<button popovertarget>` + `<menu popover>`                  |
| `.modal`                                   | `<dialog>` + `useDialog`                                                 |
| `.offcanvas-md offcanvas-start`            | `<nav :popover>` at body-shell position                                  |
| `.offcanvas-md offcanvas-end`              | `<aside v-if="isMobile" popover class="end">`                            |
| `.navbar-row`, `.navbar-expand-md`         | `<header>` at body-shell position                                        |
| `.bi bi-*`                                 | `<i class="icon" style="--icon: var(--set-icon-X)">`                     |
| `.btn-close`                               | `<button class="subtle compact" aria-label="Close">`                     |
| `.card`                                    | `<article>`                                                              |
| `.card-header / .card-body / .card-footer` | `<article> > <header>`, `<article> body content`, `<article> > <footer>` |
| `.list-group`                              | `<menu>` inside `<article>`                                              |
| `.fade .show`                              | drop — native `<dialog>` / `<aside popover>` lifecycle                   |

### What's NOT in the framework (and stays as scoped CSS in each example)

- Circular initials badge (`.mark` — for workspace marks, user avatars)
- Timeline rail + markers (`<ol class="timeline">` with `border-inline-start` + absolute-positioned `.dot` markers — used by Dashboard's activity feed)
- Stat-card big-value typography (`.stat-value` for 1.75rem bold display)
- Trend coloring on data-attributes (`[data-trend='up']` → success-emphasis text)
- SVG presentation attributes (fill, opacity — can't be set via Tailwind)
- Arbitrary-value Tailwind grids (`grid-template-columns: minmax(0, 2fr) minmax(0, 1fr)` for chart+side layouts)

### Framework change that landed during the Dashboard slice

**`:is(aside, nav)[popover] > footer:last-child`** no longer defaults to `justify-content: flex-end`. The original framework default pushed every drawer footer's content to the trailing edge, which was right for action rows (Cancel | Save) but silently broke info rows (account info, status line). New default is `flex-start`; action-row drawers opt in with `class="justify-end"` (Tailwind utility). `UseAsidePage.vue` updated to add `justify-end` to its 6 demo footers.

## Toolbar button uniformity (`examples.css`)

All `.examples-toolbar > li > button` get:

- `border-radius: 999px` (pill / circle)
- `min-block-size: 1.75rem` (28px uniform height)
- `font-size: 0.8125rem`
- `line-height: 1`

Icon-only `.subtle.compact` buttons: `padding: 0; inline-size: 1.75rem` (circular).
Primary CTA: `padding-block: 0.25rem; padding-inline: 0.875rem; gap: 0.375rem` (pill).

## Test infrastructure (already in place from Dashboard slice)

Modifications to `tests/app/browser/pages.test.ts` (commit `8f98efd`):

- `rawSources` glob extended to also pick up `app/browser/examples/*Page.vue` (only Page wrappers; the shell + bare example components are not routes).
- `nonNamespacedSelectors(css, prefixes?)` is parameterized; `pages.test.ts` enforces `.showcase-` only in `showcase.css` and `.examples-` only in `examples.css`.
- `pageNames` is the combined set; `showcasePageNames` is the bare-element set (used for structural/style checks that don't apply to example pages).

Modifications to `tests/app/browser/semantics.test.ts`:

- Vacuous-pass page-count guard switched from `.toBe(44)` to `.toBeGreaterThanOrEqual(45)` so adding pages doesn't require a constant bump.

Both `parity.test.ts` and `semantics.test.ts` auto-discover new `*Page` barrel exports and Inspector-audit them — no per-example wiring needed.

## What the new examples will not require

- Re-extracting CSS to a new file (examples.css already exists, scoped correctly).
- Re-adding the `Examples` route group (already in `types.ts`).
- Re-adding the chrome gate in `App.vue` (already done).
- Re-modifying `pages.test.ts` / `semantics.test.ts` / `guides/showcase.md` (test infra knows about examples).

Each new example just needs:

1. `<Name>Example.vue` + `<Name>ExamplePage.vue` (two new files)
2. Entry in `examples.ts` metadata
3. Entry in `router.ts` (one new const + array append)
4. Exports in `app/browser/index.ts` barrel
5. `_contract.ts` `PAGE_SURFACE_BUNDLES` entry for parity
6. Two test files in `tests/app/browser/examples/`

## Risks for the remaining four examples

- **Mail's three-pane layout** has no body-grid equivalent. The body grid is single-`<main>`-centric; for three columns we either author a custom grid inside `<main>` (loses framework chrome on the inner panes) or use multiple body-level `<aside>`s (which doesn't match the framework's "one aside on the right" expectation). Likely choice: outer `<nav>` for folders + `<main>` containing a two-pane inner grid (thread list + reading pane). Inner panes get scoped CSS.
- **Marketing's hero/landing layout** doesn't fit the body-shell at all (no sidebar, no topbar, just a long-form scroll page). Likely choice: render just `<main>` (no `<nav>`, no body-shell `<header>`) and use `<section>` blocks inside with Tailwind utilities for hero / features / CTA.
- **Auth's split-screen** is two columns side-by-side, no scroll. Likely choice: `<main>` only with an inner grid (form left, brand panel right). On mobile collapses to single column (form only; brand panel hidden or above the form as a banner).
- **CRM's three-pane workspace** is the most complex (1471 lines in mailbox). Has command bar, draggable context list (uses `useDrag` / `useDrop`), accordion chat, docs panel. The drag/drop composables are first-class framework primitives — finally exercised in an example. Likely largest scoped-CSS budget of the four.

## Verification ritual (per example)

1. `npm run check` — clean
2. `npm run test:app:browser` — 1680+ tests passing (each example adds ~10 tests)
3. Mobile visual at 375×812 — drawer opens, content scrolls, toolbar/dialog work
4. Desktop visual at 1440×900 — full layout renders, framework chrome intact
5. `npm run format` — no manual edits needed
6. `npm run show` — demo regenerated
7. Commit + push

## Process notes

- Implement examples one at a time with a stop-and-review checkpoint between each.
- Each commit message should follow the pattern: `feat(examples/<name>): port <Name>Example` + `chore(showcase): regenerate demo/showcase.html`.
- If a framework gap is discovered (like the footer flex-end default), fix in the framework AND update all consumers in the same commit.
- Read sibling examples / `_aside.scss` / `_nav.scss` / `_article.scss` / `_menu.scss` before each port to know what framework chrome is available.
