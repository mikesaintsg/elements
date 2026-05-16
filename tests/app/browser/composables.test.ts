// ============================================================================
//  app/browser/composables.ts — reactive behavior.
//
//  `useLog` / `useDismissed` are lifecycle-free (just `shallowRef` +
//  closures) so they run standalone. `useRootCssVars` registers
//  `onMounted` / `onUnmounted` (getComputedStyle + MutationObserver), so
//  it runs inside a real component via `mountSetup`.
// ============================================================================

import type { ComputedRef } from 'vue'
import { computed, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { useDismissed, useLog, useRootCssVars } from '../../../app/browser/composables.js'
import { mountSetup, waitForBootstrap } from '../../setupBrowser'

describe('useLog', () => {
	it('starts empty', () => {
		const { entries } = useLog(3)
		expect(entries.value).toEqual([])
	})

	it('appends in order and caps at `max` (oldest dropped)', () => {
		const { entries, push } = useLog<number>(3)
		push(1)
		push(2)
		push(3)
		expect(entries.value).toEqual([1, 2, 3])
		push(4)
		push(5)
		expect(entries.value).toEqual([3, 4, 5])
	})

	it('reassigns the array each push so a shallowRef consumer re-renders', () => {
		const { entries, push } = useLog(2)
		const first = entries.value
		push('a')
		expect(entries.value).not.toBe(first)
	})

	it('is generic over the entry type', () => {
		const { entries, push } = useLog<{ id: number }>(2)
		push({ id: 1 })
		push({ id: 2 })
		push({ id: 3 })
		expect(entries.value).toEqual([{ id: 2 }, { id: 3 }])
	})
})

describe('useDismissed', () => {
	it('starts with an empty set', () => {
		const { ids } = useDismissed()
		expect(ids.value.size).toBe(0)
	})

	it('dismiss adds an id; repeats are de-duped by the Set', () => {
		const { ids, dismiss } = useDismissed()
		dismiss('a')
		dismiss('b')
		dismiss('a')
		expect([...ids.value].sort()).toEqual(['a', 'b'])
		expect(ids.value.size).toBe(2)
	})

	it('reassigns the set each change (shallowRef trigger)', () => {
		const { ids, dismiss } = useDismissed()
		const before = ids.value
		dismiss('x')
		expect(ids.value).not.toBe(before)
	})

	it('restore clears every dismissed id', () => {
		const { ids, dismiss, restore } = useDismissed()
		dismiss('a')
		dismiss('b')
		restore()
		expect(ids.value.size).toBe(0)
		expect(ids.value.has('a')).toBe(false)
	})
})

describe('useRootCssVars', () => {
	const TOKEN = '--app-test-token'

	it('read → write → clear round-trips against :root', async () => {
		const [api, unmount] = mountSetup(() => useRootCssVars())
		await waitForBootstrap()

		expect(api.read(TOKEN)).toBe('…') // unset → sentinel
		api.write(TOKEN, '42px')
		expect(api.read(TOKEN)).toBe('42px')
		expect(document.documentElement.style.getPropertyValue(TOKEN)).toBe('42px')

		api.clear(TOKEN)
		expect(api.read(TOKEN)).toBe('…')
		expect(document.documentElement.style.getPropertyValue(TOKEN)).toBe('')
		unmount()
	})

	it('read() is reactive — a computed re-runs on write() / clear()', async () => {
		let probe: ComputedRef<string> | undefined
		const [api, unmount] = mountSetup(() => {
			const root = useRootCssVars()
			probe = computed(() => root.read('--app-test-rx'))
			return root
		})
		await waitForBootstrap()
		expect(probe?.value).toBe('…')

		api.write('--app-test-rx', '7')
		await nextTick()
		expect(probe?.value).toBe('7')

		api.clear('--app-test-rx')
		await nextTick()
		expect(probe?.value).toBe('…')
		unmount()
	})

	it('clear accepts multiple tokens at once', async () => {
		const [api, unmount] = mountSetup(() => useRootCssVars())
		await waitForBootstrap()
		api.write('--app-test-a', '1')
		api.write('--app-test-b', '2')
		api.clear('--app-test-a', '--app-test-b')
		expect(document.documentElement.style.getPropertyValue('--app-test-a')).toBe('')
		expect(document.documentElement.style.getPropertyValue('--app-test-b')).toBe('')
		unmount()
	})
})
