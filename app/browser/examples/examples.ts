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
]

export const isExampleId = (id: string): boolean => examples.some((e) => e.id === id)
