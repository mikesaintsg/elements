# Examples port — mailbox → elements

**Date:** 2026-05-20
**Status:** approved (brainstorming)
**Next:** writing-plans → implementation

## Why

The mailbox project ships five "Examples" — Dashboard, Mail, Marketing, Auth, CRM — that demonstrate how its Bootstrap-flavored composables and utility classes compose into recognizable application layouts. Elements has no analogue. Without one, readers can't see what semantic-first authoring looks like at the _application_ scale (only at the page / component scale that the existing docs already cover).

The port is **not** a literal copy. Mailbox uses chained Bootstrap classes (`.offcanvas-md.offcanvas-start.d-md-flex`); elements is semantic-first ("the HTML element IS the component"). The mailbox examples are the **spec** for layout + content + behavior; the markup gets rewritten in elements' vocabulary.

## Scope

**In scope (this spec):**

- One new route group, `Examples`, that renders fullscreen (no docs chrome).
- A reusable `ExamplesShell.vue` wrapper (floating toolbar + view-source dialog), built from elements primitives.
- A complete Dashboard slice: page + example + shell wiring + tests + visual verification + inspector audit.
- Test conventions for example pages that play nicely with the existing `parity.test.ts` + `semantics.test.ts` gates.

**Out of scope (this spec — deferred to follow-up sessions):**

- Porting Mail, Marketing, Auth, CRM. The user reviews the Dashboard slice before those land, so the pattern can be refined first.

**Explicit non-goals:**

- Pixel-perfect parity with mailbox. Examples should _feel like the same app idea_ — three-pane dashboard with sidebar + stats + activity — but the markup, modifier vocabulary, and (where needed) the layout follow elements idioms.
- Polluting framework SCSS with example-specific helper classes (`.dashboard-sidebar`, `.container-shell-row`). Those become scoped `<style>` blocks in the example file.

## Architecture

### New files

```
app/browser/examples/
  examples.ts                 # readonly metadata registry: id, title, tagline, icon
  ExamplesShell.vue           # toolbar + view-source dialog; shared by every example
  DashboardExample.vue        # the actual app under test (semantic HTML + scoped CSS)
  DashboardExamplePage.vue    # thin: wraps DashboardExample in ExamplesShell with ?raw source

tests/app/browser/
  pages/DashboardExamplePage.test.ts    # page-level render smoke + landmark asserts
  examples/DashboardExample.test.ts     # example-specific framework-usage asserts
```

### Modified files

- `app/browser/types.ts` — append `'Examples'` to `ROUTE_GROUPS`. Existing `RouteGroup` derives from this tuple, so the new group becomes a valid `Route.group` value automatically. The parity test's `page belongs to a known route group` check passes for free.
- `app/browser/router.ts` — add a new section ` ── Examples ─` with `EXAMPLE_DASHBOARD: Route = { id: 'example-dashboard', title: 'Dashboard', group: 'Examples', page: DashboardExamplePage }`; append to the `routes` array. Other example routes get added in the follow-up session.
- `app/browser/index.ts` — re-export the new `*Page` symbols so the barrel-driven `semantics.test.ts` and `parity.test.ts` discover them.
- `app/browser/App.vue` — when `current.value.group === 'Examples'`, render only `<main>` (the example's chrome takes over the viewport). The existing `<header>`, `<nav>`, `<aside>`, `<footer>` blocks become `v-if="!isExample"`.
- `app/browser/styles/showcase.css` — add `.examples-stage`, `.examples-toolbar`, `.examples-toolbar-label`, `.examples-source` chrome. Same location pattern mailbox uses, for the same reason (toolbar is showcase-app glue, not framework chrome).
- `tests/app/browser/pages/_contract.ts` — extend `PAGE_SURFACE_BUNDLES` with `DashboardExamplePage: ['useAside', 'useDialog', 'useMenu', 'useTheme', '<header>', '<main>', '<aside>', '<dialog>']` (exact bundle list finalized during implementation by reading the page source against the contract registries).

### ExamplesShell composition

```html
<div class="examples-stage">
	<slot />

	<!-- Floating toolbar — position:fixed via .examples-toolbar in showcase.css -->
	<menu role="toolbar" class="examples-toolbar" :aria-label="`${title} navigation`">
		<li><button class="subtle" @click="goDocs" aria-label="Back to docs">…</button></li>
		<li><button class="subtle" :disabled="!previous" @click="goPrev">…</button></li>
		<li class="examples-toolbar-label">
			<button ref="pickerRef" class="subtle dropdown-toggle" popovertarget="examples-picker">
				<i class="icon" style="--icon: var(--set-icon-window-stack)" />{{ title }}
			</button>
			<menu id="examples-picker" popover="auto" class="dropdown-menu">
				<li v-for="ex in examples" :key="ex.id">
					<button :aria-current="ex.id === id ? 'true' : undefined" @click="chooseExample(ex.id)">
						<i class="icon" :style="`--icon: var(--set-icon-${ex.icon})`" /> {{ ex.title }}
					</button>
				</li>
			</menu>
		</li>
		<li><button class="subtle" :disabled="!next" @click="goNext">…</button></li>
		<li><button class="subtle" @click="theme.toggle()">…</button></li>
		<li><button class="primary" popovertarget="examples-source">View source</button></li>
	</menu>

	<!-- Source viewer — <dialog> via useDialog -->
	<Teleport to="body">
		<dialog id="examples-source" ref="sourceRef" :aria-label="`${title} source`">
			<header>
				<h2><i class="icon" style="--icon: var(--set-icon-code-slash)" /> {{ title }} — source</h2>
				<button class="subtle compact" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
				<button class="subtle compact" @click="sourceDialog.hide()" aria-label="Close">×</button>
			</header>
			<pre class="font-mono small"><code>{{ displaySource }}</code></pre>
			<footer>
				<small>Imports rewritten to `@elements/browser` for copy-paste portability.</small>
			</footer>
		</dialog>
	</Teleport>
</div>
```

Wiring:

- `useDialog(sourceRef)` for the source viewer (Esc dismiss, focus trap, `::backdrop`).
- `useMenu(pickerRef)` for the example picker dropdown.
- `useTheme({ initial: 'light' })` for the theme toggle (singleton refs — same instance the docs shell uses, so toggling here affects the docs too).
- `displaySource` rewrites monorepo-relative imports (`../../../src/browser`) back to `@elements/browser` so the snippet compiles unchanged in a consumer project. Same substitution pattern as mailbox.

### Translation table (Bootstrap → elements)

| Mailbox idiom                                    | Elements port                                                        | Rationale                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `.btn`, `.btn-primary`                           | `<button class="primary">`                                           | Modifier cascade — variant is the element's identity, not a class root |
| `.btn-group[role=toolbar]`                       | `<menu role="toolbar">`                                              | Parity test already recognizes this via `ATTR_ROOTED.role-group`       |
| `.dropdown` + `.dropdown-menu`                   | `useMenu` + `<button popovertarget>` + `<menu popover>`              | Native Popover API; no Bootstrap JS                                    |
| `.modal modal-xl`                                | `<dialog>` + `useDialog`                                             | Native top-layer + `::backdrop`                                        |
| `.offcanvas-md offcanvas-start`                  | `<aside :popover="isMobile ? 'auto' : undefined">` mirroring App.vue | The framework's mobile drawer pattern                                  |
| `.navbar-row`, `.navbar-expand-md`               | `<header>` + Tailwind utilities                                      | Tailwind v4 is the utility layer                                       |
| `.bi bi-*`                                       | `<i class="icon" style="--icon: var(--set-icon-X)">`                 | Elements' icon mask system                                             |
| `.btn-close`                                     | `<button class="subtle compact" aria-label="Close">×</button>`       | Modifier cascade — no widget-specific class root                       |
| `.fade .show`                                    | drop — `<dialog>` / `<aside popover>` handle transitions natively    | UA lifecycle, not JS-managed classes                                   |
| `.text-primary`, `.fw-semibold`, `.fs-4`         | Tailwind v4 utilities (`text-primary`, `font-semibold`, `text-xl`)   | Tailwind owns the utility vocabulary                                   |
| `.stat-delta-up`, `.timeline-marker-*`, `.tag-*` | scoped `<style>` in the example component                            | Presentation-only, not framework chrome                                |
| `.container-shell-row`, `.dashboard-sidebar`     | scoped `<style>`                                                     | Layout glue specific to one example                                    |

### App.vue chrome gating

Add a computed flag to `App.vue`:

```ts
const isExample = computed(() => current.value.group === 'Examples')
```

Wrap the existing `<header>`, `<nav id="primary-rail">`, `<aside id="toc-rail">`, `<footer>` blocks with `v-if="!isExample"`. The `<main>` stays. Examples render their own header / sidebar / footer if they want them.

The body grid `body:has(> main)` rule from the framework places `<main>` in its grid slot even when siblings are absent — the example's `.examples-stage` `<div>` inside `<main>` claims the viewport via scoped CSS.

## Data flow

`router.ts` (hash) → `current` ref → `App.vue` (chrome gate) → `<component :is="page" />` → `DashboardExamplePage.vue` → `ExamplesShell.vue` (toolbar + dialog) → slotted `DashboardExample.vue` (the app itself).

The toolbar's prev / next / picker buttons call `navigate(id)` from `router.ts`, which mutates `window.location.hash`; the hashchange listener already in `router.ts` updates `current`, which re-renders the page.

## Testing

### Automatic (no new wiring)

- **`tests/app/browser/semantics.test.ts`** — discovers every `*Page` barrel export, runs the Inspector against the page mounted to a fresh host under the real framework cascade, fails on any `error`-severity finding. Adding `DashboardExamplePage` to the barrel auto-enrolls it. **This is the inspector audit the user asked for, built-in.**
- **`tests/app/browser/parity.test.ts`** — discovers via barrel + routes + `PAGE_SURFACE_BUNDLES`. As long as `DashboardExamplePage` is bundle-entered (or imports a composable / uses a registered element), parity stays green.
- **`tests/app/browser/pages.test.ts`** — the route ↔ barrel ↔ filesystem bijection. Adding the route + barrel export + file satisfies it.
- **`tests/app/browser/parity.test.ts`** § "page belongs to a known route group" — passes once `'Examples'` is in `ROUTE_GROUPS`.

### New (this spec)

- **`tests/app/browser/pages/DashboardExamplePage.test.ts`** — same shape as `AsidePage.test.ts`:
  - mount the page, assert the example's intro / landmark structure (e.g., `header`, `main`, `aside` drawer host) renders;
  - assert the toolbar `<menu role="toolbar">` is present and contains expected buttons;
  - assert the source `<dialog>` is in the DOM (closed by default).

- **`tests/app/browser/examples/DashboardExample.test.ts`** — focused on the example-specific framework usage:
  - `useAside` drawer wiring: `<aside :popover>` exists and has the expected ID for the toggle button's `popovertarget`;
  - stat / activity row counts match the page's data;
  - status tags render with the correct variant classes (`information`, `success`, `warning`, `danger`).

Both tests follow the existing `mount() { host, teardown }` idiom with `try { … } finally { teardown() }`.

### Verification ritual (must run before declaring done)

1. `npm run check` (oxlint + vue-tsc) — passes.
2. `npm run test:app:browser` — every page test green, including the new semantics + parity entries.
3. Visual verification:
   - Elements dev server (already running on `:5173`) on `#/example-dashboard`.
   - Mailbox dev server (started via Bash, port 5174) on `#/example-dashboard`.
   - Screenshot both, eyeball side-by-side.
4. Inspector dogfood: navigate to `#/inspector` in the elements showcase — the sandbox-pasted dashboard markup should report zero `error` findings (extra confirmation beyond the automated `semantics.test.ts`).

## Risks & rollback

- **Risk: `App.vue` chrome gating breaks the existing showcase layout** — mitigated by `v-if` on the chrome blocks (additive, doesn't touch the existing `<main>` rendering). Rollback: revert App.vue.
- **Risk: removing four of five body-grid children leaves `<main>` in a non-viewport-filling cell.** The framework's `body:has(> main)` likely uses `grid-template-areas` with named slots for header / nav / main / aside / footer. When only `<main>` is present, the other cells exist but stay empty — `<main>` keeps its assigned cell shape, which may not be the full viewport. **Mitigation:** add a body-level class (e.g., `body.examples-mode`) toggled by `App.vue` via `useTemplateRef` + `onMounted` / `onUnmounted` document.body class manipulation, and in `showcase.css` write `body.examples-mode { display: block; }` (or override the grid-template-areas to a single-cell `"main"`). The exact override is finalized during implementation by inspecting `src/styles/base/_body.scss` (or wherever the body grid lives).
- **Risk: `PAGE_SURFACE_BUNDLES` entry is wrong → parity test fails** — caught locally before commit. Fix the bundle entry, no production impact.
- **Risk: `semantics.test.ts` finds `error`-severity issues in the ported example** — the WHOLE POINT of the test. Fix the markup (the gate is the spec for "proper semantic"), don't add an exemption.
- **Risk: Mailbox port loses behavioral fidelity (e.g., drawer doesn't open at the right breakpoint)** — caught in the visual verification step. Adjust the `:popover` binding's mobile-query threshold to match mailbox's `md` breakpoint.

## Order of work

1. `types.ts` — add `'Examples'` to `ROUTE_GROUPS`.
2. `app/browser/examples/examples.ts` — metadata registry (Dashboard only for now; the other four entries land in the follow-up session).
3. `app/browser/examples/ExamplesShell.vue` — toolbar + source dialog.
4. `app/browser/examples/DashboardExample.vue` — semantic-first port of mailbox's Dashboard.
5. `app/browser/examples/DashboardExamplePage.vue` — thin wrapper.
6. `app/browser/router.ts` — register the route.
7. `app/browser/index.ts` — export from barrel.
8. `app/browser/App.vue` — chrome-gate branch.
9. `app/browser/styles/showcase.css` — `.examples-*` chrome.
10. `tests/app/browser/pages/_contract.ts` — bundle entry.
11. `tests/app/browser/pages/DashboardExamplePage.test.ts` — page smoke.
12. `tests/app/browser/examples/DashboardExample.test.ts` — example-specific.
13. Run verification ritual.
14. Hand back to user for review **before** porting Mail / Marketing / Auth / CRM.

## Follow-up sessions (not this spec)

- Port `MailExample.vue` — three-pane inbox; exercises `useAside` (folders drawer), `<menu role="toolbar">` (message-actions rail), `<details>` (collapsed threads).
- Port `MarketingExample.vue` — hero + features; mostly content (`<section>`, `<article>`, `<figure>`).
- Port `AuthExample.vue` — split-screen sign-in; exercises `<form>` chrome, OAuth buttons, `<hr>` divider.
- Port `CrmExample.vue` — three-pane agent workspace; exercises `useDrag` / `useDrop`, accordion (`<details>`), `<dialog>` for inline forms.
