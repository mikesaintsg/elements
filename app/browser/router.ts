import { computed, ref } from 'vue'
import type { Component, ComputedRef, Ref } from 'vue'

import HomePage from './pages/HomePage.vue'

// Elements (HTML tags with substantive cascade chrome)
import AnchorPage from './pages/AnchorPage.vue'
import ButtonPage from './pages/ButtonPage.vue'
import DialogPage from './pages/DialogPage.vue'
import InputPage from './pages/InputPage.vue'
import SelectPage from './pages/SelectPage.vue'
import TablePage from './pages/TablePage.vue'
import TextareaPage from './pages/TextareaPage.vue'

// Components (sectioning + generic-box compositions on bare elements)
import ArticlePage from './pages/ArticlePage.vue'
import AsidePage from './pages/AsidePage.vue'
import DivPage from './pages/DivPage.vue'
import FooterPage from './pages/FooterPage.vue'
import FormPage from './pages/FormPage.vue'
import HeaderPage from './pages/HeaderPage.vue'
import MenuPage from './pages/MenuPage.vue'
import NavPage from './pages/NavPage.vue'
import SearchPage from './pages/SearchPage.vue'

// Patterns (multi-element compositions)
import FormsPage from './pages/FormsPage.vue'
import TypographyPage from './pages/TypographyPage.vue'

// Surfaces (browser-rendered chrome)
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

	// Elements — HTML tags the framework gives substantive cascade chrome to.
	// Page IDs and titles match the tag name; the common name (e.g. "anchor"
	// for `<a>`) appears as the title only when it's the spec's own term.
	{ id: 'a', title: 'a (anchor)', group: 'Elements', page: AnchorPage },
	{ id: 'button', title: 'button', group: 'Elements', page: ButtonPage },
	{ id: 'dialog', title: 'dialog', group: 'Elements', page: DialogPage },
	{ id: 'input', title: 'input', group: 'Elements', page: InputPage },
	{ id: 'select', title: 'select', group: 'Elements', page: SelectPage },
	{ id: 'table', title: 'table', group: 'Elements', page: TablePage },
	{ id: 'textarea', title: 'textarea', group: 'Elements', page: TextareaPage },

	// Components — bare-element compositions on sectioning + generic-box
	// elements. Each page is named after the element it wraps (the element
	// IS the component). The common-name role appears in parentheses where
	// helpful, but the primary name is always the tag.
	{ id: 'article', title: 'article (card)', group: 'Components', page: ArticlePage },
	{ id: 'aside', title: 'aside (sidebar / callout)', group: 'Components', page: AsidePage },
	{ id: 'div', title: 'div (layout primitives)', group: 'Components', page: DivPage },
	{ id: 'footer', title: 'footer', group: 'Components', page: FooterPage },
	{ id: 'form', title: 'form', group: 'Components', page: FormPage },
	{ id: 'header', title: 'header (app bar)', group: 'Components', page: HeaderPage },
	{ id: 'menu', title: 'menu (toolbar)', group: 'Components', page: MenuPage },
	{ id: 'nav', title: 'nav', group: 'Components', page: NavPage },
	{ id: 'search', title: 'search', group: 'Components', page: SearchPage },

	// Patterns — multi-element compositions, named after the pattern (since
	// they don't map to a single tag).
	{ id: 'forms', title: 'Form controls', group: 'Patterns', page: FormsPage },
	{ id: 'typography', title: 'Typography', group: 'Patterns', page: TypographyPage },

	// Surfaces — browser-rendered chrome (popover, scrollbar, …).
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
