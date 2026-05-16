// ============================================================================
//  UseAlertPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  Render smoke + the §9 composable API-name guard (shared mechanism in
//  _composable-api.ts; bespoke input = this page owns useAlert).
// ============================================================================

import { UseAlertPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseAlertPage', UseAlertPage, 'use-alert', 'useAlert', [
	{ use: 'useAlert', factory: 'createAlert' },
])
