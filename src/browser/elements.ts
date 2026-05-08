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
	button: 'button',
	details: 'details',
	dialog: 'dialog',
	fieldset: 'fieldset',
	input: 'input',
	label: 'label',
	legend: 'legend',
	meter: 'meter',
	output: 'output',
	progress: 'progress',
	select: 'select',
	summary: 'summary',
	table: 'table',
	textarea: 'textarea',
} as const

export type Element = (typeof elements)[keyof typeof elements]
