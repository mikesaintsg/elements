// ============================================================================
//  UseSelectPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  Render smoke + the §9 composable API-name guard (shared mechanism in
//  _composable-api.ts; bespoke input = this page owns useSelect).
// ============================================================================

import { UseSelectPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseSelectPage', UseSelectPage, 'use-select', 'useSelect', [
	{ use: 'useSelect', factory: 'createSelect' },
])
