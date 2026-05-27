import type { MotionTiming } from './types.js'

/**
 * Wait for `ms` milliseconds — the showcase analogue of the test-side
 * helper of the same name. Used by the statechart playgrounds to space
 * scenario steps with real wall-time so the user can perceive each
 * transition in the live browser (the unit tests use fake timers; the
 * playground can't).
 */
export function waitForDelay(ms = 0): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

/**
 * True when a mouse event carries a modifier key (Cmd / Ctrl / Shift /
 * Alt). The showcase rails use this to bow out of `preventDefault()` so
 * the browser's native modifier-click affordances (open-in-new-tab,
 * background-tab) keep working on sidebar + TOC links.
 *
 * @param event - the originating mouse event
 * @returns `true` if any modifier key was held
 * @example
 * if (hasModifierKey(event)) return // let the browser handle it
 */
export function hasModifierKey(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/**
 * Format a byte count as a human-readable size string. Binary divisor
 * (1024); B with no decimals, KB to one decimal, MB to two.
 *
 * @param bytes - the size in bytes
 * @returns a display string such as `512 B`, `1.5 KB`, `2.25 MB`
 * @example
 * formatSize(1536) // '1.5 KB'
 */
export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * Map a motion-timing preset key to its CSS `transition-timing-function`
 * value. Used by the Tokens page to preview easing curves.
 *
 * @param key - the timing preset
 * @returns the matching CSS timing-function string
 * @example
 * timingFunctionFor('iOS') // 'cubic-bezier(0.32, 0.72, 0, 1)'
 */
export function timingFunctionFor(key: MotionTiming): string {
	switch (key) {
		case 'iOS':
			return 'cubic-bezier(0.32, 0.72, 0, 1)'
		case 'ease':
			return 'cubic-bezier(0.25, 0.1, 0.25, 1)'
		case 'linear':
			return 'linear'
		case 'snappy':
			return 'cubic-bezier(0.4, 0, 0.2, 1)'
	}
}

/**
 * Windowed page-list for pagination chrome. Renders at most the first,
 * last, and a ±1 window around the active page; `null` slots mark
 * collapsed ellipsis gaps so the tile stride stays even.
 *
 * @param page - the active 1-based page number
 * @param count - the total page count
 * @returns the ordered list of page numbers with `null` ellipsis gaps
 * @example
 * pageList(5, 20) // [1, null, 4, 5, 6, null, 20]
 */
export function pageList(page: number, count: number): readonly (number | null)[] {
	if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
	const window = new Set<number>([1, count, page - 1, page, page + 1])
	const sorted = [...window].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b)
	const out: (number | null)[] = []
	for (let i = 0; i < sorted.length; i++) {
		const current = sorted[i]
		const previous = sorted[i - 1]
		if (i > 0 && current !== undefined && previous !== undefined && current - previous > 1) {
			out.push(null)
		}
		if (current !== undefined) out.push(current)
	}
	return out
}

/**
 * Upper-case the first character of a string, leaving the rest intact.
 *
 * @param value - the string to capitalize
 * @returns the input with its first character upper-cased
 * @example
 * capitalize('primary') // 'Primary'
 */
export function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Clamp a number into the inclusive `[min, max]` range. Replaces the
 * `Math.max(min, Math.min(max, v))` idiom the pointer demos repeat.
 *
 * @param value - the number to constrain
 * @param min - lower bound (inclusive)
 * @param max - upper bound (inclusive)
 * @returns `value` pinned to `[min, max]`
 * @example
 * clamp(1.4, 0, 1) // 1
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}
