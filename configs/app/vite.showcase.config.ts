import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { appBrowser, resolveWorkspacePath } from '../../vite.config'

// Builds the app/browser showcase into a single self-contained HTML file.
// Output: dist/showcase/index.html — open directly in any browser, no server needed.
export default defineConfig(
	appBrowser({
		plugins: [viteSingleFile({ removeViteModuleLoader: true })],
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
