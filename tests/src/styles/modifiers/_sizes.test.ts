// ============================================================================
// Size modifier behavior — each .{size} sets the four --set-size-* context
// tokens, routing Tailwind scales (--spacing, --text-*, --radius-*) into
// the framework's size-context surface.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { render, token } from '../../../setupStyles.ts'

const SIZES = ['small', 'large'] as const

describe('size modifiers set --set-size-* context tokens', () => {
	it.each(SIZES)('.%s sets all four --set-size-* tokens', (name) => {
		const el = render('div', name)
		expect(token(el, '--set-size-padding-inline')).not.toBe('')
		expect(token(el, '--set-size-padding-block')).not.toBe('')
		expect(token(el, '--set-size-font-size')).not.toBe('')
		expect(token(el, '--set-size-border-radius')).not.toBe('')
	})
})
