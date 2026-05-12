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

### Phase 4 — Verification pass (live preview)

**Real verification via the preview server**, not against screenshots — `preview_eval` + `preview_inspect` + `preview_screenshot` are the primary instruments. The verification budget is calibrated to PER-PAGE complexity: a simple page (TypographyPage, HeadingsPage) needs a quick walk-through; a high-density page (FormControlsPage, DialogElementPage) needs the full ten-row sweep.

**Preview setup**:

```
preview_start({ name: "elements" })  // launch.json wires this to npm run dev
preview_eval(`window.location.hash = '#/{page}'`)
```

**The verification checklist** (formerly "rubric rows" — same intent, less ceremony):

| #   | Row                           | How to verify                                                                                                                                                                                                                                                                          |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Light mode contrast**       | `preview_eval` to read computed styles for representative selectors. Sample 3 variants × 3 states. WCAG AA = 4.5:1 for normal text, 3:1 for large text + UI components.                                                                                                                |
| 2   | **Dark mode contrast**        | `document.documentElement.dataset.theme = 'dark'` + 200ms wait. Re-sample. Verify the variant tier and on-canvas tier both flip cleanly.                                                                                                                                               |
| 3   | **Variant cascade**           | Every variant rendered (not "a sample"). For elements with seven variants, all seven appear in the demo. Sample each via `preview_eval` if the visual difference might be hard to read in screenshots.                                                                                 |
| 4   | **State coverage**            | Hover / focus / active / disabled / aria-current / aria-selected / loading — render or describe each state the element supports.                                                                                                                                                       |
| 5   | **Viewport responsiveness**   | Resize the preview to ~375px (mobile), ~768px (tablet), ~1440px (desktop). No horizontal scroll on mobile; body grid reflows; drawers / TOC accessible. Use `preview_screenshot` to capture each.                                                                                      |
| 6   | **Reduced motion**            | Either toggle the OS preference and re-eval, or rely on the framework's `@include transition()` mixin — every transition the page introduces should route through it. (Worth verifying when the page DOES introduce a transition — most don't, since the chrome lives in the partial.) |
| 7   | **Forced colors / a11y**      | For variant chrome that carries semantic signal (alerts, status, sort indicators), document the forced-colors fallback in the page's accessibility section. Verify in Chrome DevTools' "Emulate CSS media feature forced-colors: active" if the page introduces new variant chrome.    |
| 8   | **Keyboard nav**              | Tab through interactive elements; verify Esc dismisses popovers, Enter activates buttons, arrow keys navigate where APG specifies. For pages without interactives (TypographyPage, FiguresPage), skip — note "no interactive surface" in the report.                                   |
| 9   | **Console clean**             | `preview_console_logs({ level: 'error' })` and `{ level: 'warn' }` return clean. Vue HMR warnings during dev are acceptable as long as they resolve after a reload.                                                                                                                    |
| 10  | **Sidebar + TOC integration** | The new page appears in `SiteNav` under its group, navigates correctly via hash. Sections have `id` attributes the right-rail TOC picks up.                                                                                                                                            |

**Per row, the format**:

```
Row 1 — Light mode contrast: [PASS|FAIL] {one-line evidence — measured contrast, sampled selector, OK / NG}
```

**Any FAIL gets fixed before moving on.** Fix at the SCSS / TS source, not in the page markup. If the framework chrome is broken, the page is broken too — and the page just earned its keep by surfacing the bug.

**Cross-cutting framework changes**: when a page audit surfaces a framework bug (token-scope shadowing, variant cascade gap, contrast failure, naming inconsistency), fix it AT the framework level, then log the change in `plan.md §9.7` with: (a) which page surfaced it, (b) the diagnosis, (c) the fix, (d) any files affected. This is how the framework matures — pages aren't passive demos, they're audit drivers.

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

1. **Leave the preview server running.** The user iterates against the same live preview the audit ran against; restarting forces them to re-navigate.
2. **Run the standard cadence**: `npm run show` rebuilds `demo/showcase.html` (the single-file bundle the user can open from disk), `npm run format` formats the workspace, then commit with a descriptive message and push. The commit message names the page, the section count, and any framework gaps surfaced.
3. **Mark the plan checkbox** `[x]` after the user confirms the page is acceptable (NOT before — false `[x]`s have caused real lost-work scenarios in earlier phases).
4. **Triage feedback**: real issues → fix → re-verify → re-commit. Style preferences → discuss; only land if the user confirms direction. Naming-convention disagreements → audit against the framework's modifier-naming rules (single English word, no element-name prefix, no library namespace; past-participle / adjective for visual treatments; see `plan.md §9.7` for the codified list).
5. **App-specific vs framework-specific** is a recurring question: when a pattern lives in `src/styles/`, ask "would every consumer of the framework's `<X>` element want this?" If yes, framework. If it's a deliberate composition choice (e.g. sticky sidebar search, sidebar group rhythm, drawer-header inside flex-column rail), it belongs in `app/browser/styles/showcase.css` instead.

---

## 2. Anti-patterns

These are the failures the previous showcase work fell into. Don't repeat them.

- **Marking `[x]` before building.** Phase 9 §8.6 carried false `[x]` marks for ~20 composable pages that didn't exist. Never check a box that doesn't reflect shipping code.
- **Batching pages.** Building 5 pages in one turn means 5 pages get half-attention. Build one page, verify it, hand it off. Repeat.
- **"Sample of variants" cop-out.** If the symbol has 7 variants, render all 7. Three buttons labeled "primary, success, danger" isn't a showcase, it's a teaser.
- **Adding showcase composition to `src/styles/`.** If a rule only makes sense in the showcase's exact composition (e.g. sticky sidebar search, flex-column split rail, tightened group rhythm), it belongs in `app/browser/styles/showcase.css`, NOT in the framework. The framework ships the ELEMENTS and their CHROME; the showcase composes them into one particular shape. Cross-check: "would every consumer of the framework's `<X>` element want this?" If no, it's app-specific.
- **Inlining demos as code-fence-only.** A `<pre><code>...</code></pre>` is not a demo. The demo is the working element; the code sample (if shown) is the supplement.
- **Tailwind utility rescues.** Adding `class="bg-blue-500 px-4"` to make a demo look right hides a framework gap. Fix the framework, not the demo.
- **Console warnings.** Vue warns / Tailwind missing-source warns / unhandled errors all fail Row 9. Every page exits with a clean console.
- **Dragging Bootstrap / mailbox class names in verbatim.** Mailbox's `.list-group-item-action`, `.table-responsive`, `.table-group-divider`, `.accordion-button` are starting suggestions, not the framework's vocabulary. Audit every modifier name against the framework's naming rules before landing (`plan.md §9.7` § Modifier-name audit). The framework's preference is generic single English word, past-participle for visual treatments, no element-name prefix.
- **Letting an apparent fix mask a deeper issue.** Two examples from real audits:
  - ListsPage `.success.active` painted subtle tint, not the saturated identity. First instinct: reorder the SCSS. Real fix: the cascade-resolution timing of `--set-group-active-*` declared on the parent `<ul>` didn't reach the `<li>`'s variant tokens. The "obvious" fix was a symptom; the real fix was the architectural relocation.
  - ArticleCardPage `.filled` header band had white-on-light-slate contrast (~2:1). The fixed `--color-surface-raised` token was wrong for the filled state. Real fix: `color-mix(currentColor 8%, transparent)` so the band tints from the article's own color, automatically right in every variant + theme combo.
  - When a fix feels "too easy," it might be papering over a deeper inconsistency. Ask "is the original rule wrong, or just wrong here?" — if wrong everywhere, fix at the source.

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

Phase 4 — Verification (preview server)
- [ ] Row 1 — Light mode contrast (sampled via preview_eval)
- [ ] Row 2 — Dark mode contrast (data-theme="dark" + re-sample)
- [ ] Row 3 — Every variant rendered (not a sample)
- [ ] Row 4 — State coverage (hover / focus / active / disabled / aria-*)
- [ ] Row 5 — Viewport responsiveness (375 / 768 / 1440 screenshots)
- [ ] Row 6 — Reduced motion (mixin coverage or manual toggle)
- [ ] Row 7 — Forced colors / a11y (documented in page if new variant chrome)
- [ ] Row 8 — Keyboard nav (or "no interactive surface")
- [ ] Row 9 — Console clean (preview_console_logs error + warn)
- [ ] Row 10 — SiteNav + TOC integration

Phase 5 — Findings report (to user)
- [ ] Built section listed
- [ ] Verification results listed
- [ ] Framework chrome gaps documented + fixed (with plan.md §9.7 entry if cross-cutting)
- [ ] Open questions noted

Phase 6 — Hand-off + close
- [ ] Waited for user feedback (preview stays running)
- [ ] Fixes landed (if any)
- [ ] App-specific vs framework-specific reviewed (showcase.css vs src/styles)
- [ ] Modifier names audited against framework conventions
- [ ] `npm run show` rebuilt demo/showcase.html
- [ ] plan.md §9.4 checkbox [x]'d
- [ ] prompt.md "shipped so far" list updated
- [ ] Commit with named message + push
```
