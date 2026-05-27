import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Route, RouteLocation } from './types.js'

import HomePage from './pages/HomePage.vue'

// Foundations — tokens.md + modifiers.md territory.
import TokensPage from './pages/TokensPage.vue'
import ThemePage from './pages/ThemePage.vue'
import ModifiersPage from './pages/ModifiersPage.vue'
import PlacementsPage from './pages/PlacementsPage.vue'

// Elements — bare HTML tags. Split into Interactive + Content for sidebar
// scannability; the framework's elements/_*.scss folder is flat.
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

// Components — element compositions + class-root primitives (components.md).
import ArticleCardPage from './pages/ArticleCardPage.vue'
import AsidePage from './pages/AsidePage.vue'
import NavPage from './pages/NavPage.vue'
import MenuPage from './pages/MenuPage.vue'
import InlineAtomsPage from './pages/InlineAtomsPage.vue'

// Surfaces — pseudo-elements + attribute APIs (surfaces.md). The three
// pages bundle the nine shipped surface partials by editorial theme.
import PopoverSurfacesPage from './pages/PopoverSurfacesPage.vue'
import FormSurfacesPage from './pages/FormSurfacesPage.vue'
import ScrollAndTransitionPage from './pages/ScrollAndTransitionPage.vue'

// Composables — Element-bound (composables.md § Naming bucket 1).
import UseDialogPage from './pages/UseDialogPage.vue'
import UseAsidePage from './pages/UseAsidePage.vue'
import UseDetailsPage from './pages/UseDetailsPage.vue'
import UseMenuPage from './pages/UseMenuPage.vue'
import UseToastPage from './pages/UseToastPage.vue'
import UseTabsPage from './pages/UseTabsPage.vue'
import UseFormPage from './pages/UseFormPage.vue'
import UseSelectPage from './pages/UseSelectPage.vue'
import UseNavPage from './pages/UseNavPage.vue'
import UseAlertPage from './pages/UseAlertPage.vue'
import UseCarouselPage from './pages/UseCarouselPage.vue'
import UseTablePage from './pages/UseTablePage.vue'

// Composables — Attribute-bound (composables.md § Naming bucket 2).
import UsePopoverPage from './pages/UsePopoverPage.vue'
import UseTooltipPage from './pages/UseTooltipPage.vue'

// Composables — Primitives (composables.md § Naming bucket 3). Reusable
// behaviour building blocks; not tag- or attribute-bound.
import UseFocusPage from './pages/UseFocusPage.vue'
import UsePointerPage from './pages/UsePointerPage.vue'
import UseDragDropPage from './pages/UseDragDropPage.vue'
import UseThemeButtonPage from './pages/UseThemeButtonPage.vue'
import InspectorPage from './pages/InspectorPage.vue'

// Statechart playgrounds — visual harness over the unit-test transition
// tables (one page per factory under tests/src/browser/factories/).
import AlertPlaygroundPage from './playgrounds/AlertPlaygroundPage.vue'
import AsidePlaygroundPage from './playgrounds/AsidePlaygroundPage.vue'
import ButtonPlaygroundPage from './playgrounds/ButtonPlaygroundPage.vue'
import CarouselPlaygroundPage from './playgrounds/CarouselPlaygroundPage.vue'
import DetailsPlaygroundPage from './playgrounds/DetailsPlaygroundPage.vue'
import DialogPlaygroundPage from './playgrounds/DialogPlaygroundPage.vue'
import FormPlaygroundPage from './playgrounds/FormPlaygroundPage.vue'
import MenuPlaygroundPage from './playgrounds/MenuPlaygroundPage.vue'
import PopoverPlaygroundPage from './playgrounds/PopoverPlaygroundPage.vue'
import SelectPlaygroundPage from './playgrounds/SelectPlaygroundPage.vue'
import TabsPlaygroundPage from './playgrounds/TabsPlaygroundPage.vue'
import ThemePlaygroundPage from './playgrounds/ThemePlaygroundPage.vue'
import ToastPlaygroundPage from './playgrounds/ToastPlaygroundPage.vue'
import TooltipPlaygroundPage from './playgrounds/TooltipPlaygroundPage.vue'

// Examples — fullscreen layout templates rendered without the docs chrome.
import ConsoleExamplePage from './examples/ConsoleExamplePage.vue'
import SettingsExamplePage from './examples/SettingsExamplePage.vue'
import EditorialExamplePage from './examples/EditorialExamplePage.vue'
import PricingExamplePage from './examples/PricingExamplePage.vue'
import SigninExamplePage from './examples/SigninExamplePage.vue'
import MailExamplePage from './examples/MailExamplePage.vue'
import CrmExamplePage from './examples/CrmExamplePage.vue'
import BoardExamplePage from './examples/BoardExamplePage.vue'

/**
 * Minimal hash-based router. Each entry pairs a stable `id` (becomes the
 * URL fragment `#/{id}`) with a `title`, a `group` from `ROUTE_GROUPS`,
 * and the `Component` to render.
 *
 * Group order is canonical via `ROUTE_GROUPS` in `types.ts` — declare
 * routes in any order here; the sidebar renders groups in the order
 * `ROUTE_GROUPS` declares them.
 *
 * Hash format:
 *   `#/{id}`           — navigate to a page
 *   `#/{id}/{section}` — deep-link to an in-page anchor
 */

// ── Getting started ────────────────────────────────────────────────────────

const HOME: Route = { id: 'home', title: 'Elements', group: 'Getting started', page: HomePage }

// ── Foundations ────────────────────────────────────────────────────────────

const TOKENS: Route = { id: 'tokens', title: 'Tokens', group: 'Foundations', page: TokensPage }
const THEME: Route = { id: 'theme', title: 'Theme', group: 'Foundations', page: ThemePage }
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

// ── Elements — Interactive ─────────────────────────────────────────────────

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

// ── Elements — Content ─────────────────────────────────────────────────────

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

// ── Components ─────────────────────────────────────────────────────────────

const ARTICLE_CARD: Route = {
	id: 'article-card',
	title: 'Article card',
	group: 'Components',
	page: ArticleCardPage,
}
const ASIDE: Route = { id: 'aside', title: 'Aside', group: 'Components', page: AsidePage }
const NAV: Route = { id: 'nav', title: 'Nav', group: 'Components', page: NavPage }
const MENU: Route = { id: 'menu', title: 'Menu', group: 'Components', page: MenuPage }
const INLINE_ATOMS: Route = {
	id: 'inline-atoms',
	title: 'Inline atoms',
	group: 'Components',
	page: InlineAtomsPage,
}

// ── Surfaces ───────────────────────────────────────────────────────────────

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

// ── Composables — Element-bound ────────────────────────────────────────────

const USE_DIALOG: Route = {
	id: 'use-dialog',
	title: 'useDialog',
	group: 'Composables — Element-bound',
	page: UseDialogPage,
}
const USE_ASIDE: Route = {
	id: 'use-aside',
	title: 'useAside',
	group: 'Composables — Element-bound',
	page: UseAsidePage,
}
const USE_DETAILS: Route = {
	id: 'use-details',
	title: 'useDetails',
	group: 'Composables — Element-bound',
	page: UseDetailsPage,
}
const USE_MENU: Route = {
	id: 'use-menu',
	title: 'useMenu',
	group: 'Composables — Element-bound',
	page: UseMenuPage,
}
const USE_TOAST: Route = {
	id: 'use-toast',
	title: 'useToast',
	group: 'Composables — Element-bound',
	page: UseToastPage,
}
const USE_TABS: Route = {
	id: 'use-tabs',
	title: 'useTabs',
	group: 'Composables — Element-bound',
	page: UseTabsPage,
}
const USE_FORM: Route = {
	id: 'use-form',
	title: 'useForm',
	group: 'Composables — Element-bound',
	page: UseFormPage,
}
const USE_SELECT: Route = {
	id: 'use-select',
	title: 'useSelect',
	group: 'Composables — Element-bound',
	page: UseSelectPage,
}
const USE_NAV: Route = {
	id: 'use-nav',
	title: 'useNav',
	group: 'Composables — Element-bound',
	page: UseNavPage,
}
const USE_ALERT: Route = {
	id: 'use-alert',
	title: 'useAlert',
	group: 'Composables — Element-bound',
	page: UseAlertPage,
}
const USE_CAROUSEL: Route = {
	id: 'use-carousel',
	title: 'useCarousel',
	group: 'Composables — Element-bound',
	page: UseCarouselPage,
}
const USE_TABLE: Route = {
	id: 'use-table',
	title: 'useTable',
	group: 'Composables — Element-bound',
	page: UseTablePage,
}

// ── Composables — Attribute-bound ──────────────────────────────────────────

const USE_POPOVER: Route = {
	id: 'use-popover',
	title: 'usePopover',
	group: 'Composables — Attribute-bound',
	page: UsePopoverPage,
}
const USE_TOOLTIP: Route = {
	id: 'use-tooltip',
	title: 'useTooltip',
	group: 'Composables — Attribute-bound',
	page: UseTooltipPage,
}

// ── Composables — Primitives ───────────────────────────────────────────────

const USE_FOCUS: Route = {
	id: 'use-focus',
	title: 'useFocus',
	group: 'Composables — Primitives',
	page: UseFocusPage,
}
const USE_POINTER: Route = {
	id: 'use-pointer',
	title: 'usePointer',
	group: 'Composables — Primitives',
	page: UsePointerPage,
}
const USE_DRAG_DROP: Route = {
	id: 'use-drag-drop',
	title: 'useDrag / useDrop',
	group: 'Composables — Primitives',
	page: UseDragDropPage,
}
const USE_THEME_BUTTON: Route = {
	id: 'use-theme-button',
	title: 'useTheme / useButton',
	group: 'Composables — Primitives',
	page: UseThemeButtonPage,
}
const INSPECTOR: Route = {
	id: 'inspector',
	title: 'Inspector',
	group: 'Composables — Primitives',
	page: InspectorPage,
}

// ── Statechart playgrounds ─────────────────────────────────────────────────
//
// Each playground mirrors a factory's statechart transition table from
// `tests/src/browser/factories/`. The unit tests run those tables
// against synthetic timers; the playground drives the same tables
// against a real mounted entity with real-time delays so each transition
// is observable in the live browser. State badge + scenario list +
// emitted-event log make the cascade-side effect of every transition
// visible.

const PLAYGROUND_DIALOG: Route = {
	id: 'playground-dialog',
	title: 'Dialog',
	group: 'Statechart playgrounds',
	page: DialogPlaygroundPage,
}
const PLAYGROUND_DETAILS: Route = {
	id: 'playground-details',
	title: 'Details',
	group: 'Statechart playgrounds',
	page: DetailsPlaygroundPage,
}
const PLAYGROUND_MENU: Route = {
	id: 'playground-menu',
	title: 'Menu',
	group: 'Statechart playgrounds',
	page: MenuPlaygroundPage,
}
const PLAYGROUND_POPOVER: Route = {
	id: 'playground-popover',
	title: 'Popover',
	group: 'Statechart playgrounds',
	page: PopoverPlaygroundPage,
}
const PLAYGROUND_ASIDE: Route = {
	id: 'playground-aside',
	title: 'Aside',
	group: 'Statechart playgrounds',
	page: AsidePlaygroundPage,
}
const PLAYGROUND_TOAST: Route = {
	id: 'playground-toast',
	title: 'Toast',
	group: 'Statechart playgrounds',
	page: ToastPlaygroundPage,
}
const PLAYGROUND_FORM: Route = {
	id: 'playground-form',
	title: 'Form',
	group: 'Statechart playgrounds',
	page: FormPlaygroundPage,
}
const PLAYGROUND_TABS: Route = {
	id: 'playground-tabs',
	title: 'Tabs',
	group: 'Statechart playgrounds',
	page: TabsPlaygroundPage,
}
const PLAYGROUND_TOOLTIP: Route = {
	id: 'playground-tooltip',
	title: 'Tooltip',
	group: 'Statechart playgrounds',
	page: TooltipPlaygroundPage,
}
const PLAYGROUND_SELECT: Route = {
	id: 'playground-select',
	title: 'Select',
	group: 'Statechart playgrounds',
	page: SelectPlaygroundPage,
}
const PLAYGROUND_CAROUSEL: Route = {
	id: 'playground-carousel',
	title: 'Carousel',
	group: 'Statechart playgrounds',
	page: CarouselPlaygroundPage,
}
const PLAYGROUND_ALERT: Route = {
	id: 'playground-alert',
	title: 'Alert',
	group: 'Statechart playgrounds',
	page: AlertPlaygroundPage,
}
const PLAYGROUND_BUTTON: Route = {
	id: 'playground-button',
	title: 'Button',
	group: 'Statechart playgrounds',
	page: ButtonPlaygroundPage,
}
const PLAYGROUND_THEME: Route = {
	id: 'playground-theme',
	title: 'Theme',
	group: 'Statechart playgrounds',
	page: ThemePlaygroundPage,
}

// ── Examples ───────────────────────────────────────────────────────────────

const EXAMPLE_CONSOLE: Route = {
	id: 'example-console',
	title: 'Console',
	group: 'Examples',
	page: ConsoleExamplePage,
}

const EXAMPLE_SETTINGS: Route = {
	id: 'example-settings',
	title: 'Settings',
	group: 'Examples',
	page: SettingsExamplePage,
}

const EXAMPLE_EDITORIAL: Route = {
	id: 'example-editorial',
	title: 'Editorial',
	group: 'Examples',
	page: EditorialExamplePage,
}

const EXAMPLE_PRICING: Route = {
	id: 'example-pricing',
	title: 'Pricing',
	group: 'Examples',
	page: PricingExamplePage,
}

const EXAMPLE_SIGNIN: Route = {
	id: 'example-signin',
	title: 'Sign in',
	group: 'Examples',
	page: SigninExamplePage,
}

const EXAMPLE_MAIL: Route = {
	id: 'example-mail',
	title: 'Mail',
	group: 'Examples',
	page: MailExamplePage,
}

const EXAMPLE_CRM: Route = {
	id: 'example-crm',
	title: 'CRM',
	group: 'Examples',
	page: CrmExamplePage,
}

const EXAMPLE_BOARD: Route = {
	id: 'example-board',
	title: 'Board',
	group: 'Examples',
	page: BoardExamplePage,
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
	USE_DIALOG,
	USE_ASIDE,
	USE_DETAILS,
	USE_MENU,
	USE_TOAST,
	USE_TABS,
	USE_FORM,
	USE_SELECT,
	USE_NAV,
	USE_ALERT,
	USE_CAROUSEL,
	USE_TABLE,
	USE_POPOVER,
	USE_TOOLTIP,
	USE_FOCUS,
	USE_POINTER,
	USE_DRAG_DROP,
	USE_THEME_BUTTON,
	INSPECTOR,
	PLAYGROUND_DIALOG,
	PLAYGROUND_DETAILS,
	PLAYGROUND_MENU,
	PLAYGROUND_POPOVER,
	PLAYGROUND_ASIDE,
	PLAYGROUND_TOAST,
	PLAYGROUND_FORM,
	PLAYGROUND_TABS,
	PLAYGROUND_TOOLTIP,
	PLAYGROUND_SELECT,
	PLAYGROUND_CAROUSEL,
	PLAYGROUND_ALERT,
	PLAYGROUND_BUTTON,
	PLAYGROUND_THEME,
	EXAMPLE_CONSOLE,
	EXAMPLE_SETTINGS,
	EXAMPLE_EDITORIAL,
	EXAMPLE_PRICING,
	EXAMPLE_SIGNIN,
	EXAMPLE_MAIL,
	EXAMPLE_CRM,
	EXAMPLE_BOARD,
]

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
