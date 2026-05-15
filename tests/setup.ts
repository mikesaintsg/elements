// ============================================================================
//  Base test setup — generic helpers shared across every Vitest project
//  (`srcCore`, `srcBrowser`, `srcStyles`, `appCore`, `appBrowser`).
//
//  Loaded directly by node-environment projects and re-exported by
//  `setupBrowser.ts` via `export * from './setup'` so browser-test files
//  can pull the same primitives from a single import surface.
// ============================================================================

import { afterEach, vi } from 'vitest'

interface TestRecorderInterface<TArgs extends readonly unknown[]> {
	readonly calls: readonly TArgs[]
	readonly count: number
	readonly handler: (...args: TArgs) => void
	clear(): void
}

export function extractProperty(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined
	return Reflect.get(value, key)
}

export function createRecorder<TArgs extends readonly unknown[]>(): TestRecorderInterface<TArgs> {
	const calls: TArgs[] = []
	return {
		get calls() {
			return calls
		},
		get count() {
			return calls.length
		},
		handler(...args: TArgs): void {
			calls.push(args)
		},
		clear(): void {
			calls.length = 0
		},
	}
}

export function waitForDelay(ms = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Recursively collect every string leaf in a nested object tree. Used by
 * TS↔SCSS parity tests to flatten the frozen `tokens.ts` / `modifiers.ts`
 * trees into the set of declared identifiers.
 */
export function leaves(node: unknown): readonly string[] {
	if (typeof node === 'string') return [node]
	if (typeof node !== 'object' || node === null) return []
	return Object.values(node).flatMap(leaves)
}

afterEach(() => {
	vi.restoreAllMocks()
})
