<script lang="ts" setup>
/**
 * CrmExample — four-pane agent workspace port of mailbox's CrmExample.
 *
 * Layout intent (Option A — uses all four body-shell areas):
 *   - Command bar <header> at body-shell position: search/ask input + mobile
 *     drawer triggers on both sides (left = context, right = docs).
 *   - Context rail <nav id="crm-context" class="start"> at body-shell position:
 *     search + draggable list of context entries (pinned + recent). Drag-to-
 *     reorder via useDrag. On desktop: persistent in-flow column. On mobile:
 *     popover drawer (left edge).
 *   - Chat pane <main> at body-shell position: message thread (5+ turns
 *     including one inline form + one tool-call <details> accordion) + reply
 *     composer pinned at bottom.
 *   - Documents panel <aside id="crm-docs" class="end"> at body-shell position:
 *     docs list + "Add note" <dialog> via useDialog. On desktop: persistent
 *     in-flow column. On mobile: popover drawer (right edge).
 *
 * Body-shell pattern: the template renders <header>, <nav>, <main>, <aside> as
 * Vue-fragment siblings (no wrapping element). ExamplesShell renders a fragment
 * too, so these elements end up as effective grandchildren of <body> via the
 * #app `display: contents` hop. That lets the framework's body-shell selectors
 * paint the chrome for all four areas.
 *
 * Composables exercised:
 *   - useDrag (context list drag-to-reorder — first example to exercise this)
 *   - useDialog (Add note modal)
 *   - Standard ExamplesShell composables (useDialog, useMenu, useTheme)
 *
 * Translation rules (per spec):
 *   - `useOffcanvas` → native <nav :popover> / <aside :popover> + popovertarget
 *   - `.nav.nav-pills` context list → draggable <ul> with [data-index] rows
 *   - `.list-group` docs list → <menu> of doc rows
 *   - Bootstrap timeline accordion → <details> for tool calls
 *   - Chat turns → scoped .crm-turn message rows (no framework primitive)
 *   - Reply composer → <form> with <textarea> + send <button>, sticky bottom
 *   - "Add note" modal → <dialog> + useDialog
 *   - Avatars → scoped .crm-avatar (fifth example using this pattern)
 *
 * Framework gaps flagged:
 *   1. Circular avatar/initials badge (.crm-avatar) — Dashboard + Marketing +
 *      Auth + Mail + CRM = FIVE examples. Overwhelming signal for a framework
 *      .avatar component. Scoped only here; flag for framework addition.
 *   2. Chat message bubbles — universal pattern. No framework <article
 *      class="message"> or <dl class="conversation"> primitive. If Mail's
 *      thread-row layout overlaps, consider a shared .bubble / .message modifier.
 *   3. Sticky-bottom composer — every chat app. Could be a .composer modifier
 *      or <form class="sticky-bottom"> framework primitive. Scoped here.
 *   4. Drag-over highlight states — useDrag writes .drop-target,
 *      .drop-indicator-before, .drop-indicator-after onto rows. Styled here
 *      in scoped CSS — composable API fits without workarounds.
 *   5. Inner multi-pane grid — not needed here (Option A uses all four body-
 *      shell areas), but Mail + CRM both show the pattern is common.
 */
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useDialog, useDrag } from '@elements/browser'

// ── Types ──────────────────────────────────────────────────────────────────

type EntryKind = 'chat' | 'entity' | 'list' | 'prompt' | 'tool'

interface Entry {
	readonly id: string
	readonly kind: EntryKind
	readonly label: string
	readonly icon: string
	readonly hint?: string
	readonly count?: number
	readonly tone?: 'info' | 'warning' | 'danger'
}

type ChatRole = 'rep' | 'agent' | 'tool' | 'thinking' | 'form'

interface FormSchema {
	readonly title: string
	readonly subtitle?: string
	readonly outcomeLabel: string
	readonly options: readonly string[]
	readonly dateLabel: string
	readonly dateValue: string
	readonly toneLabel: string
	readonly toneOptions: readonly string[]
	readonly toneActive: string
	readonly submit: string
	readonly cancel: string
}

interface ChatTurn {
	readonly id: string
	readonly role: ChatRole
	readonly when: string
	readonly body: string
	readonly tool?: { readonly name: string; readonly args: string; readonly result: string }
	readonly form?: FormSchema
}

interface DocRow {
	readonly id: string
	readonly name: string
	readonly kind: string
	readonly size: string
	readonly when: string
	readonly icon: string
}

// ── Data ───────────────────────────────────────────────────────────────────

const pinned = ref<Entry[]>([
	{
		id: 'acme',
		kind: 'entity',
		label: 'Acme Corp',
		icon: 'information',
		hint: 'account · 4 contacts',
		tone: 'info',
	},
	{
		id: 'q2',
		kind: 'entity',
		label: 'Q2 expansion',
		icon: 'warning',
		hint: 'deal · $48,000',
		tone: 'warning',
	},
])

const recent = ref<Entry[]>([
	{
		id: 'chat-stall',
		kind: 'chat',
		label: 'Why is Acme stalling?',
		icon: 'search',
		tone: undefined,
	},
	{
		id: 'tool-search',
		kind: 'tool',
		label: "search('Acme')",
		icon: 'search',
		hint: '12 results',
	},
	{
		id: 'tasks',
		kind: 'list',
		label: 'Open tasks',
		icon: 'success',
		count: 12,
	},
	{
		id: 'renewals',
		kind: 'list',
		label: 'Renewals · 30d',
		icon: 'sort',
		count: 4,
	},
	{
		id: 'prompt-followup',
		kind: 'prompt',
		label: 'Confirm follow-up',
		icon: 'danger',
		tone: 'danger',
	},
])

const turns: readonly ChatTurn[] = [
	{
		id: 't1',
		role: 'rep',
		when: '9:42 AM',
		body: "Why is Acme stalling on the Q2 expansion? They were enthusiastic three weeks ago and we've heard nothing since the proposal landed.",
	},
	{
		id: 't2',
		role: 'thinking',
		when: '9:42 AM',
		body: 'Pulling the account history, then crossing it against the deal stage transitions. Looking at recent touchpoints, last carrier change, and any unanswered questions.',
	},
	{
		id: 't3',
		role: 'tool',
		when: '9:42 AM',
		body: 'search · returned 12 records',
		tool: {
			name: 'search',
			args: "{ q: 'Acme Corp', kinds: ['account','deal','contact','activity'] }",
			result: '12 records · 1 account, 1 deal, 4 contacts, 6 activities',
		},
	},
	{
		id: 't4',
		role: 'agent',
		when: '9:43 AM',
		body: 'Three things stand out. First, the proposal was sent on April 19 — but no follow-up has been logged since. Second, Maria Garcia opened the proposal twice but Daniel Reyes (Finance) has not. Third, a competitor sent a benchmark report to Acme on April 22.',
	},
	{
		id: 't5',
		role: 'agent',
		when: '9:43 AM',
		body: 'My read: the technical buyer is sold, the financial buyer is comparing. Send Daniel a one-page TCO the same day, and ping Maria to forward it. Want me to draft both?',
	},
	{
		id: 't6',
		role: 'rep',
		when: '9:44 AM',
		body: 'Yes — draft the TCO email to Daniel and a quick forward note to Maria. Soft tone, no pressure.',
	},
	{
		id: 't7',
		role: 'form',
		when: '9:44 AM',
		body: 'Confirm next step',
		form: {
			title: 'Confirm next step',
			subtitle: 'The agent paused — answer to resume the chat thread.',
			outcomeLabel: 'Outcome of this conversation',
			options: [
				'Send TCO email to Daniel Reyes',
				'Schedule discovery call with Maria Garcia',
				'Hold — wait on internal review',
				'Disqualify deal',
			],
			dateLabel: 'Follow-up date',
			dateValue: '2026-05-12',
			toneLabel: 'Tone for the draft',
			toneOptions: ['Soft', 'Direct', 'Formal'],
			toneActive: 'Soft',
			submit: 'Confirm & resume',
			cancel: 'Save draft',
		},
	},
]

const docs: readonly DocRow[] = [
	{
		id: 'd1',
		name: 'proposal_v3.pdf',
		kind: 'Proposal',
		size: '2.4 MB',
		when: 'Apr 19',
		icon: 'danger',
	},
	{
		id: 'd2',
		name: 'msa_acme_2026.docx',
		kind: 'Agreement',
		size: '184 KB',
		when: 'Apr 03',
		icon: 'external',
	},
	{
		id: 'd3',
		name: 'tco_worksheet.xlsx',
		kind: 'Pricing',
		size: '64 KB',
		when: 'Mar 28',
		icon: 'success',
	},
	{
		id: 'd4',
		name: 'discovery_notes.md',
		kind: 'Notes',
		size: '12 KB',
		when: 'Mar 14',
		icon: 'information',
	},
]

const entryToneClass: Record<NonNullable<Entry['tone']>, string> = {
	info: 'information',
	warning: 'warning',
	danger: 'danger',
}

const roleMeta: Record<ChatRole, { readonly label: string; readonly tone: string }> = {
	rep: { label: 'You', tone: 'information' },
	agent: { label: 'Agent', tone: '' },
	tool: { label: 'Tool', tone: 'warning' },
	thinking: { label: 'Thinking', tone: '' },
	form: { label: 'Agent · awaiting', tone: 'danger' },
}

// ── Mobile breakpoint ──────────────────────────────────────────────────────

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

// ── Command bar ────────────────────────────────────────────────────────────

const command = ref('')

const submit = (): void => {
	// Presentational — the seed thread is frozen in this example.
}

// ── Context drag-to-reorder ────────────────────────────────────────────────
// Two lists (pinned + recent) each bound to a useDrag instance.
// Within a list, useDrag handles reorder by splicing the reactive ref.
// Cross-list drops are handled manually via the on.drop + on.start callbacks.

type StackList = 'pinned' | 'recent'

const pinnedListRef = useTemplateRef<HTMLElement>('pinnedListRef')
const recentListRef = useTemplateRef<HTMLElement>('recentListRef')

interface DragContext {
	readonly from: StackList
	readonly indices: readonly number[]
}

let dragSource: DragContext | null = null

const pinnedDrag = useDrag<Entry>(pinnedListRef, {
	list: pinned,
	on: {
		start: () => {
			dragSource = { from: 'pinned', indices: [...pinnedDrag.indices.value] }
		},
		drop: (event) => {
			// Same-list reorder: useDrag's splice already handled it.
			// Cross-list drop from recent → pinned.
			const src = dragSource
			if (!src || src.from === 'pinned') return
			const detail = (event as CustomEvent).detail as
				| { index: number | null; position: string | null }
				| undefined
			const insertAt =
				detail?.index !== null && detail?.position != null && detail.position !== 'into'
					? detail.position === 'after'
						? (detail.index ?? 0) + 1
						: (detail.index ?? 0)
					: pinned.value.length
			const moved = [...src.indices]
				.sort((a, b) => b - a)
				.map((i) => recent.value[i])
				.filter((e): e is Entry => e !== undefined)
			for (const i of [...src.indices].sort((a, b) => b - a)) recent.value.splice(i, 1)
			pinned.value.splice(insertAt, 0, ...moved.reverse())
			dragSource = null
		},
		end: () => {
			dragSource = null
		},
	},
})

const recentDrag = useDrag<Entry>(recentListRef, {
	list: recent,
	on: {
		start: () => {
			dragSource = { from: 'recent', indices: [...recentDrag.indices.value] }
		},
		drop: (event) => {
			const src = dragSource
			if (!src || src.from === 'recent') return
			const detail = (event as CustomEvent).detail as
				| { index: number | null; position: string | null }
				| undefined
			const insertAt =
				detail?.index !== null && detail?.position != null && detail.position !== 'into'
					? detail.position === 'after'
						? (detail.index ?? 0) + 1
						: (detail.index ?? 0)
					: recent.value.length
			const moved = [...src.indices]
				.sort((a, b) => b - a)
				.map((i) => pinned.value[i])
				.filter((e): e is Entry => e !== undefined)
			for (const i of [...src.indices].sort((a, b) => b - a)) pinned.value.splice(i, 1)
			recent.value.splice(insertAt, 0, ...moved.reverse())
			dragSource = null
		},
		end: () => {
			dragSource = null
		},
	},
})

// Keep the linter happy — both drag instances are used for their side effects.
void pinnedDrag
void recentDrag

// ── Add note dialog ────────────────────────────────────────────────────────

const noteDialogRef = useTemplateRef<HTMLDialogElement>('noteDialogRef')
const noteDialog = useDialog(noteDialogRef, { modal: true })
const noteText = ref('')
</script>

<template>
	<!-- Command bar — <header> at body-shell position. Framework's
	     `body:has(main) > header` paints the band chrome (height, border-
	     block-end, background). Provides left context-drawer trigger,
	     the search/ask command input, and right docs-drawer trigger on mobile. -->
	<header>
		<button
			type="button"
			class="subtle compact"
			aria-label="Open context"
			popovertarget="crm-context"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>

		<span class="crm-brand">
			<!-- TODO icon swap — search stands in for missing 'radioactive' (brand icon) -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-search)"></i>
			<strong>Helix CRM</strong>
		</span>

		<form class="crm-command-form" role="search" @submit.prevent="submit">
			<label>
				<span class="sr-only">Search or ask the agent</span>
				<input
					v-model="command"
					type="search"
					placeholder="Search accounts, deals, tasks — or ask the agent…"
					autocomplete="off"
				/>
			</label>
			<button type="submit" class="primary compact" aria-label="Ask the agent">
				<!-- TODO icon swap — search stands in for missing 'stars' (AI ask icon) -->
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-search)"></i>
				<span class="hidden md:inline">Ask</span>
			</button>
		</form>

		<button
			type="button"
			class="subtle compact"
			aria-label="Open documents"
			popovertarget="crm-docs"
		>
			<!-- TODO icon swap — sort stands in for missing 'layout-sidebar-inset-reverse' -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
		</button>
	</header>

	<!-- Context rail — <nav> at body-shell position. Framework's
	     `body:has(main) > * > nav` chrome paints the inline-size,
	     border-inline-end, and popover drawer mode. On desktop (>960px)
	     the nav sits in-flow as a persistent left column. On mobile it
	     is a popover drawer opened by the command bar left trigger.

	     The `class="start"` tells the framework this is a left-side rail.
	     `--set-aside-drawer-padding-inline: 0` removes the framework's 16px
	     gutter so menus own their own padding.

	     `nav#crm-context > :where(menu, h6, .crm-new-row, form)` get
	     `flex: 0 0 auto` in scoped CSS so multi-section body children don't
	     stretch (framework drawer rule grows body children by default). -->
	<nav
		id="crm-context"
		class="start"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Context"
		style="--set-aside-drawer-padding-inline: 0"
	>
		<!-- Brand band — <header> inside body-shell <nav> picks up the
		     framework's drawer/rail header chrome (chunky band, divider,
		     pinned top). -->
		<header>
			<!-- TODO icon swap — search stands in for missing 'stack' (context stack icon) -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-search)"></i>
			<strong class="flex-1">Context</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close context"
				popovertarget="crm-context"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<!-- Search within context rail. -->
		<div class="crm-new-row">
			<form role="search" class="crm-context-search" @submit.prevent>
				<label>
					<span class="sr-only">Search context</span>
					<input type="search" placeholder="Search context…" autocomplete="off" />
				</label>
			</form>
		</div>

		<!-- Pinned section — draggable via useDrag.
		     Each [data-index] child is auto-draggable; .drop-indicator-before /
		     .drop-indicator-after CSS classes are written by useDrag for styling.
		     Framework-gap: drag-over highlight states need scoped CSS because
		     the composable exposes the classes but doesn't style them. -->
		<h6>Pinned</h6>
		<ul ref="pinnedListRef" class="crm-context-list">
			<li v-for="(entry, index) in pinned" :key="entry.id" :data-index="index" class="crm-entry">
				<span class="crm-grip drag-handle" aria-hidden="true">⋮⋮</span>
				<i
					class="icon crm-entry-icon"
					aria-hidden="true"
					:style="`--icon: var(--set-icon-${entry.icon})`"
				></i>
				<span class="crm-entry-body">
					<span class="crm-entry-label truncate">{{ entry.label }}</span>
					<span v-if="entry.hint" class="crm-entry-hint truncate">{{ entry.hint }}</span>
				</span>
				<span
					v-if="entry.tone"
					class="dot flex-shrink-0"
					:class="entryToneClass[entry.tone]"
					aria-hidden="true"
				></span>
			</li>
			<li v-if="pinned.length === 0" class="crm-entry-empty">Drag an entry here to pin it.</li>
		</ul>

		<!-- Recent section — draggable via useDrag. -->
		<h6>Recent</h6>
		<ul ref="recentListRef" class="crm-context-list">
			<li v-for="(entry, index) in recent" :key="entry.id" :data-index="index" class="crm-entry">
				<span class="crm-grip drag-handle" aria-hidden="true">⋮⋮</span>
				<i
					class="icon crm-entry-icon"
					aria-hidden="true"
					:style="`--icon: var(--set-icon-${entry.icon})`"
				></i>
				<span class="crm-entry-body">
					<span
						class="crm-entry-label truncate"
						:class="entry.kind === 'tool' ? 'crm-entry-mono' : ''"
						>{{ entry.label }}</span
					>
				</span>
				<small v-if="entry.count !== undefined" class="badge pill">{{ entry.count }}</small>
				<span
					v-else-if="entry.tone"
					class="dot flex-shrink-0"
					:class="entryToneClass[entry.tone]"
					aria-hidden="true"
				></span>
			</li>
			<li v-if="recent.length === 0" class="crm-entry-empty">Nothing here yet.</li>
		</ul>

		<!-- Account band — <footer> inside body-shell <nav> picks up the
		     framework's drawer/rail footer chrome (border-block-start, pinned
		     bottom via `margin-block-start: auto`). -->
		<footer>
			<!-- Circular initials badge — scoped .crm-avatar.
			     Framework-gap: Dashboard + Marketing + Auth + Mail + CRM = FIVE examples.
			     Overwhelming signal for a framework .avatar / .mark component. -->
			<span class="crm-avatar crm-avatar-account" aria-hidden="true">MS</span>
			<span class="flex flex-col leading-tight min-w-0">
				<strong class="truncate">Mike Saint</strong>
				<small style="color: var(--color-text-subtle)" class="truncate">Acme · West region</small>
			</span>
			<button type="button" class="subtle compact flex-shrink-0" aria-label="Settings">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
			</button>
		</footer>
	</nav>

	<!-- Chat pane — <main> at body-shell position. Framework's
	     `body:has(main) > main` paints scroll + overflow + the gap + padding tokens.
	     Token overrides collapse padding to zero so the inner chat thread + composer
	     own all layout edge-to-edge.
	     `pb-28 sm:pb-0` keeps the floating ExamplesShell toolbar from overlapping
	     the reply composer on mobile. -->
	<main
		class="crm-main pb-28 sm:pb-0"
		style="--set-main-padding-inline: 0; --set-main-padding-block: 0; --set-main-gap: 0"
	>
		<!-- Chat header — subject + metadata band above the thread. -->
		<header class="crm-chat-header">
			<hgroup class="min-w-0">
				<p class="crm-chat-eyebrow">
					<small class="tag information">Chat</small>
				</p>
				<h1 class="crm-chat-title truncate">Why is Acme stalling?</h1>
				<p class="crm-chat-meta">{{ turns.length }} turns · linked to Acme Corp</p>
			</hgroup>
			<menu role="toolbar" aria-label="Chat actions" class="crm-chat-toolbar">
				<li role="none">
					<!-- TODO icon swap — filter stands in for missing 'pin' -->
					<button type="button" class="subtle compact" aria-label="Pin conversation">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
					</button>
				</li>
				<li role="none">
					<!-- TODO icon swap — sort stands in for missing 'arrow-clockwise' (refresh) -->
					<button type="button" class="subtle compact" aria-label="Refresh">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
					</button>
				</li>
				<li role="none">
					<button type="button" class="subtle compact" aria-label="More options">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
					</button>
				</li>
			</menu>
		</header>

		<!-- Thread — scrollable list of chat turns.
		     Framework-gap: chat message bubbles are a universal pattern.
		     No framework primitive — scoped .crm-turn* CSS handles it.
		     Alignment: rep = trailing edge; agent/tool/thinking = leading edge. -->
		<div class="crm-thread">
			<ol class="crm-turns" role="list">
				<li v-for="turn in turns" :key="turn.id" class="crm-turn" :data-role="turn.role">
					<!-- Role label + timestamp -->
					<div class="crm-turn-meta">
						<span v-if="roleMeta[turn.role].tone" class="tag" :class="roleMeta[turn.role].tone">{{
							roleMeta[turn.role].label
						}}</span>
						<span v-else class="crm-turn-role">{{ roleMeta[turn.role].label }}</span>
						<time class="crm-turn-time">{{ turn.when }}</time>
					</div>

					<!-- Thinking turn — italicised, subtle -->
					<p v-if="turn.role === 'thinking'" class="crm-turn-body crm-turn-thinking">
						{{ turn.body }}
					</p>

					<!-- Tool call turn — <details> accordion for the args/result
					     Framework-gap: <details> works here as the disclosure chrome;
					     useDetails not needed for this simple open/closed toggle. -->
					<details
						v-else-if="turn.role === 'tool' && turn.tool"
						class="crm-turn-body crm-turn-tool"
					>
						<summary>
							<code>{{ turn.tool.name }}</code> — {{ turn.body }}
						</summary>
						<dl class="crm-tool-detail">
							<dt>Arguments</dt>
							<dd>
								<pre><code>{{ turn.tool.args }}</code></pre>
							</dd>
							<dt>Result</dt>
							<dd>{{ turn.tool.result }}</dd>
						</dl>
					</details>

					<!-- Inline form turn — agent paused and needs structured input.
					     Framework-gap: no framework "chat form turn" primitive.
					     Scoped as an <article> card with a <form> inside the thread. -->
					<article
						v-else-if="turn.role === 'form' && turn.form"
						class="crm-turn-body crm-turn-form"
					>
						<header>
							<p class="m-0">
								<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-warning)"></i>
								<strong>{{ turn.form.title }}</strong>
							</p>
							<p v-if="turn.form.subtitle" class="crm-form-subtitle">
								{{ turn.form.subtitle }}
							</p>
						</header>
						<form @submit.prevent>
							<div class="crm-form-field">
								<label :for="`crm-outcome-${turn.id}`">{{ turn.form.outcomeLabel }}</label>
								<select :id="`crm-outcome-${turn.id}`">
									<option v-for="opt in turn.form.options" :key="opt">{{ opt }}</option>
								</select>
							</div>
							<div class="crm-form-field">
								<label :for="`crm-date-${turn.id}`">{{ turn.form.dateLabel }}</label>
								<input :id="`crm-date-${turn.id}`" type="date" :value="turn.form.dateValue" />
							</div>
							<div class="crm-form-field">
								<label>{{ turn.form.toneLabel }}</label>
								<menu role="group" :aria-label="turn.form.toneLabel" class="crm-tone-group">
									<li v-for="opt in turn.form.toneOptions" :key="opt" role="none">
										<button
											type="button"
											class="subtle"
											:class="{ active: opt === turn.form.toneActive }"
											:aria-pressed="opt === turn.form.toneActive"
										>
											{{ opt }}
										</button>
									</li>
								</menu>
							</div>
							<div class="crm-form-actions">
								<button type="button" class="subtle">{{ turn.form.cancel }}</button>
								<button type="submit" class="primary">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
									{{ turn.form.submit }}
								</button>
							</div>
						</form>
					</article>

					<!-- Regular text turn (rep / agent) -->
					<p v-else class="crm-turn-body">{{ turn.body }}</p>
				</li>
			</ol>
		</div>

		<!-- Reply composer — sticky at the bottom of the chat pane.
		     Framework-gap: sticky-bottom composer is common in every chat app.
		     Could be a .composer modifier. Scoped CSS here. -->
		<footer class="crm-composer">
			<label for="crm-reply" class="sr-only">Reply to the agent</label>
			<textarea
				id="crm-reply"
				rows="2"
				placeholder="Reply to the agent — Cmd/Ctrl + Enter to send"
			></textarea>
			<div class="crm-composer-actions">
				<menu role="toolbar" aria-label="Composer attachments" class="crm-composer-toolbar">
					<li role="none">
						<!-- TODO icon swap — minus stands in for missing 'paperclip' -->
						<button type="button" class="subtle compact" aria-label="Attach file">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
						</button>
					</li>
					<li role="none">
						<!-- TODO icon swap — information stands in for missing 'mic' -->
						<button type="button" class="subtle compact" aria-label="Dictate">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
						</button>
					</li>
				</menu>
				<button type="button" class="primary">
					<!-- TODO icon swap — external stands in for missing 'send' -->
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					Send
				</button>
			</div>
		</footer>
	</main>

	<!-- Documents panel — <aside class="end"> at body-shell position.
	     Framework's `body:has(main) > * > aside.end` chrome paints the
	     inline-size (right panel), border-inline-start, and popover drawer
	     mode. On desktop (>960px) the aside sits in-flow as a persistent
	     right column. On mobile it is a popover drawer opened by the command
	     bar right trigger.

	     This is the first example to use BOTH a left <nav> drawer AND a right
	     <aside> drawer simultaneously — mirrors Dashboard's right-actions-aside
	     + nav-sidebar combination. -->
	<aside
		id="crm-docs"
		class="end"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Documents"
		style="--set-aside-drawer-padding-inline: 0"
	>
		<!-- Docs panel header. -->
		<header>
			<!-- TODO icon swap — sort stands in for missing 'folder2-open' -->
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
			<hgroup class="flex-1 min-w-0">
				<h2 class="crm-docs-title">Documents</h2>
				<p class="crm-docs-subtitle">Acme Corp · {{ docs.length }} files</p>
			</hgroup>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close documents"
				popovertarget="crm-docs"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<!-- Docs list. -->
		<div class="crm-docs-body">
			<menu class="crm-docs-list">
				<li v-for="doc in docs" :key="doc.id" class="crm-doc-row">
					<i
						class="icon crm-doc-icon"
						aria-hidden="true"
						:style="`--icon: var(--set-icon-${doc.icon})`"
					></i>
					<span class="crm-doc-meta">
						<span class="crm-doc-name truncate">{{ doc.name }}</span>
						<span class="crm-doc-info">{{ doc.kind }} · {{ doc.size }} · {{ doc.when }}</span>
					</span>
					<button
						type="button"
						class="subtle compact flex-shrink-0"
						:aria-label="`Download ${doc.name}`"
					>
						<!-- TODO icon swap — chevron-down stands in for missing 'download' -->
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-down)"></i>
					</button>
				</li>
			</menu>
		</div>

		<!-- Add note trigger + dialog. -->
		<footer>
			<button type="button" class="primary w-full" @click="noteDialog.show()">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
				Add note
			</button>
		</footer>
	</aside>

	<!-- Add note dialog — top-layer modal via useDialog.
	     Teleported to body by the framework's <dialog> element chrome.
	     framework-gap: useDialog + native <dialog> is the correct primitive here;
	     mailbox used .modal which we replace cleanly. -->
	<dialog ref="noteDialogRef" aria-label="Add note" class="crm-note-dialog">
		<header>
			<h2>Add note</h2>
			<button type="button" class="subtle compact" aria-label="Close" @click="noteDialog.hide()">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>
		<form method="dialog" @submit.prevent="noteDialog.hide()">
			<div class="crm-form-field">
				<label for="crm-note-text">Note</label>
				<textarea
					id="crm-note-text"
					v-model="noteText"
					rows="4"
					placeholder="Write your note here…"
				></textarea>
			</div>
			<div class="crm-form-field">
				<label for="crm-note-topic">Topic</label>
				<select id="crm-note-topic">
					<option>General</option>
					<option>Follow-up</option>
					<option>Risk flag</option>
					<option>Decision</option>
				</select>
			</div>
			<div class="crm-dialog-actions">
				<button type="button" class="subtle" @click="noteDialog.hide()">Cancel</button>
				<button type="submit" class="primary">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
					Save note
				</button>
			</div>
		</form>
	</dialog>
</template>

<style scoped>
/* ── App-specific layout glue ──────────────────────────────────────────
 *
 * The body-shell <header>, <nav>, <main>, <aside> elements get their chrome
 * from the framework's body-shell selectors. Only the truly app-specific
 * bits remain here.
 * ──────────────────────────────────────────────────────────────────── */

/* ── Command bar (header) ─────────────────────────────────────────────── */

/* Brand cluster — icon + name, visible on desktop. */
.crm-brand {
	display: none;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.9375rem;
	font-weight: 700;
	flex-shrink: 0;
}

@media (min-width: 640px) {
	.crm-brand {
		display: inline-flex;
	}
}

/* Command form — grows to fill the header row, capped so it doesn't blow
 * out on very wide viewports. The framework's <form role="search"> + <input
 * type="search"> chrome handles the rest. */
.crm-command-form {
	flex: 1;
	min-inline-size: 0;
	max-inline-size: 36rem;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.crm-command-form label {
	flex: 1;
	min-inline-size: 0;
}

.crm-command-form input {
	inline-size: 100%;
}

/* ── Context rail (nav) ───────────────────────────────────────────────── */

/* Sidebar nav drawer body — pin each child to natural height (framework's
 * drawer rule would grow them). Footer's margin-block-start: auto then
 * pushes the account row to the bottom (Slack / Discord / Linear shape). */
nav#crm-context > :where(.crm-new-row, h6, .crm-context-list, form) {
	flex: 0 0 auto;
}

/* Search row — compact band between header and pinned list. */
.crm-new-row {
	padding: 0.5rem 0.75rem;
}

.crm-context-search {
	inline-size: 100%;
}

.crm-context-search input {
	inline-size: 100%;
}

/* Context entry list — draggable rows. Minimum height keeps the empty drop
 * zone sized so the user can drag the last entry out without losing the target. */
.crm-context-list {
	list-style: none;
	margin: 0;
	padding: 0 0.375rem;
	display: grid;
	gap: 0.125rem;
	min-block-size: 2.5rem;
}

/* Drag-handle appearance — grip glyph for the draggable zone. */
.crm-grip {
	font-family: monospace;
	letter-spacing: -0.1em;
	color: var(--color-text-subtle);
	opacity: 0.45;
	cursor: grab;
	user-select: none;
	font-size: 0.875rem;
	flex-shrink: 0;
	transition: opacity 150ms ease;
}

.crm-entry:hover .crm-grip,
.crm-entry:focus-visible .crm-grip {
	opacity: 0.85;
}

/* Context entry row — flex layout for grip / icon / label+hint / badge. */
.crm-entry {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.5rem;
	border-radius: 0.375rem;
	cursor: grab;
	user-select: none;
	transition:
		background-color 150ms ease,
		box-shadow 150ms ease;
}

.crm-entry:hover {
	background-color: var(--color-surface-raised, var(--color-canvas-strong));
}

.crm-entry.selected {
	background-color: color-mix(in oklch, var(--color-primary) 10%, transparent);
	box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 30%, transparent);
}

.crm-entry.dragging {
	opacity: 0.4;
}

/* Drop indicator lines — written by useDrag onto each row. */
.crm-entry.drop-target.drop-indicator-before::before,
.crm-entry.drop-target.drop-indicator-after::after {
	content: '';
	position: absolute;
	inset-inline: 0.375rem;
	block-size: 2px;
	background: var(--color-primary);
	border-radius: 2px;
	pointer-events: none;
}

.crm-entry {
	position: relative;
}

.crm-entry.drop-indicator-before::before {
	inset-block-start: -1px;
}

.crm-entry.drop-indicator-after::after {
	inset-block-end: -1px;
}

.crm-entry-icon {
	flex-shrink: 0;
	inline-size: 1rem;
	block-size: 1rem;
}

.crm-entry-body {
	flex: 1;
	min-inline-size: 0;
	display: flex;
	flex-direction: column;
	gap: 0.0625rem;
}

.crm-entry-label {
	font-size: 0.8125rem;
	font-weight: 500;
	display: block;
}

.crm-entry-hint {
	font-size: 0.725rem;
	color: var(--color-text-subtle);
	display: block;
}

.crm-entry-mono {
	font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
	font-size: 0.75rem;
}

.crm-entry-empty {
	padding: 0.5rem 0.5rem;
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	font-style: italic;
	cursor: default;
}

/* Circular initials badge — no framework "filled circle with text" primitive.
 * Framework-gap: Dashboard + Marketing + Auth + Mail + CRM = FIVE examples.
 * Overwhelming signal for a framework .avatar / .mark component. */
.crm-avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	font-weight: 600;
	flex-shrink: 0;
}

.crm-avatar-account {
	inline-size: 2.25rem;
	block-size: 2.25rem;
	font-size: 0.75rem;
	background-color: var(--color-primary-bg-subtle, var(--color-surface-raised));
	color: var(--color-primary-text-emphasis, var(--color-primary));
}

/* ── Chat pane (main) ─────────────────────────────────────────────────── */

/* Chat pane is a flex-column so the thread scrolls and the composer sticks.
 * The framework's <main> sets overflow: auto by default; we override to
 * flex-column + overflow: hidden so the inner thread div controls scrolling. */
.crm-main {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

@media (max-width: 960px) {
	.crm-main {
		overflow: auto;
	}
}

/* Chat header — subject + metadata + action toolbar band. */
.crm-chat-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.875rem 1.25rem;
	border-block-end: 1px solid var(--color-border);
	background-color: var(--color-surface);
	flex-shrink: 0;
}

.crm-chat-eyebrow {
	margin: 0 0 0.25rem;
}

.crm-chat-title {
	font-size: 1rem;
	font-weight: 700;
	margin: 0;
	line-height: 1.3;
}

.crm-chat-meta {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	margin: 0.25rem 0 0;
}

.crm-chat-toolbar {
	gap: 0.25rem;
	flex-shrink: 0;
}

/* Thread scroll container — fills remaining space, scrolls independently. */
.crm-thread {
	flex: 1;
	overflow-y: auto;
	padding: 1rem 1.25rem;
}

@media (max-width: 960px) {
	.crm-thread {
		overflow-y: visible;
	}
}

/* Turn list — no bullets, natural column flow. */
.crm-turns {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.875rem;
}

/* Individual turn — metadata row + bubble. Alignment keyed on data-role:
 * rep → trailing edge; agent / tool / thinking / form → leading edge.
 * Framework-gap: chat message bubbles are universal. No framework primitive.
 * If Mail's reading pane and CRM's chat align, propose a .bubble / .message. */
.crm-turn {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	max-inline-size: 80%;
}

.crm-turn[data-role='rep'] {
	align-self: flex-end;
	align-items: flex-end;
}

.crm-turn[data-role='agent'],
.crm-turn[data-role='tool'],
.crm-turn[data-role='thinking'],
.crm-turn[data-role='form'] {
	align-self: flex-start;
	align-items: flex-start;
}

.crm-turn[data-role='form'] {
	max-inline-size: 100%;
	inline-size: 100%;
}

.crm-turn-meta {
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
}

.crm-turn-role {
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--color-text-subtle);
}

.crm-turn-time {
	font-size: 0.6875rem;
	color: var(--color-text-subtle);
	font-variant-numeric: tabular-nums;
}

/* Turn body — a bubble or disclosure card. */
.crm-turn-body {
	margin: 0;
	padding: 0.625rem 0.875rem;
	border-radius: 0.75rem;
	font-size: 0.875rem;
	line-height: 1.55;
	background-color: var(--color-surface-raised, var(--color-canvas-strong));
}

.crm-turn[data-role='rep'] .crm-turn-body {
	background-color: var(--color-primary-bg-subtle);
	border-end-inline-end-radius: 0.25rem;
}

.crm-turn[data-role='agent'] .crm-turn-body {
	border-end-inline-start-radius: 0.25rem;
}

.crm-turn-thinking {
	font-style: italic;
	color: var(--color-text-subtle);
	background-color: transparent;
	padding-inline: 0;
}

/* Tool-call details — disclosure accordion for the tool args + result. */
.crm-turn-tool {
	padding: 0;
	overflow: hidden;
}

.crm-turn-tool summary {
	padding: 0.625rem 0.875rem;
	cursor: pointer;
	font-size: 0.8125rem;
}

.crm-tool-detail {
	padding: 0.5rem 0.875rem 0.625rem;
	margin: 0;
	font-size: 0.8125rem;
	border-block-start: 1px solid var(--color-border);
	display: grid;
	grid-template-columns: 5rem 1fr;
	gap: 0.25rem 0.75rem;
	color: var(--color-text-subtle);
}

.crm-tool-detail dt {
	font-weight: 600;
	align-self: start;
}

.crm-tool-detail dd {
	margin: 0;
}

.crm-tool-detail pre {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-size: 0.75rem;
}

/* Inline form turn — agent paused, asks for structured input. */
.crm-turn-form {
	padding: 0;
	inline-size: 100%;
}

.crm-form-subtitle {
	font-size: 0.8125rem;
	color: var(--color-text-subtle);
	margin: 0.375rem 0 0;
}

.crm-form-field {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	padding: 0.75rem 1rem;
	border-block-start: 1px solid var(--color-border);
}

.crm-form-field label {
	font-size: 0.8125rem;
	font-weight: 600;
}

.crm-tone-group {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

.crm-form-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-block-start: 1px solid var(--color-border);
}

/* Reply composer — sticky bottom of the chat pane.
 * Framework-gap: sticky-bottom composer is universal. Could be .composer.
 * Scoped CSS here. */
.crm-composer {
	flex-shrink: 0;
	border-block-start: 1px solid var(--color-border);
	background-color: var(--color-surface);
	padding: 0.75rem 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
}

.crm-composer textarea {
	inline-size: 100%;
	resize: none;
	border-radius: 0.5rem;
}

.crm-composer-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.crm-composer-toolbar {
	gap: 0.25rem;
}

.crm-composer-actions .primary {
	margin-inline-start: auto;
}

/* ── Documents panel (aside) ──────────────────────────────────────────── */

/* Sidebar aside drawer body — pin children to natural height (same pattern
 * as the nav above). */
aside#crm-docs > :where(.crm-docs-body, menu, form) {
	flex: 0 0 auto;
}

.crm-docs-title {
	font-size: 0.9375rem;
	font-weight: 700;
	margin: 0;
	line-height: 1.2;
}

.crm-docs-subtitle {
	font-size: 0.75rem;
	color: var(--color-text-subtle);
	margin: 0.125rem 0 0;
}

.crm-docs-body {
	flex: 1 1 auto;
	overflow-y: auto;
}

.crm-docs-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.crm-doc-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-block-end: 1px solid var(--color-border-subtle);
}

.crm-doc-icon {
	flex-shrink: 0;
	inline-size: 1.5rem;
	block-size: 1.5rem;
	color: var(--color-primary);
}

.crm-doc-meta {
	flex: 1;
	min-inline-size: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.crm-doc-name {
	font-size: 0.8125rem;
	font-weight: 600;
	display: block;
}

.crm-doc-info {
	font-size: 0.725rem;
	color: var(--color-text-subtle);
}

/* ── Add note dialog ──────────────────────────────────────────────────── */

.crm-note-dialog {
	inline-size: min(32rem, calc(100vw - 2rem));
}

.crm-dialog-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-block-start: 1px solid var(--color-border);
}
</style>
