import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { appBrowser, resolveWorkspacePath } from '../../vite.config'

// Stamp every build with an ISO timestamp. The meta tag mutates the HTML's
// byte content on every rebuild so file:// caches revalidate, and the same
// string is exposed to the app via `__BUILD_ID__` for visible verification.
const BUILD_ID = new Date().toISOString()

const buildStampPlugin = () => ({
	name: 'build-stamp',
	transformIndexHtml(html: string) {
		return html.replace('<head>', `<head>\n\t\t<meta name="build-id" content="${BUILD_ID}" />`)
	},
})

// Vite 8 has no built-in HTML minifier — `build.minify` covers JS (via
// oxc-minify) and `build.cssMinify` covers CSS (via Lightning CSS), but
// the HTML wrapper passes through untouched. `HTMLOptions` exposes only
// `cspNonce`. This plugin is the zero-dependency closer.
//
// Ordering: this hook runs during Vite's `transformIndexHtml` pass —
// BEFORE `vite-plugin-singlefile`'s `generateBundle` step swaps
// `<script src=…>` / `<link href=…>` for inlined bodies. So we minify
// the bare wrapper first, and singlefile then injects the already-
// minified JS / CSS payloads into tight markup. `enforce: 'post'`
// plus `order: 'post'` keeps us at the tail of the HTML transform
// chain so any earlier hook (e.g. `buildStampPlugin`) lands first.
//
// `apply: 'build'` skips the pass during `npm run showcase` (dev
// server) — mangling HTML on every request just hurts DevTools.
const htmlMinifyPlugin = () => ({
	name: 'html-minify',
	enforce: 'post' as const,
	apply: 'build' as const,
	transformIndexHtml: {
		order: 'post' as const,
		handler(html: string) {
			// Carve out content-sensitive nodes. `<script>` / `<style>` may
			// hold inline bodies the source HTML authored (separate from
			// singlefile's later injection); `<pre>` / `<code>` /
			// `<textarea>` carry the showcase's source-sample blocks where
			// every space / newline is the lesson. The `[^>]*` attr-tail
			// is safe against Vite-built HTML — attribute values never
			// contain literal `>` (data URLs URL-encode it as `%3E`).
			const protectedBodies: string[] = []
			const protectRegex = /<(script|style|pre|code|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi
			const carved = html.replace(protectRegex, (match) => {
				const idx = protectedBodies.length
				protectedBodies.push(match)
				return `__PROTECTED_${idx}__`
			})

			const minified = carved
				// HTML comments — non-greedy so adjacent comments don't fuse.
				.replace(/<!--[\s\S]*?-->/g, '')
				// Whitespace strictly BETWEEN tags. Text-node interiors are
				// untouched (they lack the `>...<` shape).
				.replace(/>\s+</g, '><')
				// Per-line trim — content-sensitive nodes are already carved.
				.replace(/^\s+/gm, '')
				.replace(/\s+$/gm, '')
				// Collapse blank-line runs left after the comment strip.
				.replace(/\n{2,}/g, '\n')
				.trim()

			return minified.replace(
				/__PROTECTED_(\d+)__/g,
				(_, idx: string) => protectedBodies[Number(idx)] ?? '',
			)
		},
	},
})

// Builds the app/browser showcase into a single self-contained HTML file.
// Output: dist/showcase/index.html — open directly in any browser, no server needed.
//
// Minification stack (no additional dependencies — every layer ships with
// vite@8 or vite-plugin-singlefile):
//
//   - JS   → `build.minify: 'oxc'` — Rolldown's bundled oxc-minify. Does
//            compress + mangle + DCE in one pass. Preserves `@license` /
//            `@preserve` legal comments by default. Vite 8's default;
//            named explicitly so the contract is visible.
//   - CSS  → `build.cssMinify: 'lightningcss'` — Vite 8's default. Lightning
//            CSS is a direct `vite` dependency (no separate install).
//            Strips whitespace + comments, normalizes colors / `calc()` /
//            shorthand, and (re)applies vendor prefixes against the
//            `cssTarget` browserslist. With `target: 'esnext'` no prefixes
//            are added — single-file showcase opens in a modern browser.
//   - HTML → `htmlMinifyPlugin` above. Comment + whitespace pass with
//            `<script>` / `<style>` / `<pre>` / `<code>` / `<textarea>`
//            content carved out so the showcase's source-sample blocks
//            survive verbatim.
//
// Single-file shape — the singlefile plugin's `useRecommendedBuildConfig`
// hook (enforce: 'post') sets `assetsInlineLimit: () => true`,
// `cssCodeSplit: false`, `chunkSizeWarningLimit: 100000000`,
// `assetsDir: ''`, `base: './'`, AND `rolldownOptions.output.codeSplitting
// = false` for Vite 8+ (the Rolldown replacement for the deprecated
// Rollup-era `inlineDynamicImports: true`). Don't redeclare those here —
// setting `inlineDynamicImports: true` alongside `codeSplitting: false`
// trips a Rolldown deprecation warning at build time.
//
// `target: 'esnext'` skips legacy-syntax transpilation. The showcase is
// opened in a modern browser; older-engine fallbacks aren't needed and
// bump the bundle.
//
// `modulePreload: false` strips the `<link rel="modulepreload">` hints —
// a single inlined file doesn't need preloading.
//
// `reportCompressedSize: false` skips the gzip-size report at build time
// (saves a few hundred ms per build; the size is still visible via
// `wc -c` on the output).
export default defineConfig(
	appBrowser({
		plugins: [
			viteSingleFile({
				removeViteModuleLoader: true,
				// Apply the recommended single-file build contract — see the
				// header comment above for what this sets in Vite 8+.
				useRecommendedBuildConfig: true,
			}),
			buildStampPlugin(),
			htmlMinifyPlugin(),
		],
		define: {
			__BUILD_ID__: JSON.stringify(BUILD_ID),
		},
		build: {
			lib: false,
			outDir: resolveWorkspacePath('dist/showcase'),
			emptyOutDir: true,
			sourcemap: false,
			minify: 'oxc',
			cssMinify: 'lightningcss',
			target: 'esnext',
			modulePreload: false,
			reportCompressedSize: false,
		},
	}),
)
