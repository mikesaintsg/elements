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
	{ when: '2m ago', who: 'Ada Lovelace', action: 'paid invoice', target: 'INV-1042', status: 'paid' },
	{ when: '14m ago', who: 'Grace Hopper', action: 'submitted form', target: 'Onboarding · Step 3', status: 'pending' },
	{ when: '38m ago', who: 'Linus Torvalds', action: 'updated billing', target: 'Visa •• 4012', status: 'paid' },
	{ when: '1h ago', who: 'Margaret Hamilton', action: 'failed checkout', target: 'Cart 8721', status: 'failed' },
	{ when: '3h ago', who: 'Hedy Lamarr', action: 'cancelled trial', target: 'Pro plan', status: 'pending' },
]

const statusVariant: Record<ActivityRow['status'], string> = {
	paid: 'success',
	pending: 'warning',
	failed: 'danger',
}

const trendIconToken: Record<Stat['trend'], string> = {
	up: 'caret-up', /* TODO icon swap — caret-up stands in for missing 'arrow-up-right' */
	down: 'caret-down', /* TODO icon swap — caret-down stands in for missing 'arrow-down-right' */
	flat: 'dash', /* TODO icon swap — dash stands in for missing 'arrow-right' */
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
// useAside attaches the beforetoggle/toggle bridge and onCleanup-driven
// destroy(); the return value isn't referenced here because the popover
// is driven by native popovertarget buttons and the :popover binding.
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
				<!-- TODO icon swap — external stands in for missing 'box' (app/brand icon) -->
				<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
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
							<!-- TODO icon swap — information stands in for missing 'speedometer' (overview/dashboard) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
							Overview
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — sort stands in for missing 'bar-chart' (analytics) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
							Analytics
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — more stands in for missing 'people' (customers) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-more)"></i>
							Customers
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — minus stands in for missing 'receipt' (invoices) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
							Invoices
						</a>
					</li>
					<li>
						<a href="#">
							<!-- TODO icon swap — system stands in for missing 'gear' (settings) -->
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-system)"></i>
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
				<menu
					role="toolbar"
					aria-label="Dashboard actions"
					class="dashboard-actions"
				>
					<li role="none">
						<button type="button" class="primary">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
							New invoice
						</button>
					</li>
					<li role="none">
						<!-- TODO icon swap — sort stands in for missing 'refresh' (reload/sync) -->
						<button type="button" class="subtle compact" aria-label="Refresh">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-sort)"></i>
						</button>
					</li>
					<li role="none">
						<button type="button" class="subtle compact" aria-label="Filter">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-filter)"></i>
						</button>
					</li>
					<li role="none">
						<!-- TODO icon swap — chevron-down stands in for missing 'download' -->
						<button type="button" class="subtle compact" aria-label="Export">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-chevron-down)"></i>
						</button>
					</li>
					<li role="none">
						<!-- TODO icon swap — information stands in for missing 'bell' (notifications) -->
						<button type="button" class="subtle compact" aria-label="Notifications">
							<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
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
						<li v-for="r in (['7d','30d','90d'] as const)" :key="r" role="none">
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
									<span class="dashboard-legend-dot" data-series="revenue" aria-hidden="true"></span>
									Revenue
								</li>
								<li>
									<span class="dashboard-legend-dot" data-series="forecast" aria-hidden="true"></span>
									Forecast
								</li>
							</ul>
						</header>
						<figure>
							<svg viewBox="0 0 300 100" preserveAspectRatio="none" class="dashboard-chart" role="img" aria-label="Revenue chart, illustrative">
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
								<!-- TODO icon swap — plus stands in for missing 'person-plus' (invite teammate) -->
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-plus)"></i>
									Invite a teammate
								</button>
							</li>
							<li>
								<!-- TODO icon swap — minus stands in for missing 'receipt' (draft invoice) -->
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-minus)"></i>
									Draft an invoice
								</button>
							</li>
							<li>
								<!-- TODO icon swap — external stands in for missing 'cloud-upload' (import) -->
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-external)"></i>
									Import customers
								</button>
							</li>
							<li>
								<!-- TODO icon swap — success stands in for missing 'shield-check' (security audit) -->
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-success)"></i>
									Run a security audit
								</button>
							</li>
							<li>
								<!-- TODO icon swap — information stands in for missing 'life-preserver' (support) -->
								<button type="button" class="subtle">
									<i class="icon" aria-hidden="true" style="--icon: var(--set-icon-information)"></i>
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
						<li
							v-for="row in activity"
							:key="row.target"
							:data-status="row.status"
						>
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

.dashboard-stat-delta[data-trend='up'] { color: var(--color-success, oklch(60% 0.15 145)); }
.dashboard-stat-delta[data-trend='down'] { color: var(--color-danger, oklch(60% 0.18 25)); }
.dashboard-stat-delta[data-trend='flat'] { color: var(--color-text-subtle); }
.dashboard-stat-delta small { color: var(--color-text-subtle); margin-inline-start: 0.25rem; }

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

.dashboard-legend-dot[data-series='revenue'] { background: var(--color-primary); }
.dashboard-legend-dot[data-series='forecast'] { background: var(--color-info); }

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

.dashboard-timeline > li[data-status='paid'] .dashboard-timeline-marker { color: var(--color-success); }
.dashboard-timeline > li[data-status='pending'] .dashboard-timeline-marker { color: var(--color-warning); }
.dashboard-timeline > li[data-status='failed'] .dashboard-timeline-marker { color: var(--color-danger); }

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
