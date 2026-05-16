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
