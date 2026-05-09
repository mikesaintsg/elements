<script lang="ts" setup>
import { ref } from 'vue'

const headerQuery = ref('')
const filterQuery = ref('')
</script>

<template>
	<section class="space-y-10">
		<header class="border-b border-[color:var(--color-border)] pb-6">
			<h1 class="text-3xl font-semibold tracking-tight">
				<code class="font-mono">&lt;search&gt;</code>
			</h1>
			<p class="mt-3 text-base leading-7">
				The HTML <em>search</em> element (Baseline 2023) — "a container for search/filter controls
				and their related UI." It carries an implicit <code>role="search"</code> landmark, replacing
				the older <code>&lt;form role="search"&gt;</code> idiom.
			</p>
			<p class="mt-2 text-sm leading-6">
				The framework styles bare <code>&lt;search&gt;</code> as a horizontal flex row — drop an
				<code>&lt;input&gt;</code> inside (with optional submit / clear / suggestion slots) and the
				input fills the available space.
			</p>
		</header>

		<section id="header-search" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Site search</h2>
			<p class="text-sm leading-6">
				A <code>&lt;search&gt;</code> with an <code>&lt;input&gt;</code> + submit. The input takes
				<code>flex: 1</code> so it grows to fill the row.
			</p>
			<search>
				<input
					v-model="headerQuery"
					type="search"
					aria-label="Search the docs"
					placeholder="Search the docs…"
				/>
				<button type="submit" class="primary">Search</button>
			</search>
			<p class="text-xs">Query: {{ headerQuery || '(empty)' }}</p>
		</section>

		<section id="filter-bar" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">In-page filter</h2>
			<p class="text-sm leading-6">
				The same shape, but used to filter content inline rather than navigate. Multiple
				<code>&lt;search&gt;</code> blocks per page are valid — give each a distinct
				<code>aria-label</code> for screen-reader users.
			</p>
			<search aria-label="Filter list">
				<input v-model="filterQuery" type="search" aria-label="Filter list" placeholder="Filter…" />
				<button type="reset" @click="filterQuery = ''">Clear</button>
			</search>
		</section>

		<section id="sidebar-search" class="space-y-3">
			<h2 class="text-xl font-semibold tracking-tight">Sidebar search</h2>
			<p class="text-sm leading-6">
				The sidebar of this app uses <code>&lt;search&gt;</code> + <code>&lt;input&gt;</code> for
				the route filter (press
				<kbd class="rounded border border-[color:var(--color-border)] px-1 font-mono text-xs"
					>/</kbd
				>
				to focus it). That's the same pattern at smaller scale.
			</p>
		</section>
	</section>
</template>
