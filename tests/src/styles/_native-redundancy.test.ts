// ============================================================================
//  Native-platform redundancy — JS ↔ CSS attribute parity.
//
//  Every `setAttribute('data-X-*', …)` written by a factory in
//  `src/browser/factories/` must be referenced at least once by a partial
//  in `src/styles/`. If the CSS doesn't key on the attribute, the JS is
//  doing dead work — the framework's "lean on the platform" stance means
//  we either drop the attribute or wire it into the cascade.
//
//  This test was motivated by two real cases:
//
//    1. **createAside** (fixed: `2b6952a`). The factory wrote
//       `[data-aside-open]` / `[data-aside-closing]` on every open / close
//       — but `components/_aside.scss` and `composables/_aside.scss`
//       never referenced either. The slide-in / slide-out animation was
//       driven entirely by `:popover-open` + `@starting-style` +
//       `transition-behavior: allow-discrete`. Worse, the JS was also
//       waiting on a `transitionend` event that couldn't fire (because
//       `hidePopover()` — the call that triggers the transition — was
//       inside the `runTransition` callback), adding a ~400 ms dead wait
//       before the slide-out even began. Strip dropped close latency
//       from ~400 ms to ~73 ms.
//
//    2. **createTabs**. The factory writes `[data-tab-open]` on / off but
//       no SCSS file references it. Separately, the pane-hide chrome on
//       `components/_nav.scss` keys off the HTML `[hidden]` attribute,
//       but the JS toggles `[aria-hidden]` instead — so panels never
//       visually hide on tab switch. Caught by this test the moment it
//       went live.
//
//  Allow-list: a few attributes are intentionally JS-only (DOM query
//  helpers, JS-state markers that are not consumed by CSS). Each entry
//  must justify itself in the `JS_ONLY` map below.
// ============================================================================

import { describe, expect, it } from 'vitest'

const factorySources = import.meta.glob('../../../src/browser/factories/create*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

const styleSources = import.meta.glob('../../../src/styles/**/_*.scss', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

// ── 1. Extract every `setAttribute('data-X', …)` from factory sources ──────

const SET_ATTR_RE = /\.setAttribute\(\s*['"](data-[a-z][a-z0-9-]*)['"]/g

type AttrWrite = {
	readonly attr: string
	readonly factory: string
}

function* findAttrWrites(): Iterable<AttrWrite> {
	for (const [path, source] of Object.entries(factorySources)) {
		const factory = path.split('/').pop() ?? path
		const seen = new Set<string>()
		for (const match of source.matchAll(SET_ATTR_RE)) {
			const attr = match[1]
			if (!attr || seen.has(attr)) continue
			seen.add(attr)
			yield { attr, factory }
		}
	}
}

// ── 2. Build the set of attributes that ANY SCSS partial references ────────
//
// Liberal match: the attr name appearing anywhere in `src/styles/` source
// (including comments) counts. The point is to catch the case where the
// JS writes an attribute that NO style ever mentions; if it's mentioned
// even in a docstring, the author can argue intent.

const stylesCorpus = Object.values(styleSources).join('\n')

function isReferencedInStyles(attr: string): boolean {
	return stylesCorpus.includes(attr)
}

// ── 3. Allow-list — attributes legitimately written by JS without a CSS hit ─
//
// Every entry needs a one-line rationale. Adding to this list is a
// deliberate exception, not a workaround.

const JS_ONLY: Readonly<Record<string, string>> = {
	// Set on the toggle button (not a styling target on its own — the
	// `<menu popover>` panel is what's styled, gated by `:popover-open`).
	'data-popover-side': 'JS-resolved popover side; consumed by JS arrow-positioning logic.',
	// Set on dragged rows by `useDrag` for selection-set tracking; CSS keys
	// on `.dragging` / `.selected` class names that the factory applies.
	'data-drag-source': 'JS-only drag-source marker; styling reads `.dragging` class.',
	'data-drag-target': 'JS-only drop-target marker; styling reads `.drop-indicator` class.',
	// STRIP CANDIDATE (recorded in plan.md §Future work → Native-platform
	// redundancy audit, with createTable). `[data-collapsing]` is set on
	// the table expansion panel while the JS manually animates inline
	// `style.height` from 0 → scrollHeight → ''. The CSS in
	// `elements/_table.scss:420-446` ALREADY animates the panel via
	// `[data-table-expansion-panel]` + `[data-table-expanded]` on the
	// parent row, using `interpolate-size: allow-keywords` to tween
	// `block-size: 0 → auto`. The JS height-pinning machinery is
	// redundant. Address when UseTablePage is authored: drop the
	// inline-style animation + the `data-collapsing` marker + the
	// associated `runTransition` wait, lean on the CSS transition. Until
	// then the attribute is allowed via this exception.
	'data-collapsing':
		'STRIP CANDIDATE — redundant with CSS-driven row-expansion transition; see plan.md.',
}

// ── 4. The contract ────────────────────────────────────────────────────────

describe('factory ↔ style parity — every setAttribute("data-*") has a CSS reference', () => {
	const writes = [...findAttrWrites()]

	if (writes.length === 0) {
		it('finds at least one data-* setAttribute call to verify', () => {
			expect.fail('No `.setAttribute("data-…")` calls found in src/browser/factories/.')
		})
		return
	}

	for (const { attr, factory } of writes) {
		it(`[${attr}] (written by ${factory}) is referenced by src/styles/`, () => {
			if (JS_ONLY[attr]) {
				// Documented exception — pass with the rationale recorded in
				// the test source.
				return
			}
			expect(
				isReferencedInStyles(attr),
				`${factory} writes \`[${attr}]\` via \`setAttribute\` but NO partial in ` +
					`src/styles/ references it. Either:\n` +
					`  (a) Wire the attribute into the cascade so it actually styles something, OR\n` +
					`  (b) Drop the attribute and lean on the native platform state (e.g. ` +
					`\`:popover-open\`, \`[open]\`, \`:checked\`, \`[hidden]\`), OR\n` +
					`  (c) Add it to JS_ONLY in this file with a rationale describing why the ` +
					`attribute is JS-only and what CSS DOES style instead.\n\n` +
					`This contract was added after the createAside strip (commit \`2b6952a\`) ` +
					`exposed ~400 ms of dead-wait latency from a factory writing attributes ` +
					`the CSS never consumed.`,
			).toBe(true)
		})
	}
})
