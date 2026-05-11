# Page Authoring Process (PAP)

> The reproducible discipline for every showcase page under `app/browser/pages/`. Follow it identically across all 42 pages. The PAP is the answer to "how do we take the same — if not more — care per page?"

This document is the single source of truth for HOW pages are built. The roster of pages, audit rubric, and group structure live in [plan.md §9](plan.md#phase-9--showcase). When the two disagree, plan.md is the spec; this doc is the workflow.

---

## 0. North Star

A showcase page exists to **prove the framework's API is real**. Three commitments:

1. **Live demos, not screenshots.** Every example is interactive markup rendered on the page. Composables wire to real DOM with real factories. No faking.
2. **Code samples sit beside the demos they describe.** `<details><summary>Markup</summary><pre><code>…</code></pre></details>` per example. Copy-pasteable.
3. **The page itself uses framework chrome.** Layout via `<section>`, `<hgroup>`, `<article>`, `<dl>`, `.stack`, `.cluster`. Tailwind utilities only for last-mile assists (grid gap, sr-only, etc.). The page IS the proof — chrome-on-chrome reads honest.

The aesthetic direction across all pages is **technical-documentation editorial** — restrained, reference-grade, the framework's hydrated baselines on display. No decorative chrome competing with the demos.

---

## 1. The Six Phases

Apply each phase fully before moving to the next. **Skipping any phase = re-doing it.**

### Phase 1 — Pre-build audit

Read everything the page must cover before writing markup. This is the difference between "demoing what I remember" and "demoing what actually ships."

**For element pages (`ButtonPage`, `FormControlsPage`, etc.):**

- `src/styles/elements/_{tag}.scss` — element baseline, every selector, every `--set-{tag}-*` token, forced-colors block.
- `src/styles/modifiers/_{variants,sizes,styles,states}.scss` — the modifier cascade hooks.
- `src/browser/elements.ts` — the TS mirror.
- `guides/elements.md` (relevant section) — design rationale.

**For composable pages (`UseDialogPage`, etc.):**

- `src/browser/factories/create{Entity}.ts` — full factory surface.
- `src/browser/composables/use{Entity}.ts` — Vue adapter.
- `src/browser/types.ts` — search for `{Entity}EventMap`, `Use{Entity}Options`, `Use{Entity}Return`, `Create{Entity}Options`, `Create{Entity}Instance`. ALL of them.
- `src/browser/constants.ts` — `{ENTITY}_EVENTS` map.
- `src/styles/composables/_{entity}.scss` if it exists (chrome-on-state partial).
- `src/styles/elements/_{tag}.scss` for the bound element's baseline.
- `guides/composables.md` (relevant section).

**For component pages (`ArticleCardPage`, etc.):**

- `src/styles/components/_{tag}.scss` — composition rules.
- All elements the composition touches (e.g. `ArticleCardPage` needs `<article>`, `<header>`, `<footer>`, `<menu>`).

**For surface pages (`PopoverSurfacesPage`, etc.):**

- `src/styles/surfaces/_{name}.scss` per surface.
- `guides/surfaces.md` (relevant section).

**Output of Phase 1**: a checklist in the page's `<script>` comment block listing every API surface item the page MUST demonstrate. The checklist drives Phase 3.

### Phase 2 — Page skeleton + route registration

Build the empty page file first. No demos yet — just structure.

**File contract for `app/browser/pages/{Name}Page.vue`:**

```vue
<script lang="ts" setup>
/**
 * {Name}Page — {one-sentence purpose}.
 *
 * API surface coverage (from Phase 1):
 *   - [ ] {item 1}
 *   - [ ] {item 2}
 *   - …
 *
 * Cross-references: {other pages this composes with}
 */
import { ref } from 'vue'
// other imports as needed
</script>

<template>
	<section id="{name}-intro">
		<hgroup>
			<h1>{Page Title}</h1>
			<p>{One-sentence framing — what the page proves about the framework.}</p>
		</hgroup>
		<!-- Optional: one paragraph of context if needed. No more. -->
	</section>

	<!-- Sections follow, one per API dimension. Each gets an id. -->
</template>
```

**Section ID convention**: `{page-name}-{section}` (e.g. `button-variants`, `button-sizes`, `button-toggle`). Keep them URL-safe and stable — they're the TOC anchors AND the deep-link hash keys.

**Route registration** in `app/browser/router.ts`:

1. Import the page at the top: `import {Name}Page from './pages/{Name}Page.vue'`
2. Add a `Route` constant: `const {NAME}: Route = { id: '{name}', title: '{Display Title}', group: '{Group Name}', page: {Name}Page }`
3. Push it into the `routes` array in the correct group order (group order matches plan.md §9.4).

After this phase the page is empty but reachable at `#/{name}` and shows up in SiteNav.

### Phase 3 — Demos, section by section

One section per API dimension. Each section follows the same shape:

```vue
<section id="{page}-{section}">
	<h2>{Section title}</h2>
	<p>{One-sentence framing of what this section proves.}</p>

	<!-- Live demo. Real working markup. No data-* hooks unless the composable
	     needs them. -->
	<div class="cluster">
		<!-- demo elements -->
	</div>

	<!-- Code sample. -->
	<details>
		<summary><small>Markup</small></summary>
		<pre><code>{escaped markup}</code></pre>
	</details>
</section>
```

**Section ordering** (use the order most natural for the symbol; ButtonPage is the reference):

1. **Bare / default** — what you get with zero classes.
2. **Variants** — semantic identity (`primary`, `success`, etc.).
3. **Sizes** — `.small` / default / `.large`.
4. **Styles** — `.ghost` / `.filled`.
5. **States** — `:hover` / `:active` / `:focus-visible` / `[disabled]` / `.active` / `.loading`.
6. **Combinations** — the orthogonal cascade (variant × size × style).
7. **Element-specific patterns** — icon-only, link-as-button, groups, etc.
8. **Composable wiring** — `useButton`, `useDialog`, etc. (when applicable).
9. **A11y verification blocks** — reduced-motion, forced-colors, keyboard.
10. **Tokens reference** — the `--set-*` surface the consumer overrides.

**Hard rules during demo authoring:**

- **No utility classes inside framework demos**. If `<button class="primary">` doesn't render right without a `bg-blue-500` rescue, the framework is broken. Fix the framework, not the demo.
- **Every variant demonstrated**, not "a sample of variants." If there are 7 variants, render 7 buttons. The page IS the proof that the cascade hits every one.
- **Reduced-motion verification block is mandatory**. Every page includes a section the reader can toggle their OS reduced-motion preference against and verify the framework respects it.
- **Forced-colors verification block is mandatory.** A note + a representative element the reader can verify in Windows HC mode.
- **Tokens reference section is mandatory**. `<dl>` listing every `--set-{tag}-*` token the page exposes, with a one-line description.

### Phase 4 — Rubric pass (preview server, real browser)

This phase is non-negotiable. **Mark zero rubric rows verified before running the preview.** Run the preview, walk each row, document each pass with one line.

**Preview setup**:

```
preview_start({ name: "dev" })
preview_resize({ width: 1440, height: 900 })  // start desktop
```

**The 10 rubric rows** (from plan.md §9.3):

| #   | Row                     | How to verify                                                                                                                                                                     |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Light mode contrast** | `preview_resize({ colorScheme: 'light' })`. Spot-check 3 variants × 3 states. Use `preview_inspect` on representative selectors to capture computed `color` + `background-color`. |
| 2   | **Dark mode contrast**  | Toggle theme via `[data-theme="dark"]` (use the theme button in the showcase header or set the attr via `preview_eval`). Re-check the same 3×3 grid.                              |
| 3   | **Focus paths**         | `preview_eval` to dispatch `Tab` key presses sequentially; verify `:focus-visible` paints on every focusable, ring is visible, tab order matches visual order.                    |
| 4   | **Mobile (375)**        | `preview_resize({ preset: 'mobile' })`. Walk the page. No horizontal scroll. Drawer / TOC accessible.                                                                             |
| 5   | **Tablet (768)**        | `preview_resize({ preset: 'tablet' })`. Body grid reflows cleanly.                                                                                                                |
| 6   | **Desktop (1440)**      | `preview_resize({ width: 1440, height: 900 })`. No stretched-thin elements.                                                                                                       |
| 7   | **Reduced motion**      | `preview_eval(document.documentElement.style.setProperty …)` or use Chrome's emulator via DevTools MCP. Trigger a transition (hover, toggle); verify it collapses to instant.     |
| 8   | **Forced colors**       | Use Chrome's `forced-colors` emulator. Verify focus rings + borders + text survive.                                                                                               |
| 9   | **Keyboard nav**        | Tab through every interactive element. Verify Esc dismisses popovers, Enter activates buttons, arrow keys navigate where APG specifies.                                           |
| 10  | **Reader sanity**       | `preview_console_logs({ level: 'error' })` and `{ level: 'warn' }` both return clean. Section IDs present, TOC populated, hash deep-links resolve.                                |

**Per row, the format is**:

```
Row 1 — Light mode contrast: [PASS|FAIL] {one-line evidence}
```

**Any FAIL gets fixed before continuing.** Fix at the SCSS / TS source, not in the page markup. If the framework chrome is broken, the page is broken too.

### Phase 5 — Findings report

A short structured report to the user. Format:

```
## ButtonPage — Page Build Report

### Built
- {section 1 description}
- {section 2 description}
- …

### Rubric
- ✅ Row 1 — Light mode contrast
- ✅ Row 2 — Dark mode contrast
- ✅ Row 3 — Focus paths
- …

### Framework chrome gaps surfaced (if any)
- {gap 1} — fixed in {commit / file}
- {gap 2} — fixed in {commit / file}

### Open questions for the user
- {if any}

### Reproduction
- URL: http://localhost:5173/#/button
- Browser: Chrome (preview server)
- Viewport tested: 375, 768, 1440
- Themes tested: light, dark
```

### Phase 6 — Hand to user, then close

After the report:

1. **Stop the preview server** (`preview_stop`) so the user picks up a clean slot.
2. **Wait for user feedback.** Don't move to the next page.
3. **Triage feedback**: real issues → fix → re-rubric the affected row → re-commit. Style preferences → discuss; only land if the user confirms direction.
4. **Mark the plan checkbox** `[x]` only after the user confirms the page is acceptable.
5. **Commit** the final state with a message naming the page and what changed.

---

## 2. Anti-patterns

These are the failures the previous showcase work fell into. Don't repeat them.

- **Marking `[x]` before building.** Phase 9 §8.6 carried false `[x]` marks for ~20 composable pages that didn't exist. Never check a box that doesn't reflect shipping code.
- **Batching pages.** Building 5 pages in one turn means 5 pages get half-attention. Build one page, rubric it, hand it off. Repeat.
- **"Sample of variants" cop-out.** If the symbol has 7 variants, render all 7. Three buttons labeled "primary, success, danger" isn't a showcase, it's a teaser.
- **Skipping the reduced-motion block.** Without it, the user has to take it on faith that the framework respects motion preference. The page is supposed to prove it.
- **Inlining demos as code-fence-only.** A `<pre><code>...</code></pre>` is not a demo. The demo is the working element; the code sample is the supplement.
- **Tailwind utility rescues.** Adding `class="bg-blue-500 px-4"` to make a demo look right hides a framework gap. Fix the framework.
- **Console warnings.** Vue warns / Tailwind missing-source warns / unhandled errors all fail Row 10. Every page exits with a clean console.

---

## 3. The page template stub

When starting a new page, copy this skeleton into `app/browser/pages/{Name}Page.vue` first:

```vue
<script lang="ts" setup>
/**
 * {Name}Page — {purpose}.
 *
 * API surface coverage (from Phase 1 audit):
 *   - [ ] {item}
 *   - [ ] {item}
 *
 * Cross-references: {other pages}
 */
</script>

<template>
	<section id="{name}-intro">
		<hgroup>
			<h1>{Title}</h1>
			<p>{Tagline}</p>
		</hgroup>
	</section>

	<!-- TODO: Phase 3 demos, one section per API dimension. -->

	<section id="{name}-reduced-motion">
		<h2>Reduced motion</h2>
		<p>
			Every transition on this page collapses to instant when your OS reports
			<code>prefers-reduced-motion: reduce</code>. Toggle the preference and verify the demo below
			stops animating.
		</p>
		<!-- Live demo with a visible transition the reader can verify. -->
	</section>

	<section id="{name}-forced-colors">
		<h2>Forced colors</h2>
		<p>
			In Windows High Contrast (or any
			<code>forced-colors: active</code> mode), this page swaps custom colors for system tokens
			(<code>ButtonFace</code>, <code>ButtonText</code>, <code>Highlight</code>,
			<code>GrayText</code>) so the chrome survives. The verification element below paints with
			system tokens under HC mode.
		</p>
	</section>

	<section id="{name}-tokens">
		<h2>Tokens</h2>
		<p>
			Every value below flows through a <code>--set-*</code> custom property. Pin one at
			<code>:root</code> to retune every consumer of this element across your app.
		</p>
		<dl>
			<!-- per-token <dt>/<dd> pairs -->
		</dl>
	</section>
</template>
```

---

## 4. Working cadence checklist

Use this checklist literally — copy it into the working chat and tick rows as you go. Don't skip ahead.

```
Page: {Name}Page

Phase 1 — Pre-build audit
- [ ] Read element/composable/component source files
- [ ] Read matching guide section
- [ ] Listed full API surface coverage in page comment block

Phase 2 — Skeleton + route
- [ ] Page file created with hgroup intro
- [ ] Route registered in app/browser/router.ts
- [ ] Page reachable at #/{name} (verify in preview)

Phase 3 — Demos
- [ ] Bare/default section
- [ ] Variants section (all variants, not a sample)
- [ ] Sizes section
- [ ] Styles section
- [ ] States section (every state)
- [ ] Cascade / combinations section
- [ ] Element-specific patterns section(s)
- [ ] Composable wiring section (if applicable)
- [ ] Reduced-motion verification block
- [ ] Forced-colors verification block
- [ ] Tokens reference section

Phase 4 — Rubric (preview server)
- [ ] Row 1 — Light mode contrast
- [ ] Row 2 — Dark mode contrast
- [ ] Row 3 — Focus paths
- [ ] Row 4 — Mobile (375)
- [ ] Row 5 — Tablet (768)
- [ ] Row 6 — Desktop (1440)
- [ ] Row 7 — Reduced motion
- [ ] Row 8 — Forced colors
- [ ] Row 9 — Keyboard nav
- [ ] Row 10 — Reader sanity (console clean, TOC populated)

Phase 5 — Findings report (to user)
- [ ] Built section listed
- [ ] Rubric results listed
- [ ] Framework chrome gaps documented + fixed
- [ ] Open questions noted

Phase 6 — Hand-off + close
- [ ] Preview server stopped
- [ ] Waited for user feedback
- [ ] Fixes landed (if any)
- [ ] plan.md §9.4 checkbox [x]'d
- [ ] Commit with named message
```
