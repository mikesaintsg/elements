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
		id: 'example-dashboard',
		title: 'Dashboard',
		tagline:
			'Sidebar drawer + topbar action rail + stat cards + activity timeline. ' +
			'Exercises useAside, <menu role="toolbar">, and the modifier-cascade button vocabulary.',
		icon: 'speedometer',
	},
	{
		id: 'example-marketing',
		title: 'Marketing',
		tagline:
			'Long-scroll landing page: hero + logos + feature grid + stats + pricing + CTA + footer. ' +
			'Renders just <main> + body-shell <footer> — no sidebar, no topbar app shell.',
		icon: 'external',
	},
	{
		id: 'example-auth',
		title: 'Auth',
		tagline:
			'Split-screen sign-in: brand panel (gradient, testimonial, trust badges) left + ' +
			'form panel (OAuth buttons, email/password, remember-me) right. ' +
			'Renders just <main> with a CSS grid split; brand panel hidden on mobile.',
		icon: 'information',
	},
]

export const isExampleId = (id: string): boolean => examples.some((e) => e.id === id)
