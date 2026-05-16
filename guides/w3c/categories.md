# HTML Standard — §3.2.5 Content models (kinds of content)

> Source: <https://html.spec.whatwg.org/multipage/dom.html#content-models>

The vocabulary every element's **Contexts** and **Content model** box
resolves against. Each element falls into zero or more categories that group
elements with similar characteristics together. The category memberships
below are the lists the inspector's `content` and `context` rule families
check against.

## Contents

- [3.2.5.1 The transparent content model](#3251-the-transparent-content-model)
- [3.2.5.2 Kinds of content](#3252-kinds-of-content)
  - [3.2.5.2.1 Metadata content](#32521-metadata-content)
  - [3.2.5.2.2 Flow content](#32522-flow-content)
  - [3.2.5.2.3 Sectioning content](#32523-sectioning-content)
  - [3.2.5.2.4 Heading content](#32524-heading-content)
  - [3.2.5.2.5 Phrasing content](#32525-phrasing-content)
  - [3.2.5.2.6 Embedded content](#32526-embedded-content)
  - [3.2.5.2.7 Interactive content](#32527-interactive-content)
  - [3.2.5.2.8 Palpable content](#32528-palpable-content)
  - [3.2.5.2.9 Script-supporting elements](#32529-script-supporting-elements)
- [3.2.5.3 Paragraphs](#3253-paragraphs)
- [3.2.5.4 Inter-element whitespace](#3254-inter-element-whitespace)

---

## 3.2.5.1 The transparent content model

> Source: <https://html.spec.whatwg.org/multipage/dom.html#transparent-content-models>

Some elements are described as **transparent**; they have "transparent" in
their content model description. The content model of a transparent element
is derived from the content model of its parent element: the elements
allowed as content of a transparent element are exactly those allowed as
content of the parent element in whose context the transparent element finds
itself.

When a transparent element has no parent, its content model restrictions are
instead based on **flow content**.

For the purpose of content model conformance, a transparent element is
treated as though it were replaced in its parent by its own contents. When
transparent elements are nested, this resolution applies recursively up the
ancestor chain until a non-transparent content model is reached. Any
additional restrictions the ancestor places on its content (e.g. "no
interactive content descendants", "no `a` element descendants") continue to
apply through the transparent element to its subtree.

Transparent elements: `a`, `ins`, `del`, `object`, `video`, `audio`,
`map`, `canvas`, `slot`, and `noscript` (in some contexts).

---

## 3.2.5.2 Kinds of content

### 3.2.5.2.1 Metadata content

Metadata content is content that sets up the presentation or behavior of the
rest of the content, or that sets up the relationship of the document with
other documents, or that conveys other "out of band" information.

**Members:** `base`, `link`, `meta`, `noscript`, `script`, `style`,
`template`, `title`.

### 3.2.5.2.2 Flow content

Most elements that are used in the body of documents and applications are
categorized as flow content.

**Members:** `a`, `abbr`, `address`, `area` (if it is a descendant of a
`map` element), `article`, `aside`, `audio`, `b`, `bdi`, `bdo`,
`blockquote`, `br`, `button`, `canvas`, `cite`, `code`, `data`, `datalist`,
`del`, `details`, `dfn`, `dialog`, `div`, `dl`, `em`, `embed`, `fieldset`,
`figure`, `footer`, `form`, `h1`–`h6`, `header`, `hgroup`, `hr`, `i`,
`iframe`, `img`, `input`, `ins`, `kbd`, `label`, `link` (if it is allowed in
the body), `main` (in certain conditions), `map`, `mark`, MathML `math`,
`menu`, `meta` (if the `itemprop` attribute is present), `meter`, `nav`,
`noscript`, `object`, `ol`, `output`, `p`, `picture`, `pre`, `progress`,
`q`, `ruby`, `s`, `samp`, `script`, `search`, `section`, `select`, `slot`,
`small`, `span`, `strong`, `sub`, `sup`, SVG `svg`, `table`, `template`,
`textarea`, `time`, `u`, `ul`, `var`, `video`, `wbr`, autonomous custom
elements, and text.

### 3.2.5.2.3 Sectioning content

Sectioning content is content that defines the scope of headings and
footers.

**Members:** `article`, `aside`, `nav`, `section`.

### 3.2.5.2.4 Heading content

Heading content defines the header of a section (whether explicitly marked
up using sectioning content elements, or implied by the heading content
itself).

**Members:** `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `hgroup`.

### 3.2.5.2.5 Phrasing content

Phrasing content is the text of the document, as well as elements that mark
up that text at the intra-paragraph level. Runs of phrasing content form
paragraphs.

**Members:** `a`, `abbr`, `area` (if it is a descendant of a `map`
element), `audio`, `b`, `bdi`, `bdo`, `br`, `button`, `canvas`, `cite`,
`code`, `data`, `datalist`, `del`, `dfn`, `em`, `embed`, `i`, `iframe`,
`img`, `input`, `ins`, `kbd`, `label`, `link` (if it is allowed in the
body), `map`, `mark`, MathML `math`, `meta` (if the `itemprop` attribute is
present), `meter`, `noscript`, `object`, `output`, `picture`, `progress`,
`q`, `ruby`, `s`, `samp`, `script`, `select`, `slot`, `small`, `span`,
`strong`, `sub`, `sup`, SVG `svg`, `template`, `textarea`, `time`, `u`,
`var`, `video`, `wbr`, autonomous custom elements, and text.

Note: most elements that are categorized as phrasing content can only
contain elements that are themselves categorized as phrasing content, not
any flow content.

### 3.2.5.2.6 Embedded content

Embedded content is content that imports another resource into the document,
or content from another vocabulary that is inserted into the document.

**Members:** `audio`, `canvas`, `embed`, `iframe`, `img`, MathML `math`,
`object`, `picture`, SVG `svg`, `video`.

Elements that are from namespaces other than the HTML namespace and that
convey content but not metadata, are embedded content for the purposes of
the content models defined in this standard (e.g. MathML, or SVG).

### 3.2.5.2.7 Interactive content

Interactive content is content that is specifically intended for user
interaction.

**Members:** `a` (if the `href` attribute is present), `audio` (if the
`controls` attribute is present), `button`, `details`, `embed`, `iframe`,
`img` (if the `usemap` attribute is present), `input` (if the `type`
attribute is **not** in the Hidden state), `label`, `object` (if the
`usemap` attribute is present), `select`, `textarea`, `video` (if the
`controls` attribute is present).

### 3.2.5.2.8 Palpable content

As a general rule, elements whose content model allows any flow content or
phrasing content should have at least one node in its contents that is
palpable content and that does not have the `hidden` attribute specified.

An element is **palpable** if it contains at least one node that is either
non–[inter-element whitespace](#3254-inter-element-whitespace) text, or an
element that is itself palpable content. Palpable content makes an element
non-empty by providing either some descendant non-empty text, or else
something users can hear (`audio` elements) or view (`video`, `img`,
`canvas`) or otherwise interact with (interactive controls).

This requirement is not a hard conformance requirement; it is a should, and
is checked per-element where each element's prose calls it out.

### 3.2.5.2.9 Script-supporting elements

Script-supporting elements are elements that do not represent anything
themselves (i.e. they are not rendered), but are used to support scripts,
e.g. to provide functionality for the user.

**Members:** `script`, `template`.

Script-supporting elements are explicitly permitted, intermixed, in the
content models of `ol`, `ul`, `menu`, `dl`, `table`/`thead`/`tbody`/
`tfoot`/`tr`, `select`, `picture`, and other elements whose content model is
otherwise a constrained list — so a tree-walker must treat `script` and
`template` as always allowed wherever the spec says "optionally intermixed
with script-supporting elements".

---

## 3.2.5.3 Paragraphs

> Source: <https://html.spec.whatwg.org/multipage/dom.html#paragraphs>

A **paragraph** is typically a run of phrasing content that forms a block of
text with one or more sentences. Paragraphs can be implied (a run of
phrasing content between other block-level boundaries) or explicit (a `p`
element). The paragraph concept is used by elements such as `ins`/`del`
(which should not span across implied paragraph boundaries) and `dfn` (whose
defining instance must be in the same paragraph/section). The inspector
treats implied-paragraph crossing as an **advice**-level finding, never a
hard error, because it is not a conformance requirement.

---

## 3.2.5.4 Inter-element whitespace

> Source: <https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace>

**Inter-element whitespace** is any ASCII whitespace text node located
between an element's start tag and end tag where the element's content model
does not otherwise allow text. ASCII whitespace is always allowed between
elements, and such whitespace nodes must be ignored when establishing
whether an element's contents match the element's content model, and must be
ignored when defining document and element semantics.

A content-model walker must therefore skip pure-whitespace text nodes when
checking required-child / forbidden-child / ordering / cardinality
constraints — e.g. a `table` whose only "extra" children are whitespace text
nodes between `<tbody>` rows is still conforming.
