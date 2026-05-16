// ============================================================================
//  app/browser/index.ts — public-barrel completeness parity.
//
//  The barrel is the showcase's single public surface ("pull everything
//  from here when wiring tests"). This guards that contract: every
//  runtime export of every centralized module is reachable through the
//  barrel, with reference identity preserved (no silently-dropped or
//  shadowed export). A new export that isn't surfaced fails here.
//
//  Runs in app:browser because importing the barrel pulls `router.ts`,
//  which imports every `.vue` page (needs the Vue SFC compiler).
// ============================================================================

import { describe, expect, it } from 'vitest'
import * as barrel from '../../../app/browser/index.js'
import * as composables from '../../../app/browser/composables.js'
import * as constants from '../../../app/browser/constants.js'
import * as helpers from '../../../app/browser/helpers.js'
import * as router from '../../../app/browser/router.js'
import * as types from '../../../app/browser/types.js'
import { extractProperty } from '../../setup'

const MODULES: Readonly<Record<string, object>> = {
	types, // runtime exports only (the rest are erased type aliases)
	router,
	helpers,
	constants,
	composables,
}

describe('app/browser barrel — every centralized export is reachable', () => {
	for (const [moduleName, module] of Object.entries(MODULES)) {
		const keys = Object.keys(module)

		it(`${moduleName} contributes at least one runtime export`, () => {
			expect(keys.length).toBeGreaterThan(0)
		})

		for (const key of keys) {
			// On failure: `app/browser/index.ts` does not re-export
			// `${key}` from `./${moduleName}.js` (or re-exports a different
			// binding). The barrel is the sole public surface — add the
			// missing `export *` / fix the directive (`export type *` drops
			// runtime values like ROUTE_GROUPS).
			it(`barrel re-exports ${moduleName}.${key} with identity`, () => {
				expect(Object.keys(barrel)).toContain(key)
				expect(extractProperty(barrel, key)).toBe(extractProperty(module, key))
			})
		}
	}
})
