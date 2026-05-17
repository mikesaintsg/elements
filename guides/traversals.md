# Traversals

> Native-API-backed DOM traversal utilities — ancestor / descendant / sibling / child walks, relationship checks, batch mutation, event delegation, and keyed lookup. Package: `@elements/browser`. Source: [src/browser/traversals.ts](../src/browser/traversals.ts).

## Surface

Pure DOM operations. Simple lookups delegate to native `querySelector` / `closest` / `getElementsBy*`; predicate walks use stack/queue iteration (O(depth), no recursion limits). The node-type / matching guards and the focus set (`isElement`, `isHTMLElement`, `isTextNode`, `isTagType`, `matchesTag`, `hasClass`, `hasClasses`, `hasId`, `hasAttribute`, `createMatcher`, `isFocusable`, `findFocusableElements`, `findFirstFocusable`, `findLastFocusable`) live in [src/browser/helpers.ts](../src/browser/helpers.ts) and are documented here because they form the traversal surface.

### Guards & matching

| API | Behavior |
| --- | --- |
| `isElement(node)` | `Node \| null` → `node is Element`. |
| `isHTMLElement(node)` | `Node \| null` → `node is HTMLElement`. |
| `isTextNode(node)` | `Node \| null` → `node is Text`. |
| `isTagType(element, tag)` | `Element \| null` → `element is HTMLElementTagNameMap[tag]`. |
| `matchesTag(element, tagName)` | Case-insensitive tag check. |
| `hasClass(element, className)` / `hasClasses(element, classNames)` | Single / all-of class check. |
| `hasId(element, id)` / `hasAttribute(element, name, value?)` | Id / attribute (optional exact value) check. |
| `createMatcher(criteria)` | Build an `ElementPredicate` from a `MatcherOptions` criteria bag. |

### Ancestor

`findAncestor()`, `findAncestorByTag()`, `findAncestorByClass()`, `findAncestorById()`, `getAncestors()`, `findCommonAncestor()`, `findClosest()`, `findClosestByTag()`, `findClosestByClass()`, `findClosestById()`.

### Child

`getChildCount()`, `hasChildren()`, `isEmpty()`, `getFirstChild()`, `getLastChild()`, `getChildAt()`, `getChildren()`, `findChild()`, `findChildByTag()`, `findChildByClass()`, `findChildById()`, `findChildren()`, `findChildrenByTag()`, `findChildrenByClass()`.

### Sibling

`getNextSibling()`, `getPreviousSibling()`, `getSiblingIndex()`, `getSiblings()`, `getNextSiblings()`, `getPreviousSiblings()`, `findNextSibling()`, `findNextSiblingByTag()`, `findNextSiblingByClass()`, `findPreviousSibling()`, `findPreviousSiblingByTag()`, `findPreviousSiblingByClass()`, `getParent()`.

### Descendant

`findDescendant()`, `findDescendantByTag()`, `findDescendantByClass()`, `findDescendantById()`, `findAllDescendants()`, `findDescendantsWithLimit()`, `walkDescendants()`, `walkDescendantsGenerator()`, `walkDescendantsBreadthFirst()`, `getDescendantsByTag()`, `getDescendantsByClass()`, `getFirstDescendantByTag()`, `getFirstDescendantByClass()`.

`walkDescendantsGenerator()` is a generator (`export function*`) — it yields each descendant lazily for `for…of` consumption, unlike the eager `walkDescendants()` callback walker.

### Document & relationships

`getElementById()`, `getElementsByTag()`, `getElementsByClass()`, `getElementsByName()`, `isDescendantOf()`, `isAncestorOf()`, `isSiblingOf()`, `isBefore()`, `isAfter()`, `contains()`, `getTreeDistance()`, `getPathToAncestor()`.

`getElementById(id, doc?)` returns `HTMLElement | null` (no generics; `doc` defaults to the global `document`).

### Visibility & collections

`isInViewport()`, `isPartiallyInViewport()`, `isRendered()`, `getViewportVisibility()`, `toArray()`, `findInCollection()`, `filterCollection()`.

`getViewportVisibility()` returns the percentage (0–100) of the element's area within the viewport — `0` fully off-screen, `100` fully visible.

### Batch DOM mutation

`append()`, `prepend()`, `insertBefore()`, `insertAfter()`, `replace()`, `clear()`, `remove()`, `move()`, `swap()`, `clone()`.

`clone(element, deep?)` returns `Element` (`deep` defaults to `true`).

### Delegation, focus & keyed

`delegate()`, `isFocusable()`, `findFocusableElements()`, `findFirstFocusable()`, `findLastFocusable()`, `findByKey()`, `getAllKeyed()`.

`delegate(container, eventType, selectorOrPredicate, handler)` overloads on a tag-name `string` selector or an `ElementPredicate`, and returns a cleanup function.

## Contract

1. **DOC → SOURCE.** Every backticked call-form API here is a real `export` in [src/browser/traversals.ts](../src/browser/traversals.ts) or [src/browser/helpers.ts](../src/browser/helpers.ts).
2. **SOURCE → DOC.** Every `traversals.ts` export is documented above — the surface is exhaustive.
3. **TYPES ARE THE SOURCE OF TRUTH.** `ElementPredicate` and `MatcherOptions` are declared in [src/browser/types.ts](../src/browser/types.ts).
4. **NO ASSERTIONS.** No `!` / `as` / `any` — every narrowing is a guard.
5. **PURE DOM.** No Vue, no framework state; safe to import standalone.
6. **LIVE vs STATIC COLLECTIONS.** `getDescendantsByTag()`, `getDescendantsByClass()`, `getElementsByTag()`, and `getElementsByClass()` return LIVE `HTMLCollection` objects that update automatically when the DOM changes; `getChildren()` and `toArray()` return a static array snapshot — use `toArray()` to freeze a live collection before mutating the DOM during iteration.

Enforced by [`tests/guides/traversals.test.ts`](../tests/guides/traversals.test.ts) (doc ↔ source parity, bidirectional) and [`tests/src/browser/traversals.test.ts`](../tests/src/browser/traversals.test.ts) (DOM behavior).

## Patterns

```ts
import { findAncestorByClass, findChildren, delegate, hasClass } from '@elements/browser'

const card = findAncestorByClass(button, 'card')
const items = findChildren(list, (el) => hasClass(el, 'item'))
const off = delegate(list, 'click', 'button', (el) => console.log(el))
off()
```

## Tests

- [`tests/src/browser/traversals.test.ts`](../tests/src/browser/traversals.test.ts) — per-helper DOM behavior.
- [`tests/guides/traversals.test.ts`](../tests/guides/traversals.test.ts) — doc ↔ source parity (bidirectional).

## See also

- [README.md](README.md) — the pointer file; the full repository map by concept and by directory.
- [composables.md](composables.md) — the Vue/factory layer that builds on these DOM primitives.
