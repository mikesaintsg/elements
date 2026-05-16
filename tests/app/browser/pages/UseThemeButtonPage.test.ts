// ============================================================================
//  UseThemeButtonPage — per-page BESPOKE parity (Phase-2 §9,
//  Composables). A PAGE_SURFACE_BUNDLES bundled page: it owns BOTH
//  useTheme (→ createTheme) and useButton (→ createButton). The §9
//  guard iterates both targets. (Shared mechanism in _composable-api.ts.)
// ============================================================================

import { UseThemeButtonPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity(
	'UseThemeButtonPage',
	UseThemeButtonPage,
	'use-theme-button',
	'useTheme / useButton',
	[
		{ use: 'useTheme', factory: 'createTheme' },
		{ use: 'useButton', factory: 'createButton' },
	],
)
