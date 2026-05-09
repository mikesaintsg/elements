// ============================================================================
//  Accordion group — sibling `<details>` get a small block-start margin.
//  Per HTML5, `<details name="…">` makes the group "exclusive" (opening
//  one closes the others); the framework spacing rule applies to all
//  consecutive sibling pairs regardless of whether `name=` is present.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		if (child.tagName === 'SECTION' || child.tagName === 'DIV') child.remove()
	}
})

describe('accordion-group — adjacent `<details>` siblings', () => {
	it('the second `<details>` in a sequence gets margin-block-start', () => {
		const wrap = build('section')
		const first = build('details')
		const summary1 = build('summary')
		summary1.textContent = 'A'
		first.appendChild(summary1)

		const second = build('details')
		const summary2 = build('summary')
		summary2.textContent = 'B'
		second.appendChild(summary2)

		wrap.append(first, second)
		mount(wrap)

		expect(pixels(second, 'margin-top')).toBeGreaterThan(0)
		expect(pixels(first, 'margin-top')).toBe(0)
	})

	it('a single `<details>` with no preceding sibling has no extra margin', () => {
		const wrap = build('section')
		const only = build('details')
		const summary = build('summary')
		summary.textContent = 'Only'
		only.appendChild(summary)
		wrap.appendChild(only)
		mount(wrap)
		expect(pixels(only, 'margin-top')).toBe(0)
	})
})
