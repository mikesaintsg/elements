// ============================================================================
// Style modifier behavior — .ghost / .filled set --set-style-* context
// tokens by reading the active variant's --set-variant-*. Element files
// prefer --set-style-* over raw --set-variant-*. Two values shipped; an
// `.outline` modifier was dropped because Tailwind's `.outline` utility
// (sets outline-style + outline-width on a different property) would stack
// alongside ours and produce a doubled visual.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { render, token } from '../../../setupStyles.ts'

describe('style modifiers set --set-style-* context tokens', () => {
	it('.ghost makes both background and border transparent (and border zero)', () => {
		const el = render('div', 'primary ghost')
		expect(token(el, '--set-style-color')).not.toBe('')
		expect(token(el, '--set-style-background-color').trim()).toBe('transparent')
		expect(token(el, '--set-style-border-color').trim()).toBe('transparent')
		expect(token(el, '--set-style-border-width').trim()).toBe('0')
	})

	it('.filled mirrors the variant directly', () => {
		const el = render('div', 'primary filled')
		expect(token(el, '--set-style-color')).not.toBe('')
		expect(token(el, '--set-style-background-color')).not.toBe('')
		expect(token(el, '--set-style-border-color')).not.toBe('')
		expect(token(el, '--set-style-border-width').trim()).toBe('1px')
	})
})
