// Public barrel for the showcase app. Pull everything from here when
// wiring tests so the import surface stays in one place.
//
// `export *` everywhere: `types.ts` is a value+type module (it ships the
// runtime `ROUTE_GROUPS` const that backs the `RouteGroup` type), so
// `export type *` would silently drop that value from the public surface
// — see tests/app/browser/index.test.ts.

export * from './types.js'
export * from './router.js'
export * from './helpers.js'
export * from './constants.js'
export * from './composables.js'

// Shell + every page, surfaced as a named component export
// (`{ default as App }` → `App`). The pages suite imports its component
// surface from here so the barrel stays the single public entry; the
// browser-env meta-driver also keys its page↔route↔test bijection off
// these names.
export { default as App } from './App.vue'
export { default as AnchorPage } from './pages/AnchorPage.vue'
export { default as ArticleCardPage } from './pages/ArticleCardPage.vue'
export { default as AsidePage } from './pages/AsidePage.vue'
export { default as ButtonPage } from './pages/ButtonPage.vue'
export { default as DetailsPage } from './pages/DetailsPage.vue'
export { default as DialogElementPage } from './pages/DialogElementPage.vue'
export { default as FiguresPage } from './pages/FiguresPage.vue'
export { default as FormControlsPage } from './pages/FormControlsPage.vue'
export { default as FormSurfacesPage } from './pages/FormSurfacesPage.vue'
export { default as HeadingsPage } from './pages/HeadingsPage.vue'
export { default as HomePage } from './pages/HomePage.vue'
export { default as InlineAtomsPage } from './pages/InlineAtomsPage.vue'
export { default as ListsPage } from './pages/ListsPage.vue'
export { default as MediaPage } from './pages/MediaPage.vue'
export { default as MenuPage } from './pages/MenuPage.vue'
export { default as ModifiersPage } from './pages/ModifiersPage.vue'
export { default as NavPage } from './pages/NavPage.vue'
export { default as PlacementsPage } from './pages/PlacementsPage.vue'
export { default as PopoverSurfacesPage } from './pages/PopoverSurfacesPage.vue'
export { default as ScrollAndTransitionPage } from './pages/ScrollAndTransitionPage.vue'
export { default as SectioningPage } from './pages/SectioningPage.vue'
export { default as TablesPage } from './pages/TablesPage.vue'
export { default as ThemePage } from './pages/ThemePage.vue'
export { default as TokensPage } from './pages/TokensPage.vue'
export { default as TypographyPage } from './pages/TypographyPage.vue'
export { default as UseAlertPage } from './pages/UseAlertPage.vue'
export { default as UseAsidePage } from './pages/UseAsidePage.vue'
export { default as UseCarouselPage } from './pages/UseCarouselPage.vue'
export { default as UseDetailsPage } from './pages/UseDetailsPage.vue'
export { default as UseDialogPage } from './pages/UseDialogPage.vue'
export { default as UseDragDropPage } from './pages/UseDragDropPage.vue'
export { default as UseFocusPage } from './pages/UseFocusPage.vue'
export { default as UseFormPage } from './pages/UseFormPage.vue'
export { default as UseMenuPage } from './pages/UseMenuPage.vue'
export { default as UseNavPage } from './pages/UseNavPage.vue'
export { default as UsePointerPage } from './pages/UsePointerPage.vue'
export { default as UsePopoverPage } from './pages/UsePopoverPage.vue'
export { default as UseSelectPage } from './pages/UseSelectPage.vue'
export { default as UseTablePage } from './pages/UseTablePage.vue'
export { default as UseTabsPage } from './pages/UseTabsPage.vue'
export { default as UseThemeButtonPage } from './pages/UseThemeButtonPage.vue'
export { default as UseToastPage } from './pages/UseToastPage.vue'
export { default as UseTooltipPage } from './pages/UseTooltipPage.vue'
