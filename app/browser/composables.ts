// Vue-aware showcase composables. Pure (no-Vue) functions live in
// `helpers.ts`; static values in `constants.ts`. This module is the home
// for reactive patterns that recur across the demo pages. Showcase-
// internal only — the framework (`src/`) never imports from here.

import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'

/**
 * Bounded event log — the ring buffer the demo pages render under their
 * controls. Appends `entry` and keeps only the last `max` items.
 *
 * @param max - how many of the most recent entries to retain
 * @returns the reactive `entries` array + a `push` to append one
 * @example
 * const { entries: log, push: note } = useLog(6)
 * note('opened')
 */
export function useLog<T = string>(
	max: number,
): {
	readonly entries: Ref<readonly T[]>
	readonly push: (entry: T) => void
} {
	// `shallowRef` (not `ref`): every `push` reassigns the whole array, so
	// deep reactivity is unnecessary — and it keeps the generic element
	// type intact (`ref<T[]>` deep-unwraps `T` and breaks the signature).
	const entries: Ref<readonly T[]> = shallowRef<readonly T[]>([])
	const push = (entry: T): void => {
		entries.value = [...entries.value, entry].slice(-max)
	}
	return { entries, push }
}

/**
 * Live reader/writer for `:root` custom properties. Samples computed
 * styles on mount and re-samples whenever the theme flips (a
 * `MutationObserver` on the documentElement's `data-mode` (light/dark) /
 * `data-theme` (named core) / inline `style`). `read()` is reactive: call it inside a `computed` and it
 * re-runs on `refresh()`, `write()`, `clear()`, or a theme change.
 * Returns `'…'` until mounted / when a token is unset. `write()` pins an
 * inline `:root` override (the consumer-retune playgrounds); `clear()`
 * removes overrides so the framework defaults return.
 *
 * @returns `read` / `write` / `clear` + a manual `refresh()`
 */
export function useRootCssVars(): {
	readonly read: (token: string) => string
	readonly write: (token: string, value: string) => void
	readonly clear: (...tokens: readonly string[]) => void
	readonly refresh: () => void
} {
	const rootStyle = ref<CSSStyleDeclaration | null>(null)
	const seed = ref(0)
	const refresh = (): void => {
		seed.value += 1
	}
	let observer: MutationObserver | null = null
	onMounted(() => {
		if (typeof window === 'undefined') return
		rootStyle.value = getComputedStyle(document.documentElement)
		observer = new MutationObserver(refresh)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-mode', 'data-theme', 'style'],
		})
	})
	onUnmounted(() => {
		observer?.disconnect()
		observer = null
	})
	const read = (token: string): string => {
		void seed.value
		return rootStyle.value?.getPropertyValue(token).trim() || '…'
	}
	const write = (token: string, value: string): void => {
		document.documentElement.style.setProperty(token, value)
		refresh()
	}
	const clear = (...tokens: readonly string[]): void => {
		for (const token of tokens) document.documentElement.style.removeProperty(token)
		refresh()
	}
	return { read, write, clear, refresh }
}

/**
 * Dismissible-id set with add + reset-all — backs the "dismiss these
 * chips / cards, then restore them" demos. Reassigns the Set on every
 * change so Vue tracks it.
 *
 * @returns the reactive `ids` set + `dismiss(id)` + `restore()`
 */
export function useDismissed(): {
	readonly ids: Ref<ReadonlySet<string>>
	readonly dismiss: (id: string) => void
	readonly restore: () => void
} {
	const ids: Ref<ReadonlySet<string>> = shallowRef<ReadonlySet<string>>(new Set())
	const dismiss = (id: string): void => {
		ids.value = new Set([...ids.value, id])
	}
	const restore = (): void => {
		ids.value = new Set()
	}
	return { ids, dismiss, restore }
}
