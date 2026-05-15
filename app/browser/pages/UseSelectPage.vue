<script lang="ts" setup>
/**
 * UseSelectPage — JS-driven listbox + combobox + multi-select widget.
 *
 * `useSelect(toggleRef, { menu, native?, input?, multiple?, autocomplete?, ... })`
 * is the framework's adapter over `createSelect`. Composes `createMenu`
 * (popover lifecycle, dismiss, position) + layers WAI-ARIA listbox /
 * combobox semantics on top:
 *   - `role="listbox"` on the `<menu>` panel
 *   - `role="option"` + `aria-selected` on each option
 *   - `aria-activedescendant` cursor that moves with arrows without
 *     shifting DOM focus
 *   - `role="combobox"` + `aria-autocomplete="list"` on the input/toggle
 *     when an `input` element is wired
 *
 * API surface coverage (from Phase 1 audit):
 *   1. Native `<select>` element repaint — element-layer chrome (no
 *      useSelect; demonstrates `--set-select-*` token surface).
 *   2. Single-select listbox — custom widget, native `<select>` mirror
 *      for form-data participation.
 *   3. Multi-select — `multiple: true`; menu stays open on commit so the
 *      user can build the selection.
 *   4. Combobox + autocomplete + sticky search row — `autocomplete:
 *      true` + `input` ref; typing filters via `[data-hidden]` substring
 *      match (`SELECT_HIDDEN_ATTR`) consumed by `_select.scss:126`.
 *   5. Cancellable lifecycle — `on.show` preventDefault vetoes open;
 *      `select / clear / input` are post-state info events.
 *   6. Placement + flip — `bottom-start` default; `flip: 5` (default)
 *      reverses to top when fewer than N rows fit below.
 *   7. Dismiss policy — `outside`, `escape`, `inside` flags.
 *   8. Keyboard rove — ArrowDown/Up/Home/End move active descendant via
 *      `rove` helper; Enter commits the cursor.
 *   9. Hover sets active descendant (mouseover handler).
 *
 * Authoring + audit pass (Phase 1 §5.4.1 native-platform redundancy walk):
 * factory is clean — every `setAttribute('data-*')` write is consumed by
 * SCSS (`data-hidden` → `_select.scss:126`); every `aria-*` write is
 * standard ARIA, dynamically driven, or option-conditional. No
 * `runTransition` anti-pattern (popover lifecycle delegated to
 * `createMenu` → `createPopover`). No re-implemented Escape (native via
 * popover dismiss). No body scroll-lock. No bad cancellable wrappers.
 * No factory strip needed.
 *
 * Cross-references:
 *   - UseMenuPage — the underlying `createMenu` lifecycle this composes
 *     with (popover open/close, dismiss, placement).
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useSelect } from '@elements/browser'
import { useLog } from '../composables.js'
import { SELECT_CITIES as cities, SELECT_FRUITS as fruits, SELECT_SIZES as sizes } from '../constants.js'

// ─────────────────────────────────────────────────────────────────────
// Demo 2 — Single-select listbox. Custom widget over `<menu popover>`,
// native `<select>` mirror for form-data participation.
// ─────────────────────────────────────────────────────────────────────
const single = {
	toggleRef: useTemplateRef<HTMLButtonElement>('singleToggle'),
	menuRef: useTemplateRef<HTMLMenuElement>('singleMenu'),
	nativeRef: useTemplateRef<HTMLSelectElement>('singleNative'),
}
const singleSelect = useSelect(single.toggleRef, {
	menu: single.menuRef,
	native: single.nativeRef,
	value: 'Cherry',
})

// ─────────────────────────────────────────────────────────────────────
// Demo 3 — Multi-select. `multiple: true`; menu stays open on commit.
// ─────────────────────────────────────────────────────────────────────
const multi = {
	toggleRef: useTemplateRef<HTMLButtonElement>('multiToggle'),
	menuRef: useTemplateRef<HTMLMenuElement>('multiMenu'),
	nativeRef: useTemplateRef<HTMLSelectElement>('multiNative'),
}
const multiSelect = useSelect(multi.toggleRef, {
	menu: multi.menuRef,
	native: multi.nativeRef,
	multiple: true,
	value: ['M', 'L'],
})

// ─────────────────────────────────────────────────────────────────────
// Demo 4 — Combobox + autocomplete + sticky search. Toggle stays a
// button; typeahead input lives INSIDE the menu as the first <li>
// (`.select-search`) so it stays sticky while options scroll.
// ─────────────────────────────────────────────────────────────────────
const combo = {
	toggleRef: useTemplateRef<HTMLButtonElement>('comboToggle'),
	menuRef: useTemplateRef<HTMLMenuElement>('comboMenu'),
	inputRef: useTemplateRef<HTMLInputElement>('comboInput'),
	nativeRef: useTemplateRef<HTMLInputElement>('comboNative'),
}
const comboSelect = useSelect(combo.toggleRef, {
	menu: combo.menuRef,
	input: combo.inputRef,
	native: combo.nativeRef,
	autocomplete: true,
})

// ─────────────────────────────────────────────────────────────────────
// Demo 5 — Cancellable lifecycle. preventDefault on `on.show` vetoes
// open; the `select / clear / input` events are post-state info hooks.
// ─────────────────────────────────────────────────────────────────────
const allowOpen = ref(true)
const { entries: lifecycleLog, push: note } = useLog(6)
const lifecycle = {
	toggleRef: useTemplateRef<HTMLButtonElement>('lifecycleToggle'),
	menuRef: useTemplateRef<HTMLMenuElement>('lifecycleMenu'),
}
const lifecycleSelect = useSelect(lifecycle.toggleRef, {
	menu: lifecycle.menuRef,
	on: {
		show: (event: CustomEvent) => {
			if (!allowOpen.value) {
				event.preventDefault()
				note('show vetoed via preventDefault()')
				return
			}
			note('show')
		},
		open: () => note('open'),
		hide: () => note('hide'),
		close: () => note('close'),
		select: (event: CustomEvent) => note(`select → ${JSON.stringify(event.detail)}`),
		clear: () => note('clear'),
	},
})

// ─────────────────────────────────────────────────────────────────────
// Demo 6 — Placement. `bottom-start` (default), `top-start`, and
// `flip: 5` (default) which reverses if fewer than 5 rows fit below.
// ─────────────────────────────────────────────────────────────────────
const placement = {
	toggleRef: useTemplateRef<HTMLButtonElement>('placementToggle'),
	menuRef: useTemplateRef<HTMLMenuElement>('placementMenu'),
}
const placementValue = ref<'bottom-start' | 'top-start'>('bottom-start')
const placementSelect = useSelect(placement.toggleRef, {
	menu: placement.menuRef,
	placement: placementValue,
	value: 'M',
})

// ─────────────────────────────────────────────────────────────────────
// Page-wide reactive readout for the intro state aside.
// ─────────────────────────────────────────────────────────────────────
const states = computed(() => ({
	single: { open: singleSelect.visible.value, value: singleSelect.value.value },
	multi: { open: multiSelect.visible.value, values: multiSelect.values.value },
	combo: { open: comboSelect.visible.value, query: comboSelect.query.value },
	lifecycle: { open: lifecycleSelect.visible.value },
	placement: { open: placementSelect.visible.value, value: placementSelect.value.value },
}))
</script>

<template>
	<section id="use-select-intro">
		<hgroup>
			<h1>useSelect</h1>
			<p>
				JS-driven listbox + combobox + multi-select widget. Wraps the framework's
				<code>&lt;menu popover&gt;</code> as the listbox panel, layers WAI-ARIA
				<code>role="listbox"</code> / <code>"option"</code> / <code>"combobox"</code> semantics, and
				mirrors selection into a native <code>&lt;select&gt;</code> (or <code>&lt;input&gt;</code>)
				for form-data participation. Composes <a href="#/use-menu"><code>useMenu</code></a> for the
				underlying popover lifecycle.
			</p>
		</hgroup>
		<p>
			The framework ships TWO select surfaces because they solve different problems. Section 1
			demonstrates the bare <code>&lt;select&gt;</code> element — token-driven repaint via
			<code>--set-select-*</code>, OS-rendered dropdown popup. The custom widget (sections 2-6)
			wears a <code>.select</code> class on a wrapper <code>&lt;div&gt;</code> with a
			<code>&lt;button class="select-toggle"&gt;</code> +
			<code>&lt;menu popover class="select-menu"&gt;</code> inside; it gives consumers what the
			native element can't — styleable options, multi-select that doesn't look ancient, autocomplete
			+ typeahead, sticky search rows, the framework's variant cascade reaching every row.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>State:</strong>
				single <code>{{ states.single.open ? 'open' : 'closed' }}</code> ·
				<code>{{ JSON.stringify(states.single.value) }}</code> · multi
				<code>{{ states.multi.open ? 'open' : 'closed' }}</code> ·
				<code>[{{ states.multi.values.join(', ') }}]</code> · combo
				<code>{{ states.combo.open ? 'open' : 'closed' }}</code> ·
				<code>{{ JSON.stringify(states.combo.query) }}</code> · lifecycle
				<code>{{ states.lifecycle.open ? 'open' : 'closed' }}</code> · placement
				<code>{{ states.placement.open ? 'open' : 'closed' }}</code>
			</p>
		</aside>
	</section>

	<section id="use-select-native">
		<h2>1. Native <code>&lt;select&gt;</code> repaint</h2>
		<p>
			The bare element via the framework's <code>elements/_select.scss</code> rules. No
			<code>useSelect</code>; the OS owns the dropdown popup. Token surface fully consumable —
			retune <code>--set-select-*</code> at any scope (root, parent, element) for chrome variations.
			The chevron is a token-driven background image (<code>--set-select-background-image</code>) so
			a host-page icon-set swap retunes every chevron consumer at once. List-box mode (<code
				>multiple</code
			>
			or <code>size</code>) suppresses the chevron and reverts the right-side padding via the same
			token — single-sourced.
		</p>
		<form class="stack max-w-md">
			<label>
				<span>Single-select</span>
				<select name="bare-single">
					<option value="">Choose a fruit…</option>
					<option v-for="f in fruits" :key="f" :value="f">{{ f }}</option>
				</select>
			</label>
			<label>
				<span>List-box (size=4)</span>
				<select name="bare-listbox" size="4">
					<option v-for="f in fruits" :key="f" :value="f">{{ f }}</option>
				</select>
			</label>
			<label>
				<span>Multi-select (chevron suppressed)</span>
				<select name="bare-multi" multiple size="4">
					<option v-for="f in fruits" :key="f" :value="f">{{ f }}</option>
				</select>
			</label>
			<label>
				<span>Disabled</span>
				<select name="bare-disabled" disabled>
					<option>Cherry</option>
				</select>
			</label>
		</form>
	</section>

	<section id="use-select-listbox">
		<h2>2. Single-select listbox — custom widget</h2>
		<p>
			Wrapper <code>&lt;div class="select"&gt;</code> hosts a
			<code>&lt;button class="select-toggle"&gt;</code> + a sibling
			<code>&lt;menu popover class="select-menu"&gt;</code>. The composable wires
			<code>aria-controls</code> / <code>aria-haspopup="listbox"</code> on the toggle, paints
			<code>aria-selected</code> on the chosen option, and moves an
			<code>aria-activedescendant</code> cursor under arrow-key control without shifting DOM focus.
			A hidden native <code>&lt;select&gt;</code> mirror catches the value for form data.
		</p>
		<p>
			<small>
				Try: click toggle, ArrowDown / ArrowUp to move cursor, Enter to commit, Escape to close,
				outside-click to dismiss, hover sets the active descendant.
			</small>
		</p>
		<div class="cluster gap-4 items-end">
			<div class="select min-w-56">
				<button ref="singleToggle" type="button" class="select-toggle">
					<span class="select-value">{{ singleSelect.value.value ?? 'Choose a fruit…' }}</span>
				</button>
				<menu ref="singleMenu" popover class="select-menu">
					<li v-for="f in fruits" :key="f">
						<button type="button" :data-value="f">{{ f }}</button>
					</li>
				</menu>
			</div>
			<select ref="singleNative" name="single-fruit" hidden>
				<option v-for="f in fruits" :key="f" :value="f">{{ f }}</option>
			</select>
			<menu>
				<li>
					<button type="button" class="subtle small" @click="singleSelect.show()">Show</button>
				</li>
				<li>
					<button type="button" class="subtle small" @click="singleSelect.hide()">Hide</button>
				</li>
				<li>
					<button type="button" class="subtle small" @click="singleSelect.clear()">Clear</button>
				</li>
				<li>
					<button type="button" class="subtle small" @click="singleSelect.select('Grape')">
						Pick Grape
					</button>
				</li>
			</menu>
		</div>
		<p>
			<small>
				Native mirror current value: <code>{{ singleSelect.value.value ?? '(empty)' }}</code> — the
				factory writes it on every commit and dispatches a native <code>change</code> event so the
				field participates in form submission and constraint validation.
			</small>
		</p>
		<details>
			<summary><small>Markup</small></summary>
			<pre v-pre><code>const toggleRef = useTemplateRef('toggle')
const menuRef = useTemplateRef('menu')
const nativeRef = useTemplateRef('native')
const select = useSelect(toggleRef, {
  menu: menuRef,
  native: nativeRef,
  value: 'Cherry',
})

&lt;div class="select"&gt;
  &lt;button ref="toggle" class="select-toggle"&gt;
    &lt;span class="select-value"&gt;{{ select.value.value }}&lt;/span&gt;
  &lt;/button&gt;
  &lt;menu ref="menu" popover class="select-menu"&gt;
    &lt;li&gt;&lt;button data-value="Apple"&gt;Apple&lt;/button&gt;&lt;/li&gt;
    …
  &lt;/menu&gt;
&lt;/div&gt;
&lt;select ref="native" name="fruit" hidden&gt;…&lt;/select&gt;</code></pre>
		</details>
	</section>

	<section id="use-select-multi">
		<h2>3. Multi-select — <code>multiple: true</code></h2>
		<p>
			With <code>multiple: true</code> each commit toggles membership in the value set, and the menu
			stays open by default (<code>dismiss.inside: false</code>) so the user can build the selection
			without reopening. <code>aria-multiselectable="true"</code> on the listbox; the native mirror
			(an HTMLSelectElement with <code>multiple</code>) syncs each
			<code>&lt;option&gt;.selected</code> on commit.
		</p>
		<p>
			<small>
				Try: open, click options to toggle, observe the menu stays open until outside-click /
				Escape; the toggle label flattens the array.
			</small>
		</p>
		<div class="cluster gap-4 items-end">
			<div class="select min-w-56">
				<button ref="multiToggle" type="button" class="select-toggle">
					<span class="select-value">
						{{
							multiSelect.values.value.length === 0
								? 'Choose sizes…'
								: multiSelect.values.value.join(', ')
						}}
					</span>
				</button>
				<menu ref="multiMenu" popover class="select-menu">
					<li v-for="s in sizes" :key="s">
						<button type="button" :data-value="s">{{ s }}</button>
					</li>
				</menu>
			</div>
			<select ref="multiNative" name="sizes" multiple hidden>
				<option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
			</select>
			<menu>
				<li>
					<button type="button" class="subtle small" @click="multiSelect.clear()">Clear</button>
				</li>
				<li>
					<button type="button" class="subtle small" @click="multiSelect.select('XL')">
						Toggle XL
					</button>
				</li>
			</menu>
		</div>
		<p>
			<small>
				Selected (<code>values</code>):
				<code>[{{ multiSelect.values.value.join(', ') }}]</code> · scalar (<code>value</code>):
				<code>{{ JSON.stringify(multiSelect.value.value) }}</code>
			</small>
		</p>
	</section>

	<section id="use-select-combobox">
		<h2>4. Combobox + autocomplete + sticky search</h2>
		<p>
			With <code>autocomplete: true</code> + an <code>input</code> ref, the toggle is promoted to
			<code>role="combobox"</code> and the typeahead input lives INSIDE the menu as the first
			<code>&lt;li class="select-search"&gt;</code> (sticky to the top so it stays visible while
			options scroll). The factory's <code>filter()</code> writes the
			<code>data-hidden</code> attribute (<code>SELECT_HIDDEN_ATTR</code>) on rejected rows, which
			<code>composables/_select.scss</code> consumes via
			<code>[data-hidden] { display: none }</code>
			— no Bootstrap utility-class soup. Substring match against the option's text content.
		</p>
		<p>
			<strong>Free-text entry.</strong> Autocomplete mode treats the typed query string AS the
			committed value — the factory writes <code>value</code> + <code>values</code> on every
			keystroke. Type something that doesn't match any option (e.g. <code>"Vancouver"</code>) and
			the input stays editable, the dropdown stays open, and a <code>"No matches"</code> empty-state
			hint paints in the menu via a <code>:has()</code> rule on <code>.select-menu</code>. Press
			<kbd>Enter</kbd> to dismiss the dropdown — your typed value is already committed to
			<code>comboSelect.value</code>.
		</p>
		<p>
			<strong>IME-safe.</strong> The factory defers filter application until
			<code>compositionend</code> fires, so multi-keystroke input methods (Chinese / Japanese /
			Korean pinyin, dead-key sequences) don't thrash the visible row set as the user composes a
			character.
		</p>
		<p>
			<small>
				Try: open, type "to" to filter to Tokyo + Stockholm; clear the filter to see the full list
				return; use ArrowDown / Enter to commit; the active descendant stays valid as the visible
				subset shifts. Type a non-matching string to see the empty-state hint + Enter-to-commit.
			</small>
		</p>
		<div class="cluster gap-4 items-end">
			<div class="select min-w-72">
				<button ref="comboToggle" type="button" class="select-toggle">
					<span class="select-value">{{ comboSelect.value.value ?? 'Choose a city…' }}</span>
				</button>
				<menu ref="comboMenu" popover class="select-menu">
					<li class="select-search">
						<input ref="comboInput" type="text" placeholder="Search cities…" autocomplete="off" />
					</li>
					<li v-for="c in cities" :key="c">
						<button type="button" :data-value="c">{{ c }}</button>
					</li>
				</menu>
			</div>
			<input ref="comboNative" type="hidden" name="city" />
			<menu>
				<li>
					<button type="button" class="subtle small" @click="comboSelect.clear()">Clear</button>
				</li>
			</menu>
		</div>
		<p>
			<small>
				Query: <code>{{ JSON.stringify(comboSelect.query.value) }}</code> · selected:
				<code>{{ JSON.stringify(comboSelect.value.value) }}</code>
			</small>
		</p>
	</section>

	<section id="use-select-lifecycle">
		<h2>5. Cancellable lifecycle</h2>
		<p>
			<code>on.show</code> fires BEFORE the popover entry with a cancellable
			<code>CustomEvent</code>; <code>preventDefault()</code> aborts the open.
			<code>on.hide</code> mirrors for close. <code>on.open</code> / <code>on.close</code> fire
			AFTER the popover transition (informational). <code>on.select</code> + <code>on.clear</code> +
			<code>on.input</code> are post-state info hooks. All seven also dispatch as DOM events
			(<code>elements:select:{show,open,hide,close,select,clear,input}</code>) for non-Vue
			consumers.
		</p>
		<menu>
			<li>
				<label>
					<input v-model="allowOpen" type="checkbox" />
					allow <code>show</code> to proceed
				</label>
			</li>
			<li>
				<button type="button" class="subtle small" @click="lifecycleSelect.toggle()">
					Try to toggle
				</button>
			</li>
		</menu>
		<div class="cluster gap-4 items-end">
			<div class="select min-w-48">
				<button ref="lifecycleToggle" type="button" class="select-toggle">
					<span class="select-value">
						{{ lifecycleSelect.value.value ?? 'Choose…' }}
					</span>
				</button>
				<menu ref="lifecycleMenu" popover class="select-menu">
					<li><button type="button" data-value="A">Option A</button></li>
					<li><button type="button" data-value="B">Option B</button></li>
					<li><button type="button" data-value="C">Option C</button></li>
				</menu>
			</div>
		</div>
		<small class="block mt-2">
			<strong>Lifecycle log:</strong>
			<span v-if="lifecycleLog.length === 0">flip the checkbox and click Try to toggle</span>
			<span v-else>{{ lifecycleLog.join(' → ') }}</span>
		</small>
	</section>

	<section id="use-select-placement">
		<h2>6. Placement + flip</h2>
		<p>
			Placement is reactive — pass a <code>Ref&lt;Placement&gt;</code> for live updates without
			destroying the factory. The default is <code>bottom-start</code>; <code>useSelect</code> opts
			INTO flip with <code>flip: 5</code> (the <code>DEFAULT_SELECT_FLIP</code> constant) so a
			listbox at the bottom of the viewport reveals upwards instead of scrolling an out-of-view
			tail. Set <code>flip: 0</code> to opt out (surplus rows scroll inside the panel).
		</p>
		<menu>
			<li>
				<label>
					<input v-model="placementValue" type="radio" value="bottom-start" />
					<code>bottom-start</code>
				</label>
			</li>
			<li>
				<label>
					<input v-model="placementValue" type="radio" value="top-start" />
					<code>top-start</code>
				</label>
			</li>
		</menu>
		<div class="cluster gap-4 items-end">
			<div class="select min-w-56">
				<button ref="placementToggle" type="button" class="select-toggle">
					<span class="select-value">{{ placementSelect.value.value ?? 'Choose a size…' }}</span>
				</button>
				<menu ref="placementMenu" popover class="select-menu">
					<li v-for="s in sizes" :key="s">
						<button type="button" :data-value="s">{{ s }}</button>
					</li>
				</menu>
			</div>
		</div>
	</section>

	<section id="use-select-api">
		<h2>API reference</h2>
		<dl>
			<dt><code>useSelect(toggleRef, options): UseSelectReturn</code></dt>
			<dd>
				Composable. <code>toggleRef</code> points at the trigger button (or the wrapping toggle in
				combobox mode); <code>options.menu</code> is the listbox <code>&lt;menu&gt;</code>;
				<code>options.native</code> is an optional native <code>&lt;select&gt;</code> /
				<code>&lt;input&gt;</code> mirror; <code>options.input</code> promotes to combobox.
			</dd>
			<dt><code>options.multiple</code></dt>
			<dd>
				<code>boolean</code>. Multi-select; <code>aria-multiselectable="true"</code>;
				<code>select()</code> toggles membership; menu stays open on commit (default
				<code>dismiss.inside: false</code>). Mutually exclusive with <code>autocomplete</code>.
			</dd>
			<dt><code>options.autocomplete</code></dt>
			<dd>
				<code>boolean</code>. Combobox typeahead; requires <code>options.input</code>; toggle
				becomes <code>role="combobox"</code> + <code>aria-autocomplete="list"</code>; substring
				filter via <code>[data-hidden]</code> on rejected rows; menu hides when no matches.
			</dd>
			<dt><code>options.value</code></dt>
			<dd>
				<code>string | readonly string[] | undefined</code>. Initial selection. Single-select uses
				the scalar; multi-select uses the array; <code>undefined</code> = empty.
			</dd>
			<dt>
				<code>options.placement</code> · <code>options.strategy</code> ·
				<code>options.offset</code>
			</dt>
			<dd>
				Forwarded to the wrapped <code>createMenu</code> → <code>createPopover</code>. Reactive:
				pass a <code>Ref&lt;Placement&gt;</code> for live updates.
			</dd>
			<dt><code>options.flip</code></dt>
			<dd>
				<code>number</code>. Min item-rows the requested side must hold before the menu commits;
				default <code>5</code> (<code>DEFAULT_SELECT_FLIP</code>). Pass <code>0</code> to opt out —
				surplus rows scroll inside the panel.
			</dd>
			<dt><code>options.dismiss</code></dt>
			<dd>
				<code>{ outside?, escape?, inside? }</code>. <code>outside</code> +
				<code>escape</code> default <code>true</code>; <code>inside</code> defaults to
				<code>!multiple</code>
				(single-select dismisses on commit, multi-select keeps the menu open).
			</dd>
			<dt><code>options.on</code></dt>
			<dd>
				<code>{ show?, open?, hide?, close?, select?, clear?, input? }</code>.
				<code>show / hide</code> are pre-transition cancellable; <code>open / close</code> are
				post-transition informational. <code>select</code> carries <code>{ value, values }</code>;
				<code>input</code> carries <code>{ query }</code> (combobox keystroke after filter).
			</dd>
			<dt>
				<code>UseSelectReturn.visible</code> · <code>.value</code> · <code>.values</code> ·
				<code>.query</code>
			</dt>
			<dd>
				<code>Readonly&lt;Ref&lt;…&gt;&gt;</code>. <code>visible</code> reflects popover-open state;
				<code>value</code> is the single-select scalar (first entry of <code>values</code> in multi
				mode, <code>null</code> when empty); <code>values</code> is the canonical multi snapshot;
				<code>query</code> is the current combobox-input string.
			</dd>
			<dt>
				<code>.show()</code> · <code>.hide()</code> · <code>.toggle()</code> ·
				<code>.select(next)</code> · <code>.clear()</code> · <code>.update()</code>
			</dt>
			<dd>
				Programmatic actions. <code>select(next)</code> replaces (single) or toggles membership
				(multi); fires <code>elements:select:select</code>. <code>clear()</code> empties the
				selection; fires <code>elements:select:clear</code>. <code>update()</code> recomputes the
				popover position (forwarded to <code>createMenu</code>).
			</dd>
		</dl>
	</section>
</template>
