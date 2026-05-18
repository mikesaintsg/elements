# Browser → Core Primitive Adoption — Divergence Ledger

Tracks every site in `src/browser` where an ad-hoc guard/coercion is replaced
by an `@elements/core` primitive, and any behavior divergence that adoption
surfaces. Companion to the plan
(`2026-05-17-browser-core-primitive-adoption.md`) and spec
(`2026-05-17-browser-core-primitive-adoption-design.md`).

## Boundary facts

- **Alias (Step 1):** `@elements/core` resolves for check/vitest/vite-build
  via the shared tsconfig-path alias. `tsconfig.json`
  `compilerOptions.paths` maps `"@elements/core" → ["./src/core/index.ts"]`;
  `vite.config.ts` (`resolve.alias`, ≈ lines 84-89) derives
  `resolve.alias` from `tsconfig.compilerOptions.paths`, and that single
  `resolve` is shared by `srcCore`/`srcBrowser` and the root
  `defineConfig`, so vue-tsc (`npm run check`), vitest, and `vite build`
  all resolve `@elements/core` identically with no per-config alias.

- **Build decision (Step 2):** `srcBrowser`'s `build` block had `lib` +
  `outDir` but no `rollupOptions`. Added a new `build.rollupOptions` (no
  pre-existing block to merge, no other externalization mechanism present)
  to `srcBrowser` in `vite.config.ts`:

  ```ts
  rollupOptions: {
  	external: (id: string) =>
  		id === '@elements/core' ||
  		id.startsWith('@elements/core/') ||
  		id === '@vue/reactivity' ||
  		id.startsWith('@vue/'),
  	output: {
  		paths: { '@elements/core': './core/index.js' },
  	},
  },
  ```

  Rationale: `@elements/browser` and `@elements/core` publish as two
  subpaths of one package; the browser lib build must IMPORT the sibling
  core build rather than INLINE a copy of `src/core`, so a consumer
  importing both subpaths does not get core duplicated.

- **Emitted external-import line (Step 4):** the first line of the built
  `dist/src/browser/index.js` is exactly:

  ```js
  import { isFunction } from "./core/index.js";
  ```

  No `function isFunction` body is inlined anywhere in the browser bundle
  (verified by grep) — core is externalized to the sibling build, not
  duplicated.

## Divergences

| Site | Old behavior | Core behavior | Resolution | Test(s) updated |
| --- | --- | --- | --- | --- |
