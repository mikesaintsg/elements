// ============================================================================
//  Server-test setup — node-only loaders for the guides Vitest project.
//
//  The framework itself doesn't ship server-side logic (it's a browser +
//  styles framework), so there's no `srcServer` test project. We piggyback
//  on the node environment to test the GUIDES surface: every `guides/*.md`
//  doc against the TS + SCSS sources it documents.
//
//  Setup-file stack (configured per project in `vite.config.ts`):
//
//      setupFiles: ['./tests/setup.ts', './tests/setupServer.ts']
//
//  `setup.ts` is loaded first and is environment-agnostic; it registers the
//  `vi.restoreAllMocks` afterEach hook and ships the parsing helpers. This
//  file ships second and adds the node:fs-backed loaders the guides tests
//  use to read raw `*.scss` / `create*.ts` sources.
//
//  Why these can't live in `tests/setup.ts`: `setup.ts` is loaded by every
//  project including the browser-env ones. Pulling `node:fs` / `node:path`
//  into a browser bundle crashes the test run before vitest reaches a
//  single `it(...)`. So `node:*` imports live here, behind the per-project
//  opt-in.
//
//  Why we don't use `import.meta.glob('*.scss', { query: '?raw' })`: in
//  node env Vite's SCSS plugin intercepts before `?raw` can return the
//  source — every entry comes back as an empty string. Synchronous
//  `readFileSync` is the only reliable read in that environment.
// ============================================================================

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STYLE_LAYERS } from '@elements/browser'

const WORKSPACE_ROOT = fileURLToPath(new URL('../', import.meta.url))

/**
 * Synchronously read every `_*.scss` partial from one or more
 * workspace-relative directories. Returns `{absolutePath: rawSource}` —
 * same shape `import.meta.glob` produces, but populated correctly in
 * node env.
 *
 * @example
 *   readScssPartials('src/styles/elements')
 *   readScssPartials('src/styles/components', 'src/styles/surfaces')
 */
export function readScssPartials(...dirs: readonly string[]): Record<string, string> {
	const out: Record<string, string> = {}
	for (const dir of dirs) {
		const absDir = resolve(WORKSPACE_ROOT, dir)
		for (const file of readdirSync(absDir)) {
			if (!file.startsWith('_') || !file.endsWith('.scss')) continue
			const absPath = resolve(absDir, file)
			out[absPath] = readFileSync(absPath, 'utf8')
		}
	}
	return out
}

/**
 * Shorthand for `readScssPartials` across every folder under `src/styles/`.
 * The folder set is derived from `STYLE_LAYERS` (the authoritative list
 * exported from `@elements/browser`), so adding a new style layer there
 * automatically flows through every test that scans the whole cascade.
 */
export function readAllStyleSources(): Record<string, string> {
	return readScssPartials(...STYLE_LAYERS.map((layer) => `src/styles/${layer}`))
}

/**
 * Same as `readScssPartials` but reads `create*.ts` factory sources from a
 * single workspace-relative directory. Used by the JS↔CSS attribute parity
 * test that scans factories for `setAttribute('data-X-*', …)`.
 */
export function readFactorySources(dir = 'src/browser/factories'): Record<string, string> {
	const out: Record<string, string> = {}
	const absDir = resolve(WORKSPACE_ROOT, dir)
	for (const file of readdirSync(absDir)) {
		if (!file.startsWith('create') || !file.endsWith('.ts')) continue
		const absPath = resolve(absDir, file)
		out[absPath] = readFileSync(absPath, 'utf8')
	}
	return out
}
