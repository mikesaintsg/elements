import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { cpSync } from 'node:fs'
import { srcStyles, resolveWorkspacePath } from '../../vite.config'

// Copies SCSS source files to dist so consumers can @use individual partials.
function copyScss(): Plugin {
	return {
		name: 'copy-scss',
		closeBundle() {
			cpSync(resolveWorkspacePath('src/styles'), resolveWorkspacePath('dist/src/styles/scss'), {
				recursive: true,
				filter: (src) => !src.endsWith('.ts'),
			})
		},
	}
}

export default defineConfig(
	srcStyles({
		plugins: [copyScss()],
		build: {
			lib: {
				entry: resolveWorkspacePath('src/styles/index.ts'),
				formats: ['es'],
				fileName: () => 'index.js',
			},
			outDir: resolveWorkspacePath('dist/src/styles'),
			rolldownOptions: {
				output: {
					assetFileNames: (asset) =>
						asset.name?.endsWith('.css') ? 'index.css' : (asset.name ?? 'asset'),
				},
			},
		},
	}),
)
