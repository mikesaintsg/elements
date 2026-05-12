import { computed, ref } from 'vue'
import type { Component, ComputedRef, Ref } from 'vue'

import HomePage from './pages/HomePage.vue'
import ButtonPage from './pages/ButtonPage.vue'
import AnchorPage from './pages/AnchorPage.vue'
import FormControlsPage from './pages/FormControlsPage.vue'
import DetailsPage from './pages/DetailsPage.vue'
import DialogElementPage from './pages/DialogElementPage.vue'
import HeadingsPage from './pages/HeadingsPage.vue'
import TypographyPage from './pages/TypographyPage.vue'
import ListsPage from './pages/ListsPage.vue'
import TablesPage from './pages/TablesPage.vue'
import MediaPage from './pages/MediaPage.vue'
import FiguresPage from './pages/FiguresPage.vue'
import SectioningPage from './pages/SectioningPage.vue'
import ArticleCardPage from './pages/ArticleCardPage.vue'
import AsidePage from './pages/AsidePage.vue'
import NavPage from './pages/NavPage.vue'
import MenuPage from './pages/MenuPage.vue'
import InlineAtomsPage from './pages/InlineAtomsPage.vue'
import PopoverSurfacesPage from './pages/PopoverSurfacesPage.vue'
import FormSurfacesPage from './pages/FormSurfacesPage.vue'
import ScrollAndTransitionPage from './pages/ScrollAndTransitionPage.vue'

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
const FORM_CONTROLS: Route = {
	id: 'form-controls',
	title: 'Form controls',
	group: 'Elements — Interactive',
	page: FormControlsPage,
}
const DETAILS: Route = {
	id: 'details',
	title: 'Details',
	group: 'Elements — Interactive',
	page: DetailsPage,
}
const DIALOG_ELEMENT: Route = {
	id: 'dialog-element',
	title: 'Dialog element',
	group: 'Elements — Interactive',
	page: DialogElementPage,
}
const HEADINGS: Route = {
	id: 'headings',
	title: 'Headings',
	group: 'Elements — Content',
	page: HeadingsPage,
}
const TYPOGRAPHY: Route = {
	id: 'typography',
	title: 'Typography',
	group: 'Elements — Content',
	page: TypographyPage,
}
const LISTS: Route = {
	id: 'lists',
	title: 'Lists',
	group: 'Elements — Content',
	page: ListsPage,
}
const TABLES: Route = {
	id: 'tables',
	title: 'Tables',
	group: 'Elements — Content',
	page: TablesPage,
}
const MEDIA: Route = {
	id: 'media',
	title: 'Media',
	group: 'Elements — Content',
	page: MediaPage,
}
const FIGURES: Route = {
	id: 'figures',
	title: 'Figures',
	group: 'Elements — Content',
	page: FiguresPage,
}
const SECTIONING: Route = {
	id: 'sectioning',
	title: 'Sectioning',
	group: 'Elements — Content',
	page: SectioningPage,
}
const ARTICLE_CARD: Route = {
	id: 'article-card',
	title: 'Article card',
	group: 'Components',
	page: ArticleCardPage,
}
const ASIDE: Route = {
	id: 'aside',
	title: 'Aside',
	group: 'Components',
	page: AsidePage,
}
const NAV: Route = {
	id: 'nav',
	title: 'Nav',
	group: 'Components',
	page: NavPage,
}
const MENU: Route = {
	id: 'menu',
	title: 'Menu',
	group: 'Components',
	page: MenuPage,
}
const INLINE_ATOMS: Route = {
	id: 'inline-atoms',
	title: 'Inline atoms',
	group: 'Components',
	page: InlineAtomsPage,
}
const POPOVER_SURFACES: Route = {
	id: 'popover-surfaces',
	title: 'Popover surfaces',
	group: 'Surfaces',
	page: PopoverSurfacesPage,
}
const FORM_SURFACES: Route = {
	id: 'form-surfaces',
	title: 'Form surfaces',
	group: 'Surfaces',
	page: FormSurfacesPage,
}
const SCROLL_AND_TRANSITION: Route = {
	id: 'scroll-and-transition',
	title: 'Scroll & transition',
	group: 'Surfaces',
	page: ScrollAndTransitionPage,
}

export const routes: readonly Route[] = [
	HOME,
	BUTTON,
	ANCHOR,
	FORM_CONTROLS,
	DETAILS,
	DIALOG_ELEMENT,
	HEADINGS,
	TYPOGRAPHY,
	LISTS,
	TABLES,
	MEDIA,
	FIGURES,
	SECTIONING,
	ARTICLE_CARD,
	ASIDE,
	NAV,
	MENU,
	INLINE_ATOMS,
	POPOVER_SURFACES,
	FORM_SURFACES,
	SCROLL_AND_TRANSITION,
]

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
