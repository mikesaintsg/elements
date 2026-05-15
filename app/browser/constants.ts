/**
 * Static, non-reactive showcase-shell configuration. These mirror
 * framework conventions in JS (the mobile breakpoint) or name the
 * shell's stable DOM hooks; none of them change at runtime.
 */

/**
 * Mobile breakpoint. Mirrors the framework's `960px` rail breakpoint so
 * the shell can toggle the `popover` attribute on the rails in JS in
 * lockstep with the CSS-side drawer chrome.
 */
export const MOBILE_QUERY = '(max-width: 960px)'

/**
 * IDs of the two body-shell rail elements (`<nav>` left, `<aside>`
 * right). Used to close any open rail drawer on navigation / home.
 */
export const RAIL_IDS = ['primary-rail', 'toc-rail'] as const

/** Selector for the sidebar filter input focused by the `/` shortcut. */
export const FILTER_SELECTOR = '#sidebar-filter'

/**
 * `rootMargin` for the on-this-page IntersectionObserver. The `-70%`
 * bottom inset means a section counts as "active" only once it has
 * scrolled into the top third of the scroller.
 */
export const OBSERVER_ROOT_MARGIN = '0px 0px -70% 0px'
