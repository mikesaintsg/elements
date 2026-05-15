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

// Conservative HTML minifier for the single-file output. No new
// dependencies — pure regex passes that protect inline `<script>` /
// `<style>` / `<pre>` / `<code>` / `<textarea>` content. Vite already
// minifies the inlined script + style via Rolldown's oxc-minify; this
// plugin trims the surrounding HTML wrapper (comments, whitespace
// between tags, leading / trailing whitespace per line).
//
// Order matters: this runs AFTER `vite-plugin-singlefile` inlines the
// script + style — otherwise the link/script tag swaps would
// re-introduce whitespace after we'd stripped it. `enforce: 'post'`
// plus `order: 'post'` keeps us at the tail of the transform pipeline.
const htmlMinifyPlugin = () => ({
	name: 'html-minify',
	enforce: 'post' as const,
	transformIndexHtml: {
		order: 'post' as const,
		handler(html: string) {
			// Carve out segments the minifier MUST leave alone. The
			// inlined script / style bodies are already minified by
			// Vite; <pre> / <code> / <textarea> contents must survive
			// verbatim for the showcase's source-sample blocks.
			const protectedBodies: string[] = []
			const protectRegex = /<(script|style|pre|code|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi
			const carved = html.replace(protectRegex, (match) => {
				const idx = protectedBodies.length
				protectedBodies.push(match)
				return `__PROTECTED_${idx}__`
			})

			let minified = carved
				// HTML comments — strip outside protected regions.
				.replace(/<!--[\s\S]*?-->/g, '')
				// Collapse whitespace between adjacent tags.
				.replace(/>\s+</g, '><')
				// Trim leading / trailing whitespace per line.
				.replace(/^\s+/gm, '')
				.replace(/\s+$/gm, '')
				// Collapse blank-line runs.
				.replace(/\n{2,}/g, '\n')
				.trim()

			// Restore protected segments verbatim.
			minified = minified.replace(
				/__PROTECTED_(\d+)__/g,
				(_, idx: string) => protectedBodies[Number(idx)] ?? '',
			)

			return minified
		},
	},
})

// Builds the app/browser showcase into a single self-contained HTML file.
// Output: dist/showcase/index.html — open directly in any browser, no server needed.
//
// Minification stack (no additional dependencies — all built-in to the
// installed vite + vite-plugin-singlefile versions):
//
//   - JS  → oxc-minify (Rolldown's default minifier, ships with Vite 8).
//   - CSS → Vite's built-in CSS minifier via `cssMinify: true`. Removes
//           whitespace, collapses adjacent selectors, normalizes
//           colors, drops vendor prefixes the targets don't need.
//   - HTML wrapper → custom regex pass (the htmlMinifyPlugin above)
//           that strips comments + collapses whitespace around tags.
//           `<script>` / `<style>` / `<pre>` / `<code>` /
//           `<textarea>` content is protected from the regex.
//
// `target: 'esnext'` skips legacy-syntax transpilation. The showcase
// is opened in a modern browser; older-engine fallbacks aren't needed
// and bump the bundle.
//
// `modulePreload: false` strips the `<link rel="modulepreload">`
// hints — a single inlined file doesn't need preloading.
//
// `reportCompressedSize: false` skips the gzip-size report at build
// time (saves a few hundred ms per build; the size is still visible
// via `wc -c` on the output).
export default defineConfig(
	appBrowser({
		plugins: [
			viteSingleFile({
				removeViteModuleLoader: true,
				// Apply the recommended single-file build config
				// (`assetsInlineLimit: Infinity`, `cssCodeSplit: false`,
				// `inlineDynamicImports: true`). Default is true; declared
				// explicitly so the contract is visible.
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
			minify: true,
			cssMinify: true,
			target: 'esnext',
			modulePreload: false,
			reportCompressedSize: false,
			// Inline all binary assets (images, fonts) as data URIs.
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			rolldownOptions: {
				output: {
					// Collapse all dynamic imports so everything lands in one JS chunk.
					codeSplitting: false,
					// Inline dynamic imports too — single file, no async chunks.
					inlineDynamicImports: true,
				},
			},
		},
	}),
)
