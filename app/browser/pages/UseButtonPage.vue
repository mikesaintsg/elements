<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useButton } from '@src/browser'

const muteRef = ref<HTMLElement | null>(null)
const mute = useButton(muteRef)

const boldRef = ref<HTMLElement | null>(null)
const italicRef = ref<HTMLElement | null>(null)
const underRef = ref<HTMLElement | null>(null)
const bold = useButton(boldRef)
const italic = useButton(italicRef)
const under = useButton(underRef)

const previewStyle = computed(() => ({
	fontWeight: bold.active.value ? 700 : 400,
	fontStyle: italic.active.value ? 'italic' : 'normal',
	textDecoration: under.active.value ? 'underline' : 'none',
}))

const radioRefs = [
	ref<HTMLElement | null>(null),
	ref<HTMLElement | null>(null),
	ref<HTMLElement | null>(null),
] as const
const radioLabels = ['Day', 'Week', 'Month'] as const
const radios = radioRefs.map((r, i) =>
	useButton(r, {
		on: {
			toggle: () => {
				if (!radios[i]?.active.value) return
				for (let j = 0; j < radios.length; j++) {
					const other = radios[j]
					if (j !== i && other?.active.value) other.toggle()
				}
			},
		},
	}),
)

const setRadioRef = (i: number, el: unknown): void => {
	const slot = radioRefs[i]
	if (!slot) return
	slot.value = el instanceof HTMLElement ? el : null
}

// Social actions — same composable, three distinct visual treatments.
// Proves the composable does no presentation work; the page chooses
// label + class per state.
const likeRef = ref<HTMLElement | null>(null)
const bookmarkRef = ref<HTMLElement | null>(null)
const followRef = ref<HTMLElement | null>(null)
const like = useButton(likeRef)
const bookmark = useButton(bookmarkRef)
const follow = useButton(followRef)
</script>

<template>
	<section>
		<header>
			<h1>useButton</h1>
			<p>
				Toggle-button composable. Mirrors <code>.active</code> between the DOM class and a reactive
				ref, syncs <code>aria-pressed</code>, and emits <code>toggle</code> on each flip.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useButton(elementRef, options?): { active, toggle() }</code></pre>
		</section>

		<section id="single">
			<h2>Single toggle</h2>
			<p class="showcase-caption">
				Click flips the state. Both class and <code>aria-pressed</code> stay in sync.
			</p>
			<div class="showcase-row">
				<button ref="muteRef" type="button" class="primary outline">
					{{ mute.active.value ? 'Muted' : 'Mute' }}
				</button>
				<small
					>active = <code>{{ mute.active.value }}</code></small
				>
			</div>
		</section>

		<section id="group">
			<h2>Toolbar group</h2>
			<p class="showcase-caption">
				Each button keeps its own state. The preview reacts to all three reactive refs together.
			</p>
			<p :style="previewStyle">The quick brown fox jumps over the lazy dog.</p>
			<menu role="toolbar" aria-label="Text formatting">
				<button ref="boldRef" type="button" :class="{ primary: bold.active.value }">B</button>
				<button ref="italicRef" type="button" :class="{ primary: italic.active.value }">I</button>
				<button ref="underRef" type="button" :class="{ primary: under.active.value }">U</button>
			</menu>
		</section>

		<section id="radio">
			<h2>Radio behaviour by composition</h2>
			<p class="showcase-caption">
				The composable does not enforce single-selection. Build it by composing — each
				<code>toggle</code> handler turns its peers off.
			</p>
			<menu role="group" aria-label="Time range">
				<button
					v-for="(label, i) in radioLabels"
					:key="label"
					:ref="(el: unknown) => setRadioRef(i, el)"
					type="button"
					:class="{ primary: radios[i]?.active.value }"
				>
					{{ label }}
				</button>
			</menu>
		</section>

		<section id="social">
			<h2>Social actions</h2>
			<p class="showcase-caption">
				Same composable, three distinct visual treatments — the composable does no presentation
				work, the page chooses label + class per state. Each button toggles its own state and
				rewords its label.
			</p>
			<div class="showcase-row">
				<button
					ref="likeRef"
					type="button"
					:class="like.active.value ? ['danger', 'filled'] : ['danger', 'outline']"
				>
					{{ like.active.value ? '♥ Liked' : '♡ Like' }}
				</button>
				<button
					ref="bookmarkRef"
					type="button"
					:class="bookmark.active.value ? ['warning', 'filled'] : ['warning', 'outline']"
				>
					{{ bookmark.active.value ? '★ Saved' : '☆ Save' }}
				</button>
				<button
					ref="followRef"
					type="button"
					:class="follow.active.value ? ['success', 'filled'] : ['success', 'outline']"
				>
					{{ follow.active.value ? '✓ Following' : '+ Follow' }}
				</button>
			</div>
		</section>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Member</th>
						<th>Type</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>active</code></td>
						<td><code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code></td>
						<td>Mirrors <code>.active</code>.</td>
					</tr>
					<tr>
						<td><code>toggle()</code></td>
						<td><code>() =&gt; void</code></td>
						<td>Flip the state.</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Detail</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:button:toggle</code></td>
						<td><code>{ active }</code></td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
