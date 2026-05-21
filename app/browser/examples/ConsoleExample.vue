<script lang="ts" setup>
/**
 * ConsoleExample — the framework's app-shell pillar.
 *
 * Every body-shell slot at once, built from semantic landmarks alone:
 *
 *   <nav>    primary rail   — grouped <h6> + <menu>, badges, account footer
 *   <header> app bar        — search + New + toolbar actions
 *   <main>   work surface   — stat <article>s with <meter> gauges, a
 *                             sortable <table> (useTable) inside a card
 *   <aside>  context rail    — activity feed + storage meter
 *   <footer> status bar     — version + links
 *
 * Mobile (≤960px): <nav> and <aside> flip to native-popover drawers via
 * the `:popover` binding. The body grid's rail tracks collapse to zero
 * (popovers leave flow) so <main> spans full width — no media query, no
 * cloned markup. The only "JS" is the matchMedia breakpoint ref and the
 * useTable controller; everything visual is framework chrome.
 */
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useTable } from '../../../src/browser'

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

const range = ref<'today' | '7d' | '30d'>('7d')

interface Stat {
	readonly label: string
	readonly value: string
	readonly delta: string
	// Directional glyph drawn before the delta — content, not a framework
	// icon (the icon set is closed). ↗ rising · ↘ falling · → flat.
	readonly arrow: '↗' | '↘' | '→'
	readonly variant: 'success' | 'danger' | 'information'
	readonly meter: number
	readonly goal: string
}
const stats: readonly Stat[] = [
	{
		label: 'Revenue',
		value: '$48,290',
		delta: '+12.4%',
		arrow: '↗',
		variant: 'success',
		meter: 82,
		goal: '82% to goal',
	},
	{
		label: 'New customers',
		value: '1,204',
		delta: '+8.1%',
		arrow: '↗',
		variant: 'success',
		meter: 64,
		goal: '64% to goal',
	},
	{
		label: 'Refund rate',
		value: '2.4%',
		delta: '+0.3pt',
		arrow: '↘',
		variant: 'danger',
		meter: 24,
		goal: 'ceiling 5%',
	},
	{
		label: 'Open tickets',
		value: '27',
		delta: 'steady',
		arrow: '→',
		variant: 'information',
		meter: 41,
		goal: '41% of SLA',
	},
]

// Revenue-trajectory chart series. Each bar carries a height percentage and
// a flag marking the trailing days as forecast (painted in the information
// hue rather than primary). Pure data — the bars themselves are bare <div>s
// whose height + token-driven fill come from inline style, the same idiom
// the icon glyphs use. Built as a labelled <figure> so the dataviz stays
// accessible without a charting dependency.
interface Bar {
	readonly value: number
	readonly forecast: boolean
}
const chart: readonly Bar[] = [
	38, 44, 41, 52, 48, 60, 55, 58, 67, 62, 71, 64, 73, 78, 70, 82, 76, 85, 88, 81, 90, 84, 93, 96,
].map((value, index, all) => ({ value, forecast: index >= all.length - 5 }))

interface Order {
	readonly id: string
	readonly customer: string
	readonly plan: string
	readonly status: 'paid' | 'pending' | 'failed'
	readonly amount: string
	readonly date: string
}
// Amounts display formatted ($1,200.00) but carry a numeric `data-sort-value`
// on the cell so useTable sorts them by magnitude, not lexically.
const orders: readonly Order[] = [
	{
		id: 'INV-1042',
		customer: 'Ada Lovelace',
		plan: 'Pro annual',
		status: 'paid',
		amount: '$480.00',
		date: '2026-05-21',
	},
	{
		id: 'INV-1041',
		customer: 'Grace Hopper',
		plan: 'Team monthly',
		status: 'pending',
		amount: '$96.00',
		date: '2026-05-21',
	},
	{
		id: 'INV-1040',
		customer: 'Linus Torvalds',
		plan: 'Pro monthly',
		status: 'paid',
		amount: '$24.00',
		date: '2026-05-20',
	},
	{
		id: 'INV-1039',
		customer: 'Margaret Hamilton',
		plan: 'Enterprise',
		status: 'failed',
		amount: '$1,200.00',
		date: '2026-05-20',
	},
	{
		id: 'INV-1038',
		customer: 'Hedy Lamarr',
		plan: 'Pro annual',
		status: 'paid',
		amount: '$480.00',
		date: '2026-05-19',
	},
	{
		id: 'INV-1037',
		customer: 'Katherine Johnson',
		plan: 'Team monthly',
		status: 'paid',
		amount: '$96.00',
		date: '2026-05-19',
	},
]
const statusVariant: Record<Order['status'], string> = {
	paid: 'success',
	pending: 'warning',
	failed: 'danger',
}

const ordersRef = useTemplateRef<HTMLTableElement>('ordersRef')
useTable(ordersRef, {
	headers: ['Invoice', 'Customer', 'Plan', 'Status', 'Amount', 'Date'],
	columns: [
		{ key: 'id', sortable: true },
		{ key: 'customer', sortable: true },
		{ key: 'plan', sortable: true },
		{ key: 'status', sortable: true },
		{ key: 'amount', sortable: true },
		{ key: 'date', sortable: true },
	],
	sort: { multiple: false, auto: true },
})

interface Activity {
	readonly who: string
	readonly action: string
	readonly when: string
	readonly variant: 'success' | 'warning' | 'danger' | 'information'
}
const activity: readonly Activity[] = [
	{ who: 'Ada Lovelace', action: 'paid invoice INV-1042', when: '2m ago', variant: 'success' },
	{ who: 'Grace Hopper', action: 'started a Team trial', when: '14m ago', variant: 'information' },
	{ who: 'System', action: 'flagged INV-1039 as failed', when: '38m ago', variant: 'danger' },
	{ who: 'Katherine Johnson', action: 'upgraded to annual', when: '1h ago', variant: 'success' },
	{ who: 'Hedy Lamarr', action: 'approaching API quota', when: '3h ago', variant: 'warning' },
]

const nav = [
	{ label: 'Overview', current: true, badge: '' },
	{ label: 'Orders', current: false, badge: '6' },
	{ label: 'Customers', current: false, badge: '' },
	{ label: 'Products', current: false, badge: '' },
	{ label: 'Reports', current: false, badge: '' },
]
const rangeLabel: Record<typeof range.value, string> = {
	today: 'today',
	'7d': 'this week',
	'30d': 'this month',
}
const subtitle = computed(() => `Here's how the store is doing ${rangeLabel[range.value]}.`)
</script>

<template>
	<!-- Primary rail. body-shell <nav> → vertical column; `:popover` flips
	     it to an offcanvas drawer ≤960px. Grouped <h6> + <menu> is the
	     framework's recommended nav shape. -->
	<nav
		id="console-rail"
		class="start"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Primary"
	>
		<header>
			<span class="avatar square primary" aria-hidden="true">E</span>
			<strong class="flex-1">Elements</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close menu"
				popovertarget="console-rail"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<menu>
			<li v-for="item in nav" :key="item.label">
				<a href="#" :aria-current="item.current ? 'page' : undefined">
					{{ item.label }}
					<span v-if="item.badge" class="badge ms-auto">{{ item.badge }}</span>
				</a>
			</li>
		</menu>

		<h6>Workspaces</h6>
		<menu>
			<li>
				<a href="#"><span class="avatar small" aria-hidden="true">AC</span> Acme Inc</a>
			</li>
			<li>
				<a href="#"><span class="avatar small" aria-hidden="true">BV</span> Buena Vista</a>
			</li>
		</menu>

		<footer>
			<span class="avatar" aria-hidden="true">MS</span>
			<span class="flex flex-col flex-1 leading-tight">
				<strong>Mike Saint</strong>
				<small style="color: var(--color-text-subtle)">mike@acme.dev</small>
			</span>
			<button type="button" class="subtle compact" aria-label="Account settings">
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
			</button>
		</footer>
	</nav>

	<!-- App bar. -->
	<header>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open menu"
			popovertarget="console-rail"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-menu)"></i>
		</button>
		<search class="flex-1 max-w-md">
			<label>
				<span class="sr-only">Search</span>
				<input type="search" placeholder="Search orders, customers…" autocomplete="off" />
			</label>
		</search>
		<menu role="toolbar" aria-label="Console actions" class="hidden sm:flex">
			<li>
				<button type="button" class="subtle compact" aria-label="Filter">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
				</button>
			</li>
			<li>
				<button type="button" class="subtle compact" aria-label="Sort">
					<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
				</button>
			</li>
		</menu>
		<button type="button" class="primary">
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
			<span class="hidden sm:inline">New invoice</span>
		</button>
		<button
			v-if="isMobile"
			type="button"
			class="subtle compact"
			aria-label="Open activity"
			popovertarget="console-activity"
		>
			<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
		</button>
	</header>

	<!-- Work surface. -->
	<main>
		<header class="flex flex-wrap items-end justify-between gap-4">
			<hgroup>
				<p class="text-xs uppercase tracking-wide m-0" style="color: var(--color-text-subtle)">
					Dashboard
				</p>
				<h1>Overview</h1>
				<p>{{ subtitle }}</p>
			</hgroup>
			<div role="group" aria-label="Date range">
				<button
					v-for="r in ['today', '7d', '30d'] as const"
					:key="r"
					type="button"
					class="secondary subtle small"
					:aria-pressed="range === r"
					@click="range = r"
				>
					{{ r === 'today' ? 'Today' : r === '7d' ? '7 days' : '30 days' }}
				</button>
			</div>
		</header>

		<section aria-label="Key metrics">
			<!-- Explicit responsive columns (not auto-fit `.tiles`) — there are
			     exactly four KPIs, so a fixed 1→2→4 ramp keeps them balanced
			     (2×2 on tablet, a single 4-up row on desktop) instead of the
			     3-up + 1-orphan that auto-fit lands at the rail-narrowed main
			     width. -->
			<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
				<article v-for="stat in stats" :key="stat.label" class="small">
					<p class="text-sm m-0" style="color: var(--color-text-subtle)">{{ stat.label }}</p>
					<strong class="text-3xl">{{ stat.value }}</strong>
					<div class="cluster items-center">
						<span class="badge" :class="stat.variant"
							><span aria-hidden="true">{{ stat.arrow }}</span> {{ stat.delta }}</span
						>
						<small style="color: var(--color-text-subtle)">{{ stat.goal }}</small>
					</div>
					<meter
						class="w-full"
						:value="stat.meter"
						min="0"
						max="100"
						:aria-label="`${stat.label}: ${stat.goal}`"
					></meter>
				</article>
			</div>
		</section>

		<article aria-label="Revenue trajectory">
			<header class="flex flex-wrap items-center gap-4">
				<hgroup>
					<h2>Revenue trajectory</h2>
					<p>Daily gross, cohort-adjusted.</p>
				</hgroup>
				<div class="cluster items-center ms-auto">
					<span class="cluster items-center gap-2 flex-nowrap">
						<span class="dot primary" aria-hidden="true"></span>
						<small>Revenue</small>
					</span>
					<span class="cluster items-center gap-2 flex-nowrap">
						<span class="dot information" aria-hidden="true"></span>
						<small>Forecast</small>
					</span>
				</div>
			</header>
			<!-- Token-driven CSS bar chart. Each bar is a bare <div> whose
			     height + fill come from inline style (the same data-driven
			     idiom the icon glyphs use) — no charting dependency, no
			     bespoke class. Forecast bars paint in the information hue. -->
			<figure class="m-0">
				<div
					class="flex items-end gap-1 h-40"
					role="img"
					aria-label="Daily revenue trending upward over the period, with the final five days forecast"
				>
					<div
						v-for="(bar, i) in chart"
						:key="i"
						class="flex-1 rounded-t-sm"
						:style="`height: ${bar.value}%; background-color: var(--color-${
							bar.forecast ? 'information' : 'primary'
						}); opacity: ${bar.forecast ? 0.55 : 1}`"
					></div>
				</div>
				<figcaption>Figures auto-adjust for refunds. The last five days are forecast.</figcaption>
			</figure>
		</article>

		<article aria-label="Recent orders">
			<header class="flex flex-wrap items-center gap-4">
				<hgroup>
					<h2>Recent orders</h2>
					<p>Click a column to sort.</p>
				</hgroup>
				<a href="#" class="ms-auto">View all</a>
			</header>
			<div class="scrollable">
				<table ref="ordersRef" class="striped">
					<tbody>
						<tr v-for="order in orders" :key="order.id" :data-id="order.id">
							<td>
								<code>{{ order.id }}</code>
							</td>
							<td>{{ order.customer }}</td>
							<td>{{ order.plan }}</td>
							<td>
								<span class="badge" :class="statusVariant[order.status]">{{ order.status }}</span>
							</td>
							<td :data-sort-value="order.amount.replace(/[$,]/g, '')">{{ order.amount }}</td>
							<td>
								<time :datetime="order.date">{{ order.date }}</time>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</article>
	</main>

	<!-- Context rail. body-shell <aside> → right column; drawer ≤960px. -->
	<aside
		id="console-activity"
		class="end"
		:popover="isMobile ? 'auto' : undefined"
		aria-label="Activity"
	>
		<header>
			<strong class="flex-1">Activity</strong>
			<button
				v-if="isMobile"
				type="button"
				class="subtle compact"
				aria-label="Close activity"
				popovertarget="console-activity"
				popovertargetaction="hide"
			>
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-close)"></i>
			</button>
		</header>

		<div class="stack">
			<div v-for="entry in activity" :key="entry.action" class="cluster flex-nowrap items-start">
				<span
					class="dot"
					:class="entry.variant"
					aria-hidden="true"
					style="margin-block-start: 0.4rem"
				></span>
				<span class="flex flex-col flex-1 leading-tight">
					<span
						><strong>{{ entry.who }}</strong> {{ entry.action }}</span
					>
					<small style="color: var(--color-text-subtle)">{{ entry.when }}</small>
				</span>
			</div>
		</div>

		<article class="small information subtle">
			<p class="text-sm m-0">Storage</p>
			<strong>61.4 GB of 100 GB</strong>
			<meter class="w-full" value="61" min="0" max="100" aria-label="Storage: 61% used"></meter>
		</article>
	</aside>

	<!-- Status bar. -->
	<footer>
		<small style="color: var(--color-text-subtle)">All systems operational</small>
		<span class="badge success ms-auto">v2.4.0</span>
		<a href="#">Docs</a>
		<a href="#">Support</a>
	</footer>
</template>
