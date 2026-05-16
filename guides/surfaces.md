# Surfaces

> Browser-rendered chrome that isn't a tag or a composition — pseudo-elements, attribute APIs, and behaviour properties the browser owns. Folder: [src/styles/surfaces/](../src/styles/surfaces/).

## Surface

A **surface** is a CSS hook into UA-controlled machinery: pseudo-elements (`::backdrop`, `::placeholder`, `::marker`, `::selection`, `::view-transition-*`), attribute APIs (`[popover]`, `[popover]:popover-open`), and behaviour properties the browser owns rather than the author (anchor positioning, scrollbar appearance, forced-colors fallbacks, focus ring). Surfaces are distinct from elements (which name HTML tags) and components (which compose elements) — they name **a seam in the browser itself**.

**Shipped surfaces** (every partial under [src/styles/surfaces/](../src/styles/surfaces/)):

| Partial                                                                 | Owns                                                                                                                                                                                                                                                                                                                                                                                | Key tokens                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`_popover.scss`](../src/styles/surfaces/_popover.scss)                 | `[popover]` panel chrome + entry/exit transition via `@starting-style` + `transition-behavior: allow-discrete`. Variant `[popover='hint'], [role='tooltip']` for tooltip-shaped popovers.                                                                                                                                                                                           | `--set-popover-{color, background-color, border-color, border-width, border-radius, padding-inline, padding-block, box-shadow, transition-duration, max-inline-size}`, `--set-popover-hint-*` for the tooltip variant |
| [`_backdrop.scss`](../src/styles/surfaces/_backdrop.scss)               | Dim scrim for the framework's two blocking-overlay families: `dialog:modal::backdrop` (modal) and `:is(aside, nav)[popover]:popover-open::backdrop` (offcanvas drawer). Toasts / dropdowns / tooltips / non-modal dialogs / bare popovers keep the UA-default transparent backdrop. Single-backdrop invariant: every overlay reads from native `::backdrop`, no duplicate elements. | `--set-backdrop-{background-color, backdrop-filter, transition-duration}`                                                                                                                                             |
| [`_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss) | `[popover]:not(:where(aside, dialog, nav, output))` auto-anchored placement. Default `position-area: block-end`. `position-try-fallbacks` flips when there's no room.                                                                                                                                                                                                               | `--set-anchor-{gap, position-area, position-try-fallbacks, position-try-order, max-block-size, max-inline-size, viewport-inset}`                                                                                      |
| [`_scrollbar.scss`](../src/styles/surfaces/_scrollbar.scss)             | `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`.                                                                                                                                                                                                                                                                                                       | `--set-scrollbar-{thumb-color, track-color, width, gutter}`                                                                                                                                                           |
| [`_focus.scss`](../src/styles/surfaces/_focus.scss)                     | `:focus-visible` ring rules using the framework's focus tokens.                                                                                                                                                                                                                                                                                                                     | `--set-focus-box-shadow-{width, opacity}`                                                                                                                                                                             |
| [`_placeholder.scss`](../src/styles/surfaces/_placeholder.scss)         | `::placeholder` opacity + color across `<input>` / `<textarea>`.                                                                                                                                                                                                                                                                                                                    | `--set-placeholder-{color, opacity}`                                                                                                                                                                                  |
| [`_marker.scss`](../src/styles/surfaces/_marker.scss)                   | `::marker` styling shared across `<details>` / `<summary>` / `<li>`.                                                                                                                                                                                                                                                                                                                | `--set-marker-{color, content}`                                                                                                                                                                                       |
| [`_selection.scss`](../src/styles/surfaces/_selection.scss)             | Variant-tinted `::selection`.                                                                                                                                                                                                                                                                                                                                                       | `--set-selection-{color, background-color}`                                                                                                                                                                           |
| [`_view-transition.scss`](../src/styles/surfaces/_view-transition.scss) | `::view-transition-old(root)` / `::view-transition-new(root)` cross-page transitions for `<a>` navigation.                                                                                                                                                                                                                                                                          | `--set-view-transition-{duration, timing-function}`                                                                                                                                                                   |

**Cascade layer placement.** Surfaces ship in the `@layer surfaces` cascade layer. The full layer order is:

```
theme, base, elements, components, surfaces, composables, modifiers, utilities
```

Surfaces sit **between elements and composables**. Two reasons that placement is load-bearing:

- **Above elements / components.** Pseudo-element styling needs to beat the element baseline that hosts it. `<input>` declares `color` in the elements layer; `::placeholder` needs to win for its own `color` (without inheriting the input's). Anchor positioning needs to beat any default `position` an element partial set. Putting surfaces above elements + components means a surface rule never loses to the host's own paint.
- **Below composables.** The composable layer beats the surface for the rare case where a composable owns a pseudo-element's lifecycle. Example: drawer-mode `<aside>` (`useAside`) needs to take ownership of `[popover]` open/close transitions for its own slide-from-edge motion, overriding the surface's scale/fade transition. Composables sitting above surfaces is what makes that override clean — no `!important`, no specificity gymnastics.

Layer order is declared in the consumer's entry CSS (see [tests/setup.css](../tests/setup.css) and [app/browser/styles/main.css](../app/browser/styles/main.css)) so it precedes `@import 'tailwindcss'`. Tailwind's own `@layer theme, base, components, utilities` merges as a no-op against the wider order.

---

## Contract

These invariants hold across `src/styles/surfaces/_*.scss` ↔ `surfaces.md` ↔ consumer chrome:

1. **SCSS → DOC.** Every `surfaces/_{name}.scss` partial is named in the "Shipped surfaces" table above. New surfaces ship with a documented row in the same change.
2. **DOC → SCSS.** Every `surfaces/_{name}.scss` reference in this guide resolves to a real partial. Stale references after a rename / delete are caught.
3. **Cascade layer.** Every surface partial wraps its rules in `@layer surfaces` and writes only tokens on `:root` plus pseudo-element / attribute-API rules — no tag-headed authoring.
4. **Per-surface token + animation discipline.** `SURFACE_CONTRACTS` in [`src/browser/patterns.ts`](../src/browser/patterns.ts) declares the required tokens and whether the surface animates; partials with `animated: true` invoke the `transition` / `reduced-motion` mixin pair.

Enforced by:

- [`tests/guides/surfaces.test.ts`](../tests/guides/surfaces.test.ts) — bidirectional SCSS↔doc parity.
- [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts) — required-token coverage + animated-mixin discipline.
- [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts) — folder structural contract (layer wrapping, allowed selector kinds).

---

## Patterns

### `[popover]` panel surface

The most important surface. [`_popover.scss`](../src/styles/surfaces/_popover.scss) styles every element with the `popover` attribute — the element acts as a popover (top-layer rendering, `::backdrop`, light-dismiss via `popover=auto` or manual via `popover=manual`).

**What it owns.** Panel chrome — `color`, `background-color`, `border`, `border-radius`, `padding-inline`, `padding-block`, `box-shadow`, `max-inline-size`. Every `[popover]` paints with the same chrome by default; the toast component (`output[popover]`) repaints with banner-row layout from the composables layer.

**Open/close transition.** Three pieces wired together:

```scss
[popover] {
	transition:
		opacity var(--set-popover-transition-duration),
		transform var(--set-popover-transition-duration),
		overlay var(--set-popover-transition-duration) allow-discrete,
		display var(--set-popover-transition-duration) allow-discrete;
	transition-behavior: allow-discrete;
	opacity: 0;
	transform: scale(0.98);
}

[popover]:popover-open {
	opacity: 1;
	transform: none;
}

@starting-style {
	[popover] {
		opacity: 0;
		transform: scale(0.98);
	}
}
```

- `transition-behavior: allow-discrete` keeps the `display: none ↔ block` flip inside the transition pipeline. Without it, the popover pops in instantly.
- `@starting-style` declares the from-state for entry so the first frame interpolates from `opacity: 0; transform: scale(0.98)`.
- **Critical specificity rule.** The `@starting-style` block targets the bare `[popover]` selector (specificity 0,1,0), one step BELOW `[popover]:popover-open` (specificity 0,2,0). Chrome 148+ has a regression where `@starting-style` declarations can leak into the normal cascade tier — if the starting-state body lived at `[popover]:popover-open` specificity it would tie the open-state declaration on source-order and the popover would render permanently at `opacity: 0`. Keeping the from-state selector one specificity tier lower means the open-state declaration wins regardless.

**Variants.** Two shapes:

- **Bare `[popover]`** — the full panel. Background = `--color-surface` (tracks the active theme — flips to slate in dark mode). Max-width capped at `min(--set-popover-max-inline-size, --set-anchor-max-inline-size)`. Used by menu, dialog (non-modal), drawer-mode aside.
- **`[popover='hint'], [role='tooltip']`** — the tooltip shape. Smaller padding, inverted chrome (the bg reads `color-mix(in srgb, var(--color-inverted) 95%, transparent)` so the tooltip stays always-distinct against the canvas in both light and dark modes — inverted text on inverted bg), narrower max-width (12.5rem via the `--set-popover-hint-max-inline-size` extension), lighter shadow. The hint background runs through `--color-inverted` rather than `currentColor` to dodge the chicken-and-egg of `color` and `background-color` both being set on the same selector.

**Theme tracking.** Tokens reference `--color-surface`, `--color-text`, `--color-border` — when the consumer flips `data-theme="dark"`, popovers / menus / dropdowns track without per-host overrides.

**Gotcha — Tailwind layout utilities on `[popover]`.** The UA hides closed popovers with `[popover]:not(:popover-open) { display: none; }` in the lowest cascade tier. Any author rule beats it. Putting `class="grid"`, `class="flex"`, or `class="block"` directly on a `[popover]` element forces `display: grid|flex|block` even when closed — the panel renders flat in document flow until first opened.

```html
<!-- Wrong — `.grid` defeats the UA's hide-when-closed rule -->
<div popover="auto" class="grid gap-2">…</div>

<!-- Right — popover element keeps UA display, child handles layout -->
<div popover="auto">
	<div class="grid gap-2">…</div>
</div>
```

### Anchor positioning surface

[`_anchor-position.scss`](../src/styles/surfaces/_anchor-position.scss) handles placement for every `[popover]:not(:where(aside, dialog, nav, output))`.

**What it owns.** When a popover is invoked via `<button popovertarget="…">`, the browser sets up an _implicit_ anchor relationship between the invoker and the popover. No `anchor-name` / `position-anchor` boilerplate needed — the surface only declares placement (`position-area`) and the browser handles the rest. Default placement is `block-end` (below the invoker in LTR top-to-bottom; flips automatically in vertical / RTL writing modes).

**Modifier hookup.** Placement modifier classes (`.top`, `.bottom`, `.start`, `.end`, `.top-start`, `.top-end`, `.bottom-start`, `.bottom-end`) live in [modifiers/\_placements.scss](../src/styles/modifiers/_placements.scss) — see [modifiers.md](modifiers.md). Each writes the matching `position-area` keyword on the popover.

**Overflow handling.** `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` — the browser tries the requested side first, then flips block, then flips inline, then flips both. `position-try-order: normal` (the spec default) means the browser commits to the first fallback that fits in declaration order — `most-width` / `most-block-size` are rejected as too greedy.

**Demanded space.** `max-block-size: var(--set-anchor-max-block-size)` (default `18rem`) and `max-inline-size: var(--set-anchor-max-inline-size)` (default `28rem`). The browser uses these caps as the popover's _demanded size_ when evaluating `position-try-fallbacks`. If `18rem` doesn't fit below the trigger, `flip-block` fires and the popover lands above. Consumers tighten per-host:

```scss
#my-dropdown {
	--set-anchor-max-block-size: 12rem;
}
```

**Overflow scrolls inside.** `overflow: auto` + `overscroll-behavior: contain` — when content exceeds the cap, the popover scrolls instead of truncating, and scroll-chain doesn't leak to the document.

**Anchor-visibility tracking.** `position-visibility: anchors-visible` auto-hides the popover when the anchor scrolls offscreen, so a dropdown left open in a scrolling list doesn't float untethered.

**`position: absolute`, not the top-layer default.** Top-layer popovers default to `position: fixed` (pinned to viewport coordinates), which means scrolling a nested ancestor doesn't relayout. The surface sets `position: absolute` so the popover's layout lives in its containing block's coordinate space — letting the browser re-evaluate `position-try-fallbacks` when the anchor's surroundings change.

**Why exclude `output`.** Toasts are `<output popover="manual">` and want viewport-fixed corner placement, not anchor positioning. The toast component partial overrides position with explicit `position: fixed; inset-*` values. Excluding `output` here lets the toast component rule resolve cleanly without `!important`.

**Known limitation: in-session sticky flip.** Chromium re-evaluates `position-try-fallbacks` only when the popover's own layout changes. Scrolling the anchor in a nested scroll container doesn't trigger re-evaluation — a popover that flips up at open time stays up until closed. Closing and re-opening always re-evaluates from scratch. Composable observers (`useMenu`, `usePopover`, `useTooltip`) can nudge `max-block-size` on scroll to force re-evaluation; the surface itself documents the limitation and stays declarative.

### Backdrop surface

[`_backdrop.scss`](../src/styles/surfaces/_backdrop.scss) paints the dim scrim for the framework's two **blocking-overlay families**:

```scss
// Open-state scrim chrome — modal dialog + offcanvas drawer share
// the same dim-and-blur recipe. The `:is(aside, nav)[popover]` form
// covers BOTH the standalone `<aside popover>` offcanvas surface AND
// the `<nav popover>` navigation drawer (e.g. the showcase's body-
// shell rail on mobile, which uses a conditional `:popover` Vue
// binding to opt into popover mode below 960 px).
dialog:modal::backdrop,
:is(aside, nav)[popover]:popover-open::backdrop {
	background-color: var(--set-backdrop-background-color);
	backdrop-filter: var(--set-backdrop-backdrop-filter);
}

// Bare pseudo carries the transition list so it survives the close
// transition tail (see § "Single-backdrop guarantee" below).
dialog::backdrop,
:is(aside, nav)[popover]::backdrop {
	transition:
		background-color var(--set-motion-duration) ease-out,
		backdrop-filter var(--set-motion-duration) ease-out;
}
```

A modal `<dialog>`, an `<aside popover>` offcanvas drawer, and a `<nav popover>` navigation drawer all feel like siblings — same scrim, same fade-out timing — differing only in geometry. Bootstrap parity: their `.modal-backdrop` and `.offcanvas-backdrop` paint the same `--bs-backdrop-bg` / `--bs-backdrop-opacity` recipe.

**Transparent by default for non-blocking surfaces.** Non-modal `<dialog>` (opened via `.show()`), `<output popover>` (toasts), `<menu popover>` (dropdowns), `[popover='hint']` (tooltips), and bare `[popover]` panels keep the UA-default transparent backdrop so they don't dim the page underneath. The matching surface for a "blocking" panel — one that demands the user's attention before the page is interactive again — is modal `<dialog>` or offcanvas `<aside popover>`. The matching surface for a "non-blocking" panel is everything else.

**Single-backdrop guarantee.** Every framework surface that needs a scrim renders it via the native `::backdrop` pseudo — there is no per-component "duplicate backdrop element" anywhere in the framework. Top-layer elements get their backdrop from the browser; the framework only styles the existing pseudo. The body-shell rail drawers (`<nav>` / `<aside>` direct children of `<body>`) opt into popover mode on mobile via a `:popover="isMobile ? 'auto' : undefined"` binding (showcase pattern in `app/browser/App.vue`), which lifts them into the top layer when the drawer is open and surfaces a native `::backdrop` automatically — so the same `dialog:modal::backdrop, aside[popover]:popover-open::backdrop` rule covers both the modal dialog and the body-shell drawers without a parallel showcase-side scrim element.

**Why split the transition list onto the bare pseudo.** `:modal` (for dialog) and `:popover-open` (for popovers) stop matching synchronously the moment `.close()` / `.hidePopover()` returns. If the transition were declared only on the open-state rule, it would disappear at frame 0 of close — `background-color` and `backdrop-filter` would snap from the dim scrim to the UA-default faint `rgba(0, 0, 0, 0.1)` (Chromium's transparent-but-still-rendered default) for the 250 ms the host's `overlay allow-discrete` keeps the backdrop alive. That snap reads to the user as a backdrop "flash" between the dim scrim and the faint UA default. Putting the transition on the bare pseudo means the backdrop's color animates from dim → UA-transparent over the full motion duration in lockstep with the panel's fade-out, producing a single smooth dismiss instead of a flash-then-fade.

**Token scope.** `--set-backdrop-*` tokens live on `:root` because `::backdrop` is generated outside the normal DOM tree and cannot inherit element-scoped tokens declared on the host. Consumers override globally on `:root` or opt a specific host in:

```scss
dialog#confirm::backdrop {
	--set-backdrop-background-color: rgb(0 0 0 / 0.7);
}
```

**Opt-in for non-blocking popovers.** If a use-case needs a backdropped popover hybrid (e.g. a confirm-style "modal popover" or a dropdown that should dim the page on small screens), the consumer opts in per-host:

```scss
#my-popover::backdrop {
	background-color: var(--set-backdrop-background-color);
	backdrop-filter: var(--set-backdrop-backdrop-filter);
}
```

### Scrollbar surface

[`_scrollbar.scss`](../src/styles/surfaces/_scrollbar.scss). Declares `scrollbar-color`, `scrollbar-width`, `scrollbar-gutter` defaults on `:root`:

```scss
:root {
	--set-scrollbar-thumb-color: var(--color-border-strong);
	--set-scrollbar-track-color: transparent;
	--set-scrollbar-width: thin;
	--set-scrollbar-gutter: stable;

	scrollbar-color: var(--set-scrollbar-thumb-color) var(--set-scrollbar-track-color);
	scrollbar-width: var(--set-scrollbar-width);
	scrollbar-gutter: var(--set-scrollbar-gutter);
}
```

Modern non-WebKit way to style scrollbars. The two-value `scrollbar-color: <thumb> <track>` shorthand is composed at the application site from the two separate tokens so consumers can override either half independently.

**Vendor pseudos intentionally absent.** WebKit-only `::-webkit-scrollbar` family pseudo-elements are NOT styled here — those are deprecated in favour of the standard `scrollbar-*` properties. Safari < 18.2 ignores `scrollbar-color` / `scrollbar-width`; the native iOS overlay scrollbar is the fallback (acceptable).

### Focus surface

[`_focus.scss`](../src/styles/surfaces/_focus.scss). `:focus-visible` ring shared across every interactive element — every button, link, summary toggle, custom `[tabindex]` widget, third-party combobox. Reads `--set-focus-color` (the variant tint, defaulting to `--color-primary`), `--set-focus-box-shadow-width`, and `--set-focus-box-shadow-opacity` from `:root`.

```scss
:focus-visible:not(:where(input, textarea, select, table[role='grid'])) {
	outline: none;
	box-shadow: 0 0 0 var(--set-focus-box-shadow-width)
		color-mix(
			in oklab,
			var(--set-focus-color) calc(var(--set-focus-box-shadow-opacity) * 100%),
			transparent
		);
}
```

**Opt-out scoping.** Form controls (`<input>`, `<textarea>`, `<select>`) declare their own `&:focus-visible` block in the elements layer because focus also recolors their border. The surface uses `:focus-visible:not(:where(input, textarea, select, table[role='grid']))` — `<table role="grid">` is excluded because the table is the focus anchor while its cells are the visible target (see [composables.md](composables.md) `useTable`); `:where()` keeps the opt-out at zero specificity so the surface rule stays the lowest possible `:focus-visible`. Form controls keep their per-element ring AND border-color paint; everything else gets the surface ring.

**Why a shared surface rather than per-element rules.** Every interactive element (button, link, summary, custom widget) gets identical focus signal. Ring color tracks the active variant via `--set-focus-color → --set-variant-background-color → --color-primary`, so a focused `.danger` button rings danger-red without per-element rules.

`:focus-visible` is the UA-determined "keyboard-style" focus — clicking a button doesn't paint the ring, tabbing to it does. The surface intentionally does not style plain `:focus` (which would catch mouse clicks too) — the user-agent's heuristic is the right one and overriding it produces sticky focus rings after every click.

**Forced-colors fallback.** Custom `box-shadow` rings are stripped in Windows High Contrast mode, so the surface paints a paired `outline: 2px solid Highlight; outline-offset: 2px` rule under `@media (forced-colors: active)` so the focus signal survives.

### Placeholder surface

[`_placeholder.scss`](../src/styles/surfaces/_placeholder.scss). `::placeholder` color + opacity, shared across `<input>` / `<textarea>` (and the future search-mode `<select>`). The previous per-element `--set-input-placeholder-opacity` / `--set-textarea-placeholder-opacity` tokens are REMOVED — the surface owns the value via `--set-placeholder-color: currentColor` + `--set-placeholder-opacity: 0.6`.

```scss
::placeholder {
	color: var(--set-placeholder-color);
	opacity: var(--set-placeholder-opacity);
}
```

**Why `currentColor`.** Keeps the placeholder tracking the form control's own text color, so a `.danger` input still has a danger-tinted placeholder hint. Opacity is the muting mechanism — pure color change would lose the visual link to the field.

**Forced-colors fallback.** Windows High Contrast and similar forced-colors modes flatten author colors. The surface declares:

```scss
@media (forced-colors: active) {
	::placeholder {
		color: GrayText;
		opacity: 1;
	}
}
```

so the placeholder stays distinguishable from real text under user-mandated colour scheme overrides. `GrayText` is one of the CSS system colours preserved in forced-colors mode.

### Marker surface

[`_marker.scss`](../src/styles/surfaces/_marker.scss). `::marker` shared across `<li>` and any element with `display: list-item`.

```scss
::marker {
	color: var(--set-marker-color);
	content: var(--set-marker-content);
}
```

`--set-marker-color` defaults to `--color-text-muted` so list bullets read as structural hints rather than emphasis ink (Bootstrap's default). `--set-marker-content` defaults to `normal` — the UA sentinel that means "use the marker generated by `list-style-type`" — so leaving it as the default keeps the bullet / number / lower-roman that the consumer chose via `list-style-type`. Override per consumer to inject a custom glyph (`'›  '`, `'• '`, etc.).

**Property whitelist.** Only a small set of properties applies inside `::marker`: `color`, `content`, `font-*`, `white-space`, `text-combine-upright`, `unicode-bidi`, `direction`, `animation-*`, `transition-*`. Trying to set `background`, `padding`, `margin`, `border`, `transform`, etc. is silently ignored by the UA — this is why marker styling stays minimal.

**Why `<summary>` is intentionally outside this surface's reach.** `<summary>` paints its own disclosure marker via a `::before` mask-image SVG (see [elements/\_summary.scss](../src/styles/elements/_summary.scss)) because the UA's disclosure-triangle glyph renders inconsistently across engines and ignores `color` in some browsers. The summary partial sets `list-style: none` AND hides `::-webkit-details-marker`, so the surface's `::marker` rule never reaches it — the two surfaces don't collide.

### Selection surface

[`_selection.scss`](../src/styles/surfaces/_selection.scss). `::selection` paints the user's selected text with a variant-tinted background so highlights match the active theme. When a `.primary` / `.success` / `.danger` modifier scope is in effect, selection inside that scope picks up the matching tint:

```scss
::selection {
	color: var(--set-selection-color);
	background-color: var(--set-selection-background-color);
}
```

Background defaults to `color-mix(in oklab, var(--set-variant-background-color, var(--color-primary)) 25%, transparent)` so highlighted text stays legible — selection painted at full opacity hides the underlying characters in some font rendering paths. `--set-selection-color` defaults to `--color-text-strong` (canvas-contrasting strong text) which reaches AA against the variant tints in both light and dark themes.

Like `::backdrop`, `::selection` is generated outside the normal DOM tree, so the tint tokens live on `:root`. Modifier-scoped overrides cascade through the active variant context tokens — a `.danger` modifier in a parent element retunes `--set-variant-background-color` for its subtree, which `::selection` reads through the `var()` chain, so a selection inside a danger-themed panel paints with the danger tint without per-host rules.

### View-transition surface

[`_view-transition.scss`](../src/styles/surfaces/_view-transition.scss). `::view-transition-old(root)` and `::view-transition-new(root)` paint the cross-page transition when consumers navigate via `<a>` with `view-transition-name` set, or opt into cross-document navigation transitions via `@view-transition { navigation: auto; }`.

Default is a fade (`opacity` cross-tween). Per-page customisation lives at the call site: a navigating element declares `view-transition-name: <name>` and per-name `::view-transition-old(<name>) / -new(<name>)` rules override the default duration / timing function for that element only.

Tokens `--set-view-transition-duration` and `--set-view-transition-timing-function` retune the default fade globally. Like other top-layer-adjacent pseudos, the tokens live on `:root` — `::view-transition-*` snapshots render outside the normal DOM tree.

Reduced-motion-paired: the framework's shared `transition()` mixin honors `prefers-reduced-motion`, so the surface's view-transition rules collapse to zero-duration when the user has reduced motion enabled. Cross-page navigation still feels instant rather than ignoring user preference for the sake of polish.

### Authoring a new surface

When to add a new surface partial:

1. The pattern styles a pseudo-element or attribute API the browser owns (not a tag). If it's a tag, it belongs in [src/styles/elements/](../src/styles/elements/). If it's a composition of multiple tags under a class root, it belongs in [src/styles/components/](../src/styles/components/).
2. The pattern is shared across more than one element / component. A pseudo-element consumed only by `<progress>` lives in `elements/_progress.scss`. Promote to a surface partial once a second element needs the same styling.
3. The partial declares tokens on `:root` when the surface is generated outside the normal DOM tree (`::backdrop`, `::placeholder`, `::marker`, `::selection`, `::view-transition-*`). These pseudos cannot inherit element-scoped tokens.
4. Wrap all rules in `@layer surfaces`.
5. Add the row to the "Shipped surfaces" table in this guide's `## Surface` section.
6. Register the surface in `SURFACE_CONTRACTS` (`src/browser/patterns.ts`) with its required-token list + animation flag so the per-surface test enforces the contract.

Each substantive partial follows the template documented in the file's header — browser-support comment, surfaces-covered list, quirks list, then `@use '../mixins' as *;` and the `@layer surfaces { … }` body.

### Anti-rules

- **Don't style deprecated vendor pseudo-elements outside their specific element partial.** `::-webkit-scrollbar`, `::-moz-progress-bar`, `::-ms-*` live (when needed at all) in the relevant element partial — e.g. `<progress>` vendor pseudos live in `elements/_progress.scss`, not in a surfaces partial.
- **Don't add a surface for a single-element pseudo.** `<select>::picker(select)` lives in `elements/_select.scss` while only `<select>` consumes it. Promote to a surface once a second element does.
- **Don't override `display` on `[popover]` outside the open-state selector.** The UA's `[popover]:not(:popover-open) { display: none; }` keeps closed popovers out of flow. Any author rule that sets `display` on `[popover]` defeats the hide-when-closed behaviour. See [composables.md §3 — open/closed lifecycle](composables.md).
- **Don't filter `[popover]` rules with a raw `:not(output)` at chrome-paint time.** A bare `:not(output)` lifts specificity to `0,2,0` (vs `[popover='hint']` at `0,1,0`) and breaks the hint variant. The framework's pattern is the zero-specificity `:not(:where(aside, dialog, nav, output))` exclusion list (`:where()` flattens it to `0,1,0`) — used by both the anchor-position and popover surfaces so the opt-outs never inflate weight. Toasts (`output[popover]`), drawers (`:is(aside, nav)[popover]`), and modals (`dialog`) are excluded because they carry their own viewport-fixed placement chrome, not the `position: absolute` anchor layout.

---

## Tests

- [`tests/guides/surfaces.test.ts`](../tests/guides/surfaces.test.ts) — SCSS ↔ doc parity: every surface partial is documented, every documented partial exists.
- [`tests/src/styles/surfaces/_index.test.ts`](../tests/src/styles/surfaces/_index.test.ts) — per-surface required-token coverage + animated-mixin discipline (`SURFACE_CONTRACTS` enforcement).
- [`tests/guides/patterns.test.ts`](../tests/guides/patterns.test.ts) — folder structural contract: every surfaces partial wraps in `@layer surfaces` and uses only allowed rule-head kinds.
- Per-surface behaviour tests under [`tests/src/styles/surfaces/`](../tests/src/styles/surfaces/) — `_anchor-position.test.ts`, `_backdrop.test.ts`, `_focus.test.ts`, `_popover.test.ts`, etc.

---

## See also

- [styles.md](styles.md) — cascade layer order and authoring contract for the whole framework
- [tokens.md](tokens.md) — the `--set-*` namespace and how surface tokens compose with variant context tokens
- [composables.md](composables.md) §3 — the open/closed lifecycle that popover-based surfaces participate in (composables own the lifecycle, surfaces own the paint)
- [modifiers.md](modifiers.md) — the placement vocabulary (`.top`, `.bottom-start`, etc.) that drives `position-area`
- [components.md](components.md) — sibling category for composed widgets (bare tags / class roots) that consume surfaces
- [elements.md](elements.md) — sibling category for HTML-tag partials
