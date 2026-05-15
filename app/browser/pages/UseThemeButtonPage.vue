<script lang="ts" setup>
/**
 * UseThemeButtonPage — paired tiny-surface composables.
 *
 * `useTheme()` and `useButton()` are tiny but conceptually related: both
 * are stateful one-purpose primitives where the value of the composable
 * is the disciplined wiring between a piece of state and a DOM
 * reflection (DOM attribute on `<html>` for theme, `aria-pressed` on a
 * button for toggle). They share a page because their footprints are
 * small enough that a dedicated page per primitive would be padding.
 *
 * `useTheme` design notes:
 *   - **CSS owns OS follow.** When `setting === 'system'` (the default),
 *     the composable removes `<html data-theme="…">` and the framework
 *     stylesheet's `@media (prefers-color-scheme: dark)` rule does the
 *     light→dark flip on its own. No JS rewrite on OS-preference changes.
 *   - **Reactivity is reserved for UI.** The matchMedia listener feeds a
 *     `mode` ref so a sun/moon icon can swap when the OS preference
 *     changes; it does NOT rewrite the DOM. Single source of truth: the
 *     `data-theme` attribute when set, the media query otherwise.
 *   - **One singleton per page.** Every `useTheme()` call returns refs
 *     pointing at the same shared state, so multiple consumers stay in
 *     sync without explicit plumbing.
 *
 * `useButton` is the canonical `aria-pressed` toggle button — click
 * flips `.active`, mirrors to `aria-pressed`, fires
 * `elements:button:toggle` with the new value. The factory is gated to
 * `<button>` only (`HTMLButtonElement`) because toggle semantics
 * key off `aria-pressed`, which is button-role-specific.
 *
 * API surface coverage:
 *   useTheme:
 *     1. Tri-state segmented picker — `setting` ref driving exclusive
 *        choice between Light / Dark / System.
 *     2. Resolved `mode` ref — sun/moon icon stays accurate when the OS
 *        preference flips while in `'system'` mode.
 *     3. Binary `toggle()` — flips between explicit light + dark,
 *        anchors away from `'system'`.
 *   useButton:
 *     4. Bare toggle — `active` ref + `aria-pressed` sync.
 *     5. Multiple independent toggles — each composable instance is
 *        scoped to its own button.
 *     6. `on.toggle` event — observe the transition reactively.
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useButton, useTheme } from '@elements/browser'

// ─────────────────────────────────────────────────────────────────────
// useTheme — singleton theme controller.
// ─────────────────────────────────────────────────────────────────────
const theme = useTheme()
import { THEME_BUTTON_OPTIONS as themeOptions } from '../constants.js'
const isSystem = computed(() => theme.setting.value === 'system')

// ─────────────────────────────────────────────────────────────────────
// useButton — one composable per button host.
// ─────────────────────────────────────────────────────────────────────
const bookmarkButton = useTemplateRef<HTMLButtonElement>('bookmarkButton')
const bookmark = useButton(bookmarkButton)

const notifyButton = useTemplateRef<HTMLButtonElement>('notifyButton')
const notify = useButton(notifyButton)

const muteButton = useTemplateRef<HTMLButtonElement>('muteButton')
const muteLog = ref<string[]>([])
const mute = useButton(muteButton, {
	on: {
		toggle: (event) => {
			const active = event.detail.active
			muteLog.value = [
				...muteLog.value.slice(-3),
				`${new Date().toLocaleTimeString()} — ${active ? 'muted' : 'unmuted'}`,
			]
		},
	},
})
</script>

<template>
	<section id="use-theme-button-intro">
		<hgroup>
			<h1>useTheme &amp; useButton</h1>
			<p>
				Two tiny composables on one page. <code>useTheme()</code> reflects a single user choice
				(<code>light</code> / <code>dark</code> / <code>system</code>) onto
				<code>&lt;html data-theme="…"&gt;</code> — and crucially, when the user picks
				<code>system</code> the attribute is REMOVED so the framework stylesheet's
				<code>@media (prefers-color-scheme: dark)</code> rule handles the OS-follow without per-
				update JS. <code>useButton()</code> is the canonical <code>aria-pressed</code> toggle button
				— click flips <code>.active</code>, mirrors to <code>aria-pressed</code>, fires
				<code>elements:button:toggle</code>.
			</p>
		</hgroup>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>Theme:</strong> setting
				<code>{{ theme.setting.value }}</code>
				· resolved mode
				<code>{{ theme.mode.value }}</code>
				<span v-if="isSystem"> · following OS</span>
			</p>
		</aside>
	</section>

	<section id="use-theme-segmented">
		<h2>1. useTheme — tri-state segmented picker</h2>
		<p>
			The composable's <code>setting</code> ref is the user-facing source of truth — a tri-state
			value <code>'light' | 'dark' | 'system'</code>. UI that lets the user pick between all three
			reads <code>setting</code>. The picker below mirrors <code>setting</code> via
			<code>aria-pressed</code> on each option button and calls <code>theme.set(value)</code> on
			click.
		</p>
		<p>
			Picking <strong>System</strong> removes the <code>data-theme</code> attribute from
			<code>&lt;html&gt;</code> entirely so CSS owns the flip. Open your OS appearance settings and
			toggle dark mode while this page is on <strong>System</strong> — the colors update without a
			page reload, and the framework's matchMedia listener updates the resolved
			<code>mode</code> ref so the sun/moon icon in the next section stays accurate too.
		</p>
		<menu class="theme-picker" role="radiogroup" aria-label="Theme">
			<li v-for="option in themeOptions" :key="option.value">
				<button
					type="button"
					role="radio"
					:aria-checked="theme.setting.value === option.value"
					:class="{ active: theme.setting.value === option.value }"
					@click="theme.set(option.value)"
				>
					<span aria-hidden="true">{{ option.icon }}</span>
					<span>{{ option.label }}</span>
				</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const theme = useTheme()

// theme.setting — Ref&lt;'light' | 'dark' | 'system'&gt;
// theme.set(value) — pick one of the three
// theme.set('system') removes data-theme; CSS handles prefers-color-scheme</code></pre>
		</details>
	</section>

	<section id="use-theme-mode">
		<h2>2. useTheme — resolved <code>mode</code> ref</h2>
		<p>
			Where <code>setting</code> is the user's raw choice, <code>mode</code> is what's currently
			rendered. They diverge exactly when <code>setting === 'system'</code>:
			<code>mode</code> reflects the live <code>prefers-color-scheme</code> result via a single
			matchMedia listener wired inside the composable. Bind <code>mode</code> to anything binary — a
			sun/moon icon, a <code>:class</code> hook, a status pill.
		</p>
		<div class="mode-display">
			<div
				class="mode-card"
				:class="theme.mode.value === 'dark' ? 'tertiary filled' : 'warning subtle'"
			>
				<span aria-hidden="true" class="mode-icon">
					{{ theme.mode.value === 'dark' ? '🌙' : '☀️' }}
				</span>
				<div>
					<strong>Currently rendering:</strong>
					<code>{{ theme.mode.value }}</code>
					<p v-if="isSystem">
						<small>following <code>prefers-color-scheme</code></small>
					</p>
					<p v-else>
						<small
							>explicit pin via <code>data-theme="{{ theme.setting.value }}"</code></small
						>
					</p>
				</div>
			</div>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const theme = useTheme()

// theme.mode — Ref&lt;'light' | 'dark'&gt;, derived
//
// When setting === 'system', theme.mode tracks the OS preference via
// the composable's matchMedia listener — so a sun/moon icon stays
// accurate when the OS appearance flips at runtime.
//
// &lt;i :class="theme.mode.value === 'dark' ? 'icon-moon' : 'icon-sun'"&gt;</code></pre>
		</details>
	</section>

	<section id="use-theme-toggle">
		<h2>3. useTheme — binary <code>toggle()</code></h2>
		<p>
			<code>toggle()</code> is the affordance for "switch between light and dark, never mind
			system." It reads the RESOLVED <code>mode</code>, so a system user on a dark OS toggles to
			explicit <code>'light'</code> (and vice versa) — the choice anchors away from
			<code>'system'</code>. To opt back into OS follow, call <code>theme.set('system')</code>
			explicitly.
		</p>
		<menu>
			<li>
				<button type="button" @click="theme.toggle()">
					<span aria-hidden="true">{{ theme.mode.value === 'dark' ? '☀️' : '🌙' }}</span>
					Switch to {{ theme.mode.value === 'dark' ? 'light' : 'dark' }}
				</button>
			</li>
			<li>
				<button type="button" class="subtle" :disabled="isSystem" @click="theme.set('system')">
					🖥️ Return to system
				</button>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const theme = useTheme()

// theme.toggle() — light &lt;-&gt; dark (anchors away from 'system')
// theme.set('system') — opt back into OS follow</code></pre>
		</details>
	</section>

	<section id="use-button-bare">
		<h2>4. useButton — bare toggle</h2>
		<p>
			Mount on a <code>&lt;button&gt;</code> ref and the composable wires click → flip
			<code>.active</code> → mirror to <code>aria-pressed</code> → fire
			<code>elements:button:toggle</code>. The host element MUST be <code>&lt;button&gt;</code> (the
			factory throws otherwise) because toggle semantics rely on <code>aria-pressed</code>, which is
			button-role-specific.
		</p>
		<menu>
			<li>
				<button
					ref="bookmarkButton"
					type="button"
					:class="bookmark.active.value ? 'warning filled' : 'subtle'"
				>
					<span aria-hidden="true">{{ bookmark.active.value ? '★' : '☆' }}</span>
					{{ bookmark.active.value ? 'Bookmarked' : 'Bookmark' }}
				</button>
			</li>
			<li>
				<small>
					<code>active</code> = <strong>{{ bookmark.active.value }}</strong> ·
					<code>aria-pressed</code> mirrors via the factory
				</small>
			</li>
		</menu>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const button = useTemplateRef&lt;HTMLButtonElement&gt;('button')
const bookmark = useButton(button)

// bookmark.active — Ref&lt;boolean&gt;, mirrors .active class
// bookmark.toggle() — programmatic flip (same as click)
// The factory writes aria-pressed=&quot;true | false&quot; for you</code></pre>
		</details>
	</section>

	<section id="use-button-multi">
		<h2>5. useButton — independent instances per button</h2>
		<p>
			Each <code>useButton(ref, options)</code> instance is scoped to its own
			<code>&lt;button&gt;</code> — no shared state, no singleton. Put two on the same page and they
			toggle independently. This is the opposite contract from <code>useTheme</code>, which IS a
			singleton — both patterns appear in the framework depending on whether the state has a single
			document-wide truth (theme) or a per-element truth (this button).
		</p>
		<menu>
			<li>
				<button
					ref="notifyButton"
					type="button"
					:class="notify.active.value ? 'success filled' : 'subtle'"
				>
					<span aria-hidden="true">{{ notify.active.value ? '🔔' : '🔕' }}</span>
					Notifications {{ notify.active.value ? 'on' : 'off' }}
				</button>
			</li>
		</menu>
		<small class="block mt-2">
			Notifications: <strong>{{ notify.active.value ? 'on' : 'off' }}</strong> · this button's
			<code>active</code> ref is independent of the bookmark button above.
		</small>
	</section>

	<section id="use-button-event">
		<h2>6. useButton — <code>on.toggle</code> event observation</h2>
		<p>
			Pass <code>on: { toggle }</code> to observe every state change. The event handler receives a
			<code>CustomEvent</code> with <code>{ active: boolean }</code> in <code>event.detail</code> —
			useful for analytics, undo stacks, or paired side effects that shouldn't live inside the click
			handler.
		</p>
		<menu>
			<li>
				<button
					ref="muteButton"
					type="button"
					:class="mute.active.value ? 'danger filled' : 'subtle'"
				>
					<span aria-hidden="true">{{ mute.active.value ? '🔇' : '🔊' }}</span>
					{{ mute.active.value ? 'Muted' : 'Mute' }}
				</button>
			</li>
		</menu>
		<small class="block mt-2">
			<strong>Log:</strong>
			<span v-if="muteLog.length === 0">click to fire `on.toggle`</span>
			<span v-else>{{ muteLog.join(' · ') }}</span>
		</small>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>const mute = useButton(muteRef, {
  on: {
    toggle: (event) =&gt; {
      // event.detail.active is the new state
      log.value.push(event.detail.active ? 'muted' : 'unmuted')
    },
  },
})</code></pre>
		</details>
	</section>

	<section id="use-theme-button-api">
		<h2>API reference</h2>
		<h3><code>useTheme</code></h3>
		<dl>
			<dt><code>useTheme(options?): UseThemeReturn</code></dt>
			<dd>
				Singleton theme controller. Every call returns refs pointing at the same shared state.
			</dd>
			<dt><code>options.initial</code></dt>
			<dd>
				<code>'light' | 'dark' | 'system'</code> (default <code>'system'</code>). Used only when
				nothing is stored. Stored value (localStorage by default) wins.
			</dd>
			<dt><code>options.storage</code></dt>
			<dd>
				<code>false | { key?: string }</code>. <code>false</code> disables persistence;
				<code>{ key }</code> overrides the storage key (default <code>STORAGE_KEY_THEME</code>).
			</dd>
			<dt><code>options.on.change</code></dt>
			<dd>
				<code>(event: CustomEvent) =&gt; void</code>. Fires on every setting change.
				<code>event.detail</code> is <code>{ mode, setting }</code>. The per-instance listener is
				removed on component unmount (Vue) or <code>destroy()</code> (factory).
			</dd>
			<dt><code>UseThemeReturn.setting</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;'light' | 'dark' | 'system'&gt;&gt;</code>. User's raw choice. Bind
				to tri-state UI surfaces (radiogroup, segmented control).
			</dd>
			<dt><code>UseThemeReturn.mode</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;'light' | 'dark'&gt;&gt;</code>. Resolved mode currently rendered.
				Tracks <code>setting</code> when explicit; mirrors <code>prefers-color-scheme</code> when
				<code>setting === 'system'</code>. Use for binary UI (sun/moon icon).
			</dd>
			<dt><code>UseThemeReturn.set(next)</code></dt>
			<dd>
				Pick light, dark, or system. No-op when value matches current setting. Rejects unknown
				values at runtime.
			</dd>
			<dt><code>UseThemeReturn.toggle()</code></dt>
			<dd>
				Binary flip between explicit light and dark, anchored on the RESOLVED mode (so a system+dark
				user toggles to explicit light). Call <code>set('system')</code> to opt back into OS follow.
			</dd>
		</dl>

		<h3><code>useButton</code></h3>
		<dl>
			<dt><code>useButton(elementRef, options?): UseButtonReturn</code></dt>
			<dd>
				Toggle-button composable. <code>elementRef</code> is a
				<code>Ref&lt;HTMLButtonElement | null&gt;</code>. The factory throws if the host is not a
				<code>&lt;button&gt;</code> — toggle semantics rely on <code>aria-pressed</code>.
			</dd>
			<dt><code>options.on.toggle</code></dt>
			<dd>
				<code>(event: CustomEvent) =&gt; void</code>. Fires on click and on programmatic
				<code>toggle()</code>. <code>event.detail.active</code> is the new state.
			</dd>
			<dt><code>UseButtonReturn.active</code></dt>
			<dd>
				<code>Readonly&lt;Ref&lt;boolean&gt;&gt;</code>. Reactive mirror of the
				<code>.active</code> class + <code>aria-pressed</code> attribute.
			</dd>
			<dt><code>UseButtonReturn.toggle()</code></dt>
			<dd>Programmatic flip. Same effect as a click.</dd>
		</dl>
	</section>
</template>

<style scoped>
.theme-picker {
	display: flex;
	gap: 0.25rem;
	padding: 0.25rem;
	margin: 0;
	list-style: none;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	background: var(--color-canvas-strong);
	inline-size: fit-content;
}

.theme-picker > li {
	display: contents;
}

.theme-picker button {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding-inline: 0.875rem;
	padding-block: 0.5rem;
	border: 0;
	border-radius: 0.375rem;
	background: transparent;
	color: var(--color-text-muted);
	font-weight: 500;
	cursor: pointer;
	transition:
		background-color 150ms ease,
		color 150ms ease;
}

.theme-picker button:hover {
	color: var(--color-text);
	background: color-mix(in oklch, var(--color-canvas) 60%, transparent);
}

.theme-picker button.active {
	background: var(--color-canvas);
	color: var(--color-text-strong);
	box-shadow: var(--set-box-shadow-small);
}

.mode-display {
	display: flex;
	justify-content: stretch;
}

.mode-card {
	display: flex;
	gap: 1rem;
	align-items: center;
	padding: 1rem 1.25rem;
	border-radius: 0.75rem;
	inline-size: 100%;
	max-inline-size: 28rem;
}

.mode-card p {
	margin-block: 0.125rem 0;
}

.mode-icon {
	font-size: 2rem;
	line-height: 1;
}
</style>
