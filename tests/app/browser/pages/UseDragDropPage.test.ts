// ============================================================================
//  UseDragDropPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  A PAGE_SURFACE_BUNDLES bundled page: it owns BOTH useDrag (→
//  createDrag) and useDrop (→ createDrop). The §9 guard iterates both
//  targets. (Shared mechanism in _composable-api.ts.)
// ============================================================================

import { UseDragDropPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseDragDropPage', UseDragDropPage, 'use-drag-drop', 'useDrag / useDrop', [
	{ use: 'useDrag', factory: 'createDrag' },
	{ use: 'useDrop', factory: 'createDrop' },
])
