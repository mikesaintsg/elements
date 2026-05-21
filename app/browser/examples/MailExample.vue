<script lang="ts" setup>
/**
 * MailExample — the framework's three-pane app pillar.
 *
 * A mail client built from body-shell landmarks plus a flush, divided
 * three-pane inside <main>:
 *
 *   <nav>    folder rail   — labels + counts, drawer <1024px
 *   <header> app bar       — Compose + search
 *   <main>   two panes      — a message LIST beside a READING pane via the
 *                             `.panes` primitive: at/above 1024px a fixed
 *                             sidebar + flexible content row with 1px dividers,
 *                             each pane scrolling independently; below 1024px a
 *                             single column where the mobile view swaps list →
 *                             reading on selection. The mail <main>'s padding
 *                             is zeroed so the panes butt flush.
 *
 * Everything visual — list rows, the reading pane, badges, avatars, the
 * reply toolbar — is a bare element + framework modifier (the pane dividers
 * + flush padding are app-specific layout). The only "JS" is the matchMedia
 * breakpoint ref and a selected-message ref.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

// One breakpoint drives BOTH the layout and the single-pane toggle (matching
// the `lg:` utilities below) so there is no dead zone where the reading pane
// is wrapped-and-clipped with no way to reach it. ≥1024px: persistent two-pane
// + rail. <1024px: rail → drawer, panes → single-pane list/reading swap.
const MOBILE_QUERY = '(max-width: 1023px)'
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

// Mailbox-style list rows: a 1px bottom divider between rows + a leading
// accent bar that turns primary on the open message (transparent otherwise),
// with a subtle persistent tint on that row. The hover tint comes from the
// framework's `.flat` button state. App-specific list chrome.
const rowStyle = (message: Message): Record<string, string | undefined> => ({
	borderBlockEnd: '1px solid var(--color-border)',
	borderInlineStart: `0.1875rem solid ${
		message.id === selectedId.value ? 'var(--color-primary)' : 'transparent'
	}`,
	backgroundColor: message.id === selectedId.value ? 'var(--color-primary-bg-subtle)' : undefined,
})
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
				<i class="icon close" aria-hidden="true"></i>
			</button>
		</header>

		<button type="button" class="primary fill">
			<i class="icon plus" aria-hidden="true"></i>
			Compose
		</button>

		<menu>
			<li v-for="folder in folders" :key="folder.label">
				<a href="#" :aria-current="folder.current ? 'page' : undefined">
					<i class="icon" :class="folder.icon" aria-hidden="true"></i>
					{{ folder.label }}
					<span v-if="folder.count" class="badge ms-auto">{{ folder.count }}</span>
				</a>
			</li>
		</menu>

		<footer>
			<span class="avatar" aria-hidden="true">MS</span>
			<span class="lines fluid">
				<strong>Mike Saint</strong>
				<small class="muted">5.2 GB of 15 GB</small>
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
			<i class="icon menu" aria-hidden="true"></i>
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
					<i class="icon filter" aria-hidden="true"></i>
					Filter
				</button>
			</li>
			<li>
				<button type="button" class="subtle">
					<i class="icon sort" aria-hidden="true"></i>
					Sort
				</button>
			</li>
		</menu>
	</header>

	<!-- Two panes via the framework's `.panes` primitive: a fixed-width list
	     (sidebar) + a flexible reading pane, divided by 1px rules, each scrolling
	     independently above the breakpoint and collapsing to a single-pane swap
	     below it. The mail app is full-bleed (main padding zeroed). -->
	<main style="--set-main-padding-inline: 0; --set-main-padding-block: 0">
		<div class="panes" style="--set-panes-aside-size: 24rem">
			<!-- Message list pane. `.pane` zeroes the section's content padding,
			     scrolls, and bands its <header>; the .fluid <menu> is the scroll
			     region (flush, so its rows carry their own dividers). -->
			<section class="pane" v-show="showList" aria-label="Messages">
				<header>
					<hgroup>
						<h2 class="text-base m-0">Inbox</h2>
						<p class="muted">{{ messages.length }} messages</p>
					</hgroup>
				</header>
				<menu class="flex flex-col list-none fluid">
					<li v-for="message in messages" :key="message.id">
						<button
							type="button"
							class="flat fill text-start rounded-none"
							:style="rowStyle(message)"
							:aria-current="message.id === selectedId ? 'true' : undefined"
							@click="open(message.id)"
						>
							<span class="flex gap-3 items-start fill">
								<span class="avatar" aria-hidden="true">{{ message.initials }}</span>
								<span class="lines fluid">
									<span class="flex gap-2 items-baseline justify-between flex-nowrap">
										<strong class="truncate">{{ message.from }}</strong>
										<small class="muted">{{ message.time }}</small>
									</span>
									<span class="truncate">{{ message.subject }}</span>
									<small class="truncate muted">{{ message.preview }}</small>
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

			<!-- Reading pane. `.pane` bands the <header> (compact: subject + a
			     one-line sender · time · tag meta, no avatar) and the reply
			     <footer>; the .fluid <div> is the padded, scrolling body. The
			     band heights match the list header so the dividers align. -->
			<section class="pane" v-show="showMessage" aria-label="Conversation">
				<header>
					<button
						v-if="isMobile"
						type="button"
						class="subtle compact"
						aria-label="Back to list"
						@click="mobileView = 'list'"
					>
						<i class="icon chevron-left" aria-hidden="true"></i>
					</button>
					<div class="flex flex-col gap-1 fluid min-w-0">
						<h2 class="text-lg m-0 truncate">{{ selected.subject }}</h2>
						<div class="flex flex-wrap items-center gap-2">
							<strong>{{ selected.from }}</strong>
							<small class="muted">· {{ selected.time }}</small>
							<span class="badge" :class="selected.variant">{{ selected.tag }}</span>
						</div>
					</div>
				</header>

				<div class="stack fluid">
					<p v-for="(para, i) in selected.body" :key="i" class="m-0">{{ para }}</p>
				</div>

				<footer>
					<button type="button" class="primary">
						<i class="icon chevron-left" aria-hidden="true"></i>
						Reply
					</button>
					<button type="button" class="subtle">Reply all</button>
					<button type="button" class="subtle">
						<i class="icon external" aria-hidden="true"></i>
						Forward
					</button>
				</footer>
			</section>
		</div>
	</main>
</template>
