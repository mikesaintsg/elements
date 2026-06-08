# Page Map — `mailbox` ↔ `elements`

A cross-reference of the docs-app pages shipped by the two sibling frameworks,
grouped by related concept. Two columns show the **mailbox** page (Bootstrap-5
class contract on Tailwind v4 foundation) and the **elements** page
(semantic-HTML-first, `--set-*` tokens). Empty cells mean the concept is
unique to that framework.

Paths are relative to each project's repo root:

- `mailbox/app/browser/pages/*.vue`
- `elements/app/browser/pages/*.vue`

---

## Getting started

| Concept            | mailbox        | elements       |
| ------------------ | -------------- | -------------- |
| Overview / landing | `HomePage.vue` | `HomePage.vue` |

## Foundations / Reference

| Concept                    | mailbox                     | elements             |
| -------------------------- | --------------------------- | -------------------- |
| Design tokens              | `TokensPage.vue`            | `TokensPage.vue`     |
| Theme cores + dark/light   | (inside `UseThemePage.vue`) | `ThemePage.vue`      |
| Modifier / utility classes | `UtilitiesPage.vue`         | `ModifiersPage.vue`  |
| Placement vocabulary       | (inside `FloaterPage.vue`)  | `PlacementsPage.vue` |

## Layout

mailbox carries a dedicated Layout section; elements treats layout primitives
as plain HTML sectioning + utilities, so most rows are mailbox-only.

| Concept                                                       | mailbox            | elements             |
| ------------------------------------------------------------- | ------------------ | -------------------- |
| Grid                                                          | `GridPage.vue`     | —                    |
| Sidebar                                                       | `SidebarPage.vue`  | —                    |
| Splitter                                                      | `SplitterPage.vue` | —                    |
| Sectioning (`<section>`, `<article>`, `<header>`, `<footer>`) | —                  | `SectioningPage.vue` |

## Content

| Concept                                               | mailbox                            | elements              |
| ----------------------------------------------------- | ---------------------------------- | --------------------- |
| Typography (body, scale, prose)                       | `TypographyPage.vue`               | `TypographyPage.vue`  |
| Headings (`<h1>`–`<h6>`)                              | (rolled into `TypographyPage.vue`) | `HeadingsPage.vue`    |
| Tables                                                | `TablePage.vue`                    | `TablesPage.vue`      |
| Cards                                                 | `CardPage.vue`                     | `ArticleCardPage.vue` |
| Lists                                                 | `ListGroupPage.vue`                | `ListsPage.vue`       |
| Figures (`<figure>` + `<figcaption>`)                 | —                                  | `FiguresPage.vue`     |
| Media (`<img>`, `<video>`, `<audio>`)                 | —                                  | `MediaPage.vue`       |
| Inline atoms (`<kbd>`, `<code>`, `<mark>`, `<abbr>`…) | `KbdPage.vue`                      | `InlineAtomsPage.vue` |

## Forms

| Concept                                                    | mailbox               | elements                                                     |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Form layout + control chrome                               | `FormPage.vue`        | `FormControlsPage.vue`                                       |
| Form surfaces (`::placeholder`, `::file-selector-button`…) | —                     | `FormSurfacesPage.vue`                                       |
| Range slider                                               | `RangeSliderPage.vue` | (covered by `FormControlsPage.vue`)                          |
| File upload                                                | `UploadPage.vue`      | (covered by `FormControlsPage.vue` / `FormSurfacesPage.vue`) |
| Date picker                                                | `DatePickerPage.vue`  | (browser-native; `FormControlsPage.vue`)                     |
| Time picker                                                | `TimePickerPage.vue`  | (browser-native; `FormControlsPage.vue`)                     |

## Components — interactive primitives

| Concept                              | mailbox                              | elements                           |
| ------------------------------------ | ------------------------------------ | ---------------------------------- |
| Button                               | `ButtonPage.vue`                     | `ButtonPage.vue`                   |
| Button group                         | `ButtonGroupPage.vue`                | —                                  |
| Anchor (`<a>` chrome)                | —                                    | `AnchorPage.vue`                   |
| Nav                                  | `NavPage.vue`                        | `NavPage.vue`                      |
| Breadcrumb                           | `BreadcrumbPage.vue`                 | (folded into `NavPage.vue`)        |
| Pagination                           | `PaginationPage.vue`                 | (folded into `NavPage.vue`)        |
| Menu / dropdown                      | (component on `UseDropdownPage.vue`) | `MenuPage.vue`                     |
| Accordion / disclosure (`<details>`) | `AccordionPage.vue`                  | `DetailsPage.vue`                  |
| Dialog (`<dialog>` element)          | (uses `useModal`, no static page)    | `DialogElementPage.vue`            |
| Aside / off-canvas (component)       | (uses `useOffcanvas`)                | `AsidePage.vue`                    |
| Floater placement primitive          | `FloaterPage.vue`                    | (folded into `PlacementsPage.vue`) |

## Components — display / decoration

| Concept                | mailbox           | elements                            |
| ---------------------- | ----------------- | ----------------------------------- |
| Badge                  | `BadgePage.vue`   | (folded into `InlineAtomsPage.vue`) |
| Tag                    | `TagPage.vue`     | (folded into `InlineAtomsPage.vue`) |
| Avatar                 | `AvatarPage.vue`  | —                                   |
| Stepper                | `StepperPage.vue` | —                                   |
| Rating                 | `RatingPage.vue`  | —                                   |
| Divider                | `DividerPage.vue` | —                                   |
| Stat                   | `StatPage.vue`    | —                                   |
| Dot (status indicator) | `DotPage.vue`     | —                                   |

## Feedback — loading / empty / progress

| Concept     | mailbox               | elements |
| ----------- | --------------------- | -------- |
| Progress    | `ProgressPage.vue`    | —        |
| Spinner     | `SpinnerPage.vue`     | —        |
| Placeholder | `PlaceholderPage.vue` | —        |
| Skeleton    | `SkeletonPage.vue`    | —        |
| Empty state | `EmptyStatePage.vue`  | —        |

## Surfaces — pseudo-elements + attribute APIs

mailbox spreads these across its component partials (`::backdrop` in `_base.scss`,
`::placeholder` in form partials, etc.). elements bundles them into editorial
"surface" pages.

| Concept                                                    | mailbox                                       | elements                      |
| ---------------------------------------------------------- | --------------------------------------------- | ----------------------------- |
| Popover/menu/tooltip surfaces (`::backdrop`, `::marker`…)  | (in `_base.scss` + per-partial)               | `PopoverSurfacesPage.vue`     |
| Form surfaces (`::placeholder`, `::file-selector-button`…) | (in form partials)                            | `FormSurfacesPage.vue`        |
| Scroll + view-transition surfaces                          | (in `_base.scss`; see `UseScrollSpyPage.vue`) | `ScrollAndTransitionPage.vue` |

## Composables — element- and attribute-bound

| Concept                               | mailbox                         | elements                                                       |
| ------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| Alert                                 | `UseAlertPage.vue`              | `UseAlertPage.vue`                                             |
| Carousel                              | `UseCarouselPage.vue`           | `UseCarouselPage.vue`                                          |
| Collapse / disclosure (open/close)    | `UseCollapsePage.vue`           | `UseDetailsPage.vue`                                           |
| Dialog / modal                        | `UseModalPage.vue`              | `UseDialogPage.vue`                                            |
| Off-canvas / aside                    | `UseOffcanvasPage.vue`          | `UseAsidePage.vue`                                             |
| Dropdown / menu                       | `UseDropdownPage.vue`           | `UseMenuPage.vue`                                              |
| Popover                               | `UsePopoverPage.vue`            | `UsePopoverPage.vue`                                           |
| Tooltip                               | `UseTooltipPage.vue`            | `UseTooltipPage.vue`                                           |
| Toast                                 | `UseToastPage.vue`              | `UseToastPage.vue`                                             |
| Tabs                                  | `UseTabPage.vue`                | `UseTabsPage.vue`                                              |
| Form                                  | `UseFormPage.vue`               | `UseFormPage.vue`                                              |
| Select                                | `UseSelectPage.vue`             | `UseSelectPage.vue`                                            |
| Table                                 | `UseTablePage.vue`              | `UseTablePage.vue`                                             |
| Nav (active link, scroll, etc.)       | (split: `UseScrollSpyPage.vue`) | `UseNavPage.vue`                                               |
| Scroll-spy                            | `UseScrollSpyPage.vue`          | (folded into `UseNavPage.vue` / `ScrollAndTransitionPage.vue`) |
| Theme controller                      | `UseThemePage.vue`              | `UseThemeButtonPage.vue` (combined)                            |
| Button (active/loading state machine) | `UseButtonPage.vue`             | `UseThemeButtonPage.vue` (combined)                            |

## Composables — input primitives

| Concept                   | mailbox              | elements                         |
| ------------------------- | -------------------- | -------------------------------- |
| Pointer / press           | `UsePointerPage.vue` | `UsePointerPage.vue`             |
| Drag                      | `UseDragPage.vue`    | `UseDragDropPage.vue` (combined) |
| Drop                      | `UseDropPage.vue`    | `UseDragDropPage.vue` (combined) |
| Focus management          | —                    | `UseFocusPage.vue`               |
| Inspector / debug overlay | —                    | `InspectorPage.vue`              |

## Examples — full-page templates

Different rosters; the overlap is **Mail** and **CRM**.

| Concept                         | mailbox                             | elements                                                               |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Dashboard                       | `examples/DashboardExamplePage.vue` | —                                                                      |
| Mail                            | `examples/MailExamplePage.vue`      | `examples/MailExamplePage.vue`                                         |
| CRM                             | `examples/CrmExamplePage.vue`       | `examples/CrmExamplePage.vue`                                          |
| Marketing / Editorial / Pricing | `examples/MarketingExamplePage.vue` | `examples/EditorialExamplePage.vue`, `examples/PricingExamplePage.vue` |
| Auth / Sign-in                  | `examples/AuthExamplePage.vue`      | `examples/SigninExamplePage.vue`                                       |
| Console                         | —                                   | `examples/ConsoleExamplePage.vue`                                      |
| Settings                        | —                                   | `examples/SettingsExamplePage.vue`                                     |
| Board (kanban)                  | —                                   | `examples/BoardExamplePage.vue`                                        |

---

## Coverage summary

- **mailbox-only concepts** (no elements counterpart): Grid, Sidebar, Splitter,
  Button group, Avatar, Stepper, Rating, Divider, Stat, Dot, Pagination,
  Breadcrumb (as a discrete page), every Feedback page (Progress, Spinner,
  Placeholder, Skeleton, Empty state), Range slider / Upload / Date picker /
  Time picker as discrete pages, Dashboard example.
- **elements-only concepts** (no mailbox counterpart): Anchor as a discrete
  page, Figures, Media, Sectioning, Headings as a discrete page, the three
  Surface pages (Popover / Form / Scroll & transition), Dialog element as a
  discrete page, `useFocus`, `useNav` as a discrete composable, Inspector,
  Console / Settings / Board examples.
- **Shape mismatch (one ↔ many)**: mailbox splits `useDrag` + `useDrop` while
  elements unifies them as `useDragDrop`; mailbox splits `useTheme` +
  `useButton` while elements unifies them as `useThemeButton`; mailbox carries
  Breadcrumb and Pagination as standalone components while elements folds both
  into its Nav page; elements bundles `<details>` and `useDetails` while
  mailbox separates `AccordionPage` from `useCollapse`.
