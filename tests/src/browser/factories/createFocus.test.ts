import { describe, expect, it } from 'vitest'
import type { CreateFocusInstance, CreateFocusOptions } from '@elements/browser'
import { createFocus } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

function createFocusHost(): {
	readonly host: HTMLDivElement
	readonly buttons: readonly HTMLButtonElement[]
} {
	const host = buildElement('div')
	const buttons: HTMLButtonElement[] = []
	for (let i = 0; i < 3; i++) {
		const button = document.createElement('button')
		button.type = 'button'
		button.textContent = `Button ${i}`
		host.appendChild(button)
		buttons.push(button)
	}
	return { host, buttons }
}

describe('createFocus', () => {
	it('starts inactive', () => {
		const { host } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host))
		expect(api.active.value).toBe(false)
	})

	it('activate focuses the first focusable descendant', () => {
		const { host, buttons } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host))
		api.activate()
		expect(api.active.value).toBe(true)
		expect(document.activeElement).toBe(buttons[0])
	})

	it('Tab on the last focusable wraps back to the first', () => {
		const { host, buttons } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host))
		api.activate()
		buttons[buttons.length - 1]?.focus()
		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
		document.dispatchEvent(event)
		expect(document.activeElement).toBe(buttons[0])
	})

	it('Shift+Tab on the first wraps to the last', () => {
		const { host, buttons } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host))
		api.activate()
		buttons[0]?.focus()
		const event = new KeyboardEvent('keydown', {
			key: 'Tab',
			shiftKey: true,
			bubbles: true,
			cancelable: true,
		})
		document.dispatchEvent(event)
		expect(document.activeElement).toBe(buttons[buttons.length - 1])
	})

	it('deactivate restores focus to the previously focused element', () => {
		const previous = buildElement('button')
		previous.type = 'button'
		previous.focus()
		const { host } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host))
		api.activate()
		api.deactivate()
		expect(api.active.value).toBe(false)
		expect(document.activeElement).toBe(previous)
	})

	it('initial accepts an explicit element to focus first', () => {
		const { host, buttons } = createFocusHost()
		const [api] = createFactoryFixture(() => createFocus(host, { initial: buttons[2] }))
		api.activate()
		expect(document.activeElement).toBe(buttons[2])
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createFocus(buildElement('div')))
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Focus is a binary trap-engaged state. `activate()` moves focus to the
// initial target (or the first focusable descendant) and arms the keydown
// trap; `deactivate()` restores focus to the previously focused element
// and disarms.
//
//   States   : 'inactive' | 'active'
//   Events   : 'activate' | 'deactivate' | 'destroy'

type FocusState = 'inactive' | 'active'
type FocusEvent = 'activate' | 'deactivate' | 'destroy'

interface FocusContext {
	readonly api: CreateFocusInstance
	readonly host: HTMLDivElement
	readonly buttons: readonly HTMLButtonElement[]
}

function buildFocusContext(options: CreateFocusOptions = {}): FocusContext {
	const { host, buttons } = createFocusHost()
	const [api] = createFactoryFixture(() => createFocus(host, options))
	return { api, host, buttons }
}

function driveToFocusState(context: FocusContext, state: FocusState): void {
	if (state === 'active') context.api.activate()
}

function fireFocusEvent(context: FocusContext, event: FocusEvent): void {
	if (event === 'activate') {
		context.api.activate()
		return
	}
	if (event === 'deactivate') {
		context.api.deactivate()
		return
	}
	context.api.destroy()
}

function assertFocusState(context: FocusContext, state: FocusState): void {
	expect(context.api.active.value).toBe(state === 'active')
}

const FOCUS_SCENARIOS: readonly StateScenario<FocusState, FocusEvent, FocusContext>[] = [
	{
		transition: {
			name: 'inactive × activate → active (focuses first focusable)',
			from: 'inactive',
			event: 'activate',
			to: 'active',
		},
		arrange: driveToFocusState,
		act: fireFocusEvent,
		assert: (context, state) => {
			assertFocusState(context, state)
			expect(document.activeElement).toBe(context.buttons[0])
		},
	},
	{
		transition: {
			name: 'active × deactivate → inactive',
			from: 'active',
			event: 'deactivate',
			to: 'inactive',
		},
		arrange: driveToFocusState,
		act: fireFocusEvent,
		assert: assertFocusState,
	},
	{
		transition: {
			name: 'active × activate → active (idempotent)',
			from: 'active',
			event: 'activate',
			to: 'active',
		},
		arrange: driveToFocusState,
		act: fireFocusEvent,
		assert: assertFocusState,
	},
	{
		transition: {
			name: 'inactive × deactivate → inactive (no-op)',
			from: 'inactive',
			event: 'deactivate',
			to: 'inactive',
		},
		arrange: driveToFocusState,
		act: fireFocusEvent,
		assert: assertFocusState,
	},
	{
		transition: {
			name: 'active × destroy → inactive (trap disarms)',
			from: 'active',
			event: 'destroy',
			to: 'inactive',
		},
		arrange: driveToFocusState,
		act: fireFocusEvent,
		assert: assertFocusState,
	},
]

describe('createFocus (statechart)', () => {
	it.each(FOCUS_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildFocusContext()
		expect(context.api.active.value).toBe(false)
		await runScenario(scenario, context)
	})
})
