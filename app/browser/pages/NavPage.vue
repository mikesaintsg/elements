<script lang="ts" setup>
import { ref } from 'vue'

const activeTab = ref<'profile' | 'account' | 'security'>('profile')
</script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;nav&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>nav</em> element — "a section of a page that links to other pages or to parts
				within the page." The framework defaults bare <code>&lt;nav&gt;</code> to block flow and
				lets descendant content semantics drive the visual variant — no class on the nav itself.
			</p>
		</header>

		<section id="navbar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Navbar (with inner list)</h2>
			<p class="text-sm leading-6">
				A <code>&lt;nav&gt;&lt;ul&gt;</code> renders as a horizontal flex row with no list markers —
				the natural shape for a top-bar nav.
			</p>
			<nav>
				<ul>
					<li><a href="#/home">Home</a></li>
					<li><a href="#/article">Article</a></li>
					<li><a href="#/button">Button</a></li>
					<li><a href="#/forms">Forms</a></li>
				</ul>
			</nav>
		</section>

		<section id="breadcrumb" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Breadcrumb</h2>
			<p class="text-sm leading-6">
				Opt-in via <code>aria-label="Breadcrumb"</code> on the nav (the WAI-ARIA Authoring Practices
				recommendation). Chevron separators appear between siblings; only this explicit pattern
				triggers them — pagination, table-of-contents, and other
				<code>&lt;nav&gt;&lt;ol&gt;</code> patterns stay separator-free.
			</p>
			<nav aria-label="Breadcrumb">
				<ol>
					<li><a href="#/home">Home</a></li>
					<li><a href="#/forms">Forms</a></li>
					<li>Output</li>
				</ol>
			</nav>
		</section>

		<section id="pagination" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Pagination</h2>
			<p class="text-sm leading-6">
				A <code>&lt;nav aria-label="Pagination"&gt;&lt;ol&gt;</code> with numbered links — the
				framework lays out the inner list horizontally without separators, leaving consumers free to
				add their own visual treatment for previous/next, current page highlighting, etc.
			</p>
			<nav aria-label="Pagination">
				<ol>
					<li><a href="#prev">‹ Prev</a></li>
					<li><a href="#1">1</a></li>
					<li><a href="#2" aria-current="page">2</a></li>
					<li><a href="#3">3</a></li>
					<li><a href="#4">4</a></li>
					<li><a href="#next">Next ›</a></li>
				</ol>
			</nav>
		</section>

		<section id="tabs" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Tabs</h2>
			<p class="text-sm leading-6">
				A <code>&lt;nav role="tablist"&gt;</code> with <code>role="tab"</code> children is the
				canonical tab pattern — tabs DO navigate between sibling content panels of the same page,
				which is the HTML LS definition of a <em>nav</em>. The framework styles the role attribute
				directly so <code>&lt;menu role="tablist"&gt;</code> or
				<code>&lt;div role="tablist"&gt;</code> work too for in-card / in-widget tabs where a
				<em>nav</em> landmark would be unwanted noise.
			</p>
			<p class="text-sm leading-6">
				Active tab paints an underline in the variant color; the indicator overlaps the tablist's
				bottom-border track pixel-perfectly via a negative margin.
			</p>

			<nav aria-label="Account settings" role="tablist">
				<button
					type="button"
					role="tab"
					:aria-selected="activeTab === 'profile' ? 'true' : 'false'"
					aria-controls="tabpanel-profile"
					id="tab-profile"
					@click="activeTab = 'profile'"
				>
					Profile
				</button>
				<button
					type="button"
					role="tab"
					:aria-selected="activeTab === 'account' ? 'true' : 'false'"
					aria-controls="tabpanel-account"
					id="tab-account"
					@click="activeTab = 'account'"
				>
					Account
				</button>
				<button
					type="button"
					role="tab"
					:aria-selected="activeTab === 'security' ? 'true' : 'false'"
					aria-controls="tabpanel-security"
					id="tab-security"
					@click="activeTab = 'security'"
				>
					Security
				</button>
			</nav>
			<section
				id="tabpanel-profile"
				role="tabpanel"
				aria-labelledby="tab-profile"
				:hidden="activeTab !== 'profile'"
			>
				<p class="text-sm">
					Profile settings — display name, avatar, bio. The panel content is whatever HTML you want;
					framework just paints block-direction padding so the panel separates from the tablist
					track.
				</p>
			</section>
			<section
				id="tabpanel-account"
				role="tabpanel"
				aria-labelledby="tab-account"
				:hidden="activeTab !== 'account'"
			>
				<p class="text-sm">
					Account settings — email, billing, plan. Switch tabs and the indicator slides to the new
					selection.
				</p>
			</section>
			<section
				id="tabpanel-security"
				role="tabpanel"
				aria-labelledby="tab-security"
				:hidden="activeTab !== 'security'"
			>
				<p class="text-sm">
					Security settings — password, 2FA, devices. Keyboard navigation (<kbd
						class="rounded border border-[color:var(--color-border)] px-1 font-mono text-xs"
						>←</kbd
					>
					<kbd class="rounded border border-[color:var(--color-border)] px-1 font-mono text-xs"
						>→</kbd
					>
					<kbd class="rounded border border-[color:var(--color-border)] px-1 font-mono text-xs"
						>Home</kbd
					>
					<kbd class="rounded border border-[color:var(--color-border)] px-1 font-mono text-xs"
						>End</kbd
					>) arrives with the
					<code class="rounded px-1 py-0.5 font-mono text-xs">useTabs</code>
					composable in Phase 6.
				</p>
			</section>
		</section>

		<section id="rail" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Primary navigation rail</h2>
			<p class="text-sm leading-6">
				When <code>&lt;nav&gt;</code> is a direct child of the layout-shell
				<code>&lt;body&gt;</code>, it becomes the page's primary navigation rail — vertical column,
				fixed inline-size, padded, scrollable, with a separator border. The navigation panel on the
				left of this app is exactly that.
			</p>
			<p class="text-sm leading-6">
				Use <code>&lt;nav class="end"&gt;</code> to flip the border to the leading edge for rails
				placed on the trailing column.
			</p>
		</section>
	</section>
</template>
