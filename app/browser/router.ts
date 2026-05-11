import { computed, ref } from 'vue'
import type { Component, ComputedRef, Ref } from 'vue'

import HomePage from './pages/HomePage.vue'
import ButtonPage from './pages/ButtonPage.vue'
import AnchorPage from './pages/AnchorPage.vue'

/**
 * Minimal hash-based router. Each entry pairs a stable `id` (becomes the
 * URL fragment `#/{id}`) with a `title`, `group`, and the `Component` to
 * render. Add a new page by importing it here and pushing a new entry.
 *
 * Hash format:
 *   `#/{id}`           — navigate to a page
 *   `#/{id}/{section}` — deep-link to an in-page anchor
 */
export interface Route {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: Component
}

const HOME: Route = { id: 'home', title: 'Home', group: 'Getting started', page: HomePage }
const BUTTON: Route = {
	id: 'button',
	title: 'Button',
	group: 'Elements — Interactive',
	page: ButtonPage,
}
const ANCHOR: Route = {
	id: 'anchor',
	title: 'Anchor',
	group: 'Elements — Interactive',
	page: AnchorPage,
}

export const routes: readonly Route[] = [HOME, BUTTON, ANCHOR]

interface RouteLocation {
	readonly id: string
	readonly section: string | null
}

const parse = (fallback: string): RouteLocation => {
	const hash = window.location.hash
	if (!hash.startsWith('#/')) return { id: fallback, section: null }
	const parts = hash.slice(2).split('/')
	const raw = parts[0] ?? ''
	const id = routes.some((r) => r.id === raw) ? raw : 'home'
	const section = parts.slice(1).filter(Boolean).join('/') || null
	return { id, section }
}

const initial = typeof window === 'undefined' ? { id: 'home', section: null } : parse('home')
const currentId = ref<string>(initial.id)
const currentSection = ref<string | null>(initial.section)

if (typeof window !== 'undefined') {
	window.addEventListener('hashchange', () => {
		const next = parse(currentId.value)
		currentId.value = next.id
		currentSection.value = next.section
	})
}

export const route: Readonly<Ref<string>> = currentId
export const section: Readonly<Ref<string | null>> = currentSection

export const current: ComputedRef<Route> = computed(
	() => routes.find((r) => r.id === currentId.value) ?? HOME,
)

export const navigate = (id: string, target?: string): void => {
	window.location.hash = target ? `#/${id}/${target}` : `#/${id}`
}
