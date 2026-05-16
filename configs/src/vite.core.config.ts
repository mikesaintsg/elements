import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { srcCore } from '../../vite.config'

export default defineConfig(
	mergeConfig(srcCore(), {
		build: {
			lib: {
				entry: resolve(import.meta.dirname, '../../src/core/index.ts'),
				formats: ['es'],
				fileName: () => 'index.js',
			},
			outDir: 'dist/src/core',
		},
	}),
)
