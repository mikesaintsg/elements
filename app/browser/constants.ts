import type { Placement, Variant } from '@elements/browser'
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

// ── Placement vocabulary ─────────────────────────────────────────────────

/**
 * Every floating-panel placement, in the order the popover / menu demos
 * present them (each side, then its two alignment corners). Typed against
 * the framework's `Placement` union so an invalid value fails to compile.
 */
export const PLACEMENTS: readonly Placement[] = [
	'top',
	'top-start',
	'top-end',
	'bottom',
	'bottom-start',
	'bottom-end',
	'start',
	'start-start',
	'start-end',
	'end',
	'end-start',
	'end-end',
]

// ── Demo media assets ────────────────────────────────────────────────────
//
// Inline SVG data URIs + public sample-media URLs used by the image /
// figure / card / media demos. Inlined so the showcase stays offline-
// friendly; real consumers point at their own asset pipeline. Each is a
// distinct artwork (different viewBox / palette) — NOT interchangeable.

/** ArticleCardPage hero banner (800×400, emerald→cyan). */
export const ARTICLE_CARD_HERO_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23h)'/%3E%3Ccircle cx='180' cy='120' r='60' fill='white' fill-opacity='0.22'/%3E%3Ccircle cx='620' cy='280' r='90' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 300 L200 220 L400 270 L600 200 L800 240 L800 400 L0 400 Z' fill='white' fill-opacity='0.20'/%3E%3C/svg%3E"

/** ArticleCardPage portrait thumbnail (400×400, pink→orange). */
export const ARTICLE_CARD_PORTRAIT_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23db2777'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23p)'/%3E%3Ccircle cx='200' cy='160' r='70' fill='white' fill-opacity='0.30'/%3E%3Cpath d='M70 400 L200 240 L330 400 Z' fill='white' fill-opacity='0.22'/%3E%3C/svg%3E"

/** ArticleCardPage cosmic feature image (800×400, violet radial). */
export const ARTICLE_CARD_COSMIC_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Cdefs%3E%3CradialGradient id='c' cx='30%25' cy='40%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%237c3aed'/%3E%3Cstop offset='60%25' stop-color='%231e293b'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23c)'/%3E%3Ccircle cx='180' cy='130' r='45' fill='white' fill-opacity='0.35'/%3E%3Ccircle cx='600' cy='80' r='2' fill='white'/%3E%3Ccircle cx='680' cy='180' r='1.5' fill='white'/%3E%3Ccircle cx='720' cy='280' r='2.5' fill='white'/%3E%3Ccircle cx='500' cy='350' r='1.5' fill='white'/%3E%3Ccircle cx='580' cy='320' r='1' fill='white'/%3E%3C/svg%3E"

/** FiguresPage gradient thumbnail (640×360, emerald→violet). */
export const FIGURES_GRADIENT_THUMB_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%237c3aed'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3Ccircle cx='180' cy='120' r='60' fill='white' fill-opacity='0.22'/%3E%3Ccircle cx='460' cy='240' r='100' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 280 L160 200 L320 240 L480 180 L640 220 L640 360 L0 360 Z' fill='white' fill-opacity='0.18'/%3E%3C/svg%3E"

/** MediaPage gradient thumbnail (480×320, blue→violet). */
export const MEDIA_GRADIENT_THUMB_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%232563eb'/%3E%3Cstop offset='100%25' stop-color='%237c3aed'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='480' height='320' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='100' r='40' fill='white' fill-opacity='0.18'/%3E%3Ccircle cx='360' cy='200' r='80' fill='white' fill-opacity='0.12'/%3E%3Ccircle cx='240' cy='260' r='30' fill='white' fill-opacity='0.22'/%3E%3C/svg%3E"

/** MediaPage wide hero banner (1200×400, emerald→cyan, layered hills). */
export const MEDIA_WIDE_HERO_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 400'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23059669'/%3E%3Cstop offset='100%25' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='400' fill='url(%23h)'/%3E%3Cpath d='M0 320 L300 200 L600 280 L900 160 L1200 240 L1200 400 L0 400 Z' fill='white' fill-opacity='0.15'/%3E%3Cpath d='M0 360 L400 280 L800 340 L1200 300 L1200 400 L0 400 Z' fill='white' fill-opacity='0.25'/%3E%3C/svg%3E"

/** MediaPage portrait image (320×480, pink→orange). */
export const MEDIA_PORTRAIT_URI =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 480'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23db2777'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='480' fill='url(%23p)'/%3E%3Ccircle cx='160' cy='180' r='80' fill='white' fill-opacity='0.22'/%3E%3Cpath d='M40 480 L160 280 L280 480 Z' fill='white' fill-opacity='0.18'/%3E%3C/svg%3E"

/** Public sample video (Big Buck Bunny, Google test-content CDN). */
export const MEDIA_SAMPLE_VIDEO_URL =
	'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

/** Public sample audio (SoundHelix freely-distributed track). */
export const MEDIA_SAMPLE_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
