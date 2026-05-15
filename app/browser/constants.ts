import type { Variant } from '@elements/browser'
import { modifiers } from '@elements/browser'

/**
 * Static, non-reactive showcase constants: shell configuration plus the
 * variant vocabularies the demo pages iterate over. The vocabularies are
 * DERIVED from the framework's own `modifiers.variant` map — the showcase
 * never maintains its own copy of the framework's variant names, so the
 * two can't drift.
 */

// ── Shell configuration ─────────────────────────────────────────────────

/**
 * Mobile breakpoint. Mirrors the framework's `960px` rail breakpoint so
 * the shell can toggle the `popover` attribute on the rails in JS in
 * lockstep with the CSS-side drawer chrome.
 */
export const MOBILE_QUERY = '(max-width: 960px)'

/**
 * IDs of the two body-shell rail elements (`<nav>` left, `<aside>`
 * right). Used to close any open rail drawer on navigation / home.
 */
export const RAIL_IDS = ['primary-rail', 'toc-rail'] as const

/** Selector for the sidebar filter input focused by the `/` shortcut. */
export const FILTER_SELECTOR = '#sidebar-filter'

/**
 * `rootMargin` for the on-this-page IntersectionObserver. The `-70%`
 * bottom inset means a section counts as "active" only once it has
 * scrolled into the top third of the scroller.
 */
export const OBSERVER_ROOT_MARGIN = '0px 0px -70% 0px'

// ── Variant vocabularies (derived from @elements/browser) ────────────────

/**
 * The full framework variant vocabulary, in canonical declaration order
 * (`primary → information`). Single source of truth for every demo page
 * that iterates all seven variants.
 */
export const VARIANTS: readonly Variant[] = Object.values(modifiers.variant)

/**
 * Alert demo subset — every variant except `tertiary` (alerts don't use
 * the lowest-emphasis neutral tier).
 */
export const VARIANTS_ALERT: readonly Variant[] = VARIANTS.filter((v) => v !== 'tertiary')

/**
 * Form demo subset — every variant except `information` (the form demos
 * pair each control with an actionable status, not an informational one).
 */
export const VARIANTS_FORM: readonly Variant[] = VARIANTS.filter((v) => v !== 'information')

/**
 * Feedback-surface subset — `primary` plus the four status colors, no
 * neutral `secondary` / `tertiary`. Used by the form-surface and carousel
 * demos where every swatch must carry a semantic message.
 */
export const VARIANTS_FEEDBACK: readonly Variant[] = VARIANTS.filter(
	(v) => v !== 'secondary' && v !== 'tertiary',
)
