// ============================================================================
//  §9 composable API-name guard — shared parser + per-page runner.
//
//  THE strategic anti-rot invariant (plans/phase-2.md §2B-6): a
//  Use*Page must wire its composable through its REAL `<script setup>`
//  call-site, and every option key / `on.*` event key / return member
//  that call-site references must still exist in the composable's src
//  surface (`factories/create{Name}.ts` + `composables/use{Name}.ts` +
//  `types.ts`). Rename an option in src and the page that still passes
//  the old name fails a specific, named test — the Phase-1 1D-a class
//  of staleness ("a lot of the content is out of date") can never
//  silently recur.
//
//  Discipline (plans/phase-2.md §Phase-1 carry-over, point 3): scan
//  ONLY the real `<script setup>` code — comments + string / template
//  literals stripped, `<template>` (the API-reference <dl> prose + the
//  <pre> markup snippets + `:bind` expressions) excluded. Call-sites
//  are in `<script setup>`; code-in-`<pre>` must never be mis-scanned.
//
//  Browser project idiom: raw src via `import.meta.glob('…',{?raw})`,
//  page component via the barrel — no node fs, mirrors parity.test.ts.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import type { Component } from 'vue'

const baseName = (p: string): string => p.match(/([^/\\]+)\.[a-z]+$/)?.[1] ?? ''

// NOTE: this helper lives in tests/app/browser/pages/ — ONE directory
// deeper than parity.test.ts, so raw globs are `../../../../` (four up
// to the repo root), matching the `../../../../app/browser/index.js`
// barrel import every per-page test uses.

const factorySrc: Record<string, string> = {}
for (const [path, src] of Object.entries(
	import.meta.glob('../../../../src/browser/factories/*.ts', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>,
))
	factorySrc[baseName(path)] = src

const composableSrc: Record<string, string> = {}
for (const [path, src] of Object.entries(
	import.meta.glob('../../../../src/browser/composables/*.ts', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>,
))
	composableSrc[baseName(path)] = src

const typesSrc =
	Object.values(
		import.meta.glob('../../../../src/browser/types.ts', {
			query: '?raw',
			import: 'default',
			eager: true,
		}) as Record<string, string>,
	)[0] ?? ''

const pageSrc: Record<string, string> = {}
for (const [path, src] of Object.entries(
	import.meta.glob('../../../../app/browser/pages/*.vue', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>,
))
	pageSrc[baseName(path)] = src

/**
 * The real `<script setup>` code with JSDoc / line comments and string /
 * template literals blanked out, and `<template>` excluded. What's left
 * is executable code only — so an identifier mentioned in the header
 * JSDoc or a string can't masquerade as a call-site API name.
 */
/** The raw `<script setup>` body, NO stripping (string literals — incl.
 *  the `'@elements/browser'` import path — must survive for the
 *  import-wiring check). */
export function rawScriptSetup(vueSrc: string): string {
	return vueSrc.match(/<script\b[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
}

export function scriptSetupCode(vueSrc: string): string {
	const block = vueSrc.match(/<script\b[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)
	let code = block?.[1] ?? ''
	code = code.replace(/\/\*[\s\S]*?\*\//g, ' ') // block + JSDoc comments
	code = code.replace(/\/\/[^\n]*/g, ' ') // line comments
	code = code.replace(/`(?:[^`\\]|\\.)*`/g, '``') // template literals
	code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''") // single-quoted
	code = code.replace(/"(?:[^"\\]|\\.)*"/g, '""') // double-quoted
	return code
}

/** Index of the `)` that closes the `(` at `open`. */
function matchParen(code: string, open: number): number {
	let depth = 0
	for (let i = open; i < code.length; i += 1) {
		const c = code[i]
		if (c === '(') depth += 1
		else if (c === ')') {
			depth -= 1
			if (depth === 0) return i
		}
	}
	return -1
}

/** Index of the `}` that closes the `{` at `open`. */
function matchBrace(code: string, open: number): number {
	let depth = 0
	for (let i = open; i < code.length; i += 1) {
		const c = code[i]
		if (c === '{') depth += 1
		else if (c === '}') {
			depth -= 1
			if (depth === 0) return i
		}
	}
	return -1
}

// Object-literal value tokens that are never API keys (a loose scan
// would otherwise read `false` out of `autohide: false`).
const NON_KEY = new Set(['true', 'false', 'null', 'undefined'])

/**
 * Depth-0 object-literal keys via a key/value state machine: after `{`
 * or a depth-0 `,` we expect a KEY; an identifier followed by `:` is a
 * key whose value is then skipped to the next depth-0 `,`; an
 * identifier followed by `,`/`}` is a shorthand key. Values (incl.
 * `false`) are never collected.
 */
function objectKeys(objBody: string): string[] {
	const keys: string[] = []
	let depth = 0
	let expectKey = true
	for (let i = 0; i < objBody.length; i += 1) {
		const c = objBody[i] as string
		if (c === '{' || c === '(' || c === '[') {
			depth += 1
			continue
		}
		if (c === '}' || c === ')' || c === ']') {
			depth -= 1
			continue
		}
		if (depth !== 0) continue
		if (c === ',') {
			expectKey = true
			continue
		}
		if (!expectKey) continue
		const m = objBody.slice(i).match(/^([A-Za-z_$]\w*)\s*([:,}]|$)/)
		if (m) {
			if (!NON_KEY.has(m[1] as string)) keys.push(m[1] as string)
			expectKey = false // consumed this entry's key; value follows
			i += (m[1] as string).length - 1
		} else if (!/\s/.test(c)) {
			// A computed key / spread / string key — skip to its value.
			expectKey = false
		}
	}
	return [...new Set(keys)]
}

/**
 * API identifiers the page's REAL `use{name}` call-sites reference:
 * options-object top-level keys, nested `on.*` event keys, the return
 * destructure names, and members accessed on the return binding.
 */
export function callSiteApiNames(code: string, useName: string): string[] {
	const names = new Set<string>()
	const callRe = new RegExp(`\\b${useName}\\s*(?:<[^>]*>)?\\s*\\(`, 'g')
	for (let m = callRe.exec(code); m !== null; m = callRe.exec(code)) {
		const open = code.indexOf('(', m.index + m[0].length - 1)
		const close = matchParen(code, open)
		if (close === -1) continue
		const args = code.slice(open + 1, close)

		// Options object(s) inside the args: every balanced {…} at args
		// top level. (usePopover's only arg IS the options object;
		// useToast's is the 2nd arg — both are top-level {…} here.)
		let depth = 0
		for (let i = 0; i < args.length; i += 1) {
			const c = args[i]
			if (c === '(' || c === '[') depth += 1
			else if (c === ')' || c === ']') depth -= 1
			else if (c === '{' && depth === 0) {
				const end = matchBrace(args, i)
				if (end === -1) break
				const body = args.slice(i + 1, end)
				for (const k of objectKeys(body)) names.add(k)
				// Recurse one level into `on: { … }` for event keys.
				const onM = body.match(/\bon\s*:\s*\{/)
				if (onM) {
					const onOpen = body.indexOf('{', (onM.index ?? 0) + onM[0].length - 1)
					const onEnd = matchBrace(body, onOpen)
					if (onEnd !== -1)
						for (const k of objectKeys(body.slice(onOpen + 1, onEnd))) names.add(k)
				}
				i = end
			}
		}

		// Return binding: `const { a, b } = use…(` or `const X = use…(`.
		const before = code.slice(Math.max(0, m.index - 200), m.index)
		const destructure = before.match(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*$/)
		if (destructure) {
			for (const raw of (destructure[1] as string).split(',')) {
				const id = raw.split(':').pop()?.trim().match(/^[A-Za-z_]\w*/)?.[0]
				if (id) names.add(id)
			}
		} else {
			const assign = before.match(/(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*$/)
			if (assign) {
				const binding = assign[1] as string
				const memberRe = new RegExp(`\\b${binding}\\s*\\.\\s*([A-Za-z_]\\w*)`, 'g')
				for (let mm = memberRe.exec(code); mm !== null; mm = memberRe.exec(code))
					names.add(mm[1] as string)
			}
		}
	}
	names.delete('value') // Vue ref unwrap — never a composable API name.
	return [...names].sort()
}

/** Authoritative src surface for a composable: factory + composable + types. */
export function srcApiCorpus(factoryName: string): string {
	const stem = factoryName.replace(/^create/, '')
	return [
		factorySrc[factoryName] ?? '',
		composableSrc[`use${stem}`] ?? '',
		typesSrc,
	].join('\n')
}

interface ComposableTarget {
	/** The `use{Name}` the page imports + calls. */
	readonly use: string
	/** The matching `create{Name}` factory file basename. */
	readonly factory: string
}

/**
 * Per-page §9 runner. Bespoke inputs (the page + which composable(s) it
 * owns); the parser + cross-check mechanism is shared so it is authored
 * ONCE, never copy-pasted ×18 (the guide-suite discipline).
 */
export function runComposableApiParity(
	pageName: string,
	PageComponent: Component,
	introId: string,
	h1: string,
	targets: readonly ComposableTarget[],
): void {
	const vue = pageSrc[pageName] ?? ''
	const raw = rawScriptSetup(vue)
	const code = scriptSetupCode(vue)

	describe(`${pageName} — render smoke`, () => {
		it(`mounts + renders the "${introId}" intro section`, () => {
			const host = document.createElement('div')
			document.body.appendChild(host)
			const app = createApp(PageComponent)
			try {
				app.mount(host)
				const intro = host.querySelector(`section#${introId}-intro`)
				expect(intro).not.toBeNull()
				expect(intro?.querySelector('h1')?.textContent?.trim()).toBe(h1)
			} finally {
				app.unmount()
				host.remove()
			}
		})
	})

	describe(`${pageName} — §9 composable API-name guard`, () => {
		for (const { use, factory } of targets) {
			it(`imports + calls ${use} from the barrel (real wiring, not prose)`, () => {
				// Import check on RAW script (the '@elements/browser' path
				// string is blanked by scriptSetupCode's literal-strip).
				const importRe = new RegExp(
					`import[^]*?\\{[^}]*\\b${use}\\b[^}]*\\}[^]*?from\\s*['"]@elements/browser['"]`,
				)
				expect(importRe.test(raw)).toBe(true)
				// Call check on STRIPPED code (so a `use…(` mention inside
				// a JSDoc / <pre> snippet can't satisfy it).
				expect(new RegExp(`\\b${use}\\s*(?:<[^>]*>)?\\s*\\(`).test(code)).toBe(true)
			})

			const names = callSiteApiNames(code, use)
			const corpus = srcApiCorpus(factory)

			it(`${use} call-site exposes ≥1 API name (vacuous-pass guard)`, () => {
				expect(names.length).toBeGreaterThan(0)
			})

			for (const name of names) {
				// On failure: `Use…Page.vue` passes `${name}` to `${use}`
				// (or reads it off the return) but no token `${name}`
				// exists in `create${factory.replace(/^create/, '')}` /
				// `use…` / `types.ts` — the composable's src API drifted
				// from what the page demonstrates. Re-sync the page (or
				// the src) so the showcase stops lying.
				it(`${use} call-site name "${name}" resolves to src`, () => {
					expect(new RegExp(`\\b${name}\\b`).test(corpus)).toBe(true)
				})
			}
		}
	})
}
