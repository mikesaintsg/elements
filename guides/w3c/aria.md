# HTML Standard — Implicit ARIA roles (appendix)

> Source: W3C **ARIA in HTML** <https://www.w3.org/TR/html-aria/> ·
> HTML-AAM <https://www.w3.org/TR/html-aam-1.0/>

Scoped appendix: the **implicit ARIA role** of each element the HTML
content model references. The inspector needs this only where a role is
content-model-relevant (e.g. `main`'s "hierarchically correct" rule, the
`li`↔`ul`/`ol`/`menu` list relationship, table row/cell roles, the
no-interactive-content rules). It is **not** an accessibility auditor — it
does not check ARIA state/property validity (axe-core's domain). Each
element's per-element card links the authoritative
`html-aria/#el-{tag}` (authors) and `html-aam/#el-{tag}` (implementers).

A blank / "none\*" role means the element has **no corresponding role** (it
is not mapped to the accessibility tree as a distinct role, or maps to
`generic`). Conditional rows state the condition.

## Contents

- [Document & sections](#document--sections)
- [Grouping & text content](#grouping--text-content)
- [Inline text semantics](#inline-text-semantics)
- [Embedded & media](#embedded--media)
- [Tabular data](#tabular-data)
- [Forms](#forms)
- [Interactive elements](#interactive-elements)
- [Content-model-relevant notes](#content-model-relevant-notes)

---

## Document & sections

| Element   | Implicit role                                     | Condition                                                                                                                        |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `html`    | `document`                                        | —                                                                                                                                |
| `body`    | _(generic; the document role attaches to `html`)_ | —                                                                                                                                |
| `article` | `article`                                         | —                                                                                                                                |
| `section` | `region`                                          | if it has an accessible name (`aria-label`/`aria-labelledby`/heading); otherwise _generic_                                       |
| `nav`     | `navigation`                                      | —                                                                                                                                |
| `aside`   | `complementary`                                   | scoped to `body`; when scoped to `article`/`aside`/`nav`/`section` **with** an accessible name → `complementary`, else _generic_ |
| `header`  | `banner`                                          | when **not** a descendant of `article`/`aside`/`main`/`nav`/`section`; otherwise _generic_                                       |
| `footer`  | `contentinfo`                                     | when **not** a descendant of `article`/`aside`/`main`/`nav`/`section`; otherwise _generic_                                       |
| `main`    | `main`                                            | —                                                                                                                                |
| `search`  | `search`                                          | —                                                                                                                                |
| `h1`–`h6` | `heading` (with `aria-level` = digit)             | —                                                                                                                                |
| `hgroup`  | `group`                                           | —                                                                                                                                |
| `address` | `group`                                           | —                                                                                                                                |

## Grouping & text content

| Element      | Implicit role           | Condition                                             |
| ------------ | ----------------------- | ----------------------------------------------------- |
| `p`          | `paragraph`             | —                                                     |
| `hr`         | `separator`             | —                                                     |
| `pre`        | _generic_               | —                                                     |
| `blockquote` | `blockquote`            | —                                                     |
| `ol` / `ul`  | `list`                  | —                                                     |
| `menu`       | `list`                  | —                                                     |
| `li`         | `listitem`              | when a child of `ol`/`ul`/`menu`; otherwise _generic_ |
| `dl`         | _no corresponding role_ | —                                                     |
| `dt`         | `term`                  | —                                                     |
| `dd`         | `definition`            | —                                                     |
| `figure`     | `figure`                | —                                                     |
| `figcaption` | _no corresponding role_ | —                                                     |
| `div`        | _generic_               | —                                                     |

## Inline text semantics

| Element                                                                                                                    | Implicit role                     |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `a` (with `href`)                                                                                                          | `link`                            |
| `a` (without `href`)                                                                                                       | _generic_                         |
| `em`                                                                                                                       | `emphasis`                        |
| `strong`                                                                                                                   | `strong`                          |
| `code`                                                                                                                     | `code`                            |
| `s`                                                                                                                        | `deletion`                        |
| `del`                                                                                                                      | `deletion`                        |
| `ins`                                                                                                                      | `insertion`                       |
| `sub`                                                                                                                      | `subscript`                       |
| `sup`                                                                                                                      | `superscript`                     |
| `mark`                                                                                                                     | `mark`                            |
| `time`                                                                                                                     | `time`                            |
| `dfn`                                                                                                                      | `term`                            |
| `abbr`, `b`, `bdi`, `bdo`, `cite`, `data`, `i`, `kbd`, `q`, `rp`, `rt`, `ruby`, `samp`, `small`, `span`, `u`, `var`, `wbr` | _no corresponding role / generic_ |
| `br`                                                                                                                       | _no corresponding role_           |

## Embedded & media

| Element                              | Implicit role                  | Condition                     |
| ------------------------------------ | ------------------------------ | ----------------------------- |
| `img` (non-empty `alt`, or no `alt`) | `image`                        | —                             |
| `img` (`alt=""`)                     | `presentation` / `none`        | empty alt = decorative        |
| `picture`                            | _no corresponding role_        | —                             |
| `svg`                                | `graphics-document` (img-like) | —                             |
| `math`                               | `math`                         | —                             |
| `canvas`                             | _no corresponding role_        | (fallback subtree is exposed) |
| `audio`                              | _no corresponding role_        | —                             |
| `video`                              | _no corresponding role_        | —                             |
| `track`                              | _no corresponding role_        | —                             |
| `iframe`, `embed`, `object`          | _no corresponding role_        | (embedded content is exposed) |
| `map`                                | _no corresponding role_        | —                             |
| `area` (with `href`)                 | `link`                         | —                             |
| `area` (without `href`)              | _generic_                      | —                             |

## Tabular data

| Element                     | Implicit role                | Condition                                    |
| --------------------------- | ---------------------------- | -------------------------------------------- |
| `table`                     | `table`                      | (a layout table maps to _presentation_)      |
| `caption`                   | `caption`                    | —                                            |
| `colgroup` / `col`          | _no corresponding role_      | —                                            |
| `thead` / `tbody` / `tfoot` | `rowgroup`                   | —                                            |
| `tr`                        | `row`                        | —                                            |
| `td`                        | `cell`                       | in a `table` context (`gridcell` in a grid)  |
| `th`                        | `columnheader` / `rowheader` | resolved via `scope` / header categorization |

## Forms

| Element                                                                              | Implicit role           | Condition                               |
| ------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------- |
| `form`                                                                               | `form`                  | —                                       |
| `label`, `legend`                                                                    | _no corresponding role_ | —                                       |
| `fieldset`                                                                           | `group`                 | —                                       |
| `button`                                                                             | `button`                | —                                       |
| `select`                                                                             | `combobox`              | single-line (no `multiple`, `size` ≤ 1) |
| `select`                                                                             | `listbox`               | `multiple` present or display size > 1  |
| `optgroup`                                                                           | `group`                 | —                                       |
| `option`                                                                             | `option`                | —                                       |
| `datalist`                                                                           | `listbox`               | —                                       |
| `output`                                                                             | `status`                | —                                       |
| `progress`                                                                           | `progressbar`           | —                                       |
| `meter`                                                                              | `meter`                 | —                                       |
| `textarea`                                                                           | `textbox`               | —                                       |
| `input[type=text\|tel\|url\|email]`                                                  | `textbox`               | (`url`/`email` map to textbox)          |
| `input[type=search]`                                                                 | `searchbox`             | —                                       |
| `input[type=number]`                                                                 | `spinbutton`            | —                                       |
| `input[type=range]`                                                                  | `slider`                | —                                       |
| `input[type=checkbox]`                                                               | `checkbox`              | —                                       |
| `input[type=radio]`                                                                  | `radio`                 | —                                       |
| `input[type=button]`                                                                 | `button`                | —                                       |
| `input[type=submit\|reset\|image]`                                                   | `button`                | —                                       |
| `input[type=text]` + `list` attr                                                     | `combobox`              | when associated with a `datalist`       |
| `input[type=hidden\|password\|color\|date\|month\|week\|time\|datetime-local\|file]` | _no corresponding role_ | —                                       |

## Interactive elements

| Element   | Implicit role           | Condition                                        |
| --------- | ----------------------- | ------------------------------------------------ |
| `details` | `group`                 | —                                                |
| `summary` | _no corresponding role_ | it is the disclosure control for its `details`   |
| `dialog`  | `dialog`                | (modal `dialog` → `dialog` with modal semantics) |

## Content-model-relevant notes

These are the only places the inspector actually consumes implicit-role
data (everything else above is reference):

- **`main` hierarchically correct** — a `main` is conforming only if every
  ancestor is `html`, `body`, `div`, or a `form` **without an accessible
  name**, or an autonomous custom element. The "without an accessible
  name" clause is role/name-relevant: a `form` with `aria-label` /
  `aria-labelledby` / a `title` exposes the `form` role with a name and
  therefore disqualifies a descendant `main`.
- **List relationship** — `li` only carries `listitem` semantics under
  `ol`/`ul`/`menu`; the presentation lens additionally flags `list-style:
none` + non-`list-item` `display` stripping the list role without a
  compensating `role="list"` (see `renderings.md` §15.3.7).
- **Table model** — `tr`→`row`, `td`→`cell`, `th`→`columnheader`/
  `rowheader`, `thead`/`tbody`/`tfoot`→`rowgroup`. The presentation lens
  flags a `table` whose `display` is overridden off the table model
  without compensating ARIA table roles (see `renderings.md` §15.3.8).
- **Interactive-content roles** — the no-interactive-content-descendant
  rule for `a[href]` / `button` / `canvas` (allowlist) is decided
  structurally from the _interactive content_ category
  ([`categories.md`](categories.md) §3.2.5.2.7), not from ARIA; this
  appendix is only the lookup for messages/diagnostics.
- **`img` alt polarity** — `alt=""` → `presentation`/`none` (decorative);
  any other state → `image`. Relevant where a decorative `img` appears in
  a context that expects meaningful embedded content.
- **`a`/`area` role flips on `href`** — both are _generic_ without `href`
  and `link` with it; this mirrors the HTML _interactive content_ category
  membership (`a`/`area` are interactive **only** with `href`).
