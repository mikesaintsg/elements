<script lang="ts" setup>
/**
 * MailExample — the framework's three-pane app pillar.
 *
 * A mail client built from body-shell landmarks plus a grid inside <main>:
 *
 *   <nav>    folder rail   — labels + counts, drawer ≤960px
 *   <header> app bar       — Compose + search
 *   <main>   two panes      — a message LIST column beside a READING pane,
 *                             expressed as a Tailwind grid that collapses to
 *                             a single column on mobile. Selecting a message
 *                             swaps the mobile view from list → reading.
 *
 * Everything visual — list rows, the reading pane, badges, avatars, the
 * reply toolbar — is a bare element + framework modifier. The only "JS" is
 * the matchMedia breakpoint ref and a selected-message ref.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const MOBILE_QUERY = '(max-width: 960px)'
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

interface Folder {
	readonly label: string
	readonly icon: string
	readonly count: number
	readonly current: boolean
}
const folders: readonly Folder[] = [
	{ label: 'Inbox', icon: 'information', count: 24, current: true },
	{ label: 'Starred', icon: 'success', count: 7, current: false },
	{ label: 'Sent', icon: 'external', count: 0, current: false },
	{ label: 'Drafts', icon: 'more', count: 3, current: false },
	{ label: 'Spam', icon: 'warning', count: 1, current: false },
	{ label: 'Trash', icon: 'close', count: 0, current: false },
]

interface Message {
	readonly id: number
	readonly from: string
	readonly initials: string
	readonly subject: string
	readonly preview: string
	readonly time: string
	readonly tag: string
	readonly variant: string
	readonly unread: boolean
	readonly body: readonly string[]
}
const messages: readonly Message[] = [
	{
		id: 1,
		from: 'Ada Lovelace',
		initials: 'AL',
		subject: 'Re: Q2 platform review',
		preview: 'Thanks for circulating the draft — I think we can split the migration…',
		time: '9:42 AM',
		tag: 'urgent',
		variant: 'danger',
		unread: true,
		body: [
			'Thanks for circulating the draft. I think we can split the migration into two phases — the shorter window gives us room to validate the staging cohort before we cut the production branch, which is the safer call given the long lead times last quarter.',
			'Two open questions for the wider team: do we still need the migration shim past Q3, or can we sunset it with the v3 cut? And who owns the rollback playbook?',
			'Happy to jump on a call this afternoon — otherwise I will have the second draft ready before Friday.',
		],
	},
	{
		id: 2,
		from: 'Grace Hopper',
		initials: 'GH',
		subject: 'COBOL postmortem: outage 2026-04-30',
		preview: 'Attached the timeline. Three takeaways and one process change…',
		time: '8:17 AM',
		tag: 'work',
		variant: 'information',
		unread: true,
		body: [
			'Attached is the timeline for the April 30 outage. Three takeaways: the alert fired late, the runbook was stale, and the rollback needed a manual step nobody remembered.',
			'One process change: every on-call rotation now does a dry-run rollback in staging before their shift starts.',
		],
	},
	{
		id: 3,
		from: 'Linus Torvalds',
		initials: 'LT',
		subject: 'kernel patch series 6.12-rc3',
		preview: 'Dropped the contentious refactor. Will pick it up after the merge window…',
		time: 'Yesterday',
		tag: 'work',
		variant: 'information',
		unread: false,
		body: [
			'Dropped the contentious refactor from this series — it is not worth holding the rc for. Will pick it up after the merge window closes.',
			'Otherwise the series is clean: 14 fixes, no new warnings, and the CI matrix is green across all the architectures we still support.',
		],
	},
	{
		id: 4,
		from: 'Margaret Hamilton',
		initials: 'MH',
		subject: 'Astronaut training schedule',
		preview: 'Final draft for cycle 12. Two slots still open if you want in…',
		time: 'Yesterday',
		tag: 'personal',
		variant: 'warning',
		unread: false,
		body: [
			'Final draft for cycle 12 is ready. Two slots are still open if you want in — the simulator time is the limiting factor, as always.',
			'Let me know by end of week and I will lock the roster.',
		],
	},
	{
		id: 5,
		from: 'Hedy Lamarr',
		initials: 'HL',
		subject: 'Frequency hopping research notes',
		preview: 'Found the original sketches in storage. Scanning them this week…',
		time: 'Mon',
		tag: 'personal',
		variant: 'warning',
		unread: false,
		body: [
			'Found the original sketches in storage over the weekend. Scanning them this week — the margins have notes that never made it into the final patent.',
			'I think there is a talk in this if you are interested in co-presenting.',
		],
	},
]

const selectedId = ref<number>(1)
const selected = computed<Message>(
	() => messages.find((m) => m.id === selectedId.value) ?? messages[0],
)
// Mobile single-column view state: 'list' until a message is opened.
const mobileView = ref<'list' | 'message'>('list')
const open = (id: number): void => {
	selectedId.value = id
	mobileView.value = 'message'
}
const showList = computed(() => !isMobile.value || mobileView.value === 'list')
const showMessage = computed(() => !isMobile.value || mobileView.value === 'message')
</script>

<template>
	<!-- Folder rail. body-shell <nav> → vertical column; drawer ≤960px. -->
	<nav id="mail-rail" class="start" :popover="isMobile ? 'auto' : undefined" aria-label="Folders">
		<header>
			<span class="avatar square primary" aria-hidden="true">M</span>
			<strong class="flex-1">Mailbox</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close folders"
				popovertarget="mail-rail"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<button type="button" class="primary w-full">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			Compose
		</button>

		<menu>
			<li v-for="folder in folders" :key="folder.label">
				<a href="#" :aria-current="folder.current ? 'page' : undefined">
					<i class="icon" aria-hidden="true" :style="`--icon: var(--set-icon-${folder.icon})`"></i>
					{{ folder.label }}
					<span v-if="folder.count" class="badge ms-auto">{{ folder.count }}</span>
				</a>
			</li>
		</menu>

		<footer>
			<span class="avatar" aria-hidden="true">MS</span>
			<span class="flex flex-col flex-1 leading-tight">
				<strong>Mike Saint</strong>
				<small style="color: var(--color-text-subtle)">5.2 GB of 15 GB</small>
			</span>
		</footer>
	</nav>

	<!-- App bar. -->
	<header>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open folders"
			popovertarget="mail-rail"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
		<search class="flex-1 max-w-md">
			<label>
				<span class="sr-only">Search mail</span>
				<input type="search" placeholder="Search mail…" autocomplete="off" />
			</label>
		</search>
		<menu role="toolbar" aria-label="Mailbox actions" class="hidden sm:flex">
			<li>
				<button type="button" class="subtle">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
					Filter
				</button>
			</li>
			<li>
				<button type="button" class="subtle">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
					Sort
				</button>
			</li>
		</menu>
	</header>

	<!-- Two panes: message list + reading pane. -->
	<main>
		<div class="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-4 w-full lg:h-full lg:overflow-hidden">
			<!-- Message list -->
			<section
				v-show="showList"
				aria-label="Messages"
				class="flex flex-col lg:overflow-y-auto lg:h-full"
			>
				<header class="flex flex-wrap items-center justify-between gap-4">
					<hgroup>
						<h2 class="text-base m-0">Inbox</h2>
						<p>{{ messages.length }} messages</p>
					</hgroup>
				</header>
				<menu class="flex flex-col gap-1 list-none">
					<li v-for="message in messages" :key="message.id">
						<button
							type="button"
							class="flat w-full text-start"
							:aria-current="message.id === selectedId ? 'true' : undefined"
							@click="open(message.id)"
						>
							<span class="flex gap-3 items-start w-full">
								<span class="avatar" aria-hidden="true">{{ message.initials }}</span>
								<span class="flex flex-col flex-1 leading-tight min-w-0">
									<span class="flex gap-2 items-baseline justify-between flex-nowrap">
										<strong class="truncate">{{ message.from }}</strong>
										<small style="color: var(--color-text-subtle)">{{ message.time }}</small>
									</span>
									<span class="truncate">{{ message.subject }}</span>
									<small class="truncate" style="color: var(--color-text-subtle)">{{
										message.preview
									}}</small>
									<span class="flex flex-wrap gap-2 items-center">
										<span class="badge" :class="message.variant">{{ message.tag }}</span>
										<span v-if="message.unread" class="dot primary" aria-hidden="true"></span>
									</span>
								</span>
							</span>
						</button>
					</li>
				</menu>
			</section>

			<!-- Reading pane -->
			<article v-show="showMessage" aria-label="Conversation" class="lg:overflow-y-auto lg:h-full">
				<header class="flex flex-col gap-2">
					<div class="cluster items-center">
						<button
							v-if="isMobile"
							type="button"
							class="subtle compact"
							aria-label="Back to list"
							@click="mobileView = 'list'"
						>
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
						</button>
						<h2 class="flex-1 m-0">{{ selected.subject }}</h2>
						<span class="badge" :class="selected.variant">{{ selected.tag }}</span>
					</div>
					<div class="cluster items-center">
						<span class="avatar" aria-hidden="true">{{ selected.initials }}</span>
						<span class="flex flex-col leading-tight">
							<strong>{{ selected.from }}</strong>
							<small style="color: var(--color-text-subtle)">to me · {{ selected.time }}</small>
						</span>
					</div>
				</header>

				<p v-for="(para, i) in selected.body" :key="i">{{ para }}</p>

				<footer class="flex flex-wrap gap-2">
					<button type="button" class="primary">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-left)"></i>
						Reply
					</button>
					<button type="button" class="subtle">Reply all</button>
					<button type="button" class="subtle">
						<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
						Forward
					</button>
				</footer>
			</article>
		</div>
	</main>
</template>
