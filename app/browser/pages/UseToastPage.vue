<script lang="ts" setup>
import type { EffectScope, Ref } from 'vue'
import type { CreateToastInstance, UseToastReturn } from '@src/browser'
import { computed, effectScope, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { createToast, useToast } from '@src/browser'

// ── Trigger toasts (basic trio) ─────────────────────────────────────────────
// Three independent `useToast` adapters wired into the bottom-end linear
// container. Auto-hide delays differ; the third (`autohide: false`) is
// sticky and only closes via the close button or programmatic `hide()`.
const successEl = ref<HTMLOutputElement | null>(null)
const warningEl = ref<HTMLOutputElement | null>(null)
const stickyEl = ref<HTMLOutputElement | null>(null)
const success = useToast(successEl, { autohide: { delay: 4000 } })
const warning = useToast(warningEl, { autohide: { delay: 6000 } })
const sticky = useToast(stickyEl, { autohide: false })

// ── Pause / resume demo ─────────────────────────────────────────────────────
const pauseEl = ref<HTMLOutputElement | null>(null)
const pauseToast = useToast(pauseEl, { autohide: { delay: 6000 } })

// ── Linear stack + event log ────────────────────────────────────────────────
// Each click adds a toast to the bottom-end linear container (no
// `[data-toast-stack]` wrapper). Toasts space themselves apart via the
// `--set-toast-stack-offset` token written by the factory.
interface StackToast {
	readonly id: string
	readonly tone: string
	readonly tag: string
	readonly text: string
	readonly element: Ref<HTMLOutputElement | null>
	readonly scope: EffectScope
	readonly toast: UseToastReturn
}

interface StackVariant {
	readonly tone: string
	readonly text: string
}

const variants: readonly StackVariant[] = [
	{ tone: 'primary', text: 'First in the stack.' },
	{ tone: 'success', text: 'Second toast.' },
	{ tone: 'information', text: 'Third toast.' },
	{ tone: 'warning', text: 'Fourth toast.' },
]

const log = ref<{ at: string; kind: string; tag: string }[]>([])
const stackToasts = shallowRef<readonly StackToast[]>([])
let stackCount = 0
const stamp = (): string => new Date().toLocaleTimeString()
const record = (kind: string, tag: string): void => {
	log.value.unshift({ at: stamp(), kind, tag })
}
const removeStack = (id: string): void => {
	const item = stackToasts.value.find((toast) => toast.id === id)
	item?.scope.stop()
	stackToasts.value = stackToasts.value.filter((toast) => toast.id !== id)
}
const createStackToast = (): StackToast | undefined => {
	const index = stackCount % variants.length
	const variant = variants[index]
	if (!variant) return undefined
	stackCount += 1
	const id = `stack-${stackCount}`
	const tag = `toast ${stackCount}`
	const element = ref<HTMLOutputElement | null>(null)
	const scope = effectScope()
	const toast = scope.run(() =>
		useToast(element, {
			autohide: { delay: 4000 },
			on: {
				show: () => record('show', tag),
				open: () => record('open', tag),
				hide: () => record('hide', tag),
				close: () => {
					record('close', tag)
					removeStack(id)
				},
			},
		}),
	)
	if (!toast) {
		scope.stop()
		return undefined
	}
	return {
		id,
		tone: variant.tone,
		tag,
		text: `${variant.text} #${stackCount}`,
		element,
		scope,
		toast,
	}
}
const showStack = async (toast: StackToast): Promise<void> => {
	await nextTick()
	toast.toast.show()
}
const addStack = (): void => {
	const toast = createStackToast()
	if (!toast) return
	stackToasts.value = [...stackToasts.value, toast]
	void showStack(toast)
}
const addStacks = (): void => {
	addStack()
	addStack()
	addStack()
}
const hideStack = (toast: StackToast): void => {
	toast.toast.hide()
}
const bindStack = (toast: StackToast, element: unknown): void => {
	toast.element.value = element instanceof HTMLOutputElement ? element : null
}

// ── Deck stack (Sonner-style card-stack visual) ─────────────────────────────
// Mirrors the linear flow above but renders into a separate
// `[data-toast-stack]` container so the deck visuals (peeking edges,
// hidden-count indicator, hover-expand) can be observed in isolation.
interface DeckToast {
	readonly id: string
	readonly tone: string
	readonly text: string
	readonly element: Ref<HTMLOutputElement | null>
	readonly scope: EffectScope
	readonly toast: UseToastReturn
}
const DECK_DEPTH = 3
const deckEnabled = ref(true)
const deckToasts = shallowRef<readonly DeckToast[]>([])
const deckHiddenCount = computed(() => Math.max(0, deckToasts.value.length - DECK_DEPTH))
let deckCount = 0
const deckMessages: readonly { tone: string; text: string }[] = [
	{ tone: 'success', text: 'Saved successfully.' },
	{ tone: 'information', text: 'New activity posted.' },
	{ tone: 'primary', text: 'Connection restored.' },
	{ tone: 'warning', text: 'Background sync complete.' },
	{ tone: 'success', text: 'Reminder scheduled.' },
]
const removeDeck = (id: string): void => {
	const item = deckToasts.value.find((toast) => toast.id === id)
	item?.scope.stop()
	deckToasts.value = deckToasts.value.filter((toast) => toast.id !== id)
}
const createDeckToast = (): DeckToast | undefined => {
	deckCount += 1
	const id = `deck-${deckCount}`
	const message = deckMessages[deckCount % deckMessages.length] ??
		deckMessages[0] ?? { tone: 'primary', text: '' }
	const element = ref<HTMLOutputElement | null>(null)
	const scope = effectScope()
	const toast = scope.run(() =>
		useToast(element, {
			autohide: { delay: 6000 },
			on: { close: () => removeDeck(id) },
		}),
	)
	if (!toast) {
		scope.stop()
		return undefined
	}
	return {
		id,
		tone: message.tone,
		text: `${message.text} #${deckCount}`,
		element,
		scope,
		toast,
	}
}
const showDeckToast = async (toast: DeckToast): Promise<void> => {
	await nextTick()
	toast.toast.show()
}
const addDeck = (): void => {
	const toast = createDeckToast()
	if (!toast) return
	deckToasts.value = [...deckToasts.value, toast]
	void showDeckToast(toast)
}
const addDecks = (): void => {
	addDeck()
	addDeck()
	addDeck()
}
const hideDeck = (toast: DeckToast): void => {
	toast.toast.hide()
}
const bindDeck = (toast: DeckToast, element: unknown): void => {
	toast.element.value = element instanceof HTMLOutputElement ? element : null
}
const toggleDeck = (): void => {
	deckEnabled.value = !deckEnabled.value
}

// ── Factory layer demo ──────────────────────────────────────────────────────
// `useToast` is a thin Vue adapter over `createToast` — the factory takes
// an `<output>` element directly, manages the autohide timer, and
// composes `createPopover` for top-layer visibility. Same hover-pause and
// popover lifecycle apply.
const factoryToastEl = ref<HTMLOutputElement | null>(null)
let factoryToast: CreateToastInstance | null = null
const factoryShow = (): void => factoryToast?.show()
const factoryHide = (): void => factoryToast?.hide()
onMounted(() => {
	const el = factoryToastEl.value
	if (el) factoryToast = createToast(el, { autohide: { delay: 3000 } })
})
onBeforeUnmount(() => {
	factoryToast?.destroy()
	factoryToast = null
})
</script>

<template>
	<section>
		<header>
			<h1>useToast</h1>
			<p>
				Auto-hiding notification composable. Owns the timer, hover/focus pause, and the deck-mode
				layout tokens (<code>--set-toast-stack-depth</code>, <code>--set-toast-peek-height</code>,
				<code>--set-toast-front-height</code>) while delegating top-layer visibility to the native
				<code>&lt;output popover&gt;</code> API.
			</p>
		</header>

		<section id="signature">
			<h2>Signature</h2>
			<pre><code>useToast(elementRef: Ref&lt;HTMLOutputElement | null&gt;, options?: UseToastOptions): UseToastReturn

interface UseToastOptions {
  autohide?: false | { delay?: number }   // default { delay: 5000 }
  on?:       Partial&lt;UseToastEventMap&gt;
}
interface UseToastReturn { visible, show(), hide(), pause(), resume(), destroy() }</code></pre>
		</section>

		<section id="basic">
			<h2>Trigger toasts</h2>
			<p class="showcase-caption">
				Each button shows a toast in the bottom-end corner. The warning toast pauses while you
				hover; the sticky toast stays open until you click <code>hide()</code>.
			</p>
			<div class="showcase-row">
				<button type="button" class="success" @click="success.show()">Success (4 s)</button>
				<button type="button" class="warning" @click="warning.show()">Warning (6 s)</button>
				<button type="button" @click="sticky.show()">Sticky</button>
				<button type="button" class="ghost small" @click="sticky.hide()">hide()</button>
			</div>
			<div class="showcase-row">
				<small>
					success: <code>{{ success.visible.value ? 'visible' : 'hidden' }}</code>
				</small>
				<small>
					warning: <code>{{ warning.visible.value ? 'visible' : 'hidden' }}</code>
				</small>
				<small>
					sticky: <code>{{ sticky.visible.value ? 'visible' : 'hidden' }}</code>
				</small>
			</div>
		</section>

		<section id="pause">
			<h2>Pause &amp; resume</h2>
			<p class="showcase-caption">
				Programmatic timer control — useful when an inline action takes the user's attention away
				from the toast. Hover pauses the timer; leaving resumes it.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="pauseToast.show()">show()</button>
				<button type="button" class="ghost small" @click="pauseToast.pause()">pause()</button>
				<button type="button" class="ghost small" @click="pauseToast.resume()">resume()</button>
				<button type="button" class="ghost small" @click="pauseToast.hide()">hide()</button>
				<small>
					visible: <code>{{ pauseToast.visible.value }}</code>
				</small>
			</div>
		</section>

		<section id="factory">
			<h2>Vanilla JS — <code>createToast</code> factory</h2>
			<p class="showcase-caption">
				<code>useToast</code> is a thin Vue adapter over <code>createToast</code>. The factory
				accepts the <code>HTMLOutputElement</code> directly, manages the autohide timer, and
				composes <code>createPopover</code> for top-layer visibility. The same hover/focus pause and
				lifecycle events apply.
			</p>
			<pre><code>// vanilla.js — no Vue runtime needed
import { createToast } from '@elements/browser'

const el = document.querySelector('#my-toast')
const toast = createToast(el, { autohide: { delay: 3000 } })

document.querySelector('#fire').onclick = () =&gt; toast.show()
toast.pause()  // freeze the timer
toast.resume() // restart it
toast.destroy()</code></pre>
			<div class="showcase-row">
				<button type="button" class="success" @click="factoryShow()">show()</button>
				<button type="button" class="ghost small" @click="factoryHide()">hide()</button>
			</div>
		</section>

		<section id="stack">
			<h2>Linear stack &amp; event log</h2>
			<p class="showcase-caption">
				Add as many independent toasts as needed. Each fires its own
				<code>show</code>/<code>open</code>/<code>hide</code>/<code>close</code> and the log records
				every transition. Without <code>[data-toast-stack]</code> the container stacks linearly —
				newer toasts lift the older ones up by their measured height +
				<code>--set-toast-spacing</code>.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="addStack()">Add toast</button>
				<button type="button" class="ghost small" @click="addStacks()">Add three</button>
				<button type="button" class="ghost small" @click="log = []">clear log</button>
			</div>
			<small v-if="log.length === 0">No events yet.</small>
			<ul v-else class="showcase-event-log">
				<li v-for="(e, i) in log" :key="i">
					<code>{{ e.kind }}</code>
					<span>{{ e.tag }}</span>
					<small>{{ e.at }}</small>
				</li>
			</ul>
		</section>

		<section id="deck">
			<h2>Deck stack (Sonner-style)</h2>
			<p>
				Deck mode stacks toasts as a physical card deck. The most recent toast sits at the front,
				fully visible. Older toasts peek out as progressively smaller, dimmer edges. Toasts beyond
				the depth limit are hidden with <code>aria-hidden</code> and counted in the indicator. Hover
				the stack — or tab into it — to expand all toasts into a readable list; no JavaScript
				required for that interaction.
			</p>
			<p class="showcase-caption">
				Enabled by adding <code>[data-toast-stack]</code> to the toast container. The deck depth is
				controlled by <code>--set-toast-stack-depth</code> (default 3). All other toast behavior
				(auto-hide, pause on hover, keyboard accessibility) is unchanged.
			</p>
			<div class="showcase-row">
				<button type="button" class="primary" @click="addDeck()">Add toast</button>
				<button type="button" class="ghost small" @click="addDecks()">Add three</button>
				<button type="button" class="ghost small" @click="toggleDeck()">
					{{ deckEnabled ? 'Disable deck mode' : 'Enable deck mode' }}
				</button>
			</div>
			<div class="showcase-row">
				<small>
					mode:
					<code>{{ deckEnabled ? 'deck ([data-toast-stack])' : 'linear (default)' }}</code>
				</small>
				<small>
					depth: <code>{{ DECK_DEPTH }}</code>
				</small>
				<small>
					hidden: <code>{{ deckHiddenCount }}</code>
				</small>
				<small>
					total: <code>{{ deckToasts.length }}</code>
				</small>
			</div>
		</section>

		<!--
		   Linear toast container (no [data-toast-stack]). Toasts space
		   themselves apart via the factory-written `--set-toast-stack-offset`
		   token, which `composables/_toast.scss` adds to the corner inset.
		-->
		<Teleport to="body">
			<div class="showcase-toast-container">
				<output ref="successEl" popover="manual" class="success">
					Your changes have been saved successfully.
					<button type="button" class="ghost small" aria-label="Close" @click="success.hide()">
						×
					</button>
				</output>
				<output ref="warningEl" popover="manual" class="warning">
					Your session expires in 5 minutes — hover to pause.
					<button type="button" class="ghost small" aria-label="Close" @click="warning.hide()">
						×
					</button>
				</output>
				<output ref="stickyEl" popover="manual">
					Stays open until manually dismissed.
					<button type="button" class="ghost small" aria-label="Close" @click="sticky.hide()">
						×
					</button>
				</output>
				<output ref="pauseEl" popover="manual" class="primary">
					6-second timer — pause and resume from the buttons.
					<button type="button" class="ghost small" aria-label="Close" @click="pauseToast.hide()">
						×
					</button>
				</output>
				<output ref="factoryToastEl" popover="manual" class="success">
					Wired by <code>createToast(el)</code>.
					<button type="button" class="ghost small" aria-label="Close" @click="factoryHide()">
						×
					</button>
				</output>
				<output
					v-for="toast in stackToasts"
					:key="toast.id"
					:ref="(element) => bindStack(toast, element)"
					popover="manual"
					:class="toast.tone"
				>
					{{ toast.text }}
					<button type="button" class="ghost small" aria-label="Close" @click="hideStack(toast)">
						×
					</button>
				</output>
			</div>

			<!--
			   Deck container — opt-in via [data-toast-stack]. Anchored to
			   the bottom-start corner so it sits beside the linear bottom-
			   end container above without overlapping it.
			   `[data-toast-indicator]` surfaces the hidden count when the
			   deck exceeds `--set-toast-stack-depth`. `aria-live="polite"`
			   announces count changes.
			-->
			<div
				class="showcase-toast-container start"
				data-toast-position="start"
				:data-toast-stack="deckEnabled ? '' : null"
			>
				<span data-toast-indicator aria-live="polite" aria-atomic="true">
					+{{ deckHiddenCount }} hidden — hover to expand
				</span>
				<output
					v-for="toast in deckToasts"
					:key="toast.id"
					:ref="(element) => bindDeck(toast, element)"
					popover="manual"
					:class="toast.tone"
				>
					{{ toast.text }}
					<button type="button" class="ghost small" aria-label="Close" @click="hideDeck(toast)">
						×
					</button>
				</output>
			</div>
		</Teleport>

		<section id="api">
			<h2>API</h2>
			<table>
				<thead>
					<tr>
						<th>Option</th>
						<th>Type</th>
						<th>Default</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>autohide</code></td>
						<td><code>false | { delay?: number }</code></td>
						<td><code>{ delay: 5000 }</code></td>
					</tr>
					<tr>
						<td><code>on</code></td>
						<td><code>Partial&lt;UseToastEventMap&gt;</code></td>
						<td>—</td>
					</tr>
				</tbody>
			</table>
			<h3>Events</h3>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Cancelable</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>elements:toast:show</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:toast:open</code></td>
						<td>no</td>
					</tr>
					<tr>
						<td><code>elements:toast:hide</code></td>
						<td>yes</td>
					</tr>
					<tr>
						<td><code>elements:toast:close</code></td>
						<td>no</td>
					</tr>
				</tbody>
			</table>
		</section>
	</section>
</template>
