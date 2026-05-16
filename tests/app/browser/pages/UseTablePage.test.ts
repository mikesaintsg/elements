// ============================================================================
//  UseTablePage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  Render smoke + the §9 composable API-name guard (shared mechanism in
//  _composable-api.ts; bespoke input = this page owns useTable).
// ============================================================================

import { UseTablePage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseTablePage', UseTablePage, 'use-table', 'useTable', [
	{ use: 'useTable', factory: 'createTable' },
])
