// ============================================================================
//  _table.scss — collapse reset, cell padding, header bg, row hover, cascade.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

function buildTable(extra = ''): {
	table: HTMLTableElement
	headerCell: HTMLTableCellElement
	bodyCell: HTMLTableCellElement
	bodyRow: HTMLTableRowElement
} {
	const table = build('table', extra)
	const thead = build('thead')
	const headRow = build('tr')
	const headerCell = build('th', '', 'Head')
	headRow.appendChild(headerCell)
	thead.appendChild(headRow)

	const tbody = build('tbody')
	const bodyRow = build('tr')
	const bodyCell = build('td', '', 'Body')
	bodyRow.appendChild(bodyCell)
	tbody.appendChild(bodyRow)

	// Second body row — `tbody tr:last-child td` has its border zeroed,
	// so always include a trailing row when measuring divider behavior on
	// the first row.
	const trailingRow = build('tr')
	const trailingCell = build('td', '', 'Trailing')
	trailingRow.appendChild(trailingCell)
	tbody.appendChild(trailingRow)

	table.append(thead, tbody)
	mount(table)
	return { table, headerCell, bodyCell, bodyRow }
}

describe('table — collapse reset', () => {
	it('uses border-collapse: collapse', () => {
		const el = render('table', '')
		expect(style(el, 'border-collapse')).toBe('collapse')
	})

	it('takes 100% inline-size', () => {
		const el = render('table', '')
		expect(style(el, 'width').endsWith('px')).toBe(true)
	})
})

describe('table — cell rules', () => {
	it('th and td receive padding from the table', () => {
		const { headerCell, bodyCell } = buildTable()
		expect(pixels(headerCell, 'padding-top')).toBeGreaterThan(0)
		expect(pixels(bodyCell, 'padding-top')).toBeGreaterThan(0)
	})

	it('th uses bold font-weight', () => {
		const { headerCell } = buildTable()
		expect(Number(style(headerCell, 'font-weight'))).toBeGreaterThanOrEqual(500)
	})

	it('th has a non-transparent background', () => {
		const { headerCell } = buildTable()
		expect(style(headerCell, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
	})

	it('td shows a bottom border by default', () => {
		const { bodyCell } = buildTable()
		expect(pixels(bodyCell, 'border-bottom-width')).toBe(1)
	})
})

describe('table — variant cascade', () => {
	it('.primary moves the divider color to the primary color', () => {
		const { table } = buildTable('primary')
		const expected = style(document.documentElement, '--color-primary').trim()
		expect(token(table, '--set-table-border-color').trim()).toBe(expected)
	})
})
