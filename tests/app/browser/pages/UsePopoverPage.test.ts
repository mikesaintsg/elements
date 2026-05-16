// ============================================================================
//  UsePopoverPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  Render smoke + the §9 composable API-name guard (shared mechanism in
//  _composable-api.ts; bespoke input = this page owns usePopover).
//  usePopover takes a single options object (no elementRef) — the
//  shared parser collects its top-level keys regardless of arg slot.
// ============================================================================

import { UsePopoverPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UsePopoverPage', UsePopoverPage, 'use-popover', 'usePopover', [
	{ use: 'usePopover', factory: 'createPopover' },
])
