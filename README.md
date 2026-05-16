# elements

> Semantic-first CSS framework over **native HTML elements**, layered on **Tailwind v4**, with a paired TypeScript composable + factory API for behavioural primitives.

You reach for `<button class="primary large">`, not `.btn-primary-lg`. You drop a `<dialog>` and it lifts above the page with the right shadow. You wear a `.danger` class on a `<form>` and the variant cascade tints inputs, focus rings, selections, and toasts in lockstep — without per-component overrides.

---

## What's in the box

| Layer           | Owns                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme**       | Semantic colour variants (`--color-primary`, `--color-success`, …) registered with Tailwind via `@theme`; light/dark surface, text, border tiers           |
| **Tokens**      | The `--set-*` variation surface — every visible value is overridable at `:root` (border-radius, gap, z-index scale, elevation, focus ring, icons, floater) |
| **Mixins**      | `@include transition()` (paired with `prefers-reduced-motion`), `focus-ring()`, `forced-colors`, `floater-bounds`, `palette-each`                          |
| **Modifiers**   | Four orthogonal dimensions — `variants`, `sizes`, `styles`, `states` — plus a `placements` system for `[popover]` panels                                   |
| **Elements**    | One partial per HTML tag, token-driven baselines; bare elements look "alive" without utilities                                                             |
| **Components**  | Element compositions (`<article>` as card, `<menu>` as toolbar, `<output popover>` as toast, …)                                                            |
| **Surfaces**    | Pseudo-element / attribute-API chrome — `[popover]`, `::backdrop`, `:focus-visible`, `::placeholder`, `::marker`, `::selection`, `::view-transition-*`     |
| **Composables** | 20 framework-agnostic factories (`createDialog`, `createToast`, `createPopover`, …) paired with Vue 3 adapters (`useDialog`, `useToast`, `usePopover`, …)  |

---

## Install

```sh
npm install elements tailwindcss @tailwindcss/postcss
```

The package ships two entry points:

| Subpath                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `elements/styles`      | Compiled CSS bundle — drop into your entry stylesheet  |
| `elements/browser`     | TypeScript composables + factories + token registries  |
| `elements/styles/scss` | SCSS source — for consumers compiling their own bundle |

---

## Consumer setup

### 1. Cascade layer order + Tailwind + framework styles

```css
/* user-entry.css */
@layer theme, base, elements, components, surfaces, composables, modifiers, utilities;
@import 'tailwindcss';
@import 'elements/styles';
```

Layer order is load-bearing — declare it **before** `@import 'tailwindcss'` so Tailwind's own `@layer theme, base, components, utilities` merges as a no-op against the wider order. Element rules sit between `base` and `utilities`; modifier classes beat element baselines but lose to explicit utilities.

### 2. TypeScript composables + factories

```ts
// user-entry.ts
import { useDialog, useToast, usePopover } from 'elements/browser'
// framework-agnostic factories ship alongside
import { createDialog, createToast } from 'elements/browser'
// token / modifier registries for programmatic access
import { tokens, modifiers, elements, events } from 'elements/browser'
```

### 3. PostCSS pipeline

The framework expects Tailwind v4 via the **PostCSS plugin**, not the Vite plugin — the PostCSS plugin runs on the post-Sass output so Tailwind sees every `var(--text-sm)` reference the modifiers emit. The Vite plugin would tree-shake those references away.

```js
// postcss.config.js
export default {
	plugins: {
		'@tailwindcss/postcss': {},
	},
}
```

---

## Quick examples

### Hydrated baselines — zero classes required

```html
<button>Save</button>
<!-- Border, padding, hover, focus ring, transition all present -->
<dialog open>…</dialog>
<!-- Centered modal with backdrop scrim and lift shadow -->
<form>…</form>
<!-- Vertical stack with consistent label/control rhythm -->
<menu>…</menu>
<!-- Horizontal toolbar; nav-rail context makes it vertical -->
```

### Modifier cascade — variant + size + style compose orthogonally

```html
<button class="primary large filled">Sign in</button>
<button class="danger small subtle">Delete</button>
<aside role="alert" class="warning">Heads up — your session expires soon.</aside>
```

### Composables — bind behaviour to semantic elements

```ts
import { useDialog } from 'elements/browser'

const dialog = useDialog(document.querySelector('dialog#confirm'), {
	modal: true, // default; `false` → non-modal `dialog.show()`
	on: {
		open: () => console.log('opened'),
		close: () => console.log('closed'),
	},
})

dialog.open()
```

The framework-agnostic factory shape (`createDialog`) ships alongside every `use*` adapter — drop straight into vanilla TS / React / Svelte / Solid without a Vue dependency.

---

## Theming

Pin a brand color at `:root` and the entire cascade retunes — focus rings, toasts, alerts, selections, popovers, tabs, breadcrumbs, every variant-aware surface:

```css
:root {
	--color-primary: oklch(0.62 0.18 250);
}
```

Switch light ↔ dark by toggling `[data-theme]`:

```html
<html data-theme="dark"></html>
```

### Retune any value — the `--set-*` surface

`--color-*` is the palette; `--set-*` is the **variation surface**. Every visible value the framework paints reads through a `--set-*` custom property with a sensible default, so you retune chrome without forking a partial or writing a single rule. Override globally at `:root`:

```css
:root {
	--set-transition-duration: 120ms; /* snappier UI motion everywhere */
	--set-focus-box-shadow-width: 0.2rem; /* thicker keyboard-focus ring */
	--set-state-disabled-opacity: 0.4; /* dimmer disabled affordance */
}
```

…or scope an override to a subtree / single instance (custom properties cascade by element, so the deepest declaration wins):

```html
<!-- this card's inset + gap only -->
<article style="--set-article-padding-block: 0; --set-article-gap: 0">…</article>

<!-- every form inside .compact gets a tighter row gap -->
<style>
	.compact form {
		--set-form-row-gap: 0.5rem;
	}
</style>
```

The full `--set-*` catalog (per element / component / surface / composable) is documented in [guides/tokens.md](guides/tokens.md); the TS mirror is `import { tokens } from 'elements/browser'`.

---

## Architecture rules (TL;DR)

- **Single-word naming** for every entity-scoped property / method / option key / event — `entity.action(options)`, not `entity.actionEntity(entityOptions)`. (See [AGENTS.md §4](AGENTS.md#4-naming-conventions).)
- **Centralized files** per domain — `types.ts` (source of truth), `helpers.ts`, `constants.ts`, `errors.ts`, `index.ts` (sole barrel).
- **Token-driven variation** — element partials never declare `&.primary { color: … }`; variation flows through `--set-style-*` → `--set-variant-*` → element default.
- **TS ↔ SCSS parity is enforced bidirectionally** by `tests/src/browser/{tokens,modifiers,elements,events}.test.ts` — adding a `--set-*` declaration without a TS leaf (or vice versa) fails CI.
- **Four modifier dimensions** — `variants`, `sizes`, `styles`, `states`, plus a `placements` system. **No `shapes` dimension** (Tailwind owns `.rounded`); **no `.outline` style** (Tailwind owns `.outline`); **no `.huge` size** (Tailwind owns `text-*`).

Full architecture guide lives in [AGENTS.md](AGENTS.md). Per-layer references live in [guides/](guides/) — `styles.md`, `tokens.md`, `mixins.md`, `modifiers.md`, `elements.md`, `components.md`, `surfaces.md`, `composables.md`.

---

## Browser support

- Chrome 114+ (Edge 114+) — `[popover]`, anchor positioning, view-transitions
- Safari 17+ — `[popover]`, `:focus-visible`, `::view-transition-*` (Safari 18+)
- Firefox 125+ — `[popover]`, `:focus-visible`, `::marker`, `::selection`

Graceful degradation: surfaces relying on `@starting-style` / `position-try-fallbacks` / `::view-transition-*` are inert on unsupported engines — the framework's element / component / composable layers stay functional.

---

## License

MIT
