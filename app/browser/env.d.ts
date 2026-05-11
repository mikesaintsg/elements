/// <reference types="vite/client" />

// Injected by `configs/app/vite.showcase.config.ts` via `define`.
// ISO-8601 build timestamp — surfaces in the showcase footer so the user
// can confirm at a glance that the file in the browser is the fresh build.
declare const __BUILD_ID__: string

// `*.vue` module declaration for the IDE's TypeScript service.
// `vue-tsc` has its own `.vue` resolution and doesn't need this — the
// build's `npm run check` passes without it. But the IDE (WebStorm,
// VSCode without the Vue extension active, etc.) uses the plain TS
// language service, which doesn't know how to resolve a `.vue` import
// unless a module shim like this one is declared. Adding it here keeps
// the import experience consistent: same red squiggles → no red squiggles
// → no red squiggles wherever the IDE resolves modules.
declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<object, object, unknown>
	export default component
}
