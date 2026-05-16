// ============================================================================
//  UseToastPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//
//  The §9 composable API-name guard: render smoke + every option key /
//  on.* event key / return member the page's REAL `useToast` call-site
//  references must still exist in the src surface (createToast +
//  useToast + types.ts). Mechanism is shared (_composable-api.ts);
//  the bespoke input is "this page owns useToast / createToast".
// ============================================================================

import { UseToastPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseToastPage', UseToastPage, 'use-toast', 'useToast', [
	{ use: 'useToast', factory: 'createToast' },
])
