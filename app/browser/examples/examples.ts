// Registry of layout examples. Mirrors the shape of `router.ts`'s `Route`
// so the docs navigation can lift example metadata into the sidebar /
// footer / toolbar picker without re-implementing the join.
//
// Pure data + types. No Vue imports so any non-Vue consumer (tests,
// build tooling) can pull it freely.

export interface ExampleMeta {
	readonly id: string
	readonly title: string
	readonly tagline: string
	readonly icon: string
}

export const examples: readonly ExampleMeta[] = [
	{
		id: 'example-console',
		title: 'Console',
		tagline:
			'App-shell pillar: every body-grid slot at once — nav rail, app bar, ' +
			'stat cards with <meter> gauges, a sortable <table> (useTable), context ' +
			'rail, and status footer. Rails flip to popover drawers on mobile.',
		icon: 'system',
	},
	{
		id: 'example-settings',
		title: 'Settings',
		tagline:
			'Forms pillar: one useForm wraps a stack of section cards — fieldsets, ' +
			'switches, radios, range, color, select, file. Submit-gated validation ' +
			'chrome (danger/valid borders, label re-tint) is pure framework CSS.',
		icon: 'system',
	},
	{
		id: 'example-editorial',
		title: 'Editorial',
		tagline:
			'Content & typography pillar: a long-form article from bare content ' +
			'elements with ZERO custom CSS — heading scale, prose rhythm, figure, ' +
			'blockquote, table, code/kbd chips, details FAQ, dl, hr, callouts.',
		icon: 'information',
	},
	{
		id: 'example-pricing',
		title: 'Pricing',
		tagline:
			'Composition pillar: a marketing landing page from <article> cards, ' +
			'.badge / .tag atoms, anchors-as-buttons, and .cluster / .stack layout ' +
			'primitives. Renders just <main> with a trailing in-flow footer.',
		icon: 'external',
	},
	{
		id: 'example-signin',
		title: 'Sign in',
		tagline:
			'Focused-form + overlay pillar: split-screen sign-in with a brand panel, ' +
			'OAuth buttons, useForm validation, a useDialog reset-password modal, ' +
			'a useToast confirmation, and the .loading button spinner state.',
		icon: 'check',
	},
]

export const isExampleId = (id: string): boolean => examples.some((e) => e.id === id)
