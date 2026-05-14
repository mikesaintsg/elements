import { computed, ref } from 'vue'
import type { Component, ComputedRef, Ref } from 'vue'

import HomePage from './pages/HomePage.vue'
import TokensPage from './pages/TokensPage.vue'
import ThemePage from './pages/ThemePage.vue'
import ModifiersPage from './pages/ModifiersPage.vue'
import PlacementsPage from './pages/PlacementsPage.vue'
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
import UseFocusPage from './pages/UseFocusPage.vue'
import UsePointerPage from './pages/UsePointerPage.vue'
import UseDragDropPage from './pages/UseDragDropPage.vue'
import UseThemeButtonPage from './pages/UseThemeButtonPage.vue'
import UseMenuPage from './pages/UseMenuPage.vue'
import UseDialogPage from './pages/UseDialogPage.vue'
import UseAsidePage from './pages/UseAsidePage.vue'
import UseTabsPage from './pages/UseTabsPage.vue'
import UseDetailsPage from './pages/UseDetailsPage.vue'
import UseFormPage from './pages/UseFormPage.vue'
import UseNavPage from './pages/UseNavPage.vue'
import UseSelectPage from './pages/UseSelectPage.vue'
import UseTablePage from './pages/UseTablePage.vue'
import UseToastPage from './pages/UseToastPage.vue'
import UsePopoverPage from './pages/UsePopoverPage.vue'
import UseTooltipPage from './pages/UseTooltipPage.vue'

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
const TOKENS: Route = {
	id: 'tokens',
	title: 'Tokens',
	group: 'Foundations',
	page: TokensPage,
}
const THEME: Route = {
	id: 'theme',
	title: 'Theme',
	group: 'Foundations',
	page: ThemePage,
}
const MODIFIERS: Route = {
	id: 'modifiers',
	title: 'Modifiers',
	group: 'Foundations',
	page: ModifiersPage,
}
const PLACEMENTS: Route = {
	id: 'placements',
	title: 'Placements',
	group: 'Foundations',
	page: PlacementsPage,
}
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
const USE_FOCUS: Route = {
	id: 'use-focus',
	title: 'useFocus',
	group: 'Composables',
	page: UseFocusPage,
}
const USE_POINTER: Route = {
	id: 'use-pointer',
	title: 'usePointer',
	group: 'Composables',
	page: UsePointerPage,
}
const USE_DRAG_DROP: Route = {
	id: 'use-drag-drop',
	title: 'useDrag / useDrop',
	group: 'Composables',
	page: UseDragDropPage,
}
const USE_THEME_BUTTON: Route = {
	id: 'use-theme-button',
	title: 'useTheme / useButton',
	group: 'Composables',
	page: UseThemeButtonPage,
}
const USE_MENU: Route = {
	id: 'use-menu',
	title: 'useMenu',
	group: 'Composables',
	page: UseMenuPage,
}
const USE_DIALOG: Route = {
	id: 'use-dialog',
	title: 'useDialog',
	group: 'Composables',
	page: UseDialogPage,
}
const USE_ASIDE: Route = {
	id: 'use-aside',
	title: 'useAside',
	group: 'Composables',
	page: UseAsidePage,
}
const USE_TABS: Route = {
	id: 'use-tabs',
	title: 'useTabs',
	group: 'Composables',
	page: UseTabsPage,
}
const USE_DETAILS: Route = {
	id: 'use-details',
	title: 'useDetails',
	group: 'Composables',
	page: UseDetailsPage,
}
const USE_TOAST: Route = {
	id: 'use-toast',
	title: 'useToast',
	group: 'Composables',
	page: UseToastPage,
}
const USE_SELECT: Route = {
	id: 'use-select',
	title: 'useSelect',
	group: 'Composables',
	page: UseSelectPage,
}
const USE_TABLE: Route = {
	id: 'use-table',
	title: 'useTable',
	group: 'Composables',
	page: UseTablePage,
}
const USE_FORM: Route = {
	id: 'use-form',
	title: 'useForm',
	group: 'Composables',
	page: UseFormPage,
}
const USE_NAV: Route = {
	id: 'use-nav',
	title: 'useNav',
	group: 'Composables',
	page: UseNavPage,
}
const USE_POPOVER: Route = {
	id: 'use-popover',
	title: 'usePopover',
	group: 'Composables',
	page: UsePopoverPage,
}
const USE_TOOLTIP: Route = {
	id: 'use-tooltip',
	title: 'useTooltip',
	group: 'Composables',
	page: UseTooltipPage,
}

export const routes: readonly Route[] = [
	HOME,
	TOKENS,
	THEME,
	MODIFIERS,
	PLACEMENTS,
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
	USE_FOCUS,
	USE_POINTER,
	USE_DRAG_DROP,
	USE_THEME_BUTTON,
	USE_MENU,
	USE_DIALOG,
	USE_ASIDE,
	USE_TABS,
	USE_DETAILS,
	USE_TOAST,
	USE_SELECT,
	USE_TABLE,
	USE_FORM,
	USE_NAV,
	USE_POPOVER,
	USE_TOOLTIP,
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
