// ============================================================================
// Styled Element Registry (TS mirror)
//
// Enumerates the HTML tags the framework gives substantive (token-driven)
// styling to. A tag belongs here only after its `_{tag}.scss` partial declares
// at least one --set-{tag}-* token (the marker of "real styling," not just a
// UA reset note).
//
// Add a new entry the same commit that brings up the element's styling — the
// elements.test.ts parity test fails when a TS entry has no substantive
// partial, or vice versa.
// ============================================================================

export const elements = {
	a: 'a',
	address: 'address',
	audio: 'audio',
	blockquote: 'blockquote',
	button: 'button',
	code: 'code',
	dd: 'dd',
	details: 'details',
	dialog: 'dialog',
	dl: 'dl',
	dt: 'dt',
	embed: 'embed',
	fieldset: 'fieldset',
	figcaption: 'figcaption',
	figure: 'figure',
	hgroup: 'hgroup',
	hr: 'hr',
	iframe: 'iframe',
	input: 'input',
	kbd: 'kbd',
	label: 'label',
	legend: 'legend',
	main: 'main',
	mark: 'mark',
	meter: 'meter',
	object: 'object',
	output: 'output',
	pre: 'pre',
	progress: 'progress',
	samp: 'samp',
	section: 'section',
	select: 'select',
	small: 'small',
	strong: 'strong',
	summary: 'summary',
	table: 'table',
	textarea: 'textarea',
	var: 'var',
	video: 'video',
} as const

export type Element = (typeof elements)[keyof typeof elements]
