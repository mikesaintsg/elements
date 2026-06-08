# Implementation plan — remaining 4 examples (Mail, Marketing, Auth, CRM)

> **For agentic workers:** continue the body-shell-sibling pattern from `2026-05-21-examples-port-design-revised.md`. Each example is one focused commit (or two, including the showcase regen).

**Goal:** Port mailbox's Mail / Marketing / Auth / CRM examples to elements, leaning on the body-shell chrome the Dashboard slice proved out.

**Architecture:** Vue-fragment templates rendering body-shell siblings (`<nav>`, `<header>`, `<main>`, `<aside>`) directly. ExamplesShell + App.vue body-shell chrome-gating already in place from the Dashboard slice — these examples just author markup.

**Tech stack:** Vue 3 `<script setup>`, TypeScript, Tailwind v4 utilities, framework's `@elements/browser` composables where the example needs JS (`useDialog`, `useMenu`, `useDrag`, `useDrop`, `useDetails`, etc.).

**Specs:**

- [2026-05-20-examples-port-design.md](../specs/2026-05-20-examples-port-design.md) — original spec (file structure, route registration, test contracts).
- [2026-05-21-examples-port-design-revised.md](../specs/2026-05-21-examples-port-design-revised.md) — revised pattern (body-shell siblings, framework chrome reliance, conventions).

---

## Framework-gap watchlist (apply during ALL 4 ports)

Per user directive: when implementing, watch for patterns that require lots of scoped CSS or are common app conventions the framework should own. If found, propose a framework fix in the same commit (model: the Dashboard slice's drawer-footer `flex-start` default flip). Specifically watch for:

- **Drawer / popover defaults** that bias toward one shape (action row vs info row, single-section vs multi-section, etc.) — like the footer `flex-end` default that needed flipping.
- **Token gaps** in `_tokens.scss` — icon tokens missing for common verbs (already 22 TODOs accumulated). If a port adds ≥3 new TODOs of the same theme (e.g., 3 missing email-related icons), propose a token batch.
- **Layout primitives** with no framework equivalent — circular initials badges, timelines, split-screens, dense form rows. If two examples need the same primitive, propose a `.{name}` component class or `<i class="…">` wrapper.
- **Composable shape mismatches** — if a composable's options need scoped-CSS overrides to do what the example needs, the composable's option surface may be incomplete.
- **Semantic / a11y errors** caught by `semantics.test.ts` that point to a framework rule being too strict or too lax — fix the rule, not the consumer.

When a fix lands, update the example's commit message to call out the framework change explicitly.

---

## Per-example workflow

Every example follows the same 10-step flow. Spelled out for Mail; subsequent sections cite this as "the standard ritual."

### Standard ritual

1. **Read** the mailbox source: `C:\Users\mikes\WebstormProjects\mailbox\app\browser\examples\<Name>Example.vue`.
2. **Read** any framework partials you'll lean on heavily (e.g., `_form.scss` for Auth, `_details.scss` for CRM, `_aside.scss` for Mail's folders).
3. **Author** `app/browser/examples/<Name>Example.vue` as a Vue fragment of body-shell siblings.
4. **Author** the thin `app/browser/examples/<Name>ExamplePage.vue` wrapper (matches `DashboardExamplePage.vue` shape).
5. **Add** the metadata entry to `app/browser/examples/examples.ts`.
6. **Register** the route in `app/browser/router.ts` (one new const + array append).
7. **Export** the Page from `app/browser/index.ts`.
8. **Add** the `PAGE_SURFACE_BUNDLES` entry to `tests/app/browser/pages/_contract.ts`.
9. **Write** two test files: `<Name>ExamplePage.test.ts` + `<Name>Example.test.ts` in `tests/app/browser/examples/`.
10. **Verify**: `npm run check`, `npm run test:app:browser`, mobile + desktop visual, `npm run format`, `npm run show`, commit + push.

---

## Task 1: Port MailExample

### Layout

Three-pane inbox (mailbox-canonical):

- **Folders rail** (left) — list of folders/labels (Inbox, Starred, Sent, Drafts, Spam, Trash + custom labels). On desktop, an in-flow `<nav>` column. On mobile, a popover drawer.
- **Thread list** (middle) — list of email threads in the selected folder. Each row: sender, subject, snippet, timestamp, unread dot.
- **Reading pane** (right) — selected thread's body. Header (subject, from, to, date), message body, action toolbar (Reply, Forward, Archive, Delete).

### Body-shell mapping

The framework's body grid has 5 named areas (`header`, `nav`, `main`, `aside`, `footer`). For a three-pane layout we have to choose:

- **Option A: outer `<nav>` + outer `<main>` containing an inner two-pane grid.** Cleanest. The outer `<nav>` is the folder rail (framework chrome). The outer `<main>` contains thread list + reading pane via a scoped CSS grid (e.g., `grid-template-columns: minmax(0, 22rem) minmax(0, 1fr)`). The inner panes get scoped CSS (no framework body-shell chrome on them — they're not at body-shell position).
- **Option B: outer `<nav>` + outer `<aside>` + outer `<main>` as three siblings.** Tries to use both the `nav` and `aside` body-grid areas. But the framework's `<aside>` chrome is paint-side-rail-like (right border, ~16rem wide); the reading pane is the bigger surface and `<main>` is supposed to be the dominant content. Worse semantics.

**Pick Option A.** Reading pane is the dominant content (it's where the user reads); `<main>` is correct for it. Thread list is a secondary panel inside `<main>` — author it as `<section aria-label="Threads">` with scoped grid CSS.

Inner-pane behavior on mobile:

- Thread list and reading pane should NOT show side-by-side on a 375px viewport.
- Convention: thread list visible by default; tapping a thread opens the reading pane (replacing the thread list).
- Implementation: a ref `selectedThread: Ref<number | null>`. On mobile, the reading pane is a separate route or a popover or absolute-positioned overlay. For simplicity in this example: a scoped CSS rule that hides the thread list when a thread is selected on mobile, OR show thread list above reading pane stacked. Pick stacked-on-mobile (simpler, no JS gymnastics — `display: block` mobile, `display: grid` desktop).

### Composables exercised

- `<nav popover>` mobile drawer (no composable; native popover)
- `<menu role="toolbar">` for reading-pane action rail (Reply, Forward, Archive, Delete)
- Plus the standard ExamplesShell composables (useDialog, useMenu, useTheme)

Optionally:

- `useDetails` for collapsing/expanding a thread quote (not in mailbox's version, but a nice elements addition)

### Scoped CSS budget (estimate)

~80-120 lines:

- Inner grid for thread list + reading pane (1 rule, responsive)
- Folder badge counts (small numbers next to folder names — `.folder-count`)
- Thread row layout (sender / subject / snippet / time — flex layout with truncation)
- Unread dot (or use framework `.dot`)
- Reading pane header (subject + from/to/date — typography)
- Empty state (no thread selected, on desktop — `<figure>` + caption)

### Watchlist

- Folder count badge — common app pattern. Framework has `.badge` and `.tag` primitives. Try `<small class="badge">12</small>` first; if the placement / circular shape needs scoped CSS, that's an opportunity for `.badge.circular` or similar.
- Unread dot — `.dot` already ships. Use it.
- Thread row truncation — common pattern (single-line truncation with `text-overflow: ellipsis`). Tailwind has `truncate`. Use it. Framework has no `.truncate` modifier.
- Reading pane action toolbar — `<menu role="toolbar">` works. Same `justify-end` Tailwind utility on the parent if needed.

### Acceptance criteria

- 6+ folders with counts in the rail
- 5+ thread rows in the list
- 1 selected thread with full reading-pane content
- Reading pane has a `<menu role="toolbar">` with 4+ actions
- Mobile: folders drawer slides in from left; thread list visible above reading pane (or selection toggles)
- Desktop: 3-pane side-by-side; reading pane scrolls independently

---

## Task 2: Port MarketingExample

### Layout

Long-scroll landing page:

- **Hero** — big headline, subhead, CTA buttons (Get started / Watch demo), optional product screenshot
- **Trust strip** — logo cloud or "Used by \_\_\_ companies" line
- **Feature grid** — 3-6 feature cards (icon, title, description)
- **Showcase** — larger feature highlight (image + text, or split layout)
- **Pricing tiers** — 3 plan cards (free / pro / enterprise)
- **FAQ** — accordion (`<details>` elements)
- **CTA** — final "ready to get started?" banner
- **Footer** — links, social, copyright

### Body-shell mapping

Marketing pages **don't** have a sidebar / topbar / app shell. The right shape is just `<main>` with `<section>` blocks inside. No `<nav>` at body-shell position; the marketing site's top nav (if any) goes inside the hero `<section>` as an inline `<nav>`.

Skip:

- The mobile drawer (no sidebar)
- The right-drawer actions (no actions)

Use:

- `<main>` token override for narrow padding (`--set-main-padding-inline: 0; --set-main-padding-block: 0; --set-main-gap: 0`) so each `<section>` controls its own padding edge-to-edge
- `<section>` for each major block
- `<article>` for feature cards and pricing tiers
- `<details>` for FAQ items
- `<footer>` at body-shell position for the site footer

### Composables exercised

- `useDetails` for FAQ accordion behavior (or just bare `<details>`)
- Standard ExamplesShell composables

### Scoped CSS budget (estimate)

~150-200 lines (heaviest of the four — marketing needs lots of presentation chrome):

- Hero block (gradient background, large typography, CTA layout)
- Trust strip (logo grid, muted)
- Feature grid (3-up on desktop, 1-up on mobile)
- Showcase split (image left, text right; flip on mobile)
- Pricing tier highlight ("popular" tier needs visual emphasis)
- FAQ styling (open-state, plus/minus icon)
- CTA banner (gradient, centered, big button)
- Footer columns

### Watchlist

- **Hero gradient backgrounds** are universally common. Framework has no `<section class="hero">` primitive. Either keep scoped, or propose a `.hero` modifier in `_section.scss` if patterns recur across examples.
- **Feature grid (3-up auto-fit)** — same pattern as Dashboard stats. Could be a `.grid-cards` modifier on `<section>` if Marketing + Dashboard both use it.
- **Pricing tier "popular" highlight** — `<article class="primary">` (variant cascade) tints the border. Lean on the variant cascade.
- **Footer columns** — `<footer>` baseline doesn't ship a column layout. Use Tailwind grid utilities inline.

### Acceptance criteria

- Hero with headline + CTA + at least one secondary action
- Trust strip with 4-6 logos (use `<svg>` or `<i class="icon">` placeholders)
- 3-6 feature cards
- 3 pricing tiers, middle one visually emphasized
- 4-6 FAQ items as `<details>`
- CTA banner
- Footer with 3-4 link columns + copyright

---

## Task 3: Port AuthExample

### Layout

Split-screen sign-in:

- **Left half** — sign-in form: logo, headline, email + password, primary CTA, OAuth buttons (Google, GitHub), forgot-password / sign-up links
- **Right half** — brand panel: gradient background, marketing copy or illustration

On mobile: form fills viewport; brand panel hidden (or above the form as a small banner).

### Body-shell mapping

The simplest possible body shape:

- Just `<main>` (no nav, no header, no aside, no footer)
- Inside `<main>`, a CSS grid with two columns (`50% 50%` or `minmax(0, 32rem) 1fr`) — form on the left, brand on the right
- On mobile, the grid collapses to single column and the brand panel hides

### Composables exercised

- `useForm` for form validation (the framework's form composable; mailbox uses Bootstrap form validation, elements has `useForm`)
- Standard ExamplesShell composables

### Scoped CSS budget (estimate)

~80-120 lines:

- Outer grid (50/50 split, responsive to single column)
- Form column padding + centering
- Brand column gradient + illustration container
- OAuth button row (`<menu>` with icon + label per provider)
- Divider with "or" text (common form pattern — `<hr>` baseline + scoped CSS for the inline "or" text)

### Watchlist

- **"OR" divider with inline text** is one of the most common form patterns. `<hr>` baseline can't host inline text. Currently requires scoped CSS or a `<div class="divider">…</div>` workaround. Consider proposing a framework `<hr>` modifier (`<hr><span>or</span></hr>`?) or a `.divider` class — high value, universal pattern.
- **OAuth button rows** — common pattern. `<menu>` with `<li>` per provider. Each button gets the provider's icon. Currently icons would need `--set-icon-google`, `--set-icon-github`, etc. — framework probably doesn't ship brand icons. Use generic `external` or `more` as placeholder + TODO comment.
- **Form validation chrome** — `<input>` baseline ships `:user-valid` / `:user-invalid` chrome. `useForm` may add programmatic validation. Read `useForm` source before authoring.

### Acceptance criteria

- Split layout: form left, brand right on desktop
- Mobile: form fills viewport, brand panel hidden (or above)
- Form has: email, password, primary CTA, 2+ OAuth options, divider with "or", forgot/sign-up links
- Form has `useForm` composable wired for validation

---

## Task 4: Port CrmExample

### Layout

Three-pane agent workspace (most complex):

- **Left pane: Context** — search bar + draggable list of context items (customer cards, recent conversations, saved searches). Drag-reorder via `useDrag` / `useDrop`.
- **Middle pane: Chat** — message thread with the current contact. Accordion of past conversations (`<details>`). Reply form pinned at bottom (textarea + send button).
- **Right pane: Documents** — list of files associated with the contact. Inline forms for adding notes (`<dialog>` for "Add note" modal).

Topbar above everything: command bar (`<form role="search">` with a search input that triggers an Ask AI suggestion menu).

### Body-shell mapping

Same dilemma as Mail — three panes don't fit the body grid's single-`<main>` model. Options:

- **A:** `<header>` (command bar) + `<nav>` (context) + `<main>` (chat) + `<aside>` (documents). Uses all four body-shell areas.
- **B:** `<header>` + `<main>` containing inner three-pane grid.

For CRM specifically, **option A is cleaner** because:

- The `<nav>` is genuinely primary navigation (selecting which contact / context to view)
- The `<aside>` is genuinely tangential (documents associated with the current contact)
- `<main>` is the dominant content (the chat conversation)
- Framework chrome paints all four cleanly

Mobile behavior:

- `<nav>` becomes a left-side popover drawer (existing pattern)
- `<aside>` becomes a right-side popover drawer (existing pattern — Dashboard's actions drawer)
- `<main>` (chat) fills the viewport between them

### Composables exercised

- `useDrag` + `useDrop` on the context list items (re-orderable cards) — first example to exercise these in the layout-templates corpus
- `useDetails` for the conversation accordion in the chat pane
- `useDialog` for the "Add note" inline modal (in the documents pane)
- `useForm` for the reply composer (validation as the user types)
- Standard ExamplesShell composables

### Scoped CSS budget (estimate)

~200-280 lines (heaviest):

- Context list (draggable card layout, drag-over highlight)
- Chat message bubbles (sender/recipient alignment, timestamp, read status)
- Reply composer (sticky bottom, textarea + send button)
- Document list rows (filename + size + actions)
- Command bar styling (centered or full-width)

### Watchlist

- **Chat message bubbles** are a universal pattern. Framework has no `<article class="message">` or `<dl class="conversation">` primitive. Likely stays scoped. Watch for whether Mail's thread layout overlaps enough to propose a shared `.message` or `.bubble` modifier.
- **Drag-over highlight states** — `useDrag` / `useDrop` should expose data-attributes the consumer can style. Read the composable source before authoring the chrome.
- **Reply composer sticky-bottom** — common app pattern (every chat app). Could propose a `.composer` or `<form class="sticky-bottom">` modifier. For now, scoped.

### Acceptance criteria

- Context pane: search + 5+ draggable items
- Chat pane: thread of 5+ messages + accordion of past conversations + reply composer
- Documents pane: 4+ files + "Add note" button opening a `<dialog>`
- Drag-reordering works in the context pane (verify in browser, not just by query)
- Mobile: both side panes become popover drawers; chat fills viewport

---

## Order of work

Implement in this sequence (simpler → more complex, validating the pattern):

1. **Marketing** (simplest — long-scroll, no panes, just sections)
2. **Auth** (simple split layout, exercises `useForm`)
3. **Mail** (introduces inner two-pane grid + thread list)
4. **CRM** (most complex — exercises `useDrag`/`useDrop` + multi-pane + dialogs)

Each ends in a stop-and-review checkpoint before moving to the next.

## Verification ritual (per example, no exceptions)

1. `npm run check` — clean.
2. `npm run test:app:browser` — all green. Note new test count (~10 tests per example).
3. Mobile visual at 375×812 — drawer behavior, scroll behavior, no horizontal overflow, toolbar visible.
4. Desktop visual at 1440×900 — full layout renders, framework chrome intact.
5. If a framework gap was identified, fix it in the framework + update consumers + add note to commit message.
6. `npm run format`.
7. `npm run show`.
8. Commit: `feat(examples/<name>): port <Name>Example` + `chore(showcase): regenerate demo/showcase.html`.
9. Push.
10. Stop, report, await user review.

## Self-review checklist

Before declaring an example done:

- [ ] No `.dashboard-*` / `.example-*` class roots that the framework already provides (run grep: `grep -E "padding|margin|inline-size|block-size" app/browser/examples/<Name>Example.vue` and check each is genuinely app-specific)
- [ ] Body-shell siblings rendered as Vue fragment (not wrapped in a `<div>`)
- [ ] Sidebar nav uses `<nav>` (not `<aside>`) for primary navigation
- [ ] Sidebar drawer body children use `flex: 0 0 auto` override if multi-section
- [ ] Mobile breakpoint matches the framework `MOBILE_QUERY` (max-width: 960px)
- [ ] `<main>` token overrides applied for app-screen padding (`--set-main-padding-inline`, etc.)
- [ ] Cards use `<article>` (not `<div class="card">`)
- [ ] Action toolbars use `<menu role="toolbar">`
- [ ] Right-drawer actions opt-in to `class="justify-end"` IF they're action rows; info rows stay default
- [ ] Tests assert load-bearing landmarks present (mount + landmark count + key data-attributes)
- [ ] `PAGE_SURFACE_BUNDLES` entry lists every composable + framework element the page exercises via ExamplesShell or its own markup
- [ ] Icon TODOs use the consistent format `/* TODO icon swap — <stand-in> stands in for missing 'X' */`
- [ ] Zero `error`-severity findings from `semantics.test.ts`
