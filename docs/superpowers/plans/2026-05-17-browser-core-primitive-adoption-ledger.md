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
  	external: (id: string) => id === '@elements/core',
  	output: {
  		paths: { '@elements/core': '../core/index.js' },
  	},
  },
  ```

  Rationale: `@elements/browser` and `@elements/core` publish as two
  subpaths of one package; externalize ONLY `@elements/core` so the
  browser lib imports the sibling core build rather than inlining a copy
  of `src/core`. Vue stays inlined exactly as in the parent build — Vite
  lib mode inlines deps by default and the `external` function overrides
  that selectively, so the predicate is deliberately minimal. The
  `@elements/core/` sub-path and `@vue/` clauses that appeared in B1 are
  removed: core has no `@elements/core/*` subpaths, and externalizing vue
  caused bare `@vue/runtime-dom` imports that consumers cannot resolve
  (`@vue/runtime-dom` is not a declared dependency).

- **Emitted external-import line (Step 4):** the first line of the built
  `dist/src/browser/index.js` is exactly:

  ```js
  import { isFunction } from "../core/index.js";
  ```

  No `function isFunction` body is inlined anywhere in the browser bundle
  (verified by grep) — core is externalized to the sibling build, not
  duplicated. Vue is fully inlined (zero bare `from "@vue/` imports in the
  bundle; bundle size ~445 KB, matching the parent build).

- **Real-resolution smoke test (required boundary check for future batches):**
  The `tsconfig` alias masks bundle resolution at `npm run check` / vitest
  time. After every build that touches `rollupOptions`, verify the emitted
  bundle actually resolves by running:

  ```sh
  node --input-type=module -e "import('./dist/src/browser/index.js').then(()=>console.log('RESOLVED OK')).catch(e=>{console.error('IMPORT FAILED:',e.code,e.message);process.exit(1)})"
  ```

  Expected output: `RESOLVED OK`. A failing `ERR_MODULE_NOT_FOUND` means
  the `paths` mapping is wrong; do not declare the build done until this
  passes.

## Divergences

| Site | Old behavior | Core behavior | Resolution | Test(s) updated |
| --- | --- | --- | --- | --- |
