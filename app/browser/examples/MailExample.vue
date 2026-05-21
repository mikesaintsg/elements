<script lang="ts" setup>
/**
 * MailExample — three-pane email client port of mailbox's MailExample.
 *
 * Layout intent:
 *   - Folders rail <nav> at body-shell position (framework drawer chrome).
 *     On desktop: persistent in-flow column. On mobile: popover drawer.
 *   - <main> contains an inner two-pane grid (thread list + reading pane),
 *     both as scoped-CSS grid children (NOT at body-shell position, so they
 *     get scoped CSS for their geometry, not framework body-shell chrome).
 *   - <header> at body-shell position: mobile-only topbar with drawer
 *     toggle + brand.
 *
 * Body-shell pattern: the template renders <nav>, <header>, <main> as
 * Vue-fragment siblings (no wrapping element). ExamplesShell renders a
 * fragment too, so these elements end up as effective grandchildren of
 * <body> via the #app `display: contents` hop. That lets the framework's
 * body-shell selectors paint the nav drawer chrome, header band, and main
 * scroll container. The inner two-pane split is owned entirely by scoped CSS.
 *
 * Translation rules (per the spec):
 *   - `<nav class="offcanvas-md offcanvas-start">` → <nav :popover> at body-shell position
 *   - `.nav.nav-pills.flex-column` (folder list) → <menu> (nav-rail chrome)
 *   - `<span class="badge rounded-pill">` → <small class="badge pill"> (framework badge)
 *   - `<span class="dot dot-danger">` → <span class="dot danger"> (framework dot)
 *   - `.list-group.list-group-flush` (thread list) → <ul> of <li><button> rows (scoped CSS)
 *   - `<div class="input-group">` (search) → <form role="search"> + <input type="search">
 *   - `<div role="group" aria-label="List actions">` → <menu role="toolbar">
 *   - reading-pane action row → <menu role="toolbar">
 *   - avatar circles → <span class="avatar"> / <span class="avatar primary"> (framework .avatar)
 *
 * Framework gaps flagged:
 *   1. (resolved) Circular avatar/initials badge — now the framework .avatar component.
 *   2. Inner multi-pane grid — Mail's inner two-pane grid inside <main> uses scoped CSS
 *      (`grid-template-columns: minmax(0, 24rem) minmax(0, 1fr)`). The upcoming CRM
 *      example needs the same inner-pane pattern. If near-identical, consider a .panes
 *      layout primitive on <section> or <main>.
 *   3. Folder count badge placement — <small class="badge pill"> works for the count chip
 *      but needs `margin-inline-start: auto` to right-align in the nav row. The framework's
 *      nav-rail <menu> chrome doesn't push trailing elements to the end automatically.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface Folder {
	readonly id: string
	readonly label: string
	readonly icon: string
	readonly count: number
}

interface Message {
	readonly id: string
	readonly from: string
	readonly initials: string
	readonly subject: string
	readonly preview: string
	readonly time: string
	readonly unread: boolean
	readonly tag?: 'urgent' | 'work' | 'personal'
}

const folders: readonly Folder[] = [
	{ id: 'inbox', label: 'Inbox', icon: 'information', count: 24 },
	{ id: 'starred', label: 'Starred', icon: 'warning', count: 7 },
	{ id: 'sent', label: 'Sent', icon: 'external', count: 0 },
	{ id: 'drafts', label: 'Drafts', icon: 'minus', count: 3 },
	{ id: 'archive', label: 'Archive', icon: 'sort', count: 0 },
	{ id: 'spam', label: 'Spam', icon: 'danger', count: 1 },
	{ id: 'trash', label: 'Trash', icon: 'minus', count: 0 },
]

const messages: readonly Message[] = [
	{
		id: 'm1',
		from: 'Ada Lovelace',
		initials: 'AL',
		subject: 'Re: Q2 platform review',
		preview:
			'Including the latest scoping notes — I think we can split the migration into two phases…',
		time: '9:42 AM',
		unread: true,
		tag: 'urgent',
	},
	{
		id: 'm2',
		from: 'Grace Hopper',
		initials: 'GH',
		subject: 'COBOL postmortem: outage 2026-04-30',
		preview: 'Attached the timeline. Three takeaways and one process change we should land before…',
		time: '8:17 AM',
		unread: true,
		tag: 'work',
	},
	{
		id: 'm3',
		from: 'Linus Torvalds',
		initials: 'LT',
		subject: 'kernel patch series 6.12-rc3',
		preview:
			'Dropped the contentious refactor. Will pick it up after merge window closes — meantime…',
		time: 'Yesterday',
		unread: false,
		tag: 'work',
	},
	{
		id: 'm4',
		from: 'Margaret Hamilton',
		initials: 'MH',
		subject: 'Astronaut training schedule',
		preview: 'Final draft for cycle 12. Two slots still open if you want to nominate anyone for…',
		time: 'Yesterday',
		unread: false,
	},
	{
		id: 'm5',
		from: 'Hedy Lamarr',
		initials: 'HL',
		subject: 'Frequency hopping research notes',
		preview:
			'Found the original sketches in storage. Going to scan them this weekend — let me know…',
		time: 'Mon',
		unread: false,
		tag: 'personal',
	},
	{
		id: 'm6',
		from: 'Barbara Liskov',
		initials: 'BL',
		subject: 'Substitution principle revisited',
		preview: "I've been re-reading the original paper and I think there's a clearer way to phrase…",
		time: 'Mon',
		unread: false,
		tag: 'work',
	},
	{
		id: 'm7',
		from: 'Knuth Donald',
		initials: 'KD',
		subject: 'TAOCP volume 4F preview',
		preview: "Galleys are ready. I've sent the early chapters to your address — the binding…",
		time: 'Sun',
		unread: false,
	},
]

const tagVariant: Record<string, string> = {
	urgent: 'danger',
	work: 'information',
	personal: 'warning',
}

const activeFolder = ref('inbox')
const activeMessageId = ref<string>('m1')
const activeMessage = computed(() => messages.find((m) => m.id === activeMessageId.value) ?? null)
const activeFolderLabel = computed(
	() => folders.find((f) => f.id === activeFolder.value)?.label ?? 'Inbox',
)
const activeFolderCount = computed(
	() => folders.find((f) => f.id === activeFolder.value)?.count ?? messages.length,
)

const chooseFolder = (id: string): void => {
	activeFolder.value = id
}

// Mobile drawer breakpoint — same 960px the docs shell uses (see
// App.vue + constants.ts MOBILE_QUERY) so the mail drawer behaviour
// matches the rest of the framework chrome.
const MOBILE_QUERY = '(max-width: 960px)'
const isMobile = ref(false)
const mobileMq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mobileMq?.matches ?? false
}

onMounted(() => {
	syncMobile()
	mobileMq?.addEventListener('change', syncMobile)
})
onUnmounted(() => {
	mobileMq?.removeEventListener('change', syncMobile)
})
</script>

<template>
	<!-- Folders rail — <nav> at body-shell position. Framework's
	     `body:has(main) > * > nav` chrome paints the inline-size,
	     border-inline-end, and popover drawer mode. On desktop (>960px)
	     the nav sits in-flow as a persistent left column. On mobile it
	     is a popover drawer opened by the topbar toggle button.

	     The `class="start"` tells the framework this is a left-side rail
	     (matches Dashboard's sidebar and the docs primary nav).

	     `--set-aside-drawer-padding-inline: 0` override removes the
	     framework's 16px gutter so the menus own their own padding. -->
	<nav
		id="mail-folders"
		class="start"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Folders"
		style="--set-aside-drawer-padding-inline: 0"
	>
		<!-- Brand band — <header> inside body-shell <nav> picks up the
		     framework's drawer/rail header chrome (chunky band, divider,
		     pinned top). -->
		<header>
			<!-- TODO icon swap — external stands in for missing 'envelope-paper-fill' (mail brand icon) -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
			<strong class="flex-1">Mailbox</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close folders"
				popovertarget="mail-folders"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<!-- Compose button — between the brand header and folder menu. Rail
		     children flow at their natural height, so no flex override needed. -->
		<div class="mail-compose-row">
			<button type="button" class="primary w-full">
				<!-- TODO icon swap — plus stands in for missing 'pencil-square' (compose icon) -->
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
				Compose
			</button>
		</div>

		<!-- Folder list — framework nav-rail <menu> chrome: column layout,
		     full-width links, hover tint, aria-current=page state. -->
		<menu>
			<li v-for="folder in folders" :key="folder.id">
				<a
					href="#"
					:aria-current="activeFolder === folder.id ? 'page' : undefined"
					@click.prevent="chooseFolder(folder.id)"
				>
					<!-- TODO icon swap — using generic icon tokens as stand-ins for mail folder icons -->
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${folder.icon})`"></i>
					<!-- `flex-1` label grows to fill the row, pushing the count
					     badge to the trailing edge — no scoped CSS needed. -->
					<span class="flex-1">{{ folder.label }}</span>
					<small v-if="folder.count > 0" class="badge pill">{{ folder.count }}</small>
				</a>
			</li>
		</menu>

		<!-- Labels group — h6 eyebrow + menu, same pattern as Dashboard's
		     Workspaces section. The framework's _menu.scss ships the h6 +
		     <menu> sibling rhythm for grouped nav rails. -->
		<h6>Labels</h6>
		<menu>
			<li>
				<a href="#">
					<span class="dot danger" aria-hidden="true"></span>
					Urgent
				</a>
			</li>
			<li>
				<a href="#">
					<span class="dot information" aria-hidden="true"></span>
					Work
				</a>
			</li>
			<li>
				<a href="#">
					<span class="dot warning" aria-hidden="true"></span>
					Personal
				</a>
			</li>
		</menu>

		<!-- Account band — <footer> inside body-shell <nav> picks up the
		     framework's rail footer chrome (flex band, divider) and pins to
		     the bottom via the framework's `margin-block-start: auto` rule in
		     both the in-flow rail and the popover drawer. Rail children flow
		     at natural height, so the auto-margin pushes the account row to
		     the bottom (Slack / Discord / Linear shape). -->
		<footer>
			<span class="avatar primary" aria-hidden="true">MS</span>
			<span class="flex flex-col leading-tight min-w-0">
				<strong class="truncate">Mike Saint</strong>
				<small style="color: var(--color-text-subtle)" class="truncate">Used 5.2 / 15 GB</small>
			</span>
		</footer>
	</nav>

	<!-- Topbar — <header> at body-shell position, shown only on mobile.
	     Provides the folders-drawer toggle + brand identity.
	     On desktop the folders rail is persistent; no topbar is needed. -->
	<header v-if="isMobile">
		<button
			type="button"
			class="subtle compact"
			aria-label="Open folders"
			popovertarget="mail-folders"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
		<!-- TODO icon swap — external stands in for missing 'envelope-paper-fill' -->
		<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
		<strong class="flex-1">Mailbox</strong>
		<button type="button" class="primary compact" aria-label="Compose">
			<!-- TODO icon swap — plus stands in for missing 'pencil-square' -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
		</button>
	</header>

	<!-- Page content — <main> at body-shell position.
	     Token overrides collapse the framework's default padding to zero
	     so the inner two-pane grid owns all layout edge-to-edge.
	     The inner grid is a scoped CSS rule on .mail-main:
	       desktop (>960px): thread list (24rem) | reading pane (1fr)
	       mobile (≤960px): single column, thread list above reading pane
	     Framework-gap: this inner multi-pane grid pattern (scoped CSS inside
	     <main>) will likely repeat in CRM. If near-identical, consider a
	     .panes layout primitive. -->
	<main
		class="mail-main"
		style="--set-main-padding-inline: 0; --set-main-padding-block: 0; --set-main-gap: 0"
	>
		<!-- ── Thread list ──────────────────────────────────────────────── -->
		<section class="mail-thread-list" aria-label="Threads">
			<!-- Thread list header — folder name + count + filter/sort actions. -->
			<header class="mail-list-header">
				<hgroup class="mail-list-hgroup">
					<h1 class="mail-list-heading">{{ activeFolderLabel }}</h1>
					<p class="mail-list-count">{{ activeFolderCount }} messages</p>
				</hgroup>
				<menu role="toolbar" aria-label="List actions" class="mail-list-toolbar">
					<li role="none">
						<button type="button" class="subtle compact" aria-label="Filter">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
						</button>
					</li>
					<li role="none">
						<button type="button" class="subtle compact" aria-label="Sort">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
						</button>
					</li>
				</menu>
			</header>

			<!-- Search input — framework form chrome. -->
			<div class="mail-search-row">
				<form role="search" class="mail-search-form" @submit.prevent>
					<label>
						<span class="sr-only">Search mail</span>
						<input type="search" placeholder="Search mail" autocomplete="off" />
					</label>
				</form>
			</div>

			<!-- Message rows — scoped .mail-row chrome for the flex layout.
			     Each row is a <button> so it's keyboard-focusable and click-
			     activatable without JS event gymnastics. -->
			<ul class="mail-rows" role="list">
				<li
					v-for="message in messages"
					:key="message.id"
					class="mail-row-item"
					:class="{ 'mail-row-item--selected': activeMessageId === message.id }"
					:data-unread="message.unread || undefined"
				>
					<button
						type="button"
						class="mail-row"
						:aria-pressed="activeMessageId === message.id"
						@click="activeMessageId = message.id"
					>
						<span
							class="avatar small"
							:class="message.unread ? 'primary' : ''"
							aria-hidden="true"
							>{{ message.initials }}</span
						><!-- mail-row-body uses <span> (phrasing content, not <div>) so
						     it is allowed inside <button>. Display behaviour is set via
						     scoped CSS (display: inline-flex; flex-direction: column). -->
						<span class="mail-row-body">
							<span class="mail-row-meta">
								<span class="mail-row-from truncate">{{ message.from }}</span>
								<time class="mail-row-time">{{ message.time }}</time>
							</span>
							<span class="mail-row-subject truncate">{{ message.subject }}</span>
							<span class="mail-row-preview truncate">{{ message.preview }}</span>
							<span v-if="message.tag" class="mail-row-tags">
								<small class="tag" :class="tagVariant[message.tag]">{{ message.tag }}</small>
							</span>
						</span>
					</button>
				</li>
			</ul>
		</section>

		<!-- ── Reading pane ─────────────────────────────────────────────── -->
		<section class="mail-reading-pane" aria-label="Message">
			<template v-if="activeMessage">
				<!-- Reading pane header — subject, from, date, tag. -->
				<header class="mail-reading-header">
					<hgroup class="mail-reading-hgroup">
						<h2 class="mail-reading-subject">{{ activeMessage.subject }}</h2>
						<p class="mail-reading-meta">
							<strong>{{ activeMessage.from }}</strong>
							<span aria-hidden="true">&middot;</span>
							<time>{{ activeMessage.time }}</time>
							<template v-if="activeMessage.tag">
								<span aria-hidden="true">&middot;</span>
								<small class="tag" :class="tagVariant[activeMessage.tag]">
									{{ activeMessage.tag }}
								</small>
							</template>
						</p>
					</hgroup>
				</header>

				<!-- Message body — scrollable within the reading pane. The
				     ExamplesShell toolbar can't overlap it: the example shell
				     reserves a bottom safe-area (see `styles/examples.css`). -->
				<div class="mail-reading-body">
					<p class="mail-reading-lead">Hi Mike,</p>
					<p>
						Thanks for circulating the draft. {{ activeMessage.preview }} The shorter window gives
						us room to validate the rollout against the staging cohort before we cut the production
						branch — which I think is the safer call given the long lead times we saw last quarter.
					</p>
					<p>
						I've added inline notes on the relevant sections; flagged anything that needs a sign-off
						from legal in red, and the smaller editorial changes are in green so you can sweep them
						quickly. Two open questions for the wider team:
					</p>
					<ol>
						<li>
							Do we still need the migration shim past Q3, or can we sunset it with the v3 cut?
						</li>
						<li>
							Who owns the rollback playbook? Last cycle it lived on three different runbooks.
						</li>
					</ol>
					<p>
						Happy to jump on a call this afternoon if it's easier — otherwise, I'll have the second
						draft ready before Friday.
					</p>
					<p>— {{ activeMessage.from.split(' ')[0] }}</p>
				</div>

				<!-- Reading pane action toolbar — Reply / Reply all / Forward / Archive. -->
				<footer class="mail-reading-footer">
					<menu role="toolbar" aria-label="Message actions" class="mail-reading-toolbar">
						<li role="none">
							<button type="button" class="primary">
								<!-- TODO icon swap — chevron-left stands in for missing 'reply' icon -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
								Reply
							</button>
						</li>
						<li role="none">
							<button type="button" class="subtle">
								<!-- TODO icon swap — chevron-left stands in for missing 'reply-all' icon -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
								Reply all
							</button>
						</li>
						<li role="none">
							<button type="button" class="subtle">
								<!-- TODO icon swap — external stands in for missing 'forward' icon -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
								Forward
							</button>
						</li>
						<li role="none">
							<button type="button" class="subtle">
								<!-- TODO icon swap — sort stands in for missing 'archive' icon -->
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
								Archive
							</button>
						</li>
					</menu>
					<p class="mail-reading-footer-note">Encrypted · 2/2 attachments scanned</p>
				</footer>
			</template>

			<!-- Empty state — shown on desktop when no message is selected.
			     On mobile the reading pane stacks below the thread list so
			     the empty state may be visible while scrolling. -->
			<figure v-else class="mail-empty-state">
				<!-- TODO icon swap — external stands in for missing 'envelope-open' icon -->
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
				<figcaption>Select a message to read it here</figcaption>
			</figure>
		</section>
	</main>
</template>

<style scoped>
/* ── App-specific layout glue ──────────────────────────────────────────
 *
 * The body-shell <nav>, <header>, <main> elements get their chrome from
 * the framework's body-shell selectors (border, sidebar inline-size,
 * drawer popover mode, nav-rail menu styling, header band, main padding).
 * Only the truly app-specific bits remain here.
 * ──────────────────────────────────────────────────────────────────── */

/* Compose row — a compact band between the brand header and folder menu.
 * Padding matches the nav-rail link padding so the button sits flush. */
.mail-compose-row {
	padding: 0.5rem 0.75rem;
}

/* ── Inner two-pane grid ────────────────────────────────────────────────
 *
 * <main> gets zero padding (token overrides on the element). The inner
 * grid splits thread list (24rem fixed) | reading pane (fills rest).
 * On mobile (≤960px) collapses to a single column — thread list stacks
 * above reading pane (no JS show/hide needed).
 *
 * Framework-gap: Mail + (upcoming) CRM both need an inner multi-pane grid
 * inside <main>. If the scoped CSS is near-identical, propose a .panes
 * layout primitive.
 * ──────────────────────────────────────────────────────────────────── */
.mail-main {
	/* Shared top-band height for both inner panes' headers so their bottom
	 * dividers line up across the two-pane grid. */
	--mail-pane-header-height: 4.25rem;
	display: grid;
	grid-template-columns: minmax(0, 24rem) minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr);
	overflow: hidden;
}

@media (max-width: 960px) {
	.mail-main {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto;
		overflow: auto;
	}
}

/* ── Thread list (left inner pane) ─────────────────────────────────────── */

.mail-thread-list {
	display: flex;
	flex-direction: column;
	border-inline-end: 1px solid var(--color-border);
	overflow: hidden;
	min-block-size: 0;
}

@media (max-width: 960px) {
	.mail-thread-list {
		overflow: visible;
		border-inline-end: none;
		border-block-end: 1px solid var(--color-border);
	}
}

/* Thread list header — folder name + count + toolbar. Shares the
 * `--mail-pane-header-height` band height with the reading-pane header so
 * the two main-pane top bands (and their bottom dividers) line up across
 * the inner two-pane grid. */
.mail-list-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-block-size: var(--mail-pane-header-height, 4rem);
	padding: 0.5rem 1rem;
	border-block-end: 1px solid var(--color-border);
	background-color: var(--color-surface);
	flex-shrink: 0;
}

.mail-list-hgroup {
	flex: 1;
	min-inline-size: 0;
}

.mail-list-heading {
	font-size: 0.9375rem;
	font-weight: 600;
	margin: 0;
	line-height: 1.2;
}

.mail-list-count {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	margin: 0;
}

/* Thread list filter/sort toolbar — tight gap for icon-button cluster. */
.mail-list-toolbar {
	gap: 0.25rem;
	flex-shrink: 0;
}

/* Search row — a compact band below the list header. */
.mail-search-row {
	padding: 0.5rem 1rem;
	border-block-end: 1px solid var(--color-border);
	background-color: var(--color-surface);
	flex-shrink: 0;
}

.mail-search-form {
	inline-size: 100%;
}

.mail-search-form input {
	inline-size: 100%;
}

/* Thread rows list — scrolls within the pane. */
.mail-rows {
	list-style: none;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	flex: 1;
}

@media (max-width: 960px) {
	.mail-rows {
		overflow-y: visible;
	}
}

/* Thread row item — border separator, unread leading bar. */
.mail-row-item {
	border-block-end: 1px solid var(--color-border-subtle);
	border-inline-start: 3px solid transparent;
}

.mail-row-item[data-unread] {
	border-inline-start-color: var(--color-primary);
}

.mail-row-item--selected {
	background-color: var(--color-surface-raised);
	border-inline-start-color: var(--color-primary);
}

/* Thread row button — full-width flex layout, resets button defaults. */
.mail-row {
	display: flex;
	gap: 0.75rem;
	width: 100%;
	padding: 0.875rem 1rem;
	background: transparent;
	border: none;
	text-align: start;
	cursor: pointer;
	color: inherit;
	align-items: flex-start;
}

.mail-row:hover {
	background-color: var(--color-surface-raised);
}

.mail-row-item--selected .mail-row:hover {
	background-color: var(--color-surface-raised);
}

/* Thread row body — name / subject / preview / time / tag layout.
 * Uses <span> elements (phrasing content) styled as block/flex because
 * <button> only permits phrasing content — <div> and <p> are disallowed. */
.mail-row-body {
	flex: 1;
	min-inline-size: 0;
	display: inline-flex;
	flex-direction: column;
	gap: 0.1875rem;
}

.mail-row-meta {
	display: inline-flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.5rem;
	inline-size: 100%;
}

.mail-row-from {
	font-size: 0.875rem;
	font-weight: 600;
}

.mail-row-item--selected .mail-row-from,
.mail-row-item[data-unread] .mail-row-from {
	font-weight: 700;
}

.mail-row-time {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	flex-shrink: 0;
}

/* Subject and preview use display: block so truncation works correctly.
 * Phrasing-content <span> is allowed inside <button> and can be made block. */
.mail-row-subject {
	font-size: 0.8125rem;
	display: block;
}

.mail-row-preview {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	display: block;
}

.mail-row-tags {
	margin-block-start: 0.25rem;
	display: block;
}

/* ── Reading pane (right inner pane) ─────────────────────────────────── */

.mail-reading-pane {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-block-size: 0;
	background-color: var(--color-surface);
}

@media (max-width: 960px) {
	.mail-reading-pane {
		overflow: visible;
		border-block-start: 1px solid var(--color-border);
	}
}

/* Reading pane header — subject, sender, date, tag. Same band height as
 * the thread-list header (see `--mail-pane-header-height`) so the two
 * main-pane top bands align; content vertically centered. */
.mail-reading-header {
	display: flex;
	align-items: center;
	min-block-size: var(--mail-pane-header-height, 4rem);
	padding: 0.5rem 1.5rem;
	border-block-end: 1px solid var(--color-border);
	background-color: var(--color-surface);
	flex-shrink: 0;
}

.mail-reading-header > .mail-reading-hgroup {
	flex: 1;
	min-inline-size: 0;
}

.mail-reading-hgroup {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.mail-reading-subject {
	font-size: 1.125rem;
	font-weight: 700;
	margin: 0;
	line-height: 1.3;
}

.mail-reading-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	margin: 0;
	font-size: 0.8125rem;
	color: var(--color-text-subtle);
}

/* Reading pane body — scrollable; owns its padding. */
.mail-reading-body {
	flex: 1;
	overflow-y: auto;
	padding: 1.5rem;
	line-height: 1.7;
}

@media (max-width: 960px) {
	.mail-reading-body {
		overflow-y: visible;
	}
}

.mail-reading-lead {
	font-size: 1.0625rem;
}

/* Reading pane footer — action toolbar + encryption note. */
.mail-reading-footer {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.875rem 1.5rem;
	border-block-start: 1px solid var(--color-border);
	background-color: var(--color-surface-raised, var(--color-surface));
	flex-shrink: 0;
	flex-wrap: wrap;
}

.mail-reading-toolbar {
	gap: 0.5rem;
}

.mail-reading-footer-note {
	margin: 0;
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	margin-inline-start: auto;
}

/* Empty state — centered icon + caption when no message is selected. */
.mail-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: 0.875rem;
	color: var(--color-text-subtle);
	margin: 0;
	padding: 3rem;
}

.mail-empty-state .icon {
	inline-size: 3rem;
	block-size: 3rem;
}

.mail-empty-state figcaption {
	font-size: 0.9375rem;
	text-align: center;
}
</style>
