# Examples Port — Dashboard Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port mailbox's `DashboardExample` to elements as the first member of a new `Examples` route group, rebuilt in semantic-first vocabulary with a reusable `ExamplesShell` wrapper, verified against the existing Inspector + parity gates.

**Architecture:** New `app/browser/examples/` folder with `examples.ts` metadata, `ExamplesShell.vue` (toolbar + view-source dialog using `useDialog` / `useMenu` / `useTheme`), `DashboardExample.vue` (the app under test), and `DashboardExamplePage.vue` (thin wrapper). `App.vue` gates the docs chrome off when `current.group === 'Examples'` so the example fills the viewport. The existing `semantics.test.ts` enrolls the new page in the Inspector dogfood gate automatically via the barrel.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Vite, vitest with `@vitest/browser-playwright`, Tailwind v4 utilities, the project's own `@elements/browser` composables (`useDialog`, `useMenu`, `useAside`, `useTheme`).

**Spec:** [docs/superpowers/specs/2026-05-20-examples-port-design.md](../specs/2026-05-20-examples-port-design.md)

---

## File Structure

```
app/browser/examples/                       # NEW folder
  examples.ts                               # NEW: readonly metadata registry
  ExamplesShell.vue                         # NEW: floating toolbar + source dialog
  DashboardExample.vue                      # NEW: the example app itself
  DashboardExamplePage.vue                  # NEW: wraps DashboardExample in ExamplesShell

app/browser/
  types.ts                                  # MODIFY: append 'Examples' to ROUTE_GROUPS
  router.ts                                 # MODIFY: register DashboardExamplePage route
  index.ts                                  # MODIFY: export DashboardExamplePage from barrel
  App.vue                                   # MODIFY: gate chrome off when group === 'Examples'

app/browser/styles/
  showcase.css                              # MODIFY: add .examples-* chrome rules

tests/app/browser/pages/
  _contract.ts                              # MODIFY: add DashboardExamplePage to PAGE_SURFACE_BUNDLES
  DashboardExamplePage.test.ts              # NEW: page-level render smoke + landmark asserts

tests/app/browser/examples/                 # NEW folder
  DashboardExample.test.ts                  # NEW: example-specific framework-usage asserts
```

Responsibilities are isolated by file: `examples.ts` is pure data (no DOM, no Vue), `ExamplesShell.vue` is reusable scaffolding (theme + nav + source viewer), `DashboardExample.vue` is the app itself (no toolbar concerns), `DashboardExamplePage.vue` is a 5-line glue file. Tests sit alongside their subjects.

---

## Task 1: Add `Examples` to `ROUTE_GROUPS`

**Files:**

- Modify: `app/browser/types.ts`

- [ ] **Step 1: Append `'Examples'` to `ROUTE_GROUPS`**

Open `app/browser/types.ts`. Find the `ROUTE_GROUPS` tuple (currently ends with `'Composables — Primitives'`). Replace it with:

```ts
export const ROUTE_GROUPS = [
	'Getting started',
	'Foundations',
	'Elements — Interactive',
	'Elements — Content',
	'Components',
	'Surfaces',
	'Composables — Element-bound',
	'Composables — Attribute-bound',
	'Composables — Primitives',
	'Examples',
] as const
```

Also update the JSDoc block above `ROUTE_GROUPS` to add the new entry:

```ts
 *  10. `Examples`                     — Full-page layout templates. Rendered
 *                                       without the docs chrome so the
 *                                       example claims the viewport.
```

(Insert as the new line 10 in the numbered list inside the doc comment, after `Composables — Primitives`.)

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS (the tuple change is purely additive — no existing route uses `'Examples'` yet, so nothing depends on the new entry).

- [ ] **Step 3: Commit**

```bash
git add app/browser/types.ts
git commit -m "feat(app:browser): add Examples to ROUTE_GROUPS

Prepares the route topology for the new fullscreen layout-templates
group. No routes yet reference the group; this is the type-level seam."
```

---

## Task 2: Examples metadata registry

**Files:**

- Create: `app/browser/examples/examples.ts`

- [ ] **Step 1: Create the file**

Create `app/browser/examples/examples.ts` with:

```ts
// Registry of layout examples. Mirrors the shape of `router.ts`'s `Route`
// so the docs navigation can lift example metadata into the sidebar /
// footer / toolbar picker without re-implementing the join.
//
// Pure data + types. No Vue imports so any non-Vue consumer (tests,
// build tooling) can pull it freely.

export interface ExampleMeta {
	readonly id: string
	readonly title: string
	readonly tagline: string
	readonly icon: string
}

export const examples: readonly ExampleMeta[] = [
	{
		id: 'example-dashboard',
		title: 'Dashboard',
		tagline:
			'Sidebar drawer + topbar action rail + stat cards + activity timeline. ' +
			'Exercises useAside, <menu role="toolbar">, and the modifier-cascade button vocabulary.',
		icon: 'speedometer',
	},
]

export const isExampleId = (id: string): boolean => examples.some((e) => e.id === id)
```

Note: only the Dashboard entry lands in this PR. The other four (Mail / Marketing / Auth / CRM) are explicit follow-ups per the spec.

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS — no consumers yet.

- [ ] **Step 3: Commit**

```bash
git add app/browser/examples/examples.ts
git commit -m "feat(app:browser/examples): add ExampleMeta registry

One entry for now (Dashboard). The other four mailbox examples land
in a follow-up after the Dashboard slice is reviewed."
```

---

## Task 3: Add `.examples-*` chrome to `showcase.css`

**Files:**

- Modify: `app/browser/styles/showcase.css` (append to end)

The toolbar pins to the bottom-end corner above 600px and bottom-center on mobile (thumb zone). The source `<dialog>` is sized to `--modal-inline-size-xl` (or a generous default). All `.examples-*` selectors live here, not framework SCSS — they're showcase-app glue, mirroring the placement decision the existing `.showcase-*` chrome makes.

- [ ] **Step 1: Append the chrome block**

Open `app/browser/styles/showcase.css` and append (at end of file):

```css
/* ============================================================================
 * Examples — fullscreen layout templates rendered with the docs chrome
 * gated off. Three concerns:
 *
 *   1. `.examples-stage` claims the viewport. It's a direct child of
 *      `<main>` inside an examples route; the example's own layout
 *      (sidebar drawer, topbar, scrolling content) composes inside.
 *
 *   2. `.examples-toolbar` is the floating prev/next/picker/theme/source
 *      bar. Pinned bottom-end on desktop, bottom-center on mobile so the
 *      thumb zone is honoured. Uses the framework's `<menu role="toolbar">`
 *      pattern + `.subtle` / `.primary` modifier buttons — no Bootstrap
 *      btn-group chrome.
 *
 *   3. `.examples-source` is the scrollable code surface inside the
 *      view-source `<dialog>`. Monospace, line-wrapped, body-tertiary
 *      background so syntax (when added later) reads against the chrome.
 *
 * Placement rationale: this file already owns `.showcase-*` (sidebar,
 * filter, TOC heading) — `.examples-*` is the same flavor (app-glue, not
 * framework chrome), so it co-locates.
 * ============================================================================ */

.examples-stage {
	display: contents;
}

.examples-toolbar {
	position: fixed;
	inset-block-end: max(1rem, env(safe-area-inset-bottom));
	inset-inline-start: 50%;
	transform: translateX(-50%);
	z-index: 1080;
	display: inline-flex;
	margin: 0;
	padding: 0;
	gap: 0.25rem;
	list-style: none;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: 999px;
	box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.12);
}

.examples-toolbar > li {
	display: contents;
}

@media (min-width: 600px) {
	.examples-toolbar {
		inset-inline-start: auto;
		inset-inline-end: max(1rem, env(safe-area-inset-right));
		transform: none;
	}
}

.examples-toolbar-label {
	min-inline-size: 9rem;
	max-inline-size: 14rem;
}

.examples-toolbar-label > button > .examples-toolbar-label-text {
	display: inline-block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: middle;
}

.examples-source {
	margin: 0;
	padding: 1rem 1.25rem;
	max-block-size: 70dvh;
	overflow: auto;
	background: var(--color-surface-tertiary, var(--color-surface));
	white-space: pre;
	font-size: 0.8125rem;
	line-height: 1.45;
}
```

- [ ] **Step 2: Verify dev server still builds**

The dev server (port 5173, already running per the earlier preview_start) auto-reloads on CSS changes. Watch the preview logs for compile errors.

Run: `npm run check` (catches selector typos via vue-tsc on template uses later — not now, but it's a free check).
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/browser/styles/showcase.css
git commit -m "feat(app:styles): add .examples-* chrome for layout templates

Floating prev/next/picker toolbar pinned bottom-end on desktop +
bottom-center on mobile, and a scrollable .examples-source surface
for the view-source dialog. Same showcase-app-glue flavor as the
existing .showcase-* rules."
```

---

## Task 4: ExamplesShell.vue — toolbar + source dialog wrapper

**Files:**

- Create: `app/browser/examples/ExamplesShell.vue`

This component owns the toolbar (prev/next/picker/theme toggle/source button) and the view-source `<dialog>`. It wraps the example via a `<slot>`. Backed by `useDialog` (source viewer) + `useMenu` (picker dropdown) + `useTheme` (toggle).

- [ ] **Step 1: Create the file**

Create `app/browser/examples/ExamplesShell.vue` with:

```vue
<script lang="ts" setup>
/**
 * ExamplesShell — toolbar + view-source dialog wrapper for layout
 * examples. The example's own markup goes into the default slot; the
 * shell paints the floating toolbar (prev / next / picker / theme /
 * source) on top. Three composables wire the chrome:
 *
 *   - `useDialog` owns the view-source `<dialog>` (Esc dismiss, focus
 *     trap, native `::backdrop`).
 *   - `useMenu` powers the example-picker dropdown.
 *   - `useTheme` mirrors the docs shell's singleton theme refs so
 *     toggling here propagates to the rest of the showcase.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useDialog, useMenu, useTheme } from '@elements/browser'
import { navigate } from '../router.js'
import { examples } from './examples.js'

const props = defineProps<{
	readonly id: string
	readonly title: string
	readonly source: string
}>()

// Theme — same singleton refs the docs shell uses.
const theme = useTheme()
const themeIcon = computed(() => (theme.mode.value === 'dark' ? 'moon' : 'sun'))

// Example picker — useMenu over a popover <menu>.
const pickerRef = useTemplateRef<HTMLButtonElement>('pickerRef')
const pickerMenuRef = useTemplateRef<HTMLMenuElement>('pickerMenuRef')
const picker = useMenu(pickerRef, pickerMenuRef, { placement: 'top-end' })

const chooseExample = (id: string): void => {
	picker.hide()
	if (id !== props.id) navigate(id)
}

// Source viewer — useDialog over a native <dialog>.
const sourceRef = useTemplateRef<HTMLDialogElement>('sourceRef')
const source = useDialog(sourceRef)

// Rewrite monorepo-relative imports back to '@elements/browser' so the
// snippet compiles unchanged in any project that depends on elements.
const displaySource = computed(() =>
	props.source.replace(/from '(?:\.\.\/)+src\/browser'/g, "from '@elements/browser'"),
)
const lineCount = computed(() => displaySource.value.split('\n').length)

// Copy-to-clipboard — flips a 1.5s "Copied" badge.
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null
const copy = async (): Promise<void> => {
	try {
		await navigator.clipboard.writeText(displaySource.value)
		copied.value = true
		if (copyTimer) clearTimeout(copyTimer)
		copyTimer = setTimeout(() => {
			copied.value = false
		}, 1500)
	} catch {
		copied.value = false
	}
}

// Prev / next walk the registry in order. `null` at either end disables
// the chevron so the toolbar reads as bounded.
const currentIndex = computed(() => examples.findIndex((e) => e.id === props.id))
const previous = computed(() => {
	const idx = currentIndex.value
	return idx > 0 ? (examples[idx - 1] ?? null) : null
})
const next = computed(() => {
	const idx = currentIndex.value
	return idx >= 0 && idx < examples.length - 1 ? (examples[idx + 1] ?? null) : null
})

const goDocs = (): void => navigate('home')
const goPrev = (): void => {
	if (previous.value) navigate(previous.value.id)
}
const goNext = (): void => {
	if (next.value) navigate(next.value.id)
}
</script>

<template>
	<div class="examples-stage">
		<slot />

		<!-- Floating toolbar — `<menu role="toolbar">` is the canonical
		     elements pattern (parity test recognizes it via ATTR_ROOTED). -->
		<menu class="examples-toolbar" role="toolbar" :aria-label="`${title} example navigation`">
			<li>
				<button type="button" class="subtle compact" aria-label="Back to docs" @click="goDocs">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-arrow-left)"></i>
				</button>
			</li>
			<li>
				<button
					type="button"
					class="subtle compact"
					aria-label="Previous example"
					:disabled="!previous"
					@click="goPrev"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
				</button>
			</li>
			<li class="examples-toolbar-label">
				<button
					ref="pickerRef"
					type="button"
					class="subtle"
					aria-haspopup="menu"
					:aria-label="`Choose example: currently ${title}`"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-window-stack)"></i>
					<span class="examples-toolbar-label-text">{{ title }}</span>
				</button>
				<menu ref="pickerMenuRef" popover="auto" class="dropdown-menu" role="menu">
					<li v-for="example in examples" :key="example.id" role="none">
						<button
							type="button"
							role="menuitem"
							:aria-current="example.id === id ? 'true' : undefined"
							@click="chooseExample(example.id)"
						>
							<i
								class="icon"
								aria-hidden="true"
								:style="`--icon: var(--set-icon-${example.icon})`"
							></i>
							{{ example.title }}
						</button>
					</li>
				</menu>
			</li>
			<li>
				<button
					type="button"
					class="subtle compact"
					aria-label="Next example"
					:disabled="!next"
					@click="goNext"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-right)"></i>
				</button>
			</li>
			<li>
				<button
					type="button"
					class="subtle compact"
					:aria-label="`Switch theme (currently ${theme.mode.value})`"
					@click="theme.toggle()"
				>
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${themeIcon})`"></i>
				</button>
			</li>
			<li>
				<button type="button" class="primary" aria-label="View source" @click="source.show()">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-code-slash)"></i>
					Source
				</button>
			</li>
		</menu>

		<!-- View-source dialog. <dialog> + useDialog → modal + focus trap +
		     ::backdrop, all native. Teleported to body so it escapes the
		     example's potentially-transform-clipped containers. -->
		<Teleport to="body">
			<dialog ref="sourceRef" :aria-label="`${title} example source`">
				<header>
					<h2>
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-code-slash)"></i>
						{{ title }} — source
						<small class="font-mono">{{ lineCount }} lines</small>
					</h2>
					<button type="button" class="subtle compact" :class="{ primary: copied }" @click="copy">
						<i
							class="icon"
							aria-hidden="true"
							:style="`--icon: var(--set-icon-${copied ? 'check' : 'clipboard'})`"
						></i>
						{{ copied ? 'Copied' : 'Copy' }}
					</button>
					<button
						type="button"
						class="subtle compact"
						aria-label="Close source"
						@click="source.hide()"
					>
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
					</button>
				</header>
				<pre class="examples-source font-mono"><code>{{ displaySource }}</code></pre>
				<footer>
					<small>
						Imports rewritten to <code>@elements/browser</code> so the snippet compiles unchanged in
						any project that installs elements.
					</small>
				</footer>
			</dialog>
		</Teleport>
	</div>
</template>
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: PASS.

If `vue-tsc` complains about missing icon tokens (`--set-icon-window-stack`, `--set-icon-clipboard`, `--set-icon-check`, etc.), grep the tokens file to find the real names:

```bash
grep -n "set-icon-" src/styles/theme/_tokens.scss | head -40
```

Replace any missing token with the closest available one and add a TODO comment. (Do **not** add new icon tokens in this slice — out of scope.)

- [ ] **Step 3: Commit**

```bash
git add app/browser/examples/ExamplesShell.vue
git commit -m "feat(app:browser/examples): add ExamplesShell wrapper

Floating toolbar + view-source dialog backed by useDialog, useMenu,
useTheme. <menu role=toolbar> + .subtle/.primary modifier buttons —
no Bootstrap btn-group chrome."
```

---

## Task 5: DashboardExample.vue — the semantic-first port

**Files:**

- Create: `app/browser/examples/DashboardExample.vue`

This is the heaviest task. The mailbox version uses Bootstrap classes throughout; the elements port rewrites every chunk in semantic vocabulary per the Translation Table in the spec.

Layout plan:

- Outer wrapper: a single `<div class="dashboard-shell">` with `display: grid; grid-template-columns: auto 1fr; height: 100dvh` (scoped CSS).
- Sidebar: `<aside :popover="isMobile ? 'auto' : undefined">` via `useAside`. Mobile-only popover binding so it's a drawer below 768px and an in-flow column above.
- Main column: `<div class="dashboard-main">` containing `<header>` (topbar with search + actions menu) + `<main>` (scrolling content area).
- Topbar actions: `<menu role="toolbar" class="dashboard-actions">` with `.subtle compact` buttons.
- Range picker (7d/30d/90d): `<menu role="toolbar">` with `aria-pressed` on `.subtle` buttons.
- Stats: a grid of `<article>` cards with `<dl>` for stat label/value/delta.
- Revenue chart: `<figure>` with an `aria-label` + `<svg>` or a `<div>`-bar approximation (use a `<svg>` for accessibility — `<rect>` per day).
- Activity feed: `<ol>` of `<li>` rows. Each row carries `<time>` + name + action + target + status `<small class="tag">`.

- [ ] **Step 1: Create the file with full markup**

Create `app/browser/examples/DashboardExample.vue` with:

```vue
<script lang="ts" setup>
/**
 * DashboardExample — semantic-first port of mailbox's DashboardExample.
 *
 * Layout intent (preserved from mailbox):
 *   - Persistent left sidebar above 768px; offcanvas drawer below.
 *   - Topbar with search + action menu; collapses to a hamburger drawer
 *     below 768px.
 *   - Stat cards row, then revenue chart + quick-actions side-by-side,
 *     then a recent-activity timeline.
 *
 * Translation rules (per the spec):
 *   - `.btn-primary` / `.btn-secondary` → bare <button class="primary|subtle">.
 *   - `.btn-group[role=toolbar]` → <menu role="toolbar">.
 *   - `.offcanvas-md offcanvas-start` → <aside :popover>.
 *   - `.modal` would be → <dialog> + useDialog (none used in Dashboard).
 *   - `.bi bi-*` → <i class="icon" style="--icon: var(--set-icon-X)">.
 *   - `.card` → <article>. `.card-header/body/footer` → <header>/<div>/<footer>
 *     inside <article>.
 *   - `.timeline-item` → <li> in an <ol>; status uses <small class="tag X">.
 *   - `.stat-delta-*` → scoped CSS (presentation-only, not framework chrome).
 */
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useAside } from '@elements/browser'

interface Stat {
	readonly label: string
	readonly value: string
	readonly trend: 'up' | 'down' | 'flat'
	readonly delta: string
}

interface ActivityRow {
	readonly when: string
	readonly who: string
	readonly action: string
	readonly target: string
	readonly status: 'paid' | 'pending' | 'failed'
}

const stats: readonly Stat[] = [
	{ label: 'Monthly revenue', value: '$48,290', trend: 'up', delta: '+12.4%' },
	{ label: 'Active subscribers', value: '3,142', trend: 'up', delta: '+184' },
	{ label: 'Avg. response time', value: '1.4h', trend: 'down', delta: '-0.3h' },
	{ label: 'Open tickets', value: '27', trend: 'flat', delta: '0' },
]

const activity: readonly ActivityRow[] = [
	{
		when: '2m ago',
		who: 'Ada Lovelace',
		action: 'paid invoice',
		target: 'INV-1042',
		status: 'paid',
	},
	{
		when: '14m ago',
		who: 'Grace Hopper',
		action: 'submitted form',
		target: 'Onboarding · Step 3',
		status: 'pending',
	},
	{
		when: '38m ago',
		who: 'Linus Torvalds',
		action: 'updated billing',
		target: 'Visa •• 4012',
		status: 'paid',
	},
	{
		when: '1h ago',
		who: 'Margaret Hamilton',
		action: 'failed checkout',
		target: 'Cart 8721',
		status: 'failed',
	},
	{
		when: '3h ago',
		who: 'Hedy Lamarr',
		action: 'cancelled trial',
		target: 'Pro plan',
		status: 'pending',
	},
]

const statusVariant: Record<ActivityRow['status'], string> = {
	paid: 'success',
	pending: 'warning',
	failed: 'danger',
}

const trendIconToken: Record<Stat['trend'], string> = {
	up: 'arrow-up-right',
	down: 'arrow-down-right',
	flat: 'arrow-right',
}

const range = ref<'7d' | '30d' | '90d'>('30d')

// Mobile drawer breakpoint — mirrors the existing App.vue pattern of
// toggling the popover attribute below 960px. Dashboard uses 768px so
// stat cards have room to break to two columns before the sidebar
// dissolves.
const MOBILE_QUERY = '(max-width: 767.98px)'
const isMobile = ref(false)
const mobileMq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mobileMq?.matches ?? false
}

// Sidebar drawer — `useAside` upgrades the <aside popover> into a
// slide-from-edge drawer when the popover attribute is set (mobile).
const sidebarRef = useTemplateRef<HTMLElement>('sidebarRef')
const sidebar = useAside(sidebarRef, { popover: false })

// Compute a chart-bar height for the demo SVG. Deterministic (no rng)
// so screenshots are reproducible.
const chartBars = computed(() =>
	Array.from({ length: 30 }, (_, i) => ({
		x: i,
		h: 35 + Math.abs(Math.sin(i * 0.7)) * 65,
		highlight: i === 23,
	})),
)

onMounted(() => {
	syncMobile()
	mobileMq?.addEventListener('change', syncMobile)
})
onUnmounted(() => {
	mobileMq?.removeEventListener('change', syncMobile)
})
</script>

<template>
	<div class="dashboard-shell">
		<!-- ── Sidebar ────────────────────────────────────────────────
		     <aside> as a body-shell-style rail. Above 768px it's an
		     in-flow grid column; below 768px the `:popover` binding
		     promotes it to a drawer via the framework's
		     `aside[popover]` chrome. -->
		<aside
			id="dashboard-sidebar"
			ref="sidebarRef"
			class="dashboard-sidebar"
			:popover="isMobile ? 'auto' : undefined"
			aria-label="Primary navigation"
		>
			<header class="dashboard-sidebar-brand">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-box)"></i>
				<strong>Acme Console</strong>
				<button
					v-if="isMobile"
					type="button"
					class="subtle compact"
					aria-label="Close menu"
					popovertarget="dashboard-sidebar"
					popovertargetaction="hide"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
				</button>
			</header>
			<nav aria-label="Workspace">
				<menu>
					<li>
						<a href="#" aria-current="page">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-speedometer)"></i>
							Overview
						</a>
					</li>
					<li>
						<a href="#">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-bar-chart)"></i>
							Analytics
						</a>
					</li>
					<li>
						<a href="#">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-people)"></i>
							Customers
						</a>
					</li>
					<li>
						<a href="#">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-receipt)"></i>
							Invoices
						</a>
					</li>
					<li>
						<a href="#">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-gear)"></i>
							Settings
						</a>
					</li>
				</menu>
				<h6>Workspaces</h6>
				<menu>
					<li>
						<a href="#" class="dashboard-workspace">
							<span class="dashboard-workspace-mark" aria-hidden="true">A</span>
							Acme Inc
						</a>
					</li>
					<li>
						<a href="#" class="dashboard-workspace">
							<span class="dashboard-workspace-mark" aria-hidden="true">B</span>
							Buena Vista
						</a>
					</li>
				</menu>
			</nav>
			<footer class="dashboard-sidebar-account">
				<span class="dashboard-account-mark" aria-hidden="true">MS</span>
				<span class="dashboard-account-meta">
					<strong>Mike Saint</strong>
					<small>mike@acme.dev</small>
				</span>
			</footer>
		</aside>

		<!-- ── Main column ─────────────────────────────────────────── -->
		<div class="dashboard-main">
			<header class="dashboard-topbar">
				<button
					v-if="isMobile"
					type="button"
					class="subtle compact"
					aria-label="Open menu"
					popovertarget="dashboard-sidebar"
				>
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
				</button>
				<form class="dashboard-search" role="search" @submit.prevent>
					<label>
						<span class="sr-only">Search</span>
						<input
							type="search"
							placeholder="Search customers, invoices, settings…"
							autocomplete="off"
						/>
					</label>
				</form>
				<menu role="toolbar" aria-label="Dashboard actions" class="dashboard-actions">
					<li>
						<button type="button" class="primary">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
							New invoice
						</button>
					</li>
					<li>
						<button type="button" class="subtle compact" aria-label="Refresh">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-refresh)"></i>
						</button>
					</li>
					<li>
						<button type="button" class="subtle compact" aria-label="Filter">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
						</button>
					</li>
					<li>
						<button type="button" class="subtle compact" aria-label="Export">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-download)"></i>
						</button>
					</li>
					<li>
						<button type="button" class="subtle compact" aria-label="Notifications">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-bell)"></i>
						</button>
					</li>
				</menu>
			</header>

			<main class="dashboard-content">
				<header class="dashboard-page-header">
					<hgroup>
						<p class="dashboard-eyebrow">Overview</p>
						<h1>Welcome back, Mike</h1>
						<p>Here's what's happened across your workspace this {{ range }}.</p>
					</hgroup>
					<menu role="toolbar" aria-label="Date range" class="dashboard-range">
						<li v-for="r in ['7d', '30d', '90d'] as const" :key="r">
							<button
								type="button"
								class="subtle"
								:class="{ active: range === r }"
								:aria-pressed="range === r"
								@click="range = r"
							>
								{{ r }}
							</button>
						</li>
					</menu>
				</header>

				<!-- Stat cards. <article> is the canonical card; <dl> carries
				     label/value/delta. -->
				<section aria-label="Key metrics" class="dashboard-stats">
					<article v-for="stat in stats" :key="stat.label">
						<dl>
							<dt>{{ stat.label }}</dt>
							<dd class="dashboard-stat-value">{{ stat.value }}</dd>
							<dd class="dashboard-stat-delta" :data-trend="stat.trend">
								<i
									class="icon"
									aria-hidden="true"
									:style="`--icon: var(--set-icon-${trendIconToken[stat.trend]})`"
								></i>
								{{ stat.delta }}
								<small>vs last period</small>
							</dd>
						</dl>
					</article>
				</section>

				<!-- Chart + Quick actions row. -->
				<section class="dashboard-chart-row" aria-label="Revenue and quick actions">
					<article class="dashboard-chart-card">
						<header>
							<hgroup>
								<h2>Revenue trajectory</h2>
								<p>Daily gross, cohort-adjusted</p>
							</hgroup>
							<ul class="dashboard-legend">
								<li>
									<span
										class="dashboard-legend-dot"
										data-series="revenue"
										aria-hidden="true"
									></span>
									Revenue
								</li>
								<li>
									<span
										class="dashboard-legend-dot"
										data-series="forecast"
										aria-hidden="true"
									></span>
									Forecast
								</li>
							</ul>
						</header>
						<figure aria-label="Revenue chart, illustrative">
							<svg viewBox="0 0 300 100" preserveAspectRatio="none" class="dashboard-chart">
								<rect
									v-for="bar in chartBars"
									:key="bar.x"
									:x="bar.x * 10 + 1"
									:y="100 - bar.h"
									width="8"
									:height="bar.h"
									:data-highlight="bar.highlight || undefined"
								/>
							</svg>
							<figcaption>
								Hover any bar for the day's breakdown — figures auto-adjust for refunds.
							</figcaption>
						</figure>
					</article>

					<article class="dashboard-actions-card">
						<header>
							<h2>Quick actions</h2>
						</header>
						<menu>
							<li>
								<button type="button" class="subtle">
									<i
										class="icon"
										aria-hidden="true"
										style="--icon: var(--set-icon-person-plus)"
									></i>
									Invite a teammate
								</button>
							</li>
							<li>
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-receipt)"></i>
									Draft an invoice
								</button>
							</li>
							<li>
								<button type="button" class="subtle">
									<i
										class="icon"
										aria-hidden="true"
										style="--icon: var(--set-icon-cloud-upload)"
									></i>
									Import customers
								</button>
							</li>
							<li>
								<button type="button" class="subtle">
									<i
										class="icon"
										aria-hidden="true"
										style="--icon: var(--set-icon-shield-check)"
									></i>
									Run a security audit
								</button>
							</li>
							<li>
								<button type="button" class="subtle">
									<i
										class="icon"
										aria-hidden="true"
										style="--icon: var(--set-icon-life-preserver)"
									></i>
									Contact support
								</button>
							</li>
						</menu>
					</article>
				</section>

				<!-- Activity timeline. <ol> for ordered events; <time> for
				     the timestamp; <small class="tag X"> for status. -->
				<section aria-label="Recent activity" class="dashboard-activity">
					<header>
						<hgroup>
							<h2>Recent activity</h2>
							<p>Last 24 hours across all workspaces</p>
						</hgroup>
						<a href="#">View all</a>
					</header>
					<ol class="dashboard-timeline">
						<li v-for="row in activity" :key="row.target" :data-status="row.status">
							<span class="dashboard-timeline-marker" aria-hidden="true"></span>
							<div class="dashboard-timeline-content">
								<p>
									<strong>{{ row.who }}</strong>
									<span>{{ row.action }}</span>
									<code>{{ row.target }}</code>
									<small class="tag" :class="statusVariant[row.status]">{{ row.status }}</small>
								</p>
								<time class="dashboard-when">{{ row.when }}</time>
							</div>
						</li>
					</ol>
				</section>
			</main>
		</div>
	</div>
</template>

<style scoped>
/* Layout glue — `.dashboard-*` classes are scoped to this example.
 * Framework SCSS owns nothing dashboard-specific; this file is the
 * full local presentation surface. */

.dashboard-shell {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	block-size: 100dvh;
	overflow: hidden;
	background: var(--color-canvas);
}

@media (max-width: 767.98px) {
	.dashboard-shell {
		grid-template-columns: minmax(0, 1fr);
	}
}

.dashboard-sidebar {
	inline-size: 16rem;
	display: flex;
	flex-direction: column;
	border-inline-end: 1px solid var(--color-border);
	background: var(--color-surface);
	overflow: hidden;
}

.dashboard-sidebar-brand {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 1rem;
	min-block-size: 3.5rem;
	border-block-end: 1px solid var(--color-border);
}

.dashboard-sidebar-brand > strong {
	flex: 1;
}

.dashboard-sidebar > nav {
	flex: 1;
	overflow-y: auto;
	padding: 0.5rem;
}

.dashboard-sidebar nav h6 {
	margin: 1.5rem 0 0.25rem;
	padding-inline: 0.75rem;
	font-size: 0.6875rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-subtle);
}

.dashboard-workspace {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
}

.dashboard-workspace-mark,
.dashboard-account-mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: 1.5rem;
	block-size: 1.5rem;
	border-radius: 999px;
	background: var(--color-surface-tertiary, var(--color-surface));
	font-size: 0.75rem;
	font-weight: 600;
}

.dashboard-sidebar-account {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-block-start: 1px solid var(--color-border);
}

.dashboard-account-mark {
	inline-size: 2rem;
	block-size: 2rem;
}

.dashboard-account-meta {
	display: flex;
	flex-direction: column;
	line-height: 1.2;
}

/* Main column ─ */

.dashboard-main {
	display: flex;
	flex-direction: column;
	min-inline-size: 0;
	overflow: hidden;
}

.dashboard-topbar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-inline: 1rem;
	min-block-size: 3.5rem;
	border-block-end: 1px solid var(--color-border);
	background: var(--color-surface);
}

.dashboard-search {
	flex: 1;
	min-inline-size: 0;
	max-inline-size: 22rem;
	margin-inline-end: auto;
}

.dashboard-search input {
	inline-size: 100%;
}

.dashboard-actions {
	display: inline-flex;
	gap: 0.25rem;
	margin: 0;
	padding: 0;
	list-style: none;
}

.dashboard-actions > li {
	display: contents;
}

.dashboard-content {
	flex: 1;
	overflow-y: auto;
	padding: 1.5rem;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.dashboard-page-header {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: flex-end;
	gap: 1rem;
}

.dashboard-page-header hgroup {
	margin: 0;
}

.dashboard-page-header h1 {
	margin: 0.25rem 0 0.5rem;
	font-size: 1.5rem;
}

.dashboard-eyebrow {
	margin: 0;
	font-size: 0.6875rem;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-subtle);
}

.dashboard-range {
	display: inline-flex;
	gap: 0;
	margin: 0;
	padding: 0;
	list-style: none;
}

.dashboard-range > li {
	display: contents;
}

.dashboard-range button.active {
	font-weight: 600;
	color: var(--color-text);
}

/* Stat cards ─ */

.dashboard-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 1rem;
}

.dashboard-stats article {
	padding: 1rem 1.25rem;
}

.dashboard-stats dl {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.dashboard-stats dt {
	font-size: 0.8125rem;
	color: var(--color-text-subtle);
}

.dashboard-stat-value {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
}

.dashboard-stat-delta {
	margin: 0;
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	font-size: 0.8125rem;
}

.dashboard-stat-delta[data-trend='up'] {
	color: var(--color-success, oklch(60% 0.15 145));
}
.dashboard-stat-delta[data-trend='down'] {
	color: var(--color-danger, oklch(60% 0.18 25));
}
.dashboard-stat-delta[data-trend='flat'] {
	color: var(--color-text-subtle);
}
.dashboard-stat-delta small {
	color: var(--color-text-subtle);
	margin-inline-start: 0.25rem;
}

/* Chart + Quick actions row ─ */

.dashboard-chart-row {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	gap: 1rem;
}

@media (max-width: 1024px) {
	.dashboard-chart-row {
		grid-template-columns: minmax(0, 1fr);
	}
}

.dashboard-chart-card,
.dashboard-actions-card {
	display: flex;
	flex-direction: column;
}

.dashboard-chart-card figure,
.dashboard-chart-card svg {
	margin: 0;
}

.dashboard-chart {
	inline-size: 100%;
	block-size: 14rem;
	display: block;
}

.dashboard-chart rect {
	fill: var(--color-primary, oklch(60% 0.15 250));
	opacity: 0.45;
}

.dashboard-chart rect[data-highlight] {
	fill: var(--color-info, oklch(70% 0.15 220));
	opacity: 0.85;
}

.dashboard-legend {
	display: inline-flex;
	gap: 1rem;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 0.8125rem;
}

.dashboard-legend-dot {
	display: inline-block;
	inline-size: 0.625rem;
	block-size: 0.625rem;
	border-radius: 999px;
	margin-inline-end: 0.375rem;
	vertical-align: middle;
}

.dashboard-legend-dot[data-series='revenue'] {
	background: var(--color-primary);
}
.dashboard-legend-dot[data-series='forecast'] {
	background: var(--color-info);
}

.dashboard-actions-card menu {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
}

.dashboard-actions-card menu > li > button {
	inline-size: 100%;
	justify-content: flex-start;
	text-align: start;
}

/* Activity timeline ─ */

.dashboard-activity > header {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	gap: 1rem;
	margin-block-end: 0.75rem;
}

.dashboard-timeline {
	margin: 0;
	padding: 0;
	list-style: none;
	border-inline-start: 2px solid var(--color-border);
	padding-inline-start: 1rem;
}

.dashboard-timeline > li {
	position: relative;
	padding-block: 0.5rem;
}

.dashboard-timeline-marker {
	position: absolute;
	inset-inline-start: calc(-1rem - 0.4rem - 1px);
	inset-block-start: 0.875rem;
	inline-size: 0.8rem;
	block-size: 0.8rem;
	border-radius: 999px;
	background: var(--color-surface);
	box-shadow: 0 0 0 2px currentColor;
	color: var(--color-text-subtle);
}

.dashboard-timeline > li[data-status='paid'] .dashboard-timeline-marker {
	color: var(--color-success);
}
.dashboard-timeline > li[data-status='pending'] .dashboard-timeline-marker {
	color: var(--color-warning);
}
.dashboard-timeline > li[data-status='failed'] .dashboard-timeline-marker {
	color: var(--color-danger);
}

.dashboard-timeline-content p {
	margin: 0;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.5rem;
}

.dashboard-timeline-content code {
	font-size: 0.8125rem;
}

.dashboard-timeline-content .tag {
	margin-inline-start: auto;
}

.dashboard-when {
	display: block;
	margin-block-start: 0.125rem;
	font-size: 0.75rem;
	color: var(--color-text-subtle);
}
</style>
```

- [ ] **Step 2: Visual sanity check via dev server**

The dev server is already running on `:5173`. The route isn't wired yet, so the example won't be navigable — but the SFC must compile. Watch preview logs:

```
preview_logs serverId=… level=error lines=30
```

Expected: no errors. (If you see "Cannot find icon token --set-icon-X" — substitute with the nearest available token from `src/styles/theme/_tokens.scss`.)

- [ ] **Step 3: Type check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/browser/examples/DashboardExample.vue
git commit -m "feat(app:browser/examples): port DashboardExample to elements

Semantic-first rebuild of mailbox's DashboardExample. <aside> sidebar
(with useAside-driven popover binding for the mobile drawer), <header>
topbar, <menu role=toolbar> action rails, <article> cards, <ol>
activity timeline. Scoped CSS for layout glue only; no framework-SCSS
additions."
```

---

## Task 6: DashboardExamplePage.vue — thin wrapper

**Files:**

- Create: `app/browser/examples/DashboardExamplePage.vue`

- [ ] **Step 1: Create the file**

Create `app/browser/examples/DashboardExamplePage.vue` with:

```vue
<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import DashboardExample from './DashboardExample.vue'
import source from './DashboardExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-dashboard" title="Dashboard" :source="source">
		<DashboardExample />
	</ExamplesShell>
</template>
```

The `?raw` query is Vite's built-in suffix that loads the file's text instead of compiling — same idiom mailbox uses to feed the view-source dialog.

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: PASS. (`?raw` imports return a `string` in Vite's declared types.)

- [ ] **Step 3: Commit**

```bash
git add app/browser/examples/DashboardExamplePage.vue
git commit -m "feat(app:browser/examples): add DashboardExamplePage wrapper

Thin glue: ExamplesShell + DashboardExample + ?raw source for the
view-source dialog."
```

---

## Task 7: Register the route

**Files:**

- Modify: `app/browser/router.ts`

- [ ] **Step 1: Import + route constant + array entry**

In `app/browser/router.ts`, add a new import after the existing imports block (before the `HOME` const):

```ts
// Examples — fullscreen layout templates rendered without the docs chrome.
import DashboardExamplePage from './examples/DashboardExamplePage.vue'
```

Then, after the last `INSPECTOR` route constant, add a new section + constant:

```ts
// ── Examples ───────────────────────────────────────────────────────────────

const EXAMPLE_DASHBOARD: Route = {
	id: 'example-dashboard',
	title: 'Dashboard',
	group: 'Examples',
	page: DashboardExamplePage,
}
```

Then append `EXAMPLE_DASHBOARD` to the `routes` array (at the very end, after `INSPECTOR`).

- [ ] **Step 2: Type check + dev-server smoke**

Run: `npm run check`
Expected: PASS.

In the preview server, navigate to `http://localhost:5173/#/example-dashboard` via:

```
preview_eval serverId=… expression="window.location.hash = '#/example-dashboard'; location.hash"
```

The page renders inside the docs shell with the chrome still painted (Task 9 hasn't run yet). The toolbar should be visible at the bottom-end corner; the sidebar should be a column above 768px.

Take a screenshot to record the current state:

```
preview_screenshot serverId=…
```

- [ ] **Step 3: Commit**

```bash
git add app/browser/router.ts
git commit -m "feat(app:browser): register example-dashboard route

Lands in the new 'Examples' group. Docs-chrome gating in App.vue
follows in the next commit."
```

---

## Task 8: Wire the page into the public barrel

**Files:**

- Modify: `app/browser/index.ts`

- [ ] **Step 1: Add the export**

In `app/browser/index.ts`, find the alphabetically-sorted block of `*Page` exports. Insert the new line in the right alphabetical position (between `DetailsPage` and `DialogElementPage`):

```ts
export { default as DashboardExamplePage } from './examples/DashboardExamplePage.vue'
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:app:browser`
Expected: most tests pass; two failures expected:

1. `pages.test.ts` — the route ↔ barrel ↔ filesystem bijection may complain about the new page (depending on whether it counts files under `examples/`). Note the exact failure for Task 11.
2. `parity.test.ts` § "DashboardExamplePage resolves to ≥1 registry artifact" — fails until Task 10 adds the bundle entry.
3. `semantics.test.ts` — runs the Inspector against `DashboardExamplePage`. If our markup is semantic-clean, this passes. If it surfaces `error`-severity findings, read the Inspector's message + path and fix the markup. **Don't add an exemption** — the gate is the spec.

Capture the output for the next tasks to fix.

- [ ] **Step 3: Commit**

```bash
git add app/browser/index.ts
git commit -m "feat(app:browser): export DashboardExamplePage from barrel

Enrols the page in the meta-driven test suites (pages.test.ts,
semantics.test.ts). Failures expected until parity bundle entry +
chrome gating land in the next commits."
```

---

## Task 9: Gate docs chrome off for Examples in `App.vue`

**Files:**

- Modify: `app/browser/App.vue`

The plan: add `const isExample = computed(() => current.value.group === 'Examples')`, then add `v-if="!isExample"` to the four chrome blocks (`<header>`, `<nav id="primary-rail">`, `<aside id="toc-rail">`, `<footer>`). The body grid has named `grid-template-areas`; removing four of five children leaves their `auto`-sized tracks at zero width / height, so `<main>` claims the viewport. No body-class trick needed for this baseline — if visual verification later shows residual gaps, the body-class fallback in the spec's Risks section is the next step.

- [ ] **Step 1: Add the computed**

In `app/browser/App.vue`, in the `<script setup>` block, after the existing `const page = computed(() => current.value.page)` line, add:

```ts
// Examples route group renders without the docs chrome — header / rails
// / footer drop out so the example claims the full viewport. The body
// grid's `grid-template-areas` collapse the auto-sized tracks for the
// missing slots, so the `main` cell expands to fill.
const isExample = computed(() => current.value.group === 'Examples')
```

- [ ] **Step 2: Add `v-if="!isExample"` to the four chrome blocks**

In the same file's `<template>`:

1. The `<header>` block at the top of the template (the one containing `showcase-nav-toggle`):
   - Add `v-if="!isExample"` to the opening `<header>` tag.

2. The `<nav id="primary-rail">` block:
   - Add `v-if="!isExample"` to the opening `<nav>` tag.

3. The `<aside id="toc-rail">` block:
   - Add `v-if="!isExample"` to the opening `<aside>` tag.

4. The `<footer>` block:
   - Add `v-if="!isExample"` to the opening `<footer>` tag.

The `<main>` block stays unchanged.

- [ ] **Step 3: Visual verification**

Reload the preview:

```
preview_eval serverId=… expression="location.hash = '#/example-dashboard'; location.reload(); true"
```

Take a screenshot:

```
preview_screenshot serverId=…
```

Expected: the dashboard fills the viewport. No docs header, no left sidebar with the showcase filter, no right TOC rail, no footer. The Examples toolbar is pinned to the bottom-end (or bottom-center on mobile widths). The dashboard's own sidebar shows on the left at desktop widths.

Navigate back to `#/home` and screenshot again:

```
preview_eval serverId=… expression="location.hash = '#/home'; true"
preview_screenshot serverId=…
```

Expected: the docs chrome is back. The two screenshots prove the gate works in both directions.

- [ ] **Step 4: Commit**

```bash
git add app/browser/App.vue
git commit -m "feat(app:browser): gate docs chrome off for Examples routes

Header, primary rail, TOC rail, and footer render only when the
current route's group is not 'Examples'. <main> stays — the body
grid's auto tracks collapse to zero when their slots are empty, so
<main> fills the viewport."
```

---

## Task 10: Update parity bundle

**Files:**

- Modify: `tests/app/browser/pages/_contract.ts`

The parity test (§4 — every non-exempt page demonstrates ≥1 artifact) needs a bundle entry for `DashboardExamplePage`. The page imports `useAside` and uses framework primitives (`<aside>`, `<header>`, `<main>`, `<menu role=toolbar>`, `<dialog>` via ExamplesShell, `useTheme`, `useDialog`, `useMenu`).

- [ ] **Step 1: Add the bundle entry**

In `tests/app/browser/pages/_contract.ts`, find the `PAGE_SURFACE_BUNDLES` object. Add a new entry (preserve alphabetical-ish ordering — drop it after `FormSurfacesPage`):

```ts
	// Layout-template page. Composes useAside (sidebar drawer), useDialog
	// (view-source modal in ExamplesShell), useMenu (example picker), and
	// useTheme (toolbar light/dark toggle). The toolbar exercises the
	// `<menu role="toolbar">` pattern recognized by ATTR_ROOTED in
	// parity.test.ts §3.
	DashboardExamplePage: ['useAside', 'useDialog', 'useMenu', 'useTheme'],
```

- [ ] **Step 2: Re-run the test suite**

Run: `npm run test:app:browser`
Expected: parity test passes for `DashboardExamplePage` now that the bundle is in place. The other tests should still pass.

If `semantics.test.ts` is still surfacing `error`-severity findings, switch to fixing the markup in `DashboardExample.vue` or `ExamplesShell.vue` — the gate names the rule + element path, fix the root cause. Common offenders to watch for:

- `<menu>` without an explicit `role` outside the toolbar context (advice-level, non-blocking).
- An `<aside>` inside `<main>` (the framework treats body > aside vs main aside as different chrome — verify ancestry).
- A heading-level jump (e.g., `<h1>` skipping to `<h3>`).
- A `<dialog>` missing `aria-label` / `aria-labelledby`.

- [ ] **Step 3: Commit**

```bash
git add tests/app/browser/pages/_contract.ts
git commit -m "test(app:browser/parity): bundle composables for DashboardExamplePage

useAside (sidebar drawer), useDialog (source viewer in
ExamplesShell), useMenu (example picker), useTheme (toolbar toggle)."
```

---

## Task 11: Page-level test — render smoke + landmarks

**Files:**

- Create: `tests/app/browser/pages/DashboardExamplePage.test.ts`

Mirror the shape of `AsidePage.test.ts`: mount the page, assert load-bearing semantic landmarks are present.

- [ ] **Step 1: Create the test file**

Create `tests/app/browser/pages/DashboardExamplePage.test.ts` with:

```ts
// ============================================================================
//  DashboardExamplePage — per-page BESPOKE parity (Phase-2 §7, Examples).
//
//  Reason to exist: the page mounts the ExamplesShell wrapper PLUS the
//  DashboardExample app under it. The guards anchor on the four
//  load-bearing semantic landmarks the port has to keep alive:
//
//    1. <aside id="dashboard-sidebar"> — the sidebar drawer host
//       (useAside reads this).
//    2. <header class="dashboard-topbar"> — the topbar rail.
//    3. <menu role="toolbar"> — the action rail + the range picker +
//       the ExamplesShell toolbar. At least three on the page.
//    4. <dialog aria-label="Dashboard example source"> — the
//       view-source dialog from ExamplesShell.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { DashboardExamplePage } from '../../../../app/browser/index.js'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DashboardExamplePage)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('DashboardExamplePage — render smoke', () => {
	it('mounts + renders the example shell + the dashboard app', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('.examples-stage')).not.toBeNull()
			expect(host.querySelector('.dashboard-shell')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('DashboardExamplePage — load-bearing landmarks', () => {
	it('sidebar drawer host is present with the expected id', () => {
		const { host, teardown } = mount()
		try {
			const sidebar = host.querySelector('aside#dashboard-sidebar')
			expect(sidebar).not.toBeNull()
			expect(sidebar?.getAttribute('aria-label')).toBe('Primary navigation')
		} finally {
			teardown()
		}
	})

	it('topbar header is present with the search role and action toolbar', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('header.dashboard-topbar')).not.toBeNull()
			expect(host.querySelector('form[role="search"]')).not.toBeNull()
			expect(
				host.querySelector('menu[role="toolbar"][aria-label="Dashboard actions"]'),
			).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders at least three <menu role="toolbar"> regions (actions, range, examples-shell)', () => {
		const { host, teardown } = mount()
		try {
			// Teleported elements (ExamplesShell's <dialog>) land on body, so
			// query both roots to catch the shell toolbar that's a sibling of
			// the example, not a descendant of the dashboard.
			const docToolbars = document.querySelectorAll('menu[role="toolbar"]')
			expect(docToolbars.length).toBeGreaterThanOrEqual(3)
		} finally {
			teardown()
		}
	})

	it('view-source <dialog> is in the DOM (closed by default)', () => {
		const { host, teardown } = mount()
		try {
			const dialog = document.querySelector('dialog[aria-label="Dashboard example source"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})
})
```

- [ ] **Step 2: Run the test**

Run: `npm run test:app:browser -- DashboardExamplePage`
Expected: all four tests pass. If any landmark assertion fails, fix the markup (the test is the spec for what the page must guarantee).

- [ ] **Step 3: Commit**

```bash
git add tests/app/browser/pages/DashboardExamplePage.test.ts
git commit -m "test(app:browser/pages): DashboardExamplePage render + landmarks

Mounts the page in isolation, asserts the four load-bearing landmarks
the port has to keep alive: <aside id=dashboard-sidebar>, the topbar
<header>, the toolbar <menu role=toolbar> regions (>=3 across page +
shell), and the view-source <dialog>."
```

---

## Task 12: Example-specific framework-usage test

**Files:**

- Create: `tests/app/browser/examples/DashboardExample.test.ts`

This file focuses on the framework idioms the Dashboard exercises — separate from page-level smoke so the assertions stay readable.

- [ ] **Step 1: Create the test file**

Create the directory + file:

```ts
// ============================================================================
//  DashboardExample — framework-usage assertions.
//
//  Separate from DashboardExamplePage.test.ts so the assertions stay
//  focused on the framework idioms the example exercises (rather than
//  the ExamplesShell scaffolding). The page-level test owns landmarks;
//  this file owns counts + data wiring.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import DashboardExample from '../../../../app/browser/examples/DashboardExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(DashboardExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('DashboardExample — framework idioms', () => {
	it('sidebar uses semantic <aside> with the expected id (useAside host)', () => {
		const { host, teardown } = mount()
		try {
			const sidebar = host.querySelector('aside#dashboard-sidebar')
			expect(sidebar).not.toBeNull()
			// The popover binding is conditional on viewport — desktop = no
			// attribute, mobile = "auto". In the jsdom/headless browser the
			// matchMedia listener is fired on mount; the assertion stays
			// agnostic by checking the attribute is *either* absent or "auto".
			const popover = sidebar?.getAttribute('popover')
			expect(popover === null || popover === 'auto').toBe(true)
		} finally {
			teardown()
		}
	})

	it('topbar action rail uses <menu role="toolbar">', () => {
		const { host, teardown } = mount()
		try {
			const toolbar = host.querySelector('menu[role="toolbar"][aria-label="Dashboard actions"]')
			expect(toolbar).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('renders one <article> per stat (4 stats)', () => {
		const { host, teardown } = mount()
		try {
			const cards = host.querySelectorAll('section.dashboard-stats > article')
			expect(cards.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('renders one timeline <li> per activity row (5 rows)', () => {
		const { host, teardown } = mount()
		try {
			const rows = host.querySelectorAll('ol.dashboard-timeline > li')
			expect(rows.length).toBe(5)
		} finally {
			teardown()
		}
	})

	it('status tags use the framework variant modifiers (.success / .warning / .danger)', () => {
		const { host, teardown } = mount()
		try {
			// The data has 2 paid, 2 pending, 1 failed.
			expect(host.querySelectorAll('ol.dashboard-timeline > li[data-status="paid"]').length).toBe(2)
			expect(
				host.querySelectorAll('ol.dashboard-timeline > li[data-status="pending"]').length,
			).toBe(2)
			expect(host.querySelectorAll('ol.dashboard-timeline > li[data-status="failed"]').length).toBe(
				1,
			)
			expect(host.querySelector('ol.dashboard-timeline .tag.success')).not.toBeNull()
			expect(host.querySelector('ol.dashboard-timeline .tag.warning')).not.toBeNull()
			expect(host.querySelector('ol.dashboard-timeline .tag.danger')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('range picker is a <menu role="toolbar"> with three .subtle buttons', () => {
		const { host, teardown } = mount()
		try {
			const range = host.querySelector('menu[role="toolbar"][aria-label="Date range"]')
			expect(range).not.toBeNull()
			expect(range?.querySelectorAll('button.subtle').length).toBe(3)
			// The default selection is 30d (per `range = ref('30d')`).
			const pressed = range?.querySelector('button[aria-pressed="true"]')
			expect(pressed?.textContent?.trim()).toBe('30d')
		} finally {
			teardown()
		}
	})
})
```

- [ ] **Step 2: Run the test**

Run: `npm run test:app:browser -- DashboardExample`
Expected: all six tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/app/browser/examples/DashboardExample.test.ts
git commit -m "test(app:browser/examples): DashboardExample framework idioms

Asserts the example's load-bearing framework usage:
- <aside id=dashboard-sidebar> as the useAside host
- <menu role=toolbar> action + range rails
- 4 stat <article>s, 5 timeline <li>s, status variant distribution"
```

---

## Task 13: Full verification ritual

**Files:**

- None (verification only).

- [ ] **Step 1: Lint + type check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 2: Full app:browser test suite**

Run: `npm run test:app:browser`
Expected: all green. Specifically:

- `pages.test.ts` — route ↔ barrel ↔ file bijection: passes.
- `parity.test.ts` — every requirement satisfied: passes.
- `semantics.test.ts` — Inspector reports zero `error`-severity findings on `DashboardExamplePage`. **This is the inspector audit you asked for, executed.**
- `DashboardExamplePage.test.ts` — 4/4 green.
- `DashboardExample.test.ts` — 6/6 green.

- [ ] **Step 3: Visual verification — elements side**

Reload the preview server (already running on `:5173`):

```
preview_eval serverId=… expression="location.hash = '#/example-dashboard'; location.reload(); true"
```

Snapshot + screenshot:

```
preview_snapshot serverId=…   # accessibility tree
preview_screenshot serverId=… # visual
```

Resize to mobile width:

```
preview_resize serverId=… width=375 height=812
preview_screenshot serverId=…
```

Expected mobile state: the sidebar collapses, the hamburger toggler appears, the action rail collapses (the icon-only buttons remain in their menu). Click the toggler — sidebar slides in:

```
preview_click serverId=… ref="<sidebar-toggle-uid-from-snapshot>"
preview_screenshot serverId=…
```

Restore desktop width:

```
preview_resize serverId=… width=1440 height=900
```

- [ ] **Step 4: Visual verification — mailbox side-by-side**

Start the mailbox dev server in the background. From the elements project directory:

```bash
(cd /c/Users/mikes/WebstormProjects/mailbox && npm run dev -- --port 5174 --strictPort &)
```

Wait ~10s for it to start. Then open `http://localhost:5174/#/example-dashboard` in a browser, screenshot it, and compare side-by-side with the elements screenshot. The layouts should feel like the same app (sidebar / topbar / stats / chart+actions / activity timeline) — pixel parity is **not** the goal, semantic parity is.

When done, stop the mailbox server:

```bash
pkill -f "vite.*5174"
```

(Or close the browser tab and let the user shut it down when they're done reviewing.)

- [ ] **Step 5: Inspector dogfood — manual confirmation**

In the elements preview, navigate to `#/inspector`. Paste a snippet of the Dashboard's markup into the sandbox (the sandbox is editable). Expected: zero `error` findings reported by the Inspector. This is the same gate `semantics.test.ts` enforced in Step 2 — running it once interactively confirms the UI also reports green.

- [ ] **Step 6: Stop here for review**

Do **not** start porting Mail / Marketing / Auth / CRM. The plan ends here.

Tell the user:

> "Dashboard slice complete. All gates green:
>
> - `npm run check`: clean
> - `npm run test:app:browser`: all suites green, including `semantics.test.ts` (Inspector dogfood) and `parity.test.ts` (registry artifact coverage)
> - Visual: dashboard fills the viewport at desktop + mobile, sidebar drawer opens on the hamburger toggle, side-by-side comparison with mailbox shows the same app idea
>
> The pattern (ExamplesShell + per-example component + thin Page wrapper + scoped CSS) is proven. Ready for your review before I port Mail, Marketing, Auth, CRM as a follow-up."

---

## Self-Review

**1. Spec coverage:**

- New `Examples` route group → Task 1 ✓
- `examples.ts` metadata → Task 2 ✓
- `ExamplesShell.vue` → Task 4 ✓
- `DashboardExample.vue` → Task 5 ✓
- `DashboardExamplePage.vue` → Task 6 ✓
- `router.ts` registration → Task 7 ✓
- `index.ts` barrel export → Task 8 ✓
- `App.vue` chrome gating → Task 9 ✓
- `showcase.css` chrome → Task 3 ✓
- `_contract.ts` bundle → Task 10 ✓
- Page test + example test → Tasks 11–12 ✓
- Verification ritual (lint/test/visual/inspector) → Task 13 ✓
- Stop-and-review checkpoint before the other four examples → Task 13 Step 6 ✓

**2. Placeholder scan:**

- "TBD" / "TODO" — none.
- "Add appropriate X" — none.
- Steps without concrete code — none (every code step has a full block).
- "Similar to Task N" — none.

**3. Type consistency:**

- `ExamplesShell` exposes `id`, `title`, `source` props — matches the usage in `DashboardExamplePage.vue` (Task 6) and the test selectors (Task 11).
- `useAside(sidebarRef, { popover: false })` — matches the `useTemplateRef<HTMLElement>('sidebarRef')` declaration. (The `{ popover: false }` option leaves the `popover` attribute under template control, which is what we need for the conditional `:popover` binding.)
- `useDialog(sourceRef)` — matches `useTemplateRef<HTMLDialogElement>('sourceRef')`.
- `useMenu(pickerRef, pickerMenuRef, …)` — both refs declared in Task 4, both consumed in Task 4's template.
- Test selectors (`.dashboard-shell`, `aside#dashboard-sidebar`, `menu[role="toolbar"][aria-label="Dashboard actions"]`, `ol.dashboard-timeline > li`, `.tag.success` etc.) all match the markup declared in Task 5.
- Status counts (2 paid, 2 pending, 1 failed) match the `activity` array in Task 5.
- 4 stats / 5 activity rows match the data in Task 5.
- The `range` ref default is `'30d'`, matching the test assertion for the default `aria-pressed` button in Task 12.

**4. Known gaps surfaced during planning, not gaps in the plan:**

- Icon token names (`--set-icon-window-stack`, `--set-icon-clipboard`, `--set-icon-check`, `--set-icon-arrow-left`, `--set-icon-chevron-left`, etc.) are best-guesses against mailbox's Bootstrap-Icons vocabulary. Task 4 Step 2 and Task 5 Step 2 include explicit grep-and-substitute instructions if any are absent in `src/styles/theme/_tokens.scss`. **This is by design** — the alternative would have been to expand scope into shipping new icon tokens, which is out of scope per the spec.
