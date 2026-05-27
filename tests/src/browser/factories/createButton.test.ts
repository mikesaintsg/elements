import { describe, expect, it } from 'vitest'
import type { CreateButtonInstance, CreateButtonOptions } from '@elements/browser'
import { BUTTON_EVENTS, createButton } from '@elements/browser'
import type { StateScenario } from '../../../setup'
import { createRecorder } from '../../../setup'
import {
	assertCleanDispose,
	buildElement,
	createFactoryFixture,
	runScenario,
} from '../../../setupBrowser'

describe('createButton', () => {
	it('rejects non-<button> hosts', () => {
		const wrong = buildElement('div')
		expect(() => createButton(wrong as unknown as HTMLButtonElement)).toThrowError(/button/i)
	})

	it('seeds aria-pressed from initial active state', () => {
		const button = buildElement('button')
		button.classList.add('active')
		const [api] = createFactoryFixture(() => createButton(button))
		expect(api.active.value).toBe(true)
		expect(button.getAttribute('aria-pressed')).toBe('true')
	})

	it('toggle flips active class + aria-pressed', () => {
		const button = buildElement('button')
		const [api] = createFactoryFixture(() => createButton(button))
		api.toggle()
		expect(api.active.value).toBe(true)
		expect(button.classList.contains('active')).toBe(true)
		expect(button.getAttribute('aria-pressed')).toBe('true')
		api.toggle()
		expect(api.active.value).toBe(false)
		expect(button.classList.contains('active')).toBe(false)
	})

	it('emits namespaced toggle event with detail.active', () => {
		const button = buildElement('button')
		const calls: boolean[] = []
		button.addEventListener(BUTTON_EVENTS.toggle, (event) => {
			if (event instanceof CustomEvent) calls.push(event.detail.active)
		})
		const [api] = createFactoryFixture(() => createButton(button))
		api.toggle()
		api.toggle()
		expect(calls).toEqual([true, false])
	})

	it('destroy reverses every listener', () => {
		assertCleanDispose(() => createButton(buildElement('button')))
	})
})

// ── Statechart transition coverage ─────────────────────────────────────────
//
// Button is the simplest stateful factory — a binary `active` toggle that
// mirrors `[aria-pressed]` and the `.active` class. Every transition fires
// BUTTON_EVENTS.toggle with `detail.active` reflecting the new state.
//
//   States   : 'inactive' | 'active'
//   Events   : 'toggle' | 'click' | 'destroy'

type ButtonState = 'inactive' | 'active'
type ButtonEvent = 'toggle' | 'click' | 'destroy'

interface ButtonContext {
	readonly api: CreateButtonInstance
	readonly element: HTMLButtonElement
	readonly toggles: { readonly count: number; clear(): void }
}

function buildButtonContext(options: CreateButtonOptions = {}): ButtonContext {
	const element = buildElement('button')
	const toggles = createRecorder<[Event]>()
	element.addEventListener(BUTTON_EVENTS.toggle, toggles.handler)
	const [api] = createFactoryFixture(() => createButton(element, options))
	return { api, element, toggles }
}

function driveToButtonState(context: ButtonContext, state: ButtonState): void {
	if (state === 'active') {
		context.api.toggle()
		context.toggles.clear()
	}
}

function fireButtonEvent(context: ButtonContext, event: ButtonEvent): void {
	if (event === 'toggle') {
		context.api.toggle()
		return
	}
	if (event === 'click') {
		context.element.click()
		return
	}
	context.api.destroy()
}

function assertButtonState(context: ButtonContext, state: ButtonState): void {
	const expectedActive = state === 'active'
	expect(context.api.active.value).toBe(expectedActive)
	expect(context.element.classList.contains('active')).toBe(expectedActive)
	expect(context.element.getAttribute('aria-pressed')).toBe(expectedActive ? 'true' : 'false')
}

const BUTTON_SCENARIOS: readonly StateScenario<ButtonState, ButtonEvent, ButtonContext>[] = [
	{
		transition: {
			name: 'inactive × toggle → active',
			from: 'inactive',
			event: 'toggle',
			to: 'active',
		},
		arrange: driveToButtonState,
		act: fireButtonEvent,
		assert: (context, state) => {
			assertButtonState(context, state)
			expect(context.toggles.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'active × toggle → inactive',
			from: 'active',
			event: 'toggle',
			to: 'inactive',
		},
		arrange: driveToButtonState,
		act: fireButtonEvent,
		assert: (context, state) => {
			assertButtonState(context, state)
			expect(context.toggles.count).toBe(1)
		},
	},
	{
		transition: {
			name: 'inactive × click → active (native click drives toggle)',
			from: 'inactive',
			event: 'click',
			to: 'active',
		},
		arrange: driveToButtonState,
		act: fireButtonEvent,
		assert: assertButtonState,
	},
	{
		transition: {
			name: 'active × click → inactive (native click drives toggle)',
			from: 'active',
			event: 'click',
			to: 'inactive',
		},
		arrange: driveToButtonState,
		act: fireButtonEvent,
		assert: assertButtonState,
	},
	{
		transition: {
			name: 'active × destroy → inactive (factory clears class + aria-pressed)',
			from: 'active',
			event: 'destroy',
			to: 'inactive',
		},
		arrange: driveToButtonState,
		act: fireButtonEvent,
		assert: (context) => {
			// Destroy strips the class + aria attribute regardless of prior
			// `active` value; the reactive ref isn't necessarily reset
			// (consumers may still hold it), so only assert the DOM.
			expect(context.element.classList.contains('active')).toBe(false)
			expect(context.element.hasAttribute('aria-pressed')).toBe(false)
		},
	},
]

describe('createButton (statechart)', () => {
	it.each(BUTTON_SCENARIOS)('$transition.name', async (scenario) => {
		const context = buildButtonContext()
		expect(context.api.active.value).toBe(false)
		await runScenario(scenario, context)
	})
})
