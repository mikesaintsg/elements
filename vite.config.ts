import type { UserConfig } from 'vite'
import { defineConfig, mergeConfig } from 'vitest/config'
import tsconfig from './tsconfig.json' with { type: 'json' }
import { fileURLToPath, URL } from 'node:url'
import { existsSync, readdirSync } from 'node:fs'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/postcss'

export function resolveWorkspacePath(relativePath: string): string {
	return fileURLToPath(new URL(relativePath, import.meta.url))
}

// Provider precedence:
//   1. PLAYWRIGHT_EXECUTABLE_PATH — explicit binary (CI / local dev with a
//      pinned browser).
//   2. PLAYWRIGHT_WS_ENDPOINT     — CDP / WebSocket connection to an already-
//      running browser instance (remote debugging, browser-tools MCP, etc.).
//   3. PLAYWRIGHT_CHANNEL         — explicit channel (`chrome`, `msedge`,
//      `chromium`, etc.) for local dev loops.
//   4. Claude Code / Claude Cloud — auto-detect the bundled Playwright
//      chromium under `/opt/pw-browsers/`. The remote-execution environment
//      ships chromium under a revisioned directory whose revision number AND
//      inner layout BOTH drift across Playwright versions
//      (`chromium-{rev}/chrome-linux64/chrome` on some builds,
//      `chromium-{rev}/chrome-linux/chrome` on others), plus a top-level
//      `/opt/pw-browsers/chromium` symlink that points straight at whichever
//      binary the environment installed. The probe checks the symlink first,
//      then globs every `chromium-*` revision dir against every known inner
//      layout, so neither a revision bump nor a layout change can strand the
//      auto-detect.
//   5. Platform default — pre-installed system browser by OS:
//        Windows  → `msedge`   ships with the OS and never collides with a
//                              foreground Chrome instance. System Chrome
//                              invoked from Node with
//                              `--remote-debugging-pipe` plus a fresh
//                              `--user-data-dir` can be refused with
//                              `spawn UNKNOWN` on machines where Chrome
//                              is also running interactively (Defender /
//                              SmartScreen / profile lock interaction);
//                              Edge has no equivalent constraint.
//        macOS / Linux → `chrome` — system Chrome is the conventional
//                                   dev browser on those platforms.
//      Override via PLAYWRIGHT_CHANNEL when the platform default isn't
//      installed (e.g., `PLAYWRIGHT_CHANNEL=chromium` after
//      `npx playwright install chromium`).

/**
 * Find a Playwright-bundled chromium installed under the Claude Code /
 * Claude Cloud remote-execution path `/opt/pw-browsers/`. Both the revision
 * directory name (`chromium-{rev}`) AND its inner layout drift across
 * Playwright builds — the binary has shipped as both
 * `chrome-linux64/chrome` and `chrome-linux/chrome` — and the environment
 * also maintains a top-level `chromium` symlink that resolves straight to
 * whichever binary it installed. The probe is therefore deliberately broad:
 * the symlink first (the environment's own canonical pointer, layout-proof),
 * then every `chromium-*` revision dir crossed with every known inner
 * layout. Returns the absolute binary path if found, `undefined` otherwise.
 */
function findClaudeCodeChromium(): string | undefined {
	if (process.platform !== 'linux') return undefined
	const root = '/opt/pw-browsers'
	if (!existsSync(root)) return undefined
	// The environment-maintained `chromium` symlink points straight at the
	// installed binary regardless of revision / inner-layout drift.
	const linked = `${root}/chromium`
	if (existsSync(linked)) return linked
	let entries: string[]
	try {
		entries = readdirSync(root)
	} catch {
		return undefined
	}
	// `chrome-linux64/chrome` (newer builds) and `chrome-linux/chrome`
	// (older / current Cloud builds) are both probed so a layout change
	// can't strand the auto-detect.
	const layouts = ['chrome-linux64/chrome', 'chrome-linux/chrome']
	for (const entry of entries.sort().reverse()) {
		if (!entry.startsWith('chromium-')) continue
		for (const layout of layouts) {
			const candidate = `${root}/${entry}/${layout}`
			if (existsSync(candidate)) return candidate
		}
	}
	return undefined
}

export function createBrowserProvider() {
	const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
	if (executablePath) return playwright({ launchOptions: { executablePath } })
	const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT
	if (wsEndpoint) return playwright({ connectOptions: { wsEndpoint } })
	const channel = process.env.PLAYWRIGHT_CHANNEL
	if (channel) return playwright({ launchOptions: { channel } })
	const claudeCodeChromium = findClaudeCodeChromium()
	if (claudeCodeChromium)
		return playwright({ launchOptions: { executablePath: claudeCodeChromium } })
	const defaultChannel = process.platform === 'win32' ? 'msedge' : 'chrome'
	return playwright({ launchOptions: { channel: defaultChannel } })
}

const resolve = {
	alias: Object.entries(tsconfig.compilerOptions.paths).reduce(
		(a, [k, v]) => Object.assign(a, { [k]: resolveWorkspacePath(v[0]) }),
		{},
	),
}

// Base: shared resolve + build defaults + src:core tests.
export const srcCore = (config?: UserConfig): UserConfig =>
	mergeConfig(
		{
			resolve,
			build: {
				emptyOutDir: true,
				sourcemap: true,
				minify: false,
			},
			test: {
				name: { label: 'src:core', color: 'magenta' },
				include: ['tests/src/core/**/*.test.ts'],
				setupFiles: ['./tests/setup.ts'],
				environment: 'node',
				browser: { enabled: false },
			},
		},
		config ?? {},
	)

// Standalone: guides ↔ code parity, node environment.
//
// Tests under `tests/guides/` assert that the documentation in
// `guides/*.md` stays in lock-step with the framework's shipped TS surface
// (`src/browser/`) and SCSS surface (`src/styles/`). One test file per
// guide (`tests/guides/{guide}.test.ts`) plus cross-guide meta-tests
// (`tests/guides/references.test.ts`). The folder sits at
// `tests/guides/` rather than `tests/src/guides/` because guides are a
// top-level repo concern, not source mirrored under `src/`.
//
// Pure node — no DOM, no Vue, no chromium. Fast and deterministic. The
// shared markdown helpers live in `tests/setup.ts`; the node:fs-backed SCSS
// + factory loaders live in `tests/setupServer.ts` (the node-env equivalent
// of `setupBrowser.ts` / `setupStyles.ts`).
export const guides = (config?: UserConfig): UserConfig =>
	mergeConfig(
		{
			resolve,
			test: {
				name: { label: 'guides', color: 'green' },
				include: ['tests/guides/**/*.test.ts'],
				setupFiles: ['./tests/setup.ts', './tests/setupServer.ts'],
				environment: 'node',
				browser: { enabled: false },
			},
		},
		config ?? {},
	)

// PostCSS pipeline. Tailwind is kept available so showcase pages and
// downstream consumers can lean on its utility classes for one-off
// tweaks — but the framework + the chrome SCSS deliberately don't depend
// on it. Authors can drop Tailwind from their own builds without
// breaking any framework-shipped surface.
const postcss = { plugins: [tailwindcss()] }

// Extends srcCore: adds Vue + ES lib build + browser tests.
export const srcBrowser = (config?: UserConfig): UserConfig =>
	srcCore(
		mergeConfig(
			{
				plugins: [
					vue({
						// `<search>` is a Baseline-2023 HTML landmark element that
						// Vue's compiler doesn't yet have in its native-tag list.
						// Tell it explicitly so `<search>` renders as a real DOM
						// element and not as an unresolved component.
						template: { compilerOptions: { isCustomElement: (tag) => tag === 'search' } },
					}),
				],
				// Pre-bundle Vue + reactivity so the first browser-test run
				// doesn't trigger a mid-suite Vite reload (fixes the
				// "unexpectedly reloaded a test" flake when composables first
				// pull in vue / @vue/reactivity).
				optimizeDeps: { include: ['vue', '@vue/reactivity'] },
				css: { postcss },
				build: {
					lib: {
						entry: resolveWorkspacePath('src/browser/index.ts'),
						formats: ['es'],
						fileName: () => 'index.js',
					},
					outDir: 'dist/src/browser',
					// `@elements/browser` and `@elements/core` publish as two
					// subpaths of one package. Externalize ONLY `@elements/core`
					// so the browser lib imports the sibling core build rather
					// than inlining a copy of `src/core`. Vue stays inlined
					// exactly as in the parent build — the predicate is
					// deliberately minimal.
					rollupOptions: {
						external: (id: string) => id === '@elements/core',
						output: {
							paths: { '@elements/core': '../core/index.js' },
						},
					},
				},
				test: {
					name: { label: 'src:browser', color: 'yellow' },
					include: ['tests/src/browser/**/*.test.ts'],
					exclude: ['tests/src/core/**/*.test.ts'],
					setupFiles: ['./tests/setup.ts', './tests/setupBrowser.ts'],
					browser: {
						enabled: true,
						provider: createBrowserProvider(),
						instances: [{ browser: 'chromium', headless: true }],
					},
					fileParallelism: false,
				},
			},
			config ?? {},
		),
	)

// Standalone: SCSS to CSS lib build + real-browser style assertion tests.
//
// Style tests render Bootstrap-class elements into a real Chromium document,
// let Vite compile `src/styles/index.scss` through the Sass pipeline, and
// assert against `getComputedStyle(...)`. The setup file owns the single
// `import '../src/styles/index.scss'` side-effect that wires the cascade.
export const srcStyles = (config?: UserConfig): UserConfig =>
	mergeConfig(
		{
			resolve,
			css: { postcss },
			build: {
				emptyOutDir: true,
				sourcemap: false,
				minify: false,
				cssCodeSplit: false,
			},
			test: {
				name: { label: 'src:styles', color: 'gray' },
				include: ['tests/src/styles/**/*.test.ts'],
				setupFiles: ['./tests/setup.ts', './tests/setupStyles.ts'],
				browser: {
					enabled: true,
					provider: createBrowserProvider(),
					instances: [{ browser: 'chromium', headless: true }],
				},
				fileParallelism: false,
			},
		},
		config ?? {},
	)

// Standalone: app:core tests only, no build config.
export const appCore = (config?: UserConfig): UserConfig =>
	mergeConfig(
		{
			resolve,
			test: {
				name: { label: 'app:core', color: 'cyan' },
				include: ['tests/app/core/**/*.test.ts'],
				setupFiles: ['./tests/setup.ts'],
				environment: 'node',
				browser: { enabled: false },
			},
		},
		config ?? {},
	)

// Extends srcBrowser: switches to the app browser root/build/tests.
export const appBrowser = (config?: UserConfig): UserConfig =>
	srcBrowser(
		mergeConfig(
			{
				root: resolveWorkspacePath('app/browser'),
				build: {
					lib: false,
					outDir: resolveWorkspacePath('dist/app/browser'),
				},
				test: {
					name: { label: 'app:browser', color: 'blue' },
					root: resolveWorkspacePath('.'),
					dir: resolveWorkspacePath('.'),
					include: ['tests/app/browser/**/*.test.ts'],
					exclude: ['tests/src/browser/**/*.test.ts', 'tests/src/core/**/*.test.ts'],
					setupFiles: ['./tests/setup.ts', './tests/setupBrowser.ts'],
				},
			},
			config ?? {},
		),
	)

export default defineConfig({
	resolve,
	test: {
		projects: [srcCore, srcBrowser, srcStyles, guides, appCore, appBrowser],
	},
})
