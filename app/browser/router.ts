import { computed, ref } from 'vue'
import type { Component, ComputedRef, Ref } from 'vue'

import HomePage from './pages/HomePage.vue'
import ButtonPage from './pages/ButtonPage.vue'
import AnchorPage from './pages/AnchorPage.vue'
import DialogPage from './pages/DialogPage.vue'
import InputPage from './pages/InputPage.vue'
import SelectPage from './pages/SelectPage.vue'
import TablePage from './pages/TablePage.vue'
import TextareaPage from './pages/TextareaPage.vue'
import CardPage from './pages/CardPage.vue'
import FormsPage from './pages/FormsPage.vue'
import TypographyPage from './pages/TypographyPage.vue'
import SurfacesPage from './pages/SurfacesPage.vue'

export interface Route {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: Component
}

const HOME: Route = { id: 'home', title: 'Overview', group: 'Getting started', page: HomePage }

export const routes: readonly Route[] = [
	HOME,

	// Elements
	{ id: 'anchor', title: 'Anchor', group: 'Elements', page: AnchorPage },
	{ id: 'button', title: 'Button', group: 'Elements', page: ButtonPage },
	{ id: 'dialog', title: 'Dialog', group: 'Elements', page: DialogPage },
	{ id: 'input', title: 'Input', group: 'Elements', page: InputPage },
	{ id: 'select', title: 'Select', group: 'Elements', page: SelectPage },
	{ id: 'table', title: 'Table', group: 'Elements', page: TablePage },
	{ id: 'textarea', title: 'Textarea', group: 'Elements', page: TextareaPage },

	// Components — bare-element compositions (Phase 5: "the element IS the component")
	{ id: 'card', title: 'Card (article)', group: 'Components', page: CardPage },

	// Forms — composed Phase 2 elements (label / fieldset / details / progress / meter / output)
	{ id: 'forms', title: 'Forms', group: 'Patterns', page: FormsPage },
	{ id: 'typography', title: 'Typography', group: 'Patterns', page: TypographyPage },

	// Surfaces
	{ id: 'surfaces', title: 'Surfaces', group: 'Surfaces', page: SurfacesPage },
]

export const EXAMPLES_GROUP = 'Examples'

interface RouteLocation {
	readonly id: string
	readonly section: string | null
}

// Hash format: `#/{id}` for a page or `#/{id}/{section}` to deep-link to an
// in-page section. Bare `#anchor` values belong to in-page navigation
// (Toc) and must not reset the active route.
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
