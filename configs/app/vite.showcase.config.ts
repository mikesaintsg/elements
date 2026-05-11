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

// Builds the app/browser showcase into a single self-contained HTML file.
// Output: dist/showcase/index.html — open directly in any browser, no server needed.
export default defineConfig(
	appBrowser({
		plugins: [viteSingleFile({ removeViteModuleLoader: true }), buildStampPlugin()],
		define: {
			__BUILD_ID__: JSON.stringify(BUILD_ID),
		},
		build: {
			lib: false,
			outDir: resolveWorkspacePath('dist/showcase'),
			emptyOutDir: true,
			sourcemap: false,
			minify: true,
			// Inline all binary assets (images, fonts) as data URIs.
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			rolldownOptions: {
				output: {
					// Collapse all dynamic imports so everything lands in one JS chunk.
					codeSplitting: false,
				},
			},
		},
	}),
)
