import { defineConfig } from 'vite'
import { srcBrowser } from '../../vite.config'

// The PUBLISHED `@elements/browser` library build. `@elements/browser` and
// `@elements/core` ship as two subpaths of one package, so the browser lib
// must import the SIBLING `dist/src/core` build rather than inline a copy of
// `src/core`. Vue stays inlined exactly as in the shared base — the
// predicate is deliberately minimal.
//
// This externalization is a LIBRARY-publish concern ONLY. It is intentionally
// NOT in the shared `srcBrowser` base (vite.config.ts): the app/showcase
// build (`appBrowser`) extends that same base and an APPLICATION must BUNDLE
// its dependencies — otherwise the single-file showcase emits an un-inlined
// `../core/index.js` import that a `file://` open (the showcase's whole
// point) blocks under CORS (origin `null`), rendering a blank screen.
export default defineConfig(
	srcBrowser({
		build: {
			rollupOptions: {
				external: (id: string) => id === '@elements/core',
				output: {
					paths: { '@elements/core': '../core/index.js' },
				},
			},
		},
	}),
)
