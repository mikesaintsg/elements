// ============================================================================
// Tailwind v4 utility class catalog — collision watch list.
//
// Why this exists:
//   The framework lives in `@layer components` (and `elements`, `surfaces`).
//   Tailwind sits in `@layer utilities`, which is the LAST layer in the
//   merged order. Layered rules from a later layer always beat earlier
//   ones, regardless of selector specificity. So if a Tailwind utility
//   shares a name with a framework modifier (e.g. `.inline`), Tailwind
//   wins — silently — and the framework rule never paints.
//
// What's in this list:
//   Every Tailwind v4 utility class whose ENTIRE class name is a single
//   token (no hyphen-separated value suffix). These are the only ones at
//   risk of colliding with framework modifiers, because every framework
//   modifier is a single semantic English word (`primary`, `small`,
//   `ghost`, `disabled`, etc.).
//
//   Functional utilities (`.bg-blue-500`, `.p-4`, `.text-lg`, etc.) are
//   excluded — the hyphenated value suffix makes a name collision
//   impossible by construction.
//
// How to update:
//   When Tailwind ships a new bare utility, add it here. The companion
//   test under tests/src/core (tailwind-conflicts) will then refuse any
//   framework modifier that matches.
//
// Source: https://tailwindcss.com/docs (v4 reference, last reviewed
// 2026-05). Pseudo-class variants and arbitrary values aren't included
// because they can't appear standalone as a class name.
// ============================================================================

export const TAILWIND_SINGLE_TOKEN_UTILITIES: readonly string[] = [
	// ── Display ───────────────────────────────────────────────────────────────
	'block',
	'inline',
	'flex',
	'grid',
	'contents',
	'hidden',
	'table',
	'flow-root',
	'list-item',

	// ── Position ──────────────────────────────────────────────────────────────
	'static',
	'fixed',
	'absolute',
	'relative',
	'sticky',

	// ── Visibility ────────────────────────────────────────────────────────────
	'visible',
	'invisible',
	'collapse',

	// ── Layout helpers ────────────────────────────────────────────────────────
	'isolate',
	'container',
	'truncate',

	// ── Flex/Grid item shorthand ─────────────────────────────────────────────
	'shrink',
	'grow',

	// ── Typography ────────────────────────────────────────────────────────────
	'italic',
	'underline',
	'overline',
	'uppercase',
	'lowercase',
	'capitalize',
	'antialiased',
	'ordinal',
	'normal-nums',

	// ── Borders / decoration ──────────────────────────────────────────────────
	'border',
	'rounded',
	'shadow',
	'ring',
	'outline',

	// ── Behavior ──────────────────────────────────────────────────────────────
	'resize',

	// ── Print / accessibility ─────────────────────────────────────────────────
	'sr-only',

	// ── SVG ───────────────────────────────────────────────────────────────────
	'fill-current',
	'stroke-current',
] as const
