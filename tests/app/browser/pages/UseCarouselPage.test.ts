// ============================================================================
//  UseCarouselPage — per-page BESPOKE parity (Phase-2 §9, Composables).
//  Render smoke + the §9 composable API-name guard (shared mechanism in
//  _composable-api.ts; bespoke input = this page owns useCarousel).
// ============================================================================

import { UseCarouselPage } from '../../../../app/browser/index.js'
import { runComposableApiParity } from './_composable-api'

runComposableApiParity('UseCarouselPage', UseCarouselPage, 'use-carousel', 'useCarousel', [
	{ use: 'useCarousel', factory: 'createCarousel' },
])
