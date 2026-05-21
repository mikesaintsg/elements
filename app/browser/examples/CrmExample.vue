<script lang="ts" setup>
/**
 * CrmExample — the framework's agent-workspace pillar.
 *
 * A dual-rail agent chat built from body-shell landmarks:
 *
 *   <nav>    context rail   — pinned + recent threads, drawer ≤1100px
 *   <header> app bar        — search + Ask
 *   <main>   chat thread     — each turn is a native <details> disclosure
 *                             (role-tinted dot + summary + expandable body),
 *                             ending in a useForm composer
 *   <aside>  documents rail  — linked files with download actions, drawer
 *
 * The collapsible turns are bare <details>/<summary> — no JS, the platform
 * owns the open/close. Rails flip to popover drawers on mobile.
 */
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useForm } from '../../../src/browser'

const MOBILE_QUERY = '(max-width: 1100px)'
const isMobile = ref(false)
const mq = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null
const syncMobile = (): void => {
	isMobile.value = mq?.matches ?? false
}
onMounted(() => {
	syncMobile()
	mq?.addEventListener('change', syncMobile)
})
onUnmounted(() => mq?.removeEventListener('change', syncMobile))

const formRef = useTemplateRef<HTMLFormElement>('formRef')
const draft = ref('')
useForm(formRef, {
	on: {
		submit: (event: Event) => {
			event.preventDefault()
			draft.value = ''
		},
	},
})

interface Thread {
	readonly label: string
	readonly meta: string
	readonly icon: string
	readonly count?: number
	readonly current?: boolean
}
const pinned: readonly Thread[] = [
	{ label: 'Acme Corp', meta: 'account · 4 contacts', icon: 'information' },
	{ label: 'Q2 expansion', meta: 'deal · $48,000', icon: 'success' },
]
const recent: readonly Thread[] = [
	{ label: 'Why is Acme stalling?', meta: '', icon: 'system', current: true },
	{ label: 'Open tasks', meta: '', icon: 'check', count: 12 },
	{ label: 'Renewals · 30d', meta: '', icon: 'warning', count: 4 },
	{ label: 'Draft pricing email', meta: '', icon: 'more' },
]

type Role = 'you' | 'thinking' | 'tool' | 'agent'
interface Turn {
	readonly role: Role
	readonly label: string
	readonly variant: string
	readonly time: string
	readonly summary: string
	readonly body: string
	readonly open: boolean
}
const turns: readonly Turn[] = [
	{
		role: 'you',
		label: 'You',
		variant: 'primary',
		time: '9:42 AM',
		summary: 'Why is Acme stalling on the Q2 expansion?',
		body: 'They were enthusiastic three weeks ago — what changed? Pull the account history and the deal-stage transitions.',
		open: true,
	},
	{
		role: 'thinking',
		label: 'Thinking',
		variant: 'secondary',
		time: '9:42 AM',
		summary: 'Pulling the account history first, then crossing it against the deal stage…',
		body: 'The proposal was sent April 19 with no follow-up logged. The economic buyer was looped in late. Checking for a competing vendor mention.',
		open: false,
	},
	{
		role: 'tool',
		label: 'Tool',
		variant: 'warning',
		time: '9:42 AM',
		summary: 'search · returned 12 records',
		body: 'Matched 12 activity records across email, calls, and the deal timeline for Acme Corp in the last 45 days.',
		open: false,
	},
	{
		role: 'agent',
		label: 'Agent',
		variant: 'information',
		time: '9:43 AM',
		summary: 'Three things stand out. First, the proposal was sent on April 19 — but no follow-up.',
		body: 'My read: the technical buyer is sold, the financial buyer is comparing. The fastest unlock is a TCO one-pager to the CFO and a short note to the champion to keep momentum.',
		open: true,
	},
]

interface Doc {
	readonly name: string
	readonly meta: string
}
const docs: readonly Doc[] = [
	{ name: 'proposal_v3.pdf', meta: 'Proposal · 2.4 MB · Apr 19' },
	{ name: 'msa_acme_2026.docx', meta: 'Agreement · 184 KB · Apr 03' },
	{ name: 'tco_worksheet.xlsx', meta: 'Pricing · 64 KB · Mar 28' },
	{ name: 'discovery_notes.md', meta: 'Notes · 12 KB · Mar 14' },
]
</script>

<template>
	<!-- Context rail. -->
	<nav id="crm-rail" class="start" :popover="isMobile ? 'auto' : undefined" aria-label="Context">
		<header>
			<span class="avatar square primary" aria-hidden="true">H</span>
			<strong class="flex-1">Helix CRM</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close context"
				popovertarget="crm-rail"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<button type="button" class="primary w-full">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			New chat
		</button>

		<h6>Pinned</h6>
		<menu>
			<li v-for="item in pinned" :key="item.label">
				<a href="#">
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${item.icon})`"></i>
					<span class="flex flex-col leading-tight">
						<strong>{{ item.label }}</strong>
						<small style="color: var(--color-text-subtle)">{{ item.meta }}</small>
					</span>
				</a>
			</li>
		</menu>

		<h6>Recent</h6>
		<menu>
			<li v-for="item in recent" :key="item.label">
				<a href="#" :aria-current="item.current ? 'page' : undefined">
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${item.icon})`"></i>
					{{ item.label }}
					<span v-if="item.count" class="badge ms-auto">{{ item.count }}</span>
				</a>
			</li>
		</menu>
	</nav>

	<!-- App bar. -->
	<header>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open context"
			popovertarget="crm-rail"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
		<search class="flex-1 max-w-lg">
			<label>
				<span class="sr-only">Search</span>
				<input type="search" placeholder="Search accounts, deals, tasks — or ask the agent…" />
			</label>
		</search>
		<button type="button" class="primary">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
			Ask
		</button>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open documents"
			popovertarget="crm-docs"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
		</button>
	</header>

	<!-- Chat thread. -->
	<main>
		<header class="flex flex-wrap items-center justify-between gap-4">
			<hgroup>
				<p class="text-xs uppercase tracking-wide m-0" style="color: var(--color-text-subtle)">
					Conversation · 7 turns · linked to Acme Corp
				</p>
				<h1 class="text-xl">Why is Acme stalling?</h1>
			</hgroup>
			<span class="badge information subtle pill">Agent</span>
		</header>

		<div class="stack">
			<details v-for="(turn, i) in turns" :key="i" class="flat" :open="turn.open">
				<summary>
					<span class="flex gap-2 items-center flex-nowrap w-full">
						<span class="dot" :class="turn.variant" aria-hidden="true"></span>
						<strong>{{ turn.label }}</strong>
						<small style="color: var(--color-text-subtle)">{{ turn.time }}</small>
						<small class="truncate flex-1" style="color: var(--color-text-subtle)">{{
							turn.summary
						}}</small>
					</span>
				</summary>
				<p class="m-0">{{ turn.body }}</p>
			</details>

			<!-- Inline confirm card — the agent paused for a decision. -->
			<article class="warning subtle small">
				<div class="cluster items-center flex-nowrap">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-warning)"></i>
					<span class="flex flex-col flex-1 leading-tight">
						<strong>Confirm next step</strong>
						<small style="color: var(--color-text-subtle)"
							>Draft the TCO email to the CFO and a nudge to the champion?</small
						>
					</span>
				</div>
				<div class="cluster">
					<button type="button" class="primary small">Approve</button>
					<button type="button" class="subtle small">Edit plan</button>
				</div>
			</article>
		</div>

		<!-- Composer. -->
		<form ref="formRef" class="flex flex-col gap-4 mt-auto" @submit.prevent>
			<label>
				<span class="sr-only">Reply to the agent</span>
				<textarea
					v-model="draft"
					rows="2"
					placeholder="Reply to the agent — ⌘/Ctrl + Enter to send"
				></textarea>
			</label>
			<div class="cluster items-center justify-between">
				<small style="color: var(--color-text-subtle)"
					>Replies stream into the same chat entry.</small
				>
				<button type="submit" class="primary">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					Send
				</button>
			</div>
		</form>
	</main>

	<!-- Documents rail. -->
	<aside id="crm-docs" class="end" :popover="isMobile ? 'auto' : undefined" aria-label="Documents">
		<header>
			<strong class="flex-1">Documents</strong>
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
		<p class="text-sm m-0" style="color: var(--color-text-subtle)">Acme Corp · Q2 expansion</p>

		<menu class="flex flex-col gap-1 list-none">
			<li v-for="doc in docs" :key="doc.name">
				<div class="cluster items-center flex-nowrap">
					<span class="avatar square information subtle" aria-hidden="true">
						<i class="icon" style="--icon: var(--set-icon-information)"></i>
					</span>
					<span class="flex flex-col flex-1 leading-tight min-w-0">
						<strong class="truncate">{{ doc.name }}</strong>
						<small class="truncate" style="color: var(--color-text-subtle)">{{ doc.meta }}</small>
					</span>
					<button type="button" class="subtle compact" :aria-label="`Download ${doc.name}`">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
					</button>
				</div>
			</li>
		</menu>

		<button type="button" class="secondary subtle w-full">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			Attach a document
		</button>
	</aside>
</template>
