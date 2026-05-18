# HTML Standard — §15 Rendering

> Source: <https://html.spec.whatwg.org/multipage/rendering.html#rendering>

## Contents

- [15.1 Introduction](#151-introduction)
- [15.2 The CSS user agent style sheet and presentational hints](#152-the-css-user-agent-style-sheet-and-presentational-hints)
- [15.3 Non-replaced elements](#153-non-replaced-elements)
  - [15.3.1 Hidden elements](#1531-hidden-elements)
  - [15.3.2 The page](#1532-the-page)
  - [15.3.3 Flow content](#1533-flow-content)
  - [15.3.4 Phrasing content](#1534-phrasing-content)
  - [15.3.5 Bidirectional text](#1535-bidirectional-text)
  - [15.3.6 Sections and headings](#1536-sections-and-headings)
  - [15.3.7 Lists](#1537-lists)
  - [15.3.8 Tables](#1538-tables)
  - [15.3.9 Margin collapsing quirks](#1539-margin-collapsing-quirks)
  - [15.3.10 Form controls](#15310-form-controls)
  - [15.3.11 The hr element](#15311-the-hr-element)
  - [15.3.12 The fieldset and legend elements](#15312-the-fieldset-and-legend-elements)
- [15.4 Replaced elements](#154-replaced-elements)
  - [15.4.1 Embedded content](#1541-embedded-content)
  - [15.4.2 Images](#1542-images)
  - [15.4.3 Attributes for embedded content and images](#1543-attributes-for-embedded-content-and-images)
  - [15.4.4 Image maps](#1544-image-maps)
- [15.5 Widgets](#155-widgets)
  - [15.5.1 Native appearance](#1551-native-appearance)
  - [15.5.2 Writing mode](#1552-writing-mode)
  - [15.5.3 Button layout](#1553-button-layout)
  - [15.5.4 The button element](#1554-the-button-element)
  - [15.5.5 The details and summary elements](#1555-the-details-and-summary-elements)
  - [15.5.6 The input element as a text entry widget](#1556-the-input-element-as-a-text-entry-widget)
  - [15.5.7 The input element as domain-specific widgets](#1557-the-input-element-as-domain-specific-widgets)
  - [15.5.8 The input element as a range control](#1558-the-input-element-as-a-range-control)
  - [15.5.9 The input element as a color well](#1559-the-input-element-as-a-color-well)
  - [15.5.10 The input element as a checkbox and radio button widgets](#15510-the-input-element-as-a-checkbox-and-radio-button-widgets)
  - [15.5.11 The input element as a file upload control](#15511-the-input-element-as-a-file-upload-control)
  - [15.5.12 The input element as a button](#15512-the-input-element-as-a-button)
  - [15.5.13 The marquee element](#15513-the-marquee-element)
  - [15.5.14 The meter element](#15514-the-meter-element)
  - [15.5.15 The progress element](#15515-the-progress-element)
  - [15.5.16 The select element](#15516-the-select-element)
  - [15.5.17 The textarea element](#15517-the-textarea-element)
- [15.6 Frames and framesets](#156-frames-and-framesets)
- [15.7 Interactive media](#157-interactive-media)
  - [15.7.1 Links, forms, and navigation](#1571-links-forms-and-navigation)
  - [15.7.2 The title attribute](#1572-the-title-attribute)
  - [15.7.3 Editing hosts](#1573-editing-hosts)
  - [15.7.4 Text rendered in native user interfaces](#1574-text-rendered-in-native-user-interfaces)
- [15.8 Print media](#158-print-media)
- [15.9 Unstyled XML documents](#159-unstyled-xml-documents)

---

## 15 Rendering

_User agents are not required to present HTML documents in any particular way. However, this section provides a set of suggestions for rendering HTML documents that, if followed, are likely to lead to a user experience that closely resembles the experience intended by the documents' authors. So as to avoid confusion regarding the normativity of this section, "must" has not been used. Instead, the term "expected" is used to indicate behavior that will lead to this experience. For the purposes of conformance for user agents designated as [supporting the suggested default rendering](infrastructure.html#renderingUA), the term "expected" in this section has the same conformance implications as "must"._

### 15.1 Introduction

The suggestions in this section are generally expressed in CSS terms. User agents are[expected](#expected) to either support CSS, or translate from the CSS rules given in this section to approximations for other presentation mechanisms.

In the absence of style-layer rules to the contrary (e.g. author style sheets), user agents are[expected](#expected) to render an element so that it conveys to the user the meaning that the element [represents](dom.html#represents), as described by this specification.

The suggestions in this section generally assume a visual output medium with a resolution of 96dpi or greater, but HTML is intended to apply to multiple media (it is a*media-independent* language). User agent implementers are encouraged to adapt the suggestions in this section to their target media.

---

An element is being rendered if it has any associated CSS layout boxes, SVG layout boxes, or some equivalent in other styling languages.

Just being off-screen does not mean the element is not [being rendered](#being-rendered). The presence of the `[hidden](interaction.html#attr-hidden)` attribute normally means the element is not [being rendered](#being-rendered), though this might be overridden by the style sheets.

The [fully active](document-sequences.html#fully-active) state does not affect whether an element is[being rendered](#being-rendered) or not. Even if a document is not [fully active](document-sequences.html#fully-active) and not shown at all to the user, elements within it can still qualify as "being rendered".

An element is said to intersect the viewport when it is [being rendered](#being-rendered) and its associated CSS layout box intersects the [viewport](https://drafts.csswg.org/css2/#viewport).

Similar to the [being rendered](#being-rendered) state, elements in non-[fully active](document-sequences.html#fully-active) documents can still [intersect the viewport](#intersect-the-viewport). The [viewport](https://drafts.csswg.org/css2/#viewport) is not shared between documents and might not always be shown to the user, so an element in a non-[fully active](document-sequences.html#fully-active) document can still intersect the [viewport](https://drafts.csswg.org/css2/#viewport) associated with its document.

This specification does not define the precise timing for when the intersection is tested, but it is suggested that the timing match that of the Intersection Observer API. [\[INTERSECTIONOBSERVER\]](references.html#refsINTERSECTIONOBSERVER)

An element is delegating its rendering to its children if it is not [being rendered](#being-rendered) but its children (if any) could [be rendered](#being-rendered), as a result of CSS 'display: contents', or some equivalent in other styling languages.[\[CSSDISPLAY\]](references.html#refsCSSDISPLAY)

---

User agents that do not honor author-level CSS style sheets are nonetheless[expected](#expected) to act as if they applied the CSS rules given in these sections in a manner consistent with this specification and the relevant CSS and Unicode specifications.[\[CSS\]](references.html#refsCSS) [\[UNICODE\]](references.html#refsUNICODE) [\[BIDI\]](references.html#refsBIDI)

This is especially important for issues relating to the ['display'](https://drafts.csswg.org/css2/#display-prop),['unicode-bidi'](https://drafts.csswg.org/css-writing-modes/#unicode-bidi), and ['direction'](https://drafts.csswg.org/css-writing-modes/#direction) properties.

### 15.2 The CSS user agent style sheet and presentational hints

The CSS rules given in these subsections are, except where otherwise specified,[expected](#expected) to be used as part of the user-agent level style sheet defaults for all documents that contain [HTML elements](infrastructure.html#html-elements).

Some rules are intended for the author-level zero-specificity presentational hints part of the CSS cascade; these are explicitly called out as presentational hints.

---

When the text below says that an attribute attribute on an elementelement maps to the pixel length property (or properties)properties, it means that if element has an attribute attribute set, and parsing that attribute's value using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) doesn't generate an error, then the user agent is [expected](#expected) to use the parsed value as a pixel length for a [presentational hint](#presentational-hints) for properties.

When the text below says that an attribute attribute on an elementelement maps to the dimension property (or properties)properties, it means that if element has an attribute attribute set, and parsing that attribute's value using the [rules for parsing dimension values](common-microsyntaxes.html#rules-for-parsing-dimension-values) doesn't generate an error, then the user agent is [expected](#expected) to use the parsed dimension as the value for a [presentational hint](#presentational-hints) forproperties, with the value given as a pixel length if the dimension was a length, and with the value given as a percentage if the dimension was a percentage.

When the text below says that an attribute attribute on an elementelement maps to the dimension property (ignoring zero) (or properties)properties, it means that if element has an attribute attribute set, and parsing that attribute's value using the [rules for parsing nonzero dimension values](common-microsyntaxes.html#rules-for-parsing-non-zero-dimension-values) doesn't generate an error, then the user agent is [expected](#expected) to use the parsed dimension as the value for a [presentational hint](#presentational-hints) for properties, with the value given as a pixel length if the dimension was a length, and with the value given as a percentage if the dimension was a percentage.

When the text below says that a pair of attributes w and h on an element element map to the aspect-ratio property, it means that ifelement has both attributes w and h, and parsing those attributes' values using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) doesn't generate an error for either, then the user agent is [expected](#expected) to use the parsed integers as a [presentational hint](#presentational-hints) for the['aspect-ratio'](https://drafts.csswg.org/css-sizing-4/#aspect-ratio) property of the form `auto w /h`.

When the text below says that a pair of attributes w and h on an element element map to the aspect-ratio property (using dimension rules), it means that if element has both attributes w and h, and parsing those attributes' values using the [rules for parsing dimension values](common-microsyntaxes.html#rules-for-parsing-dimension-values) doesn't generate an error or return a percentage for either, then the user agent is [expected](#expected) to use the parsed dimensions as a [presentational hint](#presentational-hints) for the ['aspect-ratio'](https://drafts.csswg.org/css-sizing-4/#aspect-ratio) property of the form `auto w /h`.

When a user agent is to align descendants of a node, the user agent is[expected](#expected) to align only those descendants that have both their['margin-inline-start'](https://drafts.csswg.org/css-logical/#propdef-margin-inline-start) and ['margin-inline-end'](https://drafts.csswg.org/css-logical/#propdef-margin-inline-end) properties computing to a value other than 'auto', that are over-constrained and that have one of those two margins with a[used value](https://drafts.csswg.org/css-cascade/#used-value) forced to a greater value, and that do not themselves have an applicable`align` attribute. When multiple elements are to [align](#align-descendants) a particular descendant, the most deeply nested such element is[expected](#expected) to override the others. Aligned elements are [expected](#expected) to be aligned by having the [used values](https://drafts.csswg.org/css-cascade/#used-value) of their margins on the[line-left](https://drafts.csswg.org/css-writing-modes/#line-left) and [line-right](https://drafts.csswg.org/css-writing-modes/#line-right) sides be set accordingly.[\[CSSLOGICAL\]](references.html#refsCSSLOGICAL) [\[CSSWM\]](references.html#refsCSSWM)

### 15.3 Non-replaced elements

#### 15.3.1 Hidden elements

```
@namespace "http://www.w3.org/1999/xhtml";

area, base, basefont, datalist, head, link, meta, noembed,
noframes, param, rp, script, style, template, title {
  display: none;
}

[hidden]:not([hidden=until-found i]):not(embed) {
  display: none;
}

[hidden=until-found i]:not(embed) {
  content-visibility: hidden;
}

embed[hidden] { display: inline; height: 0; width: 0; }

input[type=hidden i] { display: none !important; }

@media (scripting) {
  noscript { display: none !important; }
}
```

#### 15.3.2 The page

```
@namespace "http://www.w3.org/1999/xhtml";

html, body { display: block; }
```

For each property in the table below, given a `[body](sections.html#the-body-element)` element, the first attribute that exists [maps to the pixel length property](#maps-to-the-pixel-length-property) on the `[body](sections.html#the-body-element)` element. If none of the attributes for a property are found, or if the value of the attribute that was found cannot be parsed successfully, then a default value of 8px is [expected](#expected) to be used for that property instead.

Property

Source

['margin-top'](https://drafts.csswg.org/css-box/#propdef-margin-top), ['margin-bottom'](https://drafts.csswg.org/css-box/#propdef-margin-bottom)

The `[body](sections.html#the-body-element)` element's `[marginheight](obsolete.html#attr-body-marginheight)` attributeThe `[body](sections.html#the-body-element)` element's `[topmargin](obsolete.html#attr-body-topmargin)` attributeThe `[body](sections.html#the-body-element)` element's [container frame element](#container-frame-element)'s `[marginheight](obsolete.html#attr-iframe-marginheight)` attribute

['margin-left'](https://drafts.csswg.org/css-box/#propdef-margin-left), ['margin-right'](https://drafts.csswg.org/css-box/#propdef-margin-right)

The `[body](sections.html#the-body-element)` element's `[marginwidth](obsolete.html#attr-body-marginwidth)` attributeThe `[body](sections.html#the-body-element)` element's `[leftmargin](obsolete.html#attr-body-leftmargin)` attribute

The `[body](sections.html#the-body-element)` element's [container frame element](#container-frame-element)'s `[marginwidth](obsolete.html#attr-iframe-marginwidth)` attribute

If the `[body](sections.html#the-body-element)` element's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s [node navigable](document-sequences.html#node-navigable) is a [child navigable](document-sequences.html#child-navigable), and the [container](document-sequences.html#nav-container) of that[navigable](document-sequences.html#navigable) is a `[frame](obsolete.html#frame)` or `[iframe](iframe-embed-object.html#the-iframe-element)` element, then thecontainer frame element of the `[body](sections.html#the-body-element)` element is that `[frame](obsolete.html#frame)` or`[iframe](iframe-embed-object.html#the-iframe-element)` element. Otherwise, there is no [container frame element](#container-frame-element).

The above requirements imply that a page can change the margins of another page (including one from another [origin](browsers.html#concept-origin)) using, for example, an `[iframe](iframe-embed-object.html#the-iframe-element)`. This is potentially a security risk, as it might in some cases allow an attack to contrive a situation in which a page is rendered not as the author intended, possibly for the purposes of phishing or otherwise misleading the user.

---

If a `[Document](dom.html#document)`'s [node navigable](document-sequences.html#node-navigable) is a [child navigable](document-sequences.html#child-navigable), then it is [expected](#expected) to be positioned and sized to fit inside the [content box](https://drafts.csswg.org/css-box/#content-box) of the [container](document-sequences.html#nav-container) of that [navigable](document-sequences.html#navigable). If the [container](document-sequences.html#nav-container) is not [being rendered](#being-rendered), the[navigable](document-sequences.html#navigable) is [expected](#expected) to have a [viewport](https://drafts.csswg.org/css2/#viewport) with zero width and zero height.

If a `[Document](dom.html#document)`'s [node navigable](document-sequences.html#node-navigable) is a [child navigable](document-sequences.html#child-navigable), the [container](document-sequences.html#nav-container) of that [navigable](document-sequences.html#navigable) is a`[frame](obsolete.html#frame)` or `[iframe](iframe-embed-object.html#the-iframe-element)` element, that element has a `scrolling` attribute, and that attribute's value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`off`", "`noscroll`", or "`no`", then the user agent is[expected](#expected) to prevent any scrollbars from being shown for the [viewport](https://drafts.csswg.org/css2/#viewport) of the `[Document](dom.html#document)`'s [node navigable](document-sequences.html#node-navigable), regardless of the['overflow'](https://drafts.csswg.org/css-overflow/#propdef-overflow) property that applies to that [viewport](https://drafts.csswg.org/css2/#viewport).

---

When a `[body](sections.html#the-body-element)` element has a `[background](obsolete.html#attr-background)` attribute set to a non-empty value, the new value is [expected](#expected) to be [encoding-parsed-and-serialized](urls-and-fetching.html#encoding-parsing-and-serializing-a-url) relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['background-image'](https://drafts.csswg.org/css-backgrounds/#propdef-background-image) property to the return value.

When a `[body](sections.html#the-body-element)` element has a `[bgcolor](obsolete.html#attr-body-bgcolor)` attribute set, the new value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color) property to the resulting color.

When a `[body](sections.html#the-body-element)` element has a `[text](obsolete.html#attr-body-text)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['color'](https://drafts.csswg.org/css-color/#the-color-property) property to the resulting color.

When a `[body](sections.html#the-body-element)` element has a `[link](obsolete.html#attr-body-link)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the ['color'](https://drafts.csswg.org/css-color/#the-color-property) property of any element in the `[Document](dom.html#document)` matching the `[:link](semantics-other.html#selector-link)` [pseudo-class](https://drafts.csswg.org/selectors/#pseudo-class) to the resulting color.

When a `[body](sections.html#the-body-element)` element has a `[vlink](obsolete.html#attr-body-vlink)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the ['color'](https://drafts.csswg.org/css-color/#the-color-property) property of any element in the `[Document](dom.html#document)` matching the `[:visited](semantics-other.html#selector-visited)` [pseudo-class](https://drafts.csswg.org/selectors/#pseudo-class) to the resulting color.

When a `[body](sections.html#the-body-element)` element has an `[alink](obsolete.html#attr-body-alink)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the ['color'](https://drafts.csswg.org/css-color/#the-color-property) property of any element in the `[Document](dom.html#document)` matching the`[:active](semantics-other.html#selector-active)` [pseudo-class](https://drafts.csswg.org/selectors/#pseudo-class) and either the `[:link](semantics-other.html#selector-link)` [pseudo-class](https://drafts.csswg.org/selectors/#pseudo-class) or the `[:visited](semantics-other.html#selector-visited)` [pseudo-class](https://drafts.csswg.org/selectors/#pseudo-class) to the resulting color.

#### 15.3.3 Flow content

```
@namespace "http://www.w3.org/1999/xhtml";

address, blockquote, center, dialog, div, figure, figcaption, footer, form,
header, hr, legend, listing, main, p, plaintext, pre, search, xmp {
  display: block;
}

blockquote, figure, listing, p, plaintext, pre, xmp {
  margin-block: 1em;
}

blockquote, figure { margin-inline: 40px; }

address { font-style: italic; }
listing, plaintext, pre, xmp {
  font-family: monospace; white-space: pre;
}

dialog:not([open]) { display: none; }
dialog {
  position: absolute;
  inset-inline-start: 0; inset-inline-end: 0;
  width: fit-content;
  height: fit-content;
  margin: auto;
  border: solid;
  padding: 1em;
  background-color: Canvas;
  color: CanvasText;
}
dialog:modal {
  position: fixed;
  overflow: auto;
  inset-block: 0;
  max-width: calc(100% - 6px - 2em);
  max-height: calc(100% - 6px - 2em);
}
dialog::backdrop {
  background: rgba(0,0,0,0.1);
}

[popover]:not(:popover-open):not(dialog[open]) {
  display:none;
}

dialog:popover-open {
  display:block;
}

[popover] {
  position: fixed;
  inset: 0;
  width: fit-content;
  height: fit-content;
  margin: auto;
  border: solid;
  padding: 0.25em;
  overflow: auto;
  color: CanvasText;
  background-color: Canvas;
}

:popover-open::backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none !important;
  background-color: transparent;
}

slot {
  display: contents;
}
```

The following rules are also [expected](#expected) to apply, as [presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

pre[wrap] { white-space: pre-wrap; }
```

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), the following rules are also [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

form { margin-block-end: 1em; }
```

---

The `[center](obsolete.html#center)` element, and the `[div](grouping-content.html#the-div-element)` element when it has an `[align](obsolete.html#attr-div-align)` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for either the string "`center`" or the string "`middle`", are [expected](#expected) to center text within themselves, as if they had their ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'center' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the center.

The `[div](grouping-content.html#the-div-element)` element, when it has an `[align](obsolete.html#attr-div-align)` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`left`", is [expected](#expected) to left-align text within itself, as if it had its ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'left' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the left.

The `[div](grouping-content.html#the-div-element)` element, when it has an `[align](obsolete.html#attr-div-align)` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`right`", is [expected](#expected) to right-align text within itself, as if it had its ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'right' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the right.

The `[div](grouping-content.html#the-div-element)` element, when it has an `[align](obsolete.html#attr-div-align)` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`justify`", is [expected](#expected) to full-justify text within itself, as if it had its ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'justify' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the left.

#### 15.3.4 Phrasing content

```
@namespace "http://www.w3.org/1999/xhtml";

cite, dfn, em, i, var { font-style: italic; }
b, strong { font-weight: bolder; }
code, kbd, samp, tt { font-family: monospace; }
big { font-size: larger; }
small { font-size: smaller; }

sub { vertical-align: sub; }
sup { vertical-align: super; }
sub, sup { line-height: normal; font-size: smaller; }

ruby { display: ruby; }
rt { display: ruby-text; }

:link { color: #0000EE; }
:visited { color: #551A8B; }
:link:active, :visited:active { color: #FF0000; }
:link, :visited { text-decoration: underline; cursor: pointer; }

:focus-visible { outline: auto; }

mark { background: yellow; color: black; } /* this color is just a suggestion and can be changed based on implementation feedback */

abbr[title], acronym[title] { text-decoration: dotted underline; }
ins, u { text-decoration: underline; }
del, s, strike { text-decoration: line-through; }

q::before { content: open-quote; }
q::after { content: close-quote; }

br { display-outside: newline; } /* this also has bidi implications */
nobr { white-space: nowrap; }
wbr { display-outside: break-opportunity; } /* this also has bidi implications */
nobr wbr { white-space: normal; }
```

The following rules are also [expected](#expected) to apply, as[presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

br[clear=left i] { clear: left; }
br[clear=right i] { clear: right; }
br[clear=all i], br[clear=both i] { clear: both; }
```

For the purposes of the CSS ruby model, runs of children of `[ruby](text-level-semantics.html#the-ruby-element)` elements that are not `[rt](text-level-semantics.html#the-rt-element)` or `[rp](text-level-semantics.html#the-rp-element)` elements are [expected](#expected) to be wrapped in anonymous boxes whose ['display'](https://drafts.csswg.org/css2/#display-prop) property has the value ['ruby-base'](https://drafts.csswg.org/css-ruby/#valdef-display-ruby-base).[\[CSSRUBY\]](references.html#refsCSSRUBY)

When a particular part of a ruby has more than one annotation, the annotations should be distributed on both sides of the base text so as to minimize the stacking of ruby annotations on one side.

When it becomes possible to do so, the preceding requirement will be updated to be expressed in terms of CSS ruby. (Currently, CSS ruby does not handle nested `[ruby](text-level-semantics.html#the-ruby-element)` elements or multiple sequential `[rt](text-level-semantics.html#the-rt-element)` elements, which is how this semantic is expressed.)

User agents that do not support correct ruby rendering are [expected](#expected) to render parentheses around the text of `[rt](text-level-semantics.html#the-rt-element)` elements in the absence of `[rp](text-level-semantics.html#the-rp-element)` elements.

---

User agents are [expected](#expected) to support the ['clear'](https://drafts.csswg.org/css2/#flow-control) property on inline elements (in order to render `[br](text-level-semantics.html#the-br-element)` elements with `[clear](obsolete.html#attr-br-clear)` attributes) in the manner described in the non-normative note to this effect in CSS.

The initial value for the ['color'](https://drafts.csswg.org/css-color/#the-color-property) property is [expected](#expected) to be black. The initial value for the ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color) property is [expected](#expected) to be 'transparent'. The canvas's background is [expected](#expected) to be white.

---

When a `[font](obsolete.html#font)` element has a `color` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['color'](https://drafts.csswg.org/css-color/#the-color-property) property to the resulting color.

When a `[font](obsolete.html#font)` element has a `face` attribute, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's['font-family'](https://drafts.csswg.org/css-fonts/#font-family-prop) property to the attribute's value.

When a `[font](obsolete.html#font)` element has a `size` attribute, the user agent is [expected](#expected) to use the following steps, known as therules for parsing a legacy font size, to treat the attribute as a [presentational hint](#presentational-hints) setting the element's['font-size'](https://drafts.csswg.org/css-fonts/#font-size-prop) property:

Let input be the attribute's value.Let position be a pointer into input, initially pointing at the start of the string.[Skip ASCII whitespace](https://infra.spec.whatwg.org/#skip-ascii-whitespace) within input givenposition.If position is past the end of input, there is no [presentational hint](#presentational-hints). Return.If the character at position is a U+002B PLUS SIGN character (+), then letmode be _relative-plus_, and advance position to the next character. Otherwise, if the character at position is a U+002D HYPHEN-MINUS character (-), then let mode be _relative-minus_, and advance position to the next character. Otherwise, let mode be _absolute_.[Collect a sequence of code points](https://infra.spec.whatwg.org/#collect-a-sequence-of-code-points) that are [ASCII digits](https://infra.spec.whatwg.org/#ascii-digit) frominput given position, and let digits be the resulting sequence.If digits is the empty string, there is no [presentational hint](#presentational-hints). Return.Interpret digits as a base-ten integer. Let value be the resulting number.

- If mode is _relative-plus_, then increment value by 3\. Ifmode is _relative-minus_, then let value be the result of subtractingvalue from 3.
  If value is greater than 7, let it be 7.If value is less than 1, let it be 1.

Set the ['font-size'](https://drafts.csswg.org/css-fonts/#font-size-prop) property to the keyword corresponding to the value of value according to the following table:

value

['font-size'](https://drafts.csswg.org/css-fonts/#font-size-prop) keyword

1

'x-small'

2

'small'

3

'medium'

4

'large'

5

'x-large'

6

'xx-large'

7

'xxx-large'

#### 15.3.5 Bidirectional text

```
@namespace "http://www.w3.org/1999/xhtml";

[dir]:dir(ltr), bdi:dir(ltr), input[type=tel i]:dir(ltr) { direction: ltr; }
[dir]:dir(rtl), bdi:dir(rtl) { direction: rtl; }

address, blockquote, center, div, figure, figcaption, footer, form, header, hr,
legend, listing, main, p, plaintext, pre, summary, xmp, article, aside,
:heading, hgroup, nav, section, search, table, caption, colgroup, col, thead,
tbody, tfoot, tr, td, th, dir, dd, dl, dt, menu, ol, ul, li, bdi, output,
[dir=ltr i], [dir=rtl i], [dir=auto i] {
  unicode-bidi: isolate;
}

bdo, bdo[dir] { unicode-bidi: isolate-override; }

input[dir=auto i]:is([type=search i], [type=tel i], [type=url i],
[type=email i]), textarea[dir=auto i], pre[dir=auto i] {
  unicode-bidi: plaintext;
}
/* see prose for input elements whose type attribute is in the Text state */

/* the rules setting the 'content' property on br and wbr elements also has bidi implications */
```

When an `[input](input.html#the-input-element)` element's `[dir](dom.html#attr-dir)` attribute is in the[auto](dom.html#attr-dir-auto) state and its `[type](input.html#attr-input-type)` attribute is in the [Text](input.html#text-%28type=text%29-state-and-search-state-%28type=search%29) state, then the user agent is[expected](#expected) to act as if it had a user-agent-level style sheet rule setting the['unicode-bidi'](https://drafts.csswg.org/css-writing-modes/#unicode-bidi) property to 'plaintext'.

Input fields (i.e. `[textarea](form-elements.html#the-textarea-element)` elements, and `[input](input.html#the-input-element)` elements when their`[type](input.html#attr-input-type)` attribute is in the [Text](input.html#text-%28type=text%29-state-and-search-state-%28type=search%29), [Search](input.html#text-%28type=text%29-state-and-search-state-%28type=search%29),[Telephone](input.html#telephone-state-%28type=tel%29), [URL](input.html#url-state-%28type=url%29), or [Email](input.html#email-state-%28type=email%29) state) are [expected](#expected) to present an editing user interface with a directionality that matches the element's['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property.

When the document's character encoding is [ISO-8859-8](https://encoding.spec.whatwg.org/#iso-8859-8), the following rules are additionally [expected](#expected) to apply, following those above: [\[ENCODING\]](references.html#refsENCODING)

```
@namespace "http://www.w3.org/1999/xhtml";

address, blockquote, center, div, figure, figcaption, footer, form, header, hr,
legend, listing, main, p, plaintext, pre, summary, xmp, article, aside,
:heading, hgroup, nav, section, search, table, caption, colgroup, col, thead,
tbody, tfoot, tr, td, th, dir, dd, dl, dt, menu, ol, ul, li, [dir=ltr i],
[dir=rtl i], [dir=auto i], *|* {
  unicode-bidi: bidi-override;
}
input:not([type=submit i]):not([type=reset i]):not([type=button i]),
textarea {
  unicode-bidi: normal;
}
```

#### 15.3.6 Sections and headings

```
@namespace "http://www.w3.org/1999/xhtml";

article, aside, :heading, hgroup, nav, section {
  display: block;
}

:heading { font-weight: bold; }

:heading(1) { margin-block: 0.67em; font-size: 2.00em; }
:heading(2) { margin-block: 0.83em; font-size: 1.50em; }
:heading(3) { margin-block: 1.00em; font-size: 1.17em; }
:heading(4) { margin-block: 1.33em; font-size: 1.00em; }
:heading(5) { margin-block: 1.67em; font-size: 0.83em; }
:heading(6, 7, 8, 9) {
  font-size: 0.67em;
  margin-block: 2.33em;
}

```

#### 15.3.7 Lists

```
@namespace "http://www.w3.org/1999/xhtml";

dir, dd, dl, dt, menu, ol, ul { display: block; }
li { display: list-item; text-align: match-parent; }

dir, dl, menu, ol, ul { margin-block: 1em; }

:is(dir, dl, menu, ol, ul) :is(dir, dl, menu, ol, ul) {
  margin-block: 0;
}

dd { margin-inline-start: 40px; }
dir, menu, ol, ul { padding-inline-start: 40px; }

ol, ul, menu { counter-reset: list-item; }
ol { list-style-type: decimal; }

dir, menu, ul {
  list-style-type: disc;
}
:is(dir, menu, ol, ul) :is(dir, menu, ul) {
  list-style-type: circle;
}
:is(dir, menu, ol, ul) :is(dir, menu, ol, ul) :is(dir, menu, ul) {
  list-style-type: square;
}
```

The following rules are also [expected](#expected) to apply, as[presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

ol[type="1"], li[type="1"] { list-style-type: decimal; }
ol[type=a s], li[type=a s] { list-style-type: lower-alpha; }
ol[type=A s], li[type=A s] { list-style-type: upper-alpha; }
ol[type=i s], li[type=i s] { list-style-type: lower-roman; }
ol[type=I s], li[type=I s] { list-style-type: upper-roman; }
ul[type=none i], li[type=none i] { list-style-type: none; }
ul[type=disc i], li[type=disc i] { list-style-type: disc; }
ul[type=circle i], li[type=circle i] { list-style-type: circle; }
ul[type=square i], li[type=square i] { list-style-type: square; }
```

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), the following rules are also [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

li { list-style-position: inside; }
li :is(dir, menu, ol, ul) { list-style-position: outside; }
:is(dir, menu, ol, ul) :is(dir, menu, ol, ul, li) { list-style-position: unset; }
```

When rendering `[li](grouping-content.html#the-li-element)` elements, non-CSS user agents are [expected](#expected) to use the [ordinal value](grouping-content.html#ordinal-value) of the `[li](grouping-content.html#the-li-element)` element to render the counter in the list item marker.

For CSS user agents, some aspects of rendering [list items](https://drafts.csswg.org/css-lists/#list-item) are defined by the CSS Lists specification. Additionally, the following attribute mappings are [expected](#expected) to apply:[\[CSSLISTS\]](references.html#refsCSSLISTS)

When an `[li](grouping-content.html#the-li-element)` element has a `[value](grouping-content.html#attr-li-value)` attribute, and parsing that attribute's value using the[rules for parsing integers](common-microsyntaxes.html#rules-for-parsing-integers) doesn't generate an error, the user agent is[expected](#expected) to use the parsed value value as a [presentational hint](#presentational-hints) for the ['counter-set'](https://drafts.csswg.org/css-lists/#propdef-counter-set) property of the form `list-item value`.

When an `[ol](grouping-content.html#the-ol-element)` element has a `[start](grouping-content.html#attr-ol-start)` attribute or a `[reversed](grouping-content.html#attr-ol-reversed)` attribute, or both, the user agent is [expected](#expected) to use the following steps to treat the attributes as a [presentational hint](#presentational-hints) for the ['counter-reset'](https://drafts.csswg.org/css-lists/#propdef-counter-reset) property:

Let value be null.If the element has a `[start](grouping-content.html#attr-ol-start)` attribute, then setvalue to the result of parsing the attribute's value using the [rules for parsing integers](common-microsyntaxes.html#rules-for-parsing-integers).

If the element has a `[reversed](grouping-content.html#attr-ol-reversed)` attribute, then:

If value is an integer, then increment value by 1 and return`reversed(list-item) value`.

- Otherwise, return `reversed(list-item)`.  
  Either the `[start](grouping-content.html#attr-ol-start)` attribute was absent, or parsing its value resulted in an error.

Otherwise:

If value is an integer, then decrement value by 1 and return`list-item value`.

Otherwise, there is no [presentational hint](#presentational-hints).

#### 15.3.8 Tables

```
@namespace "http://www.w3.org/1999/xhtml";

table { display: table; }
caption { display: table-caption; }
colgroup, colgroup[hidden] { display: table-column-group; }
col, col[hidden] { display: table-column; }
thead, thead[hidden] { display: table-header-group; }
tbody, tbody[hidden] { display: table-row-group; }
tfoot, tfoot[hidden] { display: table-footer-group; }
tr, tr[hidden] { display: table-row; }
td, th { display: table-cell; }

colgroup[hidden], col[hidden], thead[hidden], tbody[hidden],
tfoot[hidden], tr[hidden] {
  visibility: collapse;
}

table {
  box-sizing: border-box;
  border-spacing: 2px;
  border-collapse: separate;
  text-indent: initial;
}
td, th { padding: 1px; }
th { font-weight: bold; }

caption { text-align: center; }
thead, tbody, tfoot, table > tr { vertical-align: middle; }
tr, td, th { vertical-align: inherit; }

thead, tbody, tfoot, tr { border-color: inherit; }
table[rules=none i], table[rules=groups i], table[rules=rows i],
table[rules=cols i], table[rules=all i], table[frame=void i],
table[frame=above i], table[frame=below i], table[frame=hsides i],
table[frame=lhs i], table[frame=rhs i], table[frame=vsides i],
table[frame=box i], table[frame=border i],
table[rules=none i] > tr > td, table[rules=none i] > tr > th,
table[rules=groups i] > tr > td, table[rules=groups i] > tr > th,
table[rules=rows i] > tr > td, table[rules=rows i] > tr > th,
table[rules=cols i] > tr > td, table[rules=cols i] > tr > th,
table[rules=all i] > tr > td, table[rules=all i] > tr > th,
table[rules=none i] > thead > tr > td, table[rules=none i] > thead > tr > th,
table[rules=groups i] > thead > tr > td, table[rules=groups i] > thead > tr > th,
table[rules=rows i] > thead > tr > td, table[rules=rows i] > thead > tr > th,
table[rules=cols i] > thead > tr > td, table[rules=cols i] > thead > tr > th,
table[rules=all i] > thead > tr > td, table[rules=all i] > thead > tr > th,
table[rules=none i] > tbody > tr > td, table[rules=none i] > tbody > tr > th,
table[rules=groups i] > tbody > tr > td, table[rules=groups i] > tbody > tr > th,
table[rules=rows i] > tbody > tr > td, table[rules=rows i] > tbody > tr > th,
table[rules=cols i] > tbody > tr > td, table[rules=cols i] > tbody > tr > th,
table[rules=all i] > tbody > tr > td, table[rules=all i] > tbody > tr > th,
table[rules=none i] > tfoot > tr > td, table[rules=none i] > tfoot > tr > th,
table[rules=groups i] > tfoot > tr > td, table[rules=groups i] > tfoot > tr > th,
table[rules=rows i] > tfoot > tr > td, table[rules=rows i] > tfoot > tr > th,
table[rules=cols i] > tfoot > tr > td, table[rules=cols i] > tfoot > tr > th,
table[rules=all i] > tfoot > tr > td, table[rules=all i] > tfoot > tr > th {
  border-color: black;
}
```

The following rules are also [expected](#expected) to apply, as [presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

table[align=left i] { float: left; }
table[align=right i] { float: right; }
table[align=center i] { margin-inline: auto; }
thead[align=absmiddle i], tbody[align=absmiddle i], tfoot[align=absmiddle i],
tr[align=absmiddle i], td[align=absmiddle i], th[align=absmiddle i] {
  text-align: center;
}

caption[align=bottom i] { caption-side: bottom; }
p[align=left i], h1[align=left i], h2[align=left i], h3[align=left i],
h4[align=left i], h5[align=left i], h6[align=left i] {
  text-align: left;
}
p[align=right i], h1[align=right i], h2[align=right i], h3[align=right i],
h4[align=right i], h5[align=right i], h6[align=right i] {
  text-align: right;
}
p[align=center i], h1[align=center i], h2[align=center i], h3[align=center i],
h4[align=center i], h5[align=center i], h6[align=center i] {
  text-align: center;
}
p[align=justify i], h1[align=justify i], h2[align=justify i], h3[align=justify i],
h4[align=justify i], h5[align=justify i], h6[align=justify i] {
  text-align: justify;
}
thead[valign=top i], tbody[valign=top i], tfoot[valign=top i],
tr[valign=top i], td[valign=top i], th[valign=top i] {
  vertical-align: top;
}
thead[valign=middle i], tbody[valign=middle i], tfoot[valign=middle i],
tr[valign=middle i], td[valign=middle i], th[valign=middle i] {
  vertical-align: middle;
}
thead[valign=bottom i], tbody[valign=bottom i], tfoot[valign=bottom i],
tr[valign=bottom i], td[valign=bottom i], th[valign=bottom i] {
  vertical-align: bottom;
}
thead[valign=baseline i], tbody[valign=baseline i], tfoot[valign=baseline i],
tr[valign=baseline i], td[valign=baseline i], th[valign=baseline i] {
  vertical-align: baseline;
}

td[nowrap], th[nowrap] { white-space: nowrap; }

table[rules=none i], table[rules=groups i], table[rules=rows i],
table[rules=cols i], table[rules=all i] {
  border-style: hidden;
  border-collapse: collapse;
}
table[border] { border-style: outset; } /* only if border is not equivalent to zero */
table[frame=void i] { border-style: hidden; }
table[frame=above i] { border-style: outset hidden hidden hidden; }
table[frame=below i] { border-style: hidden hidden outset hidden; }
table[frame=hsides i] { border-style: outset hidden outset hidden; }
table[frame=lhs i] { border-style: hidden hidden hidden outset; }
table[frame=rhs i] { border-style: hidden outset hidden hidden; }
table[frame=vsides i] { border-style: hidden outset; }
table[frame=box i], table[frame=border i] { border-style: outset; }

table[border] > tr > td, table[border] > tr > th,
table[border] > thead > tr > td, table[border] > thead > tr > th,
table[border] > tbody > tr > td, table[border] > tbody > tr > th,
table[border] > tfoot > tr > td, table[border] > tfoot > tr > th {
  /* only if border is not equivalent to zero */
  border-width: 1px;
  border-style: inset;
}
table[rules=none i] > tr > td, table[rules=none i] > tr > th,
table[rules=none i] > thead > tr > td, table[rules=none i] > thead > tr > th,
table[rules=none i] > tbody > tr > td, table[rules=none i] > tbody > tr > th,
table[rules=none i] > tfoot > tr > td, table[rules=none i] > tfoot > tr > th,
table[rules=groups i] > tr > td, table[rules=groups i] > tr > th,
table[rules=groups i] > thead > tr > td, table[rules=groups i] > thead > tr > th,
table[rules=groups i] > tbody > tr > td, table[rules=groups i] > tbody > tr > th,
table[rules=groups i] > tfoot > tr > td, table[rules=groups i] > tfoot > tr > th,
table[rules=rows i] > tr > td, table[rules=rows i] > tr > th,
table[rules=rows i] > thead > tr > td, table[rules=rows i] > thead > tr > th,
table[rules=rows i] > tbody > tr > td, table[rules=rows i] > tbody > tr > th,
table[rules=rows i] > tfoot > tr > td, table[rules=rows i] > tfoot > tr > th {
  border-width: 1px;
  border-style: none;
}
table[rules=cols i] > tr > td, table[rules=cols i] > tr > th,
table[rules=cols i] > thead > tr > td, table[rules=cols i] > thead > tr > th,
table[rules=cols i] > tbody > tr > td, table[rules=cols i] > tbody > tr > th,
table[rules=cols i] > tfoot > tr > td, table[rules=cols i] > tfoot > tr > th {
  border-width: 1px;
  border-block-style: none;
  border-inline-style: solid;
}
table[rules=all i] > tr > td, table[rules=all i] > tr > th,
table[rules=all i] > thead > tr > td, table[rules=all i] > thead > tr > th,
table[rules=all i] > tbody > tr > td, table[rules=all i] > tbody > tr > th,
table[rules=all i] > tfoot > tr > td, table[rules=all i] > tfoot > tr > th {
  border-width: 1px;
  border-style: solid;
}

table[rules=groups i] > colgroup {
  border-inline-width: 1px;
  border-inline-style: solid;
}
table[rules=groups i] > thead,
table[rules=groups i] > tbody,
table[rules=groups i] > tfoot {
  border-block-width: 1px;
  border-block-style: solid;
}

table[rules=rows i] > tr, table[rules=rows i] > thead > tr,
table[rules=rows i] > tbody > tr, table[rules=rows i] > tfoot > tr {
  border-block-width: 1px;
  border-block-style: solid;
}
```

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), the following rules are also [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

table {
  font-weight: initial;
  font-style: initial;
  font-variant: initial;
  font-size: initial;
  line-height: initial;
  white-space: initial;
  text-align: initial;
}
```

---

For the purposes of the CSS table model, the `[col](tables.html#the-col-element)` element is [expected](#expected) to be treated as if it was present as many times as its `[span](tables.html#attr-col-span)` attribute [specifies](common-microsyntaxes.html#rules-for-parsing-non-negative-integers).

For the purposes of the CSS table model, the `[colgroup](tables.html#the-colgroup-element)` element, if it contains no`[col](tables.html#the-col-element)` element, is [expected](#expected) to be treated as if it had as many such children as its `[span](tables.html#attr-colgroup-span)` attribute [specifies](common-microsyntaxes.html#rules-for-parsing-non-negative-integers).

For the purposes of the CSS table model, the `[colspan](tables.html#attr-tdth-colspan)` and`[rowspan](tables.html#attr-tdth-rowspan)` attributes on `[td](tables.html#the-td-element)` and `[th](tables.html#the-th-element)` elements are [expected](#expected) to [provide](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) the _special knowledge_ regarding cells spanning rows and columns.

In [HTML documents](https://dom.spec.whatwg.org/#html-document), the following rules are also [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

:is(table, thead, tbody, tfoot, tr) > form { display: none !important; }
```

---

The `[table](tables.html#the-table-element)` element's `[cellspacing](obsolete.html#attr-table-cellspacing)` attribute [maps to the pixel length property](#maps-to-the-pixel-length-property) ['border-spacing'](https://drafts.csswg.org/css-tables/#propdef-border-spacing) on the element.

The `[table](tables.html#the-table-element)` element's `[cellpadding](obsolete.html#attr-table-cellpadding)` attribute [maps to the pixel length properties](#maps-to-the-pixel-length-property) ['padding-top'](https://drafts.csswg.org/css-box/#propdef-padding-top), ['padding-right'](https://drafts.csswg.org/css-box/#propdef-padding-right),['padding-bottom'](https://drafts.csswg.org/css-box/#propdef-padding-bottom), and ['padding-left'](https://drafts.csswg.org/css-box/#propdef-padding-left) of any `[td](tables.html#the-td-element)` and`[th](tables.html#the-th-element)` elements that have corresponding [cells](tables.html#concept-cell) in the[table](tables.html#concept-table) corresponding to the `[table](tables.html#the-table-element)` element.

The `[table](tables.html#the-table-element)` element's `[height](obsolete.html#attr-table-height)` attribute[maps to the dimension property](#maps-to-the-dimension-property) ['height'](https://drafts.csswg.org/css2/#the-height-property) on the `[table](tables.html#the-table-element)` element.

The `[table](tables.html#the-table-element)` element's `[width](obsolete.html#attr-table-width)` attribute[maps to the dimension property (ignoring zero)](#maps-to-the-dimension-property-%28ignoring-zero%29) ['width'](https://drafts.csswg.org/css2/#the-width-property) on the`[table](tables.html#the-table-element)` element.

The `[col](tables.html#the-col-element)` element's `[width](obsolete.html#attr-col-width)` attribute [maps to the dimension property](#maps-to-the-dimension-property) ['width'](https://drafts.csswg.org/css2/#the-width-property) on the `[col](tables.html#the-col-element)` element.

The `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, and `[tfoot](tables.html#the-tfoot-element)` elements' `[height](obsolete.html#attr-tbody-height)` attribute [maps to the dimension property](#maps-to-the-dimension-property) ['height'](https://drafts.csswg.org/css2/#the-height-property) on the element.

The `[tr](tables.html#the-tr-element)` element's `[height](obsolete.html#attr-tr-height)` attribute [maps to the dimension property](#maps-to-the-dimension-property) ['height'](https://drafts.csswg.org/css2/#the-height-property) on the `[tr](tables.html#the-tr-element)` element.

The `[td](tables.html#the-td-element)` and `[th](tables.html#the-th-element)` elements' `[height](obsolete.html#attr-tdth-height)` attributes [map to the dimension property (ignoring zero)](#maps-to-the-dimension-property-%28ignoring-zero%29) ['height'](https://drafts.csswg.org/css2/#the-height-property) on the element.

The `[td](tables.html#the-td-element)` and `[th](tables.html#the-th-element)` elements' `[width](obsolete.html#attr-tdth-width)` attributes [map to the dimension property (ignoring zero)](#maps-to-the-dimension-property-%28ignoring-zero%29) ['width'](https://drafts.csswg.org/css2/#the-width-property) on the element.

---

The `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`, `[tr](tables.html#the-tr-element)`,`[td](tables.html#the-td-element)`, and `[th](tables.html#the-th-element)` elements, when they have an `align` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for either the string "`center`" or the string "`middle`", are [expected](#expected) to center text within themselves, as if they had their ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'center' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the center.

The `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`, `[tr](tables.html#the-tr-element)`,`[td](tables.html#the-td-element)`, and `[th](tables.html#the-th-element)` elements, when they have an `align` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`left`", are [expected](#expected) to left-align text within themselves, as if they had their ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'left' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the left.

The `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`, `[tr](tables.html#the-tr-element)`,`[td](tables.html#the-td-element)`, and `[th](tables.html#the-th-element)` elements, when they have an `align` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`right`", are [expected](#expected) to right-align text within themselves, as if they had their ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'right' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the right.

The `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`, `[tr](tables.html#the-tr-element)`,`[td](tables.html#the-td-element)`, and `[th](tables.html#the-th-element)` elements, when they have an `align` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`justify`", are [expected](#expected) to full-justify text within themselves, as if they had their ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property set to 'justify' in a [presentational hint](#presentational-hints), and to [align descendants](#align-descendants) to the left.

User agents are [expected](#expected) to have a rule in their user agent style sheet that matches `[th](tables.html#the-th-element)` elements that have a parent node whose [computed value](https://drafts.csswg.org/css-cascade/#computed-value) for the ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property is its initial value, whose declaration block consists of just a single declaration that sets the ['text-align'](https://drafts.csswg.org/css-text/#text-align-property) property to the value 'center'.

---

When a `[table](tables.html#the-table-element)`, `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`,`[tr](tables.html#the-tr-element)`, `[td](tables.html#the-td-element)`, or `[th](tables.html#the-th-element)` element has a `[background](obsolete.html#attr-background)` attribute set to a non-empty value, the new value is[expected](#expected) to be [encoding-parsed-and-serialized](urls-and-fetching.html#encoding-parsing-and-serializing-a-url) relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['background-image'](https://drafts.csswg.org/css-backgrounds/#propdef-background-image) property to the return value.

When a `[table](tables.html#the-table-element)`, `[thead](tables.html#the-thead-element)`, `[tbody](tables.html#the-tbody-element)`, `[tfoot](tables.html#the-tfoot-element)`,`[tr](tables.html#the-tr-element)`, `[td](tables.html#the-td-element)`, or `[th](tables.html#the-th-element)` element has a `bgcolor` attribute set, the new value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color) property to the resulting color.

When a `[table](tables.html#the-table-element)` element has a `[bordercolor](obsolete.html#attr-table-bordercolor)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['border-top-color'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-color),['border-right-color'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-color), ['border-bottom-color'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-color), and['border-left-color'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-color) properties to the resulting color.

---

The `[table](tables.html#the-table-element)` element's `[border](obsolete.html#attr-table-border)` attribute [maps to the pixel length properties](#maps-to-the-pixel-length-property) ['border-top-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-width), ['border-right-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-width),['border-bottom-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-width), ['border-left-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-width) on the element. If the attribute is present but parsing the attribute's value using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) generates an error, a default value of 1px is [expected](#expected) to be used for that property instead.

Rules marked "only if border is not equivalent to zero" in the CSS block above is [expected](#expected) to only be applied if the `[border](obsolete.html#attr-table-border)` attribute mentioned in the selectors for the rule is not only present but, when parsed using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers), is also found to have a value other than zero or to generate an error.

---

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), a `[td](tables.html#the-td-element)` element or a `[th](tables.html#the-th-element)` element that has a`[nowrap](obsolete.html#attr-tdth-nowrap)` attribute but also has a `[width](obsolete.html#attr-tdth-width)` attribute whose value, when parsed using the [rules for parsing nonzero dimension values](common-microsyntaxes.html#rules-for-parsing-non-zero-dimension-values), is found to be a length (not an error or a number classified as a percentage), is [expected](#expected) to have a [presentational hint](#presentational-hints) setting the element's ['white-space'](https://drafts.csswg.org/css-text/#white-space-property) property to 'normal', overriding the rule in the CSS block above that sets it to 'nowrap'.

#### 15.3.9 Margin collapsing quirks

A node is substantial if it is a text node that is not [inter-element whitespace](dom.html#inter-element-whitespace), or if it is an element node.

A node is blank if it is an element that contains no[substantial](#concept-rendering-substantial) nodes.

The elements with default margins are the following elements: `[blockquote](grouping-content.html#the-blockquote-element)`, `[dir](obsolete.html#dir)`, `[dl](grouping-content.html#the-dl-element)`,`[h1](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`, `[h2](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`, `[h3](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`, `[h4](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`, `[h5](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`,`[h6](sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements)`, `[listing](obsolete.html#listing)`, `[menu](grouping-content.html#the-menu-element)`, `[ol](grouping-content.html#the-ol-element)`,`[p](grouping-content.html#the-p-element)`, `[plaintext](obsolete.html#plaintext)`, `[pre](grouping-content.html#the-pre-element)`, `[ul](grouping-content.html#the-ul-element)`, `[xmp](obsolete.html#xmp)`.

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), any [element with default margins](#concept-rendering-elements-with-margins) that is the [child](https://dom.spec.whatwg.org/#concept-tree-child) of a`[body](sections.html#the-body-element)`, `[td](tables.html#the-td-element)`, or `[th](tables.html#the-th-element)` element and has no [substantial](#concept-rendering-substantial) previous siblings is[expected](#expected) to have a user-agent level style sheet rule that sets its['margin-block-start'](https://drafts.csswg.org/css-logical/#propdef-margin-block-start) property to zero.

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), any [element with default margins](#concept-rendering-elements-with-margins) that is the [child](https://dom.spec.whatwg.org/#concept-tree-child) of a`[body](sections.html#the-body-element)`, `[td](tables.html#the-td-element)`, or `[th](tables.html#the-th-element)` element, has no [substantial](#concept-rendering-substantial) previous siblings, and is [blank](#concept-rendering-blank), is [expected](#expected) to have a user-agent level style sheet rule that sets its ['margin-block-end'](https://drafts.csswg.org/css-logical/#propdef-margin-block-end) property to zero also.

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), any [element with default margins](#concept-rendering-elements-with-margins) that is the [child](https://dom.spec.whatwg.org/#concept-tree-child) of a`[td](tables.html#the-td-element)` or `[th](tables.html#the-th-element)` element, has no [substantial](#concept-rendering-substantial) following siblings, and is [blank](#concept-rendering-blank), is [expected](#expected) to have a user-agent level style sheet rule that sets its ['margin-block-start'](https://drafts.csswg.org/css-logical/#propdef-margin-block-start) property to zero.

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), any `[p](grouping-content.html#the-p-element)` element that is the [child](https://dom.spec.whatwg.org/#concept-tree-child) of a `[td](tables.html#the-td-element)` or `[th](tables.html#the-th-element)` element and has no [substantial](#concept-rendering-substantial) following siblings, is[expected](#expected) to have a user-agent level style sheet rule that sets its['margin-block-end'](https://drafts.csswg.org/css-logical/#propdef-margin-block-end) property to zero.

#### 15.3.10 Form controls

```
@namespace "http://www.w3.org/1999/xhtml";

input, button, textarea {
  letter-spacing: initial;
  word-spacing: initial;
  line-height: initial;
}

input, select, button, textarea {
  text-transform: initial;
  text-indent: initial;
  text-shadow: initial;
  appearance: auto;
}

input:not([type=image i], [type=range i], [type=checkbox i], [type=radio i]) {
  overflow: clip !important;
  overflow-clip-margin: 0 !important;
}

input, select, textarea {
  text-align: initial;
}

:autofill {
  field-sizing: fixed !important;
}

input:is([type=reset i], [type=button i], [type=submit i]), button {
  text-align: center;
}

input, button {
  display: inline-block;
}

input[type=hidden i], input[type=file i], input[type=image i] {
  appearance: none;
}

input:is([type=radio i], [type=checkbox i], [type=reset i], [type=button i],
[type=submit i], [type=color i], [type=search i]), select, button {
  box-sizing: border-box;
}

textarea { white-space: pre-wrap; }
```

In [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), the following rules are also [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

input:not([type=image i]), textarea { box-sizing: border-box; }
```

Each kind of form control is also described in the [Widgets](#widgets) section, which describes the look and feel of the control.

For `[input](input.html#the-input-element)` elements where the `[type](input.html#attr-input-type)` attribute is not in the [Hidden](input.html#hidden-state-%28type=hidden%29) state or the [Image Button](input.html#image-button-state-%28type=image%29) state, and that are [being rendered](#being-rendered), are [expected](#expected) to act as follows:

The [inner display type](https://drafts.csswg.org/css-display/#inner-display-type) is always 'flow-root'.

#### 15.3.11 The hr element

```
@namespace "http://www.w3.org/1999/xhtml";

hr {
  color: gray;
  border-style: inset;
  border-width: 1px;
  margin-block: 0.5em;
  margin-inline: auto;
  overflow: hidden;
}
```

The following rules are also [expected](#expected) to apply, as [presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

hr[align=left i] { margin-left: 0; margin-right: auto; }
hr[align=right i] { margin-left: auto; margin-right: 0; }
hr[align=center i] { margin-left: auto; margin-right: auto; }
hr[color], hr[noshade] { border-style: solid; }
```

If an `[hr](grouping-content.html#the-hr-element)` element has either a `[color](obsolete.html#attr-hr-color)` attribute or a `[noshade](obsolete.html#attr-hr-noshade)` attribute, and furthermore also has a `[size](obsolete.html#attr-hr-size)` attribute, and parsing that attribute's value using the[rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) doesn't generate an error, then the user agent is [expected](#expected) to use the parsed value divided by two as a pixel length for[presentational hints](#presentational-hints) for the properties ['border-top-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-width),['border-right-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-width), ['border-bottom-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-width), and['border-left-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-width) on the element.

Otherwise, if an `[hr](grouping-content.html#the-hr-element)` element has neither a `[color](obsolete.html#attr-hr-color)` attribute nor a `[noshade](obsolete.html#attr-hr-noshade)` attribute, but does have a `[size](obsolete.html#attr-hr-size)` attribute, and parsing that attribute's value using the[rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) doesn't generate an error, then: if the parsed value is one, then the user agent is [expected](#expected) to use the attribute as a [presentational hint](#presentational-hints) setting the element's['border-bottom-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-width) to 0; otherwise, if the parsed value is greater than one, then the user agent is [expected](#expected) to use the parsed value minus two as a pixel length for[presentational hints](#presentational-hints) for the ['height'](https://drafts.csswg.org/css2/#the-height-property) property on the element.

The `[width](obsolete.html#attr-hr-width)` attribute on an `[hr](grouping-content.html#the-hr-element)` element [maps to the dimension property](#maps-to-the-dimension-property) ['width'](https://drafts.csswg.org/css2/#the-width-property) on the element.

When an `[hr](grouping-content.html#the-hr-element)` element has a `[color](obsolete.html#attr-hr-color)` attribute, its value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is [expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['color'](https://drafts.csswg.org/css-color/#the-color-property) property to the resulting color.

#### 15.3.12 The fieldset and legend elements

```
@namespace "http://www.w3.org/1999/xhtml";

fieldset {
  display: block;
  margin-inline: 2px;
  border: groove 2px ThreeDFace;
  padding-block: 0.35em 0.625em;
  padding-inline: 0.75em;
  min-inline-size: min-content;
}

legend {
  padding-inline: 2px;
}

legend[align=left i] {
  justify-self: left;
}

legend[align=center i] {
  justify-self: center;
}

legend[align=right i] {
  justify-self: right;
}
```

The `[fieldset](form-elements.html#the-fieldset-element)` element, when it generates a [CSS box](https://drafts.csswg.org/css-display/#css-box), is[expected](#expected) to act as follows:

The element is [expected](#expected) to establish a new [block formatting context](https://drafts.csswg.org/css-display/#block-formatting-context).

The ['display'](https://drafts.csswg.org/css2/#display-prop) property is [expected](#expected) to act as follows:

If the computed value of ['display'](https://drafts.csswg.org/css2/#display-prop) is a value such that the [outer display type](https://drafts.csswg.org/css-display/#outer-display-type) is 'inline', then behave as 'inline-block'.

- Otherwise, behave as 'flow-root'.  
  This does not change the computed value.
- If the element's box has a child box that matches the conditions in the list below, then the first such child box is the 'fieldset' element's rendered legend:
- The child is a `[legend](form-elements.html#the-legend-element)` element.
- The child's used value of ['float'](https://drafts.csswg.org/css2/#float-position) is 'none'.
- The child's used value of ['position'](https://drafts.csswg.org/css-position/#position-property) is not 'absolute' or 'fixed'.

If the element has a [rendered legend](#rendered-legend), then the border is [expected](#expected) to not be painted behind the rectangle defined as follows, using the writing mode of the fieldset:

The block-start edge of the rectangle is the smaller of the block-start edge of the[rendered legend](#rendered-legend)'s margin rectangle at its static position (ignoring transforms), and the block-start outer edge of the `[fieldset](form-elements.html#the-fieldset-element)`'s border.The block-end edge of the rectangle is the larger of the block-end edge of the[rendered legend](#rendered-legend)'s margin rectangle at its static position (ignoring transforms), and the block-end outer edge of the `[fieldset](form-elements.html#the-fieldset-element)`'s border.The inline-start edge of the rectangle is the smaller of the inline-start edge of the[rendered legend](#rendered-legend)'s border rectangle at its static position (ignoring transforms), and the inline-start outer edge of the `[fieldset](form-elements.html#the-fieldset-element)`'s border.The inline-end edge of the rectangle is the larger of the inline-end edge of the[rendered legend](#rendered-legend)'s border rectangle at its static position (ignoring transforms), and the inline-end outer edge of the `[fieldset](form-elements.html#the-fieldset-element)`'s border. The space allocated for the element's border on the block-start side is[expected](#expected) to be the element's ['border-block-start-width'](https://drafts.csswg.org/css-logical/#propdef-border-block-start-width) or the[rendered legend](#rendered-legend)'s margin box size in the `[fieldset](form-elements.html#the-fieldset-element)`'s block-flow direction, whichever is greater.For the purpose of calculating the used ['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size), if the computed['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size) is not 'auto', the space allocated for the [rendered legend](#rendered-legend)'s margin box that spills out past the border, if any, is [expected](#expected) to be subtracted from the ['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size). If the content box's block-size would be negative, then let the content box's block-size be 0 instead.If the element has a [rendered legend](#rendered-legend), then that element is[expected](#expected) to be the first child box.The [anonymous fieldset content box](#anonymous-fieldset-content-box) is [expected](#expected) to appear after the [rendered legend](#rendered-legend) and is [expected](#expected) to contain the content (including the '::before' and '::after' pseudo-elements) of the `[fieldset](form-elements.html#the-fieldset-element)` element except for the [rendered legend](#rendered-legend), if there is one.The used value of the ['padding-top'](https://drafts.csswg.org/css-box/#propdef-padding-top), ['padding-right'](https://drafts.csswg.org/css-box/#propdef-padding-right),['padding-bottom'](https://drafts.csswg.org/css-box/#propdef-padding-bottom), and ['padding-left'](https://drafts.csswg.org/css-box/#propdef-padding-left) properties are[expected](#expected) to be zero.For the purpose of calculating the min-content inline size, use the greater of the min-content inline size of the [rendered legend](#rendered-legend) and the min-content inline size of the [anonymous fieldset content box](#anonymous-fieldset-content-box).

For the purpose of calculating the max-content inline size, use the greater of the max-content inline size of the [rendered legend](#rendered-legend) and the max-content inline size of the [anonymous fieldset content box](#anonymous-fieldset-content-box).

A `[fieldset](form-elements.html#the-fieldset-element)` element's [rendered legend](#rendered-legend), if any, is[expected](#expected) to act as follows:

The element is [expected](#expected) to establish a new [formatting context](https://drafts.csswg.org/css-display/#formatting-context) for its contents. The type of this [formatting context](https://drafts.csswg.org/css-display/#formatting-context) is determined by its['display'](https://drafts.csswg.org/css2/#display-prop) value, as usual.

- The ['display'](https://drafts.csswg.org/css2/#display-prop) property is [expected](#expected) to behave as if its computed value was blockified.  
  This does not change the computed value.
  If the [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['inline-size'](https://drafts.csswg.org/css-logical/#propdef-inline-size) is 'auto', then the[used value](https://drafts.csswg.org/css-cascade/#used-value) is the [fit-content inline size](https://drafts.csswg.org/css-sizing/#fit-content-inline-size).The element is [expected](#expected) to be positioned in the inline direction as is normal for blocks (e.g., taking into account margins and the ['justify-self'](https://drafts.csswg.org/css-align/#propdef-justify-self) property).
- The element's box is [expected](#expected) to be constrained in the inline direction by the inline content size of the `[fieldset](form-elements.html#the-fieldset-element)` as if it had used its computed inline padding.  
  For example, if the `[fieldset](form-elements.html#the-fieldset-element)` has a specified padding of 50px, then the[rendered legend](#rendered-legend) will be positioned 50px in from the `[fieldset](form-elements.html#the-fieldset-element)`'s border. The padding will further apply to the [anonymous fieldset content box](#anonymous-fieldset-content-box) instead of the `[fieldset](form-elements.html#the-fieldset-element)` element itself.

The element is [expected](#expected) to be positioned in the block-flow direction such that its border box is centered over the border on the block-start side of the`[fieldset](form-elements.html#the-fieldset-element)` element.

A `[fieldset](form-elements.html#the-fieldset-element)` element's anonymous fieldset content box is[expected](#expected) to act as follows:

The ['display'](https://drafts.csswg.org/css2/#display-prop) property is [expected](#expected) to act as follows:

If the computed value of ['display'](https://drafts.csswg.org/css2/#display-prop) on the `[fieldset](form-elements.html#the-fieldset-element)` element is 'grid' or 'inline-grid', then set the used value to 'grid'.If the computed value of ['display'](https://drafts.csswg.org/css2/#display-prop) on the `[fieldset](form-elements.html#the-fieldset-element)` element is 'flex' or 'inline-flex', then set the used value to 'flex'.Otherwise, set the used value to 'flow-root'.

- The following properties are [expected](#expected) to inherit from the `[fieldset](form-elements.html#the-fieldset-element)` element:
- ['align-content'](https://drafts.csswg.org/css-align/#propdef-align-content)
- ['align-items'](https://drafts.csswg.org/css-align/#propdef-align-items)
- ['border-radius'](https://drafts.csswg.org/css-backgrounds/#propdef-border-radius)
- ['column-count'](https://drafts.csswg.org/css-multicol/#propdef-column-count)
- ['column-fill'](https://drafts.csswg.org/css-multicol/#propdef-column-fill)
- ['column-gap'](https://drafts.csswg.org/css-multicol/#propdef-column-gap)
- ['column-rule'](https://drafts.csswg.org/css-multicol/#propdef-column-rule)
- ['column-width'](https://drafts.csswg.org/css-multicol/#propdef-column-width)
- ['flex-direction'](https://drafts.csswg.org/css-flexbox/#propdef-flex-direction)
- ['flex-wrap'](https://drafts.csswg.org/css-flexbox/#propdef-flex-wrap)
- ['grid-auto-columns'](https://drafts.csswg.org/css-grid/#propdef-grid-auto-columns)
- ['grid-auto-flow'](https://drafts.csswg.org/css-grid/#propdef-grid-auto-flow)
- ['grid-auto-rows'](https://drafts.csswg.org/css-grid/#propdef-grid-auto-rows)
- ['grid-column-gap'](https://drafts.csswg.org/css-grid/#propdef-grid-column-gap)
- ['grid-row-gap'](https://drafts.csswg.org/css-grid/#propdef-grid-row-gap)
- ['grid-template-areas'](https://drafts.csswg.org/css-grid/#propdef-grid-template-areas)
- ['grid-template-columns'](https://drafts.csswg.org/css-grid/#propdef-grid-template-columns)
- ['grid-template-rows'](https://drafts.csswg.org/css-grid/#propdef-grid-template-rows)
- ['justify-content'](https://drafts.csswg.org/css-align/#propdef-propdef-justify-content)
- ['justify-items'](https://drafts.csswg.org/css-align/#propdef-propdef-justify-items)
- ['overflow'](https://drafts.csswg.org/css-overflow/#propdef-overflow)
- ['padding-bottom'](https://drafts.csswg.org/css-box/#propdef-padding-bottom)
- ['padding-left'](https://drafts.csswg.org/css-box/#propdef-padding-left)
- ['padding-right'](https://drafts.csswg.org/css-box/#propdef-padding-right)
- ['padding-top'](https://drafts.csswg.org/css-box/#propdef-padding-top)
- ['text-overflow'](https://drafts.csswg.org/css-overflow/#propdef-text-overflow)
- ['unicode-bidi'](https://drafts.csswg.org/css-writing-modes/#unicode-bidi)
  The ['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size) property is [expected](#expected) to be set to '100%'.

For the purpose of calculating percentage padding, act as if the padding was calculated for the `[fieldset](form-elements.html#the-fieldset-element)` element.

fieldset's margin legend padding legend's margin padding anonymous fieldset content box content

The legend is rendered over the top border, and the top border area reserves vertical space for the legend. The fieldset's top margin starts at the top margin edge of the legend. The legend's horizontal margins, or the ['justify-self'](https://drafts.csswg.org/css-align/#propdef-justify-self) property, gives its horizontal position. The [anonymous fieldset content box](#anonymous-fieldset-content-box) appears below the legend.

### 15.4 Replaced elements

The following elements can be [replaced elements](https://drafts.csswg.org/css-display/#replaced-element): `[audio](media.html#the-audio-element)`, `[canvas](canvas.html#the-canvas-element)`, `[embed](iframe-embed-object.html#the-embed-element)`, `[iframe](iframe-embed-object.html#the-iframe-element)`,`[img](embedded-content.html#the-img-element)`, `[input](input.html#the-input-element)`, `[object](iframe-embed-object.html#the-object-element)`, and `[video](media.html#the-video-element)`.

#### 15.4.1 Embedded content

The `[embed](iframe-embed-object.html#the-embed-element)`, `[iframe](iframe-embed-object.html#the-iframe-element)`, and `[video](media.html#the-video-element)` elements are[expected](#expected) to be treated as [replaced elements](https://drafts.csswg.org/css-display/#replaced-element).

A `[canvas](canvas.html#the-canvas-element)` element that [represents](dom.html#represents) [embedded content](dom.html#embedded-content-category) is[expected](#expected) to be treated as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element); the contents of such elements are the element's bitmap, if any, or else a [transparent black](https://drafts.csswg.org/css-color/#transparent-black) bitmap with the same [natural dimensions](https://drafts.csswg.org/css-images/#natural-dimensions) as the element. Other `[canvas](canvas.html#the-canvas-element)` elements are[expected](#expected) to be treated as ordinary elements in the rendering model.

An `[object](iframe-embed-object.html#the-object-element)` element that [represents](dom.html#represents) an image, plugin, or its[content navigable](document-sequences.html#content-navigable) is [expected](#expected) to be treated as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element). Other `[object](iframe-embed-object.html#the-object-element)` elements are [expected](#expected) to be treated as ordinary elements in the rendering model.

The `[audio](media.html#the-audio-element)` element, when it is [exposing a user interface](media.html#expose-a-user-interface-to-the-user), is [expected](#expected) to be treated as a[replaced element](https://drafts.csswg.org/css-display/#replaced-element) about one line high, as wide as is necessary to expose the user agent's user interface features. When an `[audio](media.html#the-audio-element)` element is not [exposing a user interface](media.html#expose-a-user-interface-to-the-user), the user agent is[expected](#expected) to force its ['display'](https://drafts.csswg.org/css2/#display-prop) property to compute to 'none', irrespective of CSS rules.

Whether a `[video](media.html#the-video-element)` element is [exposing a user interface](media.html#expose-a-user-interface-to-the-user) is not [expected](#expected) to affect the size of the rendering; controls are [expected](#expected) to be overlaid above the page content without causing any layout changes, and are [expected](#expected) to disappear when the user does not need them.

When a `[video](media.html#the-video-element)` element represents a poster frame or frame of video, the poster frame or frame of video is [expected](#expected) to be rendered at the largest size that maintains the aspect ratio of that poster frame or frame of video without being taller or wider than the`[video](media.html#the-video-element)` element itself, and is [expected](#expected) to be centered in the`[video](media.html#the-video-element)` element.

Any subtitles or captions are [expected](#expected) to be overlaid directly on top of their`[video](media.html#the-video-element)` element, as defined by the relevant rendering rules; for WebVTT, those are the[rules for updating the display of WebVTT text tracks](https://w3c.github.io/webvtt/#rules-for-updating-the-display-of-webvtt-text-tracks). [\[WEBVTT\]](references.html#refsWEBVTT)

When the user agent starts [exposing a user interface](media.html#expose-a-user-interface-to-the-user) for a `[video](media.html#the-video-element)` element, the user agent should run the [rules for updating the text track rendering](media.html#rules-for-updating-the-text-track-rendering) of each of the [text tracks](media.html#text-track) in the `[video](media.html#the-video-element)` element's [list of text tracks](media.html#list-of-text-tracks) that are [showing](media.html#text-track-showing) and whose [text track kind](media.html#text-track-kind) is one of `[subtitles](media.html#dom-texttrack-kind-subtitles)` or `[captions](media.html#dom-texttrack-kind-captions)` (e.g., for [text tracks](media.html#text-track) based on WebVTT, the [rules for updating the display of WebVTT text tracks](https://w3c.github.io/webvtt/#rules-for-updating-the-display-of-webvtt-text-tracks)). [\[WEBVTT\]](references.html#refsWEBVTT)

Resizing `[video](media.html#the-video-element)` and `[canvas](canvas.html#the-canvas-element)` elements does not interrupt video playback or clear the canvas.

---

The following CSS rules are [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

iframe { border: 2px inset; }
video { object-fit: contain; }
```

#### 15.4.2 Images

User agents are [expected](#expected) to render `[img](embedded-content.html#the-img-element)` elements and`[input](input.html#the-input-element)` elements whose `[type](input.html#attr-input-type)` attributes are in the [Image Button](input.html#image-button-state-%28type=image%29) state, according to the first applicable rules from the following list:

If the element [represents](dom.html#represents) an imageThe user agent is [expected](#expected) to treat the element as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element) and render the image according to the rules for doing so defined in CSS. If the element does not [represent](dom.html#represents) an image and either:

- the user agent has reason to believe that the image will become _[available](images.html#img-available)_ and be rendered in due course, or
- the element has no `alt` attribute, or
- the `[Document](dom.html#document)` is in [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), and the element already has[natural dimensions](https://drafts.csswg.org/css-images/#natural-dimensions) (e.g., from the [dimension attributes](embedded-content-other.html#dimension-attributes) or CSS rules)
  The user agent is [expected](#expected) to treat the element as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element) whose content is the text that the element represents, if any, optionally alongside an icon indicating that the image is being obtained (if applicable). For`[input](input.html#the-input-element)` elements, the element is [expected](#expected) to appear button-like to indicate that the element is a [button](forms.html#concept-button).If the element is an `[img](embedded-content.html#the-img-element)` element that [represents](dom.html#represents) some text and the user agent does not expect this to changeThe user agent is [expected](#expected) to treat the element as a non-replaced phrasing element whose content is the text, optionally with an icon indicating that an image is missing, so that the user can request the image be displayed or investigate why it is not rendering. In non-graphical contexts, such an icon should be omitted.If the element is an `[img](embedded-content.html#the-img-element)` element that [represents](dom.html#represents) nothing and the user agent does not expect this to changeThe user agent is [expected](#expected) to treat the element as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element) whose [natural dimensions](https://drafts.csswg.org/css-images/#natural-dimensions) are 0\. (In the absence of further styles, this will cause the element to essentially not be rendered.)If the element is an `[input](input.html#the-input-element)` element that does not [represent](dom.html#represents) an image and the user agent does not expect this to changeThe user agent is [expected](#expected) to treat the element as a [replaced element](https://drafts.csswg.org/css-display/#replaced-element) consisting of a button whose content is the element's alternative text. The[natural dimensions](https://drafts.csswg.org/css-images/#natural-dimensions) of the button are [expected](#expected) to be about one line in height and whatever width is necessary to render the text on one line.

The icons mentioned above are [expected](#expected) to be relatively small so as not to disrupt most text but be easily clickable. In a visual environment, for instance, icons could be 16 pixels by 16 pixels square, or 1em by 1em if the images are scalable. In an audio environment, the icon could be a short bleep. The icons are intended to indicate to the user that they can be used to get to whatever options the UA provides for images, and, where appropriate, are[expected](#expected) to provide access to the context menu that would have come up if the user interacted with the actual image.

---

All animated images with the same [absolute URL](https://url.spec.whatwg.org/#syntax-url-absolute) and the same image data are[expected](#expected) to be rendered synchronized to the same timeline as a group, with the timeline starting at the time of the least recent addition to the group.

In other words, when a second image with the same [absolute URL](https://url.spec.whatwg.org/#syntax-url-absolute) and animated image data is inserted into a document, it jumps to the point in the animation cycle that is currently being displayed by the first image.

When a user agent is to restart the animation for an `[img](embedded-content.html#the-img-element)` element showing an animated image, all animated images with the same [absolute URL](https://url.spec.whatwg.org/#syntax-url-absolute) and the same image data in that `[img](embedded-content.html#the-img-element)` element's [node document](https://dom.spec.whatwg.org/#concept-node-document) are[expected](#expected) to restart their animation from the beginning.

---

The following CSS rules are [expected](#expected) to apply:

```
@namespace "http://www.w3.org/1999/xhtml";

img:is([sizes="auto" i], [sizes^="auto," i]) {
  contain: size !important;
  contain-intrinsic-size: 300px 150px;
}
```

The following CSS rules are [expected](#expected) to apply when the `[Document](dom.html#document)` is in [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks):

```
@namespace "http://www.w3.org/1999/xhtml";

img[align=left i] { margin-right: 3px; }
img[align=right i] { margin-left: 3px; }
```

#### 15.4.3 Attributes for embedded content and images

The following CSS rules are [expected](#expected) to apply as [presentational hints](#presentational-hints):

```
@namespace "http://www.w3.org/1999/xhtml";

embed[align=left i], iframe[align=left i], img[align=left i],
input[type=image i][align=left i], object[align=left i] {
  float: left;
}

embed[align=right i], iframe[align=right i], img[align=right i],
input[type=image i][align=right i], object[align=right i] {
  float: right;
}

embed[align=top i], iframe[align=top i], img[align=top i],
input[type=image i][align=top i], object[align=top i] {
  vertical-align: top;
}

embed[align=baseline i], iframe[align=baseline i], img[align=baseline i],
input[type=image i][align=baseline i], object[align=baseline i] {
  vertical-align: baseline;
}

embed[align=texttop i], iframe[align=texttop i], img[align=texttop i],
input[type=image i][align=texttop i], object[align=texttop i] {
  vertical-align: text-top;
}

embed[align=absmiddle i], iframe[align=absmiddle i], img[align=absmiddle i],
input[type=image i][align=absmiddle i], object[align=absmiddle i],
embed[align=abscenter i], iframe[align=abscenter i], img[align=abscenter i],
input[type=image i][align=abscenter i], object[align=abscenter i] {
  vertical-align: middle;
}

embed[align=bottom i], iframe[align=bottom i], img[align=bottom i],
input[type=image i][align=bottom i], object[align=bottom i] {
  vertical-align: bottom;
}
```

When an `[embed](iframe-embed-object.html#the-embed-element)`, `[iframe](iframe-embed-object.html#the-iframe-element)`, `[img](embedded-content.html#the-img-element)`, or `[object](iframe-embed-object.html#the-object-element)` element, or an `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Image Button](input.html#image-button-state-%28type=image%29) state, has an `align` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`center`" or the string "`middle`", the user agent is [expected](#expected) to act as if the element's ['vertical-align'](https://drafts.csswg.org/css2/#propdef-vertical-align) property was set to a value that aligns the vertical middle of the element with the parent element's baseline.

The `hspace` attribute of `[embed](iframe-embed-object.html#the-embed-element)`,`[img](embedded-content.html#the-img-element)`, or `[object](iframe-embed-object.html#the-object-element)` elements, and `[input](input.html#the-input-element)` elements with a `[type](input.html#attr-input-type)` attribute in the [Image Button](input.html#image-button-state-%28type=image%29) state, [maps to the dimension properties](#maps-to-the-dimension-property) ['margin-left'](https://drafts.csswg.org/css-box/#propdef-margin-left) and ['margin-right'](https://drafts.csswg.org/css-box/#propdef-margin-right) on the element.

The `vspace` attribute of `[embed](iframe-embed-object.html#the-embed-element)`,`[img](embedded-content.html#the-img-element)`, or `[object](iframe-embed-object.html#the-object-element)` elements, and `[input](input.html#the-input-element)` elements with a `[type](input.html#attr-input-type)` attribute in the [Image Button](input.html#image-button-state-%28type=image%29) state, [maps to the dimension properties](#maps-to-the-dimension-property) ['margin-top'](https://drafts.csswg.org/css-box/#propdef-margin-top) and ['margin-bottom'](https://drafts.csswg.org/css-box/#propdef-margin-bottom) on the element.

When an `[iframe](iframe-embed-object.html#the-iframe-element)` element has a `[frameborder](obsolete.html#attr-iframe-frameborder)` attribute whose value, when parsed using the[rules for parsing integers](common-microsyntaxes.html#rules-for-parsing-integers), is zero or an error, the user agent is[expected](#expected) to have [presentational hints](#presentational-hints) setting the element's['border-top-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-width), ['border-right-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-width),['border-bottom-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-width), and ['border-left-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-width) properties to zero.

When an `[img](embedded-content.html#the-img-element)` element, `[object](iframe-embed-object.html#the-object-element)` element, or `[input](input.html#the-input-element)` element with a `[type](input.html#attr-input-type)` attribute in the [Image Button](input.html#image-button-state-%28type=image%29) state has a `border` attribute whose value, when parsed using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers), is found to be a number greater than zero, the user agent is[expected](#expected) to use the parsed value for eight [presentational hints](#presentational-hints): four setting the parsed value as a pixel length for the element's ['border-top-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-width),['border-right-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-width), ['border-bottom-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-width), and['border-left-width'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-width) properties, and four setting the element's['border-top-style'](https://drafts.csswg.org/css-backgrounds/#propdef-border-top-style), ['border-right-style'](https://drafts.csswg.org/css-backgrounds/#propdef-border-right-style),['border-bottom-style'](https://drafts.csswg.org/css-backgrounds/#propdef-border-bottom-style), and ['border-left-style'](https://drafts.csswg.org/css-backgrounds/#propdef-border-left-style) properties to the value 'solid'.

The `[width](embedded-content-other.html#attr-dim-width)` and `[height](embedded-content-other.html#attr-dim-height)` attributes on an `[img](embedded-content.html#the-img-element)` element's [dimension attribute source](embedded-content.html#concept-img-dimension-attribute-source) [map to the dimension properties](#maps-to-the-dimension-property) ['width'](https://drafts.csswg.org/css2/#the-width-property) and ['height'](https://drafts.csswg.org/css2/#the-height-property) on the `[img](embedded-content.html#the-img-element)` element respectively. They similarly [map to the aspect-ratio property (using dimension rules)](#map-to-the-aspect-ratio-property-%28using-dimension-rules%29) of the`[img](embedded-content.html#the-img-element)` element.

The `[width](embedded-content-other.html#attr-dim-width)` and `[height](embedded-content-other.html#attr-dim-height)` attributes on `[embed](iframe-embed-object.html#the-embed-element)`, `[iframe](iframe-embed-object.html#the-iframe-element)`, `[object](iframe-embed-object.html#the-object-element)`, and `[video](media.html#the-video-element)` elements, and `[input](input.html#the-input-element)` elements with a `[type](input.html#attr-input-type)` attribute in the [Image Button](input.html#image-button-state-%28type=image%29) state and that either represents an image or that the user expects will eventually represent an image, [map to the dimension properties](#maps-to-the-dimension-property) ['width'](https://drafts.csswg.org/css2/#the-width-property) and ['height'](https://drafts.csswg.org/css2/#the-height-property) on the element respectively.

The `[width](embedded-content-other.html#attr-dim-width)` and `[height](embedded-content-other.html#attr-dim-height)` attributes [map to the aspect-ratio property (using dimension rules)](#map-to-the-aspect-ratio-property-%28using-dimension-rules%29) on`[img](embedded-content.html#the-img-element)` and `[video](media.html#the-video-element)` elements, and `[input](input.html#the-input-element)` elements with a `[type](input.html#attr-input-type)` attribute in the [Image Button](input.html#image-button-state-%28type=image%29) state.

The `[width](canvas.html#attr-canvas-width)` and `[height](canvas.html#attr-canvas-height)` attributes [map to the aspect-ratio property](#map-to-the-aspect-ratio-property) on `[canvas](canvas.html#the-canvas-element)` elements.

#### 15.4.4 Image maps

Shapes on an [image map](image-maps.html#image-map) are [expected](#expected) to act, for the purpose of the CSS cascade, as elements independent of the original `[area](image-maps.html#the-area-element)` element that happen to match the same style rules but inherit from the `[img](embedded-content.html#the-img-element)` or `[object](iframe-embed-object.html#the-object-element)` element.

For the purposes of the rendering, only the ['cursor'](https://drafts.csswg.org/css-ui/#cursor) property is[expected](#expected) to have any effect on the shape.

Thus, for example, if an `[area](image-maps.html#the-area-element)` element has a `[style](dom.html#attr-style)` attribute that sets the ['cursor'](https://drafts.csswg.org/css-ui/#cursor) property to 'help', then when the user designates that shape, the cursor would change to a Help cursor.

Similarly, if an `[area](image-maps.html#the-area-element)` element had a CSS rule that set its['cursor'](https://drafts.csswg.org/css-ui/#cursor) property to 'inherit' (or if no rule setting the ['cursor'](https://drafts.csswg.org/css-ui/#cursor) property matched the element at all), the shape's cursor would be inherited from the`[img](embedded-content.html#the-img-element)` or `[object](iframe-embed-object.html#the-object-element)` element of the [image map](image-maps.html#image-map), not from the parent of the `[area](image-maps.html#the-area-element)` element.

### 15.5 Widgets

#### 15.5.1 Native appearance

The CSS Basic User Interface specification calls elements that can have a[native appearance](https://drafts.csswg.org/css-ui/#native-appearance) [widgets](https://drafts.csswg.org/css-ui/#widget), and defines whether to use that [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) depending on the ['appearance'](https://drafts.csswg.org/css-ui/#appearance-switching) property. That logic, in turn, depends on whether each the element is classified as a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) or [non-devolvable widget](https://drafts.csswg.org/css-ui/#non-devolvable). This section defines which elements match these concepts for HTML, what their [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is, and any particularity of their [devolved](https://drafts.csswg.org/css-ui/#devolved) state or [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).[\[CSSUI\]](references.html#refsCSSUI)

The following elements can have a [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) for the purpose of the CSS['appearance'](https://drafts.csswg.org/css-ui/#appearance-switching) property.

- `[button](form-elements.html#the-button-element)`
- `[input](input.html#the-input-element)`
- `[meter](form-elements.html#the-meter-element)`
- `[progress](form-elements.html#the-progress-element)`
- `[select](form-elements.html#the-select-element)`
- `[textarea](form-elements.html#the-textarea-element)`

#### 15.5.2 Writing mode

Several widgets have their rendering controlled by the ['writing-mode'](https://drafts.csswg.org/css-writing-modes/#propdef-writing-mode) CSS property. For the purposes of those widgets, we have the following definitions.

A horizontal writing mode is when resolving the ['writing-mode'](https://drafts.csswg.org/css-writing-modes/#propdef-writing-mode) property of the control results in a computed value of 'horizontal-tb'.

A vertical writing mode is when resolving the ['writing-mode'](https://drafts.csswg.org/css-writing-modes/#propdef-writing-mode) property of the control results in a computed value of either 'vertical-rl', 'vertical-lr', 'sideways-rl' or 'sideways-lr'.

#### 15.5.3 Button layout

When an element uses [button layout](#button-layout-2), it is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable), and its [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is that of a button.

Button layout is as follows:

If the element is a `[button](form-elements.html#the-button-element)` element, then the ['display'](https://drafts.csswg.org/css2/#display-prop) property is[expected](#expected) to act as follows:

If the computed value of ['display'](https://drafts.csswg.org/css2/#display-prop) is 'inline-grid', 'grid', 'inline-flex', 'flex', 'none', or 'contents', then behave as the computed value.Otherwise, if the computed value of ['display'](https://drafts.csswg.org/css2/#display-prop) is a value such that the[outer display type](https://drafts.csswg.org/css-display/#outer-display-type) is 'inline', then behave as 'inline-block'.Otherwise, behave as 'flow-root'. The element is [expected](#expected) to establish a new [formatting context](https://drafts.csswg.org/css-display/#formatting-context) for its contents. The type of this formatting context is determined by its['display'](https://drafts.csswg.org/css2/#display-prop) value, as usual.If the element is [absolutely-positioned](https://drafts.csswg.org/css-position/#absolute-position), then for the purpose of the[CSS visual formatting model](https://drafts.csswg.org/css2/#visuren), act as if the element is a [replaced element](https://drafts.csswg.org/css-display/#replaced-element). [\[CSS\]](references.html#refsCSS)If the [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['inline-size'](https://drafts.csswg.org/css-logical/#propdef-inline-size) is 'auto', then the[used value](https://drafts.csswg.org/css-cascade/#used-value) is the [fit-content inline size](https://drafts.csswg.org/css-sizing/#fit-content-inline-size).For the purpose of the 'normal' keyword of the ['align-self'](https://drafts.csswg.org/css-align/#propdef-align-self) property, act as if the element is a replaced element.

If the element is an `[input](input.html#the-input-element)` element, or if it is a `[button](form-elements.html#the-button-element)` element and its computed value for ['display'](https://drafts.csswg.org/css2/#display-prop) is not 'inline-grid', 'grid', 'inline-flex', or 'flex', then the element's box has a child anonymous button content box with the following behaviors:

The box is a [block-level](https://drafts.csswg.org/css-display/#block-level) [block container](https://drafts.csswg.org/css-display/#block-container) that establishes a new [block formatting context](https://drafts.csswg.org/css-display/#block-formatting-context) (i.e., ['display'](https://drafts.csswg.org/css2/#display-prop) is 'flow-root').

If the box does not overflow in the horizontal axis, then it is centered horizontally.

- If the box does not overflow in the vertical axis, then it is centered vertically.  
  Otherwise, there is no [anonymous button content box](#anonymous-button-content-box).

Need to define the [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.4 The button element

The `[button](form-elements.html#the-button-element)` element, when it generates a [CSS box](https://drafts.csswg.org/css-display/#css-box), is[expected](#expected) to depict a button and to use [button layout](#button-layout-2) whose[anonymous button content box](#anonymous-button-content-box)'s contents (if there is an [anonymous button content box](#anonymous-button-content-box)) are the child boxes the element's box would otherwise have.

#### 15.5.5 The details and summary elements

```
@namespace "http://www.w3.org/1999/xhtml";

details, summary {
  display: block;
}
details > summary:first-of-type {
  display: list-item;
  counter-increment: list-item 0;
  list-style: disclosure-closed inside;
}
details[open] > summary:first-of-type {
  list-style-type: disclosure-open;
}
```

The `[details](interactive-elements.html#the-details-element)` element is [expected](#expected) to have an internal [shadow tree](https://dom.spec.whatwg.org/#concept-shadow-tree) with three child elements:

1. The first child element is a `[slot](scripting.html#the-slot-element)` that is [expected](#expected) to take the`[details](interactive-elements.html#the-details-element)` element's first `[summary](interactive-elements.html#the-summary-element)` element child, if any. This element has a single child `[summary](interactive-elements.html#the-summary-element)` element called the default summary which has text content that is [implementation-defined](https://infra.spec.whatwg.org/#implementation-defined) (and probably locale-specific).  
   The `[summary](interactive-elements.html#the-summary-element)` element that this slot [represents](dom.html#represents) is[expected](#expected) to allow the user to request the details be shown or hidden.
2. The second child element is a `[slot](scripting.html#the-slot-element)` that is [expected](#expected) to take the`[details](interactive-elements.html#the-details-element)` element's remaining descendants, if any. This element has no contents.  
   This element is [expected](#expected) to match the ['::details-content'](https://drafts.csswg.org/css-pseudo/#details-content-pseudo) pseudo-element.  
   This element is [expected](#expected) to have its `[style](dom.html#attr-style)` attribute set to "`display: block; content-visibility: hidden;`" when the`[details](interactive-elements.html#the-details-element)` element does not have an `[open](interactive-elements.html#attr-details-open)` attribute. When it does have the `[open](interactive-elements.html#attr-details-open)` attribute, the`[style](dom.html#attr-style)` attribute is [expected](#expected) to be set to "`display: block;`".  
   Because the slots are hidden inside a shadow tree, this `[style](dom.html#attr-style)` attribute is not directly visible to author code. Its impacts, however, are visible. Notably, the choice of `content-visibility: hidden` instead of, e.g., `display: none`, impacts the results of various APIs that query layout information.
3. The third child element is either a `[link](semantics.html#the-link-element)` or `[style](semantics.html#the-style-element)` element with the following styles for the [default summary](#default-summary):

```
:host summary {
  display: list-item;
  counter-increment: list-item 0;
  list-style: disclosure-closed inside;
}
:host([open]) summary {
  list-style-type: disclosure-open;
}
```

The position of this child element relative to the other two is not observable. This means that implementations might have it in a different order relative to its siblings. Implementations might even associate the style with the shadow tree using a mechanism that is not an element.

The structure of this shadow tree is observable through the ways that the children of the `[details](interactive-elements.html#the-details-element)` element and the ['::details-content'](https://drafts.csswg.org/css-pseudo/#details-content-pseudo) pseudo-element respond to CSS styles.

#### 15.5.6 The input element as a text entry widget

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Text](input.html#text-%28type=text%29-state-and-search-state-%28type=search%29), [Telephone](input.html#telephone-state-%28type=tel%29), [URL](input.html#url-state-%28type=url%29), or[Email](input.html#email-state-%28type=email%29) state, is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its[native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a one-line text control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Search](input.html#text-%28type=text%29-state-and-search-state-%28type=search%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a one-line text control. If the [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of the element's ['appearance'](https://drafts.csswg.org/css-ui/#appearance-switching) property is not `['textfield'](https://drafts.csswg.org/css-ui/#valdef-appearance-textfield)`, it may have a distinct style indicating that it is a search field.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Password](input.html#password-state-%28type=password%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a one-line text control that obscures data entry.

For `[input](input.html#the-input-element)` elements whose `[type](input.html#attr-input-type)` attribute is in one of the above states, the [used value](https://drafts.csswg.org/css-cascade/#used-value) of the ['line-height'](https://drafts.csswg.org/css2/#propdef-line-height) property must be a length value that is no smaller than what the [used value](https://drafts.csswg.org/css-cascade/#used-value) would be for 'line-height: normal'.

The [used value](https://drafts.csswg.org/css-cascade/#used-value) will not be the actual keyword 'normal'. Also, this rule does not affect the [computed value](https://drafts.csswg.org/css-cascade/#computed-value).

If these text controls provide a text selection, then, when the user changes the current selection, the user agent is [expected](#expected) to [queue an element task](webappapis.html#queue-an-element-task) on the[user interaction task source](webappapis.html#user-interaction-task-source) given the `[input](input.html#the-input-element)` element to [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `[select](indices.html#event-select)` at the element, with the `[bubbles](https://dom.spec.whatwg.org/#dom-event-bubbles)` attribute initialized to true.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in one of the above states is an [element with default preferred size](https://drafts.csswg.org/css-ui/#element-with-default-preferred-size), and user agents are [expected](#expected) to apply the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) CSS property to the element. User agents are [expected](#expected) to determine the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of its[intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) by the following steps:

1. If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) is determined by the text which the element shows. The text is either a[value](form-control-infrastructure.html#concept-fe-value) or a short hint specified by the`[placeholder](input.html#attr-input-placeholder)` attribute. User agents may take the text caret size into account in the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size).
2. If the element has a `[size](input.html#attr-input-size)` attribute, and parsing that attribute's value using the [rules for parsing non-negative integers](common-microsyntaxes.html#rules-for-parsing-non-negative-integers) doesn't generate an error, return the value obtained from applying the [converting a character width to pixels](#converting-a-character-width-to-pixels) algorithm to the value of the attribute.
3. Otherwise, return the value obtained from applying the [converting a character width to pixels](#converting-a-character-width-to-pixels) algorithm to the number 20.

The converting a character width to pixels algorithm returns (size\-1)×avg \+ max, where size is the character width to convert, avg is the average character width of the primary font for the element for which the algorithm is being run, in pixels, and max is the maximum character width of that same font, also in pixels. (The element's ['letter-spacing'](https://drafts.csswg.org/css-text/#letter-spacing-property) property does not affect the result.)

These text controls are [expected](#expected) to be [scroll containers](https://drafts.csswg.org/css-overflow/#scroll-container) and support scrolling in the [inline axis](https://drafts.csswg.org/css-writing-modes/#inline-axis), but not the [block axis](https://drafts.csswg.org/css-writing-modes/#block-axis).

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.7 The input element as domain-specific widgets

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Date](input.html#date-state-%28type=date%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a date control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Month](input.html#month-state-%28type=month%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a month control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Week](input.html#week-state-%28type=week%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a week control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Time](input.html#time-state-%28type=time%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a time control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Local Date and Time](input.html#local-date-and-time-state-%28type=datetime-local%29) state is a[devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a local date and time control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Number](input.html#number-state-%28type=number%29) state is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a number control.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Number](input.html#number-state-%28type=number%29) state is an[element with default preferred size](https://drafts.csswg.org/css-ui/#element-with-default-preferred-size), and user agents are [expected](#expected) to apply the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) CSS property to the element. The [block size](https://drafts.csswg.org/css-writing-modes/#block-size) of the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is about one line high. If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of the[intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is [expected](#expected) to be about as wide as necessary to show the current [value](form-control-infrastructure.html#concept-fe-value). Otherwise, the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is [expected](#expected) to be about as wide as necessary to show the widest possible value.

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Date](input.html#date-state-%28type=date%29),[Month](input.html#month-state-%28type=month%29),[Week](input.html#week-state-%28type=week%29), [Time](input.html#time-state-%28type=time%29), or [Local Date and Time](input.html#local-date-and-time-state-%28type=datetime-local%29) state, is[expected](#expected) to be about one line high, and about as wide as necessary to show the widest possible value.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.8 The input element as a range control

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Range](input.html#range-state-%28type=range%29) state is a [non-devolvable widget](https://drafts.csswg.org/css-ui/#non-devolvable). Its [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a slider control.

When this control has a [horizontal writing mode](#horizontal-writing-mode), the control is[expected](#expected) to be a horizontal slider. Its lowest value is on the right if the['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and on the left otherwise. When this control has a [vertical writing mode](#vertical-writing-mode), it is[expected](#expected) to be a vertical slider. Its lowest value is on the bottom if the['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and on the top otherwise.

Predefined suggested values (provided by the `[list](input.html#attr-input-list)` attribute) are [expected](#expected) to be shown as tick marks on the slider, which the slider can snap to.

Need to detail the [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.9 The input element as a color well

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Color](input.html#color-state-%28type=color%29) state is [expected](#expected) to depict a color well, which, when activated, provides the user with a color picker (e.g. a color wheel or color palette) from which the color can be changed. The element, when it generates a [CSS box](https://drafts.csswg.org/css-display/#css-box), is [expected](#expected) to use [button layout](#button-layout-2), that has no child boxes of the [anonymous button content box](#anonymous-button-content-box). The [anonymous button content box](#anonymous-button-content-box) is [expected](#expected) to have a [presentational hint](#presentational-hints) setting the ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color) property to the element's [value](form-control-infrastructure.html#concept-fe-value).

Predefined suggested values (provided by the `[list](input.html#attr-input-list)` attribute) are [expected](#expected) to be shown in the color picker interface, not on the color well itself.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.10 The input element as a checkbox and radio button widgets

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Checkbox](input.html#checkbox-state-%28type=checkbox%29) state is a [non-devolvable widget](https://drafts.csswg.org/css-ui/#non-devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box containing a single checkbox control, with no label.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Radio Button](input.html#radio-button-state-%28type=radio%29) state is a [non-devolvable widget](https://drafts.csswg.org/css-ui/#non-devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box containing a single radio button control, with no label.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.11 The input element as a file upload control

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [File Upload](input.html#file-upload-state-%28type=file%29) state, when it generates a [CSS box](https://drafts.csswg.org/css-display/#css-box), is [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box containing a span of text giving the filename(s) of the [selected files](input.html#concept-input-type-file-selected), if any, followed by a button that, when activated, provides the user with a file picker from which the selection can be changed. The button is [expected](#expected) to use [button layout](#button-layout-2) and match the['::file-selector-button'](https://drafts.csswg.org/css-pseudo/#file-selector-button-pseudo) pseudo-element. The contents of its [anonymous button content box](#anonymous-button-content-box) are [expected](#expected) to be [implementation-defined](https://infra.spec.whatwg.org/#implementation-defined) (and possibly locale-specific) text, for example "Choose file".

User agents may handle an `[input](input.html#the-input-element)` element whose`[type](input.html#attr-input-type)` attribute is in the[File Upload](input.html#file-upload-state-%28type=file%29) state as an[element with default preferred size](https://drafts.csswg.org/css-ui/#element-with-default-preferred-size), and user agents may apply the['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) CSS property to the element. If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) of the element is [expected](#expected) to depend on its content such as the['::file-selector-button'](https://drafts.csswg.org/css-pseudo/#file-selector-button-pseudo) pseudo-element and chosen file names.

#### 15.5.12 The input element as a button

An `[input](input.html#the-input-element)` element whose `[type](input.html#attr-input-type)` attribute is in the [Submit Button](input.html#submit-button-state-%28type=submit%29), [Reset Button](input.html#reset-button-state-%28type=reset%29), or [Button](input.html#button-state-%28type=button%29) state, when it generates a [CSS box](https://drafts.csswg.org/css-display/#css-box), is[expected](#expected) to depict a button and use [button layout](#button-layout-2) and the contents of the [anonymous button content box](#anonymous-button-content-box) are [expected](#expected) to be the text of the element's `[value](input.html#attr-input-value)` attribute, if any, or text derived from the element's `[type](input.html#attr-input-type)` attribute in an[implementation-defined](https://infra.spec.whatwg.org/#implementation-defined) (and probably locale-specific) fashion, if not.

#### 15.5.13 The marquee element

```
@namespace "http://www.w3.org/1999/xhtml";

marquee {
  display: inline-block;
  text-align: initial;
  overflow: hidden !important;
}
```

The `[marquee](obsolete.html#the-marquee-element)` element, while [turned on](obsolete.html#concept-marquee-on), is[expected](#expected) to render in an animated fashion according to its attributes as follows:

If the element's `[behavior](obsolete.html#attr-marquee-behavior)` attribute is in the[scroll](obsolete.html#attr-marquee-behavior-scroll) state

Slide the contents of the element in the direction described by the `[direction](obsolete.html#attr-marquee-direction)` attribute as defined below, such that it begins off the start side of the `[marquee](obsolete.html#the-marquee-element)`, and ends flush with the inner end side.

For example, if the `[direction](obsolete.html#attr-marquee-direction)` attribute is [left](obsolete.html#attr-marquee-direction-left) (the default), then the contents would start such that their left edge are off the side of the right edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area), and the contents would then slide up to the point where the left edge of the contents are flush with the left inner edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area).

Once the animation has ended, the user agent is [expected](#expected) to [increment the marquee current loop index](obsolete.html#increment-the-marquee-current-loop-index). If the element is still [turned on](obsolete.html#concept-marquee-on) after this, then the user agent is[expected](#expected) to restart the animation.

If the element's `[behavior](obsolete.html#attr-marquee-behavior)` attribute is in the[slide](obsolete.html#attr-marquee-behavior-slide) state

Slide the contents of the element in the direction described by the `[direction](obsolete.html#attr-marquee-direction)` attribute as defined below, such that it begins off the start side of the `[marquee](obsolete.html#the-marquee-element)`, and ends off the end side of the`[marquee](obsolete.html#the-marquee-element)`.

For example, if the `[direction](obsolete.html#attr-marquee-direction)` attribute is [left](obsolete.html#attr-marquee-direction-left) (the default), then the contents would start such that their left edge are off the side of the right edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area), and the contents would then slide up to the point where the _right_ edge of the contents are flush with the left inner edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area).

Once the animation has ended, the user agent is [expected](#expected) to [increment the marquee current loop index](obsolete.html#increment-the-marquee-current-loop-index). If the element is still [turned on](obsolete.html#concept-marquee-on) after this, then the user agent is[expected](#expected) to restart the animation.

If the element's `[behavior](obsolete.html#attr-marquee-behavior)` attribute is in the[alternate](obsolete.html#attr-marquee-behavior-alternate) state

When the [marquee current loop index](obsolete.html#marquee-current-loop-index) is even (or zero), slide the contents of the element in the direction described by the `[direction](obsolete.html#attr-marquee-direction)` attribute as defined below, such that it begins flush with the start side of the`[marquee](obsolete.html#the-marquee-element)`, and ends flush with the end side of the `[marquee](obsolete.html#the-marquee-element)`.

When the [marquee current loop index](obsolete.html#marquee-current-loop-index) is odd, slide the contents of the element in the opposite direction than that described by the `[direction](obsolete.html#attr-marquee-direction)` attribute as defined below, such that it begins flush with the end side of the `[marquee](obsolete.html#the-marquee-element)`, and ends flush with the start side of the`[marquee](obsolete.html#the-marquee-element)`.

For example, if the `[direction](obsolete.html#attr-marquee-direction)` attribute is [left](obsolete.html#attr-marquee-direction-left) (the default), then the contents would with their right edge flush with the right inner edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area), and the contents would then slide up to the point where the _left_ edge of the contents are flush with the left inner edge of the`[marquee](obsolete.html#the-marquee-element)`'s [content area](https://drafts.csswg.org/css-box/#content-area).

Once the animation has ended, the user agent is [expected](#expected) to [increment the marquee current loop index](obsolete.html#increment-the-marquee-current-loop-index). If the element is still [turned on](obsolete.html#concept-marquee-on) after this, then the user agent is[expected](#expected) to continue the animation.

The `[direction](obsolete.html#attr-marquee-direction)` attribute has the meanings described in the following table:

`[direction](obsolete.html#attr-marquee-direction)` attribute state

Direction of animation

Start edge

End edge

Opposite direction

[left](obsolete.html#attr-marquee-direction-left)

← Right to left

Right

Left

→ Left to Right

[right](obsolete.html#attr-marquee-direction-right)

→ Left to Right

Left

Right

← Right to left

[up](obsolete.html#attr-marquee-direction-up)

↑ Up (Bottom to Top)

Bottom

Top

↓ Down (Top to Bottom)

[down](obsolete.html#attr-marquee-direction-down)

↓ Down (Top to Bottom)

Top

Bottom

↑ Up (Bottom to Top)

In any case, the animation should proceed such that there is a delay given by the [marquee scroll interval](obsolete.html#marquee-scroll-interval) between each frame, and such that the content moves at most the distance given by the [marquee scroll distance](obsolete.html#marquee-scroll-distance) with each frame.

When a `[marquee](obsolete.html#the-marquee-element)` element has a `bgcolor` attribute set, the value is [expected](#expected) to be parsed using the [rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value), and if that does not return failure, the user agent is[expected](#expected) to treat the attribute as a [presentational hint](#presentational-hints) setting the element's ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color) property to the resulting color.

The `width` and `height` attributes on a `[marquee](obsolete.html#the-marquee-element)` element[map to the dimension properties](#maps-to-the-dimension-property) ['width'](https://drafts.csswg.org/css2/#the-width-property) and ['height'](https://drafts.csswg.org/css2/#the-height-property) on the element respectively.

The [natural height](https://drafts.csswg.org/css-images/#natural-height) of a `[marquee](obsolete.html#the-marquee-element)` element with its `[direction](obsolete.html#attr-marquee-direction)` attribute in the [up](obsolete.html#attr-marquee-direction-up) or [down](obsolete.html#attr-marquee-direction-down) states is 200 [CSS pixels](https://drafts.csswg.org/css-values/#px).

The `vspace` attribute of a`[marquee](obsolete.html#the-marquee-element)` element [maps to the dimension properties](#maps-to-the-dimension-property) ['margin-top'](https://drafts.csswg.org/css-box/#propdef-margin-top) and ['margin-bottom'](https://drafts.csswg.org/css-box/#propdef-margin-bottom) on the element. The`hspace` attribute of a `[marquee](obsolete.html#the-marquee-element)` element [maps to the dimension properties](#maps-to-the-dimension-property) ['margin-left'](https://drafts.csswg.org/css-box/#propdef-margin-left) and ['margin-right'](https://drafts.csswg.org/css-box/#propdef-margin-right) on the element.

#### 15.5.14 The meter element

```
@namespace "http://www.w3.org/1999/xhtml";

meter { appearance: auto; }
```

The `[meter](form-elements.html#the-meter-element)` element is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box with a['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size) of '1em' and an ['inline-size'](https://drafts.csswg.org/css-logical/#propdef-inline-size) of '5em', a['vertical-align'](https://drafts.csswg.org/css2/#propdef-vertical-align) of '-0.2em', and with its contents depicting a gauge.

When this element has a [horizontal writing mode](#horizontal-writing-mode), the depiction is[expected](#expected) to be of a horizontal gauge. Its minimum value is on the right if the['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and on the left otherwise. When this element has a [vertical writing mode](#vertical-writing-mode), it is[expected](#expected) to depict a vertical gauge. Its minimum value is on the bottom if the['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and on the top otherwise.

User agents are [expected](#expected) to use a presentation consistent with platform conventions for gauges, if any.

Requirements for what must be depicted in the gauge are included in the definition of the `[meter](form-elements.html#the-meter-element)` element.

Need to detail the [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.15 The progress element

```
@namespace "http://www.w3.org/1999/xhtml";

progress { appearance: auto; }
```

The `[progress](form-elements.html#the-progress-element)` element is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its[native appearance](https://drafts.csswg.org/css-ui/#native-appearance) is [expected](#expected) to render as an['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box with a ['block-size'](https://drafts.csswg.org/css-logical/#propdef-block-size) of '1em' and an['inline-size'](https://drafts.csswg.org/css-logical/#propdef-inline-size) of '10em', and a ['vertical-align'](https://drafts.csswg.org/css2/#propdef-vertical-align) of '-0.2em'.

When this element has a [horizontal writing mode](#horizontal-writing-mode), the element is [expected](#expected) to be depicted as a horizontal progress bar. The start is on the right and the end is on the left if the ['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property on this element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and with the start on the left and the end on the right otherwise. When this element has a[vertical writing mode](#vertical-writing-mode), it is [expected](#expected) to be depicted as a vertical progress bar. The start is on the bottom and the end is on the top if the['direction'](https://drafts.csswg.org/css-writing-modes/#direction) property on this element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of 'rtl', and with the start on the top and the end on the bottom otherwise.

User agents are [expected](#expected) to use a presentation consistent with platform conventions for progress bars. In particular, user agents are [expected](#expected) to use different presentations for determinate and indeterminate progress bars. User agents are also[expected](#expected) to vary the presentation based on the dimensions of the element.

Requirements for how to determine if the progress bar is determinate or indeterminate, and what progress a determinate progress bar is to show, are included in the definition of the `[progress](form-elements.html#the-progress-element)` element.

Need to detail the [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

#### 15.5.16 The select element

The `[select](form-elements.html#the-select-element)` element is an [element with default preferred size](https://drafts.csswg.org/css-ui/#element-with-default-preferred-size), and user agents are [expected](#expected) to apply the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) CSS property to`[select](form-elements.html#the-select-element)` elements.

A `[select](form-elements.html#the-select-element)` element is either a list box or a drop-down box, depending on its attributes.

A `[select](form-elements.html#the-select-element)` element whose `[multiple](form-elements.html#attr-select-multiple)` attribute is present is [expected](#expected) to render as a multi-select [list box](#list-box) if its [display size](form-elements.html#concept-select-size) is greater than 1\. If the`[select](form-elements.html#the-select-element)` element has the `[multiple](form-elements.html#attr-select-multiple)` attribute and a [display size](form-elements.html#concept-select-size) of 1, then it may render as a multi-select [drop-down box](#drop-down-box) if the platform supports it; otherwise as a multi-select[list box](#list-box).

A `[select](form-elements.html#the-select-element)` element whose `[multiple](form-elements.html#attr-select-multiple)` attribute is absent is [expected](#expected) to render as a single-select [drop-down box](#drop-down-box) if its [display size](form-elements.html#concept-select-size) is 1, or as a single-select [list box](#list-box) if its [display size](form-elements.html#concept-select-size) is greater than 1.

When the element renders as a [list box](#list-box), it is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box. The [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of its [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is the [width of the select's labels](#width-of-the-select's-labels) plus the width of a scrollbar. The [block size](https://drafts.csswg.org/css-writing-modes/#block-size) of its [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is determined by the following steps:

1. If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), return the height necessary to contain all rows for items.
2. If the `[size](form-elements.html#attr-select-size)` attribute is absent or it has no valid value, return the height necessary to contain four rows.
3. Otherwise, return the height necessary to contain as many rows for items as given by the element's [display size](form-elements.html#concept-select-size).

A `[select](form-elements.html#the-select-element)` element which is being rendered as a [drop-down box](#drop-down-box) is[expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box. The [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of its [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is the [width of the select's labels](#width-of-the-select's-labels). If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), the [inline size](https://drafts.csswg.org/css-writing-modes/#inline-size) of the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) depends on the shown text. The shown text is typically the label of an `[option](form-elements.html#the-option-element)` of which [selectedness](form-elements.html#concept-option-selectedness) is set to true.

When the element renders as a [drop-down box](#drop-down-box), it is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable). Its appearance in the devolved state, as well as its appearance when the[computed value](https://drafts.csswg.org/css-cascade/#computed-value) of the element's ['appearance'](https://drafts.csswg.org/css-ui/#appearance-switching) property is`['menulist-button'](https://drafts.csswg.org/css-ui/#valdef-appearance-menulist-button)`, is that of a drop-down box, including a "drop-down button", but not necessarily rendered using a native control of the host operating system. In such a state, CSS properties such as ['color'](https://drafts.csswg.org/css-color/#the-color-property), ['background-color'](https://drafts.csswg.org/css-backgrounds/#propdef-background-color), and 'border' should not be disregarded (as is generally permissible when rendering an element according to its[native appearance](https://drafts.csswg.org/css-ui/#native-appearance)).

In either case ([list box](#list-box) or [drop-down box](#drop-down-box)), the element's items are[expected](#expected) to be the element's [list of options](form-elements.html#concept-select-option-list), with the element's `[optgroup](form-elements.html#the-optgroup-element)` element [children](https://dom.spec.whatwg.org/#concept-tree-child) providing headers for groups of options where applicable.

`[select](form-elements.html#the-select-element)` elements which render as a [drop-down box](#drop-down-box) support a [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) in addition to [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

`[select](form-elements.html#the-select-element)` elements which render as a [drop-down box](#drop-down-box) without the `[multiple](form-elements.html#attr-select-multiple)` attribute or as a [list box](#list-box) support a[base appearance](https://drafts.csswg.org/css-ui/#base-appearance) in addition to [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

The `[select](form-elements.html#the-select-element)` element's [select popover](#select-popover) supports a [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) and a [native appearance](https://drafts.csswg.org/css-ui/#native-appearance). The [select popover](#select-popover) can only be rendered with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) if its associated `[select](form-elements.html#the-select-element)` is being rendered with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance).

When a `[select](form-elements.html#the-select-element)` is being rendered as a [drop-down box](#drop-down-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance), it is [expected](#expected) to render with a [shadow tree](https://dom.spec.whatwg.org/#concept-shadow-tree) that contains the following elements:

A select button slot, which is a `[slot](scripting.html#the-slot-element)` element. It is appended to the `[select](form-elements.html#the-select-element)`'s [shadow root](https://dom.spec.whatwg.org/#concept-shadow-root) as the first child. It is[expected](#expected) to take the first child element of the `[select](form-elements.html#the-select-element)` if the first child element is a `[button](form-elements.html#the-button-element)`.A select fallback button text, which is a `[div](grouping-content.html#the-div-element)` element. It is appended to the [select button slot](#select-button-slot).A select popover, which is a `[div](grouping-content.html#the-div-element)` element. It is appended to the`[select](form-elements.html#the-select-element)`'s [shadow root](https://dom.spec.whatwg.org/#concept-shadow-root) as the second child, after the [select button slot](#select-button-slot). The `[select](form-elements.html#the-select-element)` element's ['::picker'](https://drafts.csswg.org/css-forms/#picker-pseudo) pseudo-element is the[select popover](#select-popover) if the [provided argument](https://drafts.csswg.org/css-forms/#typedef-picker-form-control-identifier) is `select`.

A select popover slot, which is a `[slot](scripting.html#the-slot-element)` element. It is appended to the [select popover](#select-popover). It is [expected](#expected) to take all child nodes of the`[select](form-elements.html#the-select-element)` except for the first child `[button](form-elements.html#the-button-element)`, which is taken by the[select button slot](#select-button-slot).

Since [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) is determined by computing style, it isn't possible to swap this DOM structure when switching appearance. Implementations can always include the DOM structure for [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) when the `[select](form-elements.html#the-select-element)` is rendered as a[drop-down box](#drop-down-box) and then choose to include or exclude it from the layout tree in order to control whether it gets rendered or not.

The [select popover](#select-popover) is only rendered when it is opted in to [base appearance](https://drafts.csswg.org/css-ui/#base-appearance) separately from the `[select](form-elements.html#the-select-element)` element. Otherwise, a native picker is used.

When a `[select](form-elements.html#the-select-element)` is being rendered as a [list box](#list-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance), it is expected to render with a [shadow tree](https://dom.spec.whatwg.org/#concept-shadow-tree) that contains aselect list box slot, which is a `[slot](scripting.html#the-slot-element)` element. The [select list box slot](#select-list-box-slot) is appended to the `[select](form-elements.html#the-select-element)`'s [shadow root](https://dom.spec.whatwg.org/#concept-shadow-root) as the first child. The [select list box slot](#select-list-box-slot) is expected to take all children of the `[select](form-elements.html#the-select-element)` element.

The [select popover](#select-popover)'s [implicit anchor element](https://drafts.csswg.org/css-anchor-position/#implicit-anchor-element) is its associated`[select](form-elements.html#the-select-element)` element.

When a `[select](form-elements.html#the-select-element)` element is being rendered with [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) or[primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance), or the `[select](form-elements.html#the-select-element)` element is being rendered as a[list box](#list-box), the ['::picker'](https://drafts.csswg.org/css-forms/#picker-pseudo) pseudo-element and the['::picker-icon'](https://drafts.csswg.org/css-forms/#selectordef-picker-icon) pseudo-element do not apply.

The ['::picker'](https://drafts.csswg.org/css-forms/#picker-pseudo) pseudo-element is not rendered when it has [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) or [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

The ['::checkmark'](https://drafts.csswg.org/css-forms/#checkmark) pseudo-element only applies to `[option](form-elements.html#the-option-element)` elements which are [being rendered with base appearance](#option-base-appearance).

An `[optgroup](form-elements.html#the-optgroup-element)` element is [expected](#expected) to be rendered by displaying the element's `[label](form-elements.html#attr-optgroup-label)` attribute.

To determine if a `select`'s `option`s are being rendered with base appearance, given a `[select](form-elements.html#the-select-element)` element select:

If select is being rendered as a [list box](#list-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance), then return true.If select is being rendered as a [drop-down box](#drop-down-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance), and its [select popover](#select-popover) is being rendered with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance), and select does not have the `[multiple](form-elements.html#attr-select-multiple)` attribute set, then return true.

Return false.

An `[option](form-elements.html#the-option-element)` element is rendered with base appearance if it has a [nearest ancestor select](form-elements.html#option-element-nearest-ancestor-select) and the [select's options are being rendered with base appearance](#select's-options-are-being-rendered-with-base-appearance).

An `[option](form-elements.html#the-option-element)` element is [expected](#expected) to be rendered by displaying the result of [collect option text](form-elements.html#collect-option-text) given the `[option](form-elements.html#the-option-element)` and true, indented under its`[optgroup](form-elements.html#the-optgroup-element)` element if it has one. If the `[option](form-elements.html#the-option-element)` [is being rendered with base appearance](#option-base-appearance) and the`[option](form-elements.html#the-option-element)`'s `[label](form-elements.html#attr-option-label)` attribute is not set, then the`[option](form-elements.html#the-option-element)` is [expected](#expected) to render all of its children rather than by displaying its [label](form-elements.html#concept-option-label).

Each sequence of one or more child `[hr](grouping-content.html#the-hr-element)` element siblings may be rendered as a single separator.

The width of the `select`'s labels is the wider of the width necessary to render the widest `[optgroup](form-elements.html#the-optgroup-element)`, and the width necessary to render the widest`[option](form-elements.html#the-option-element)` element in the element's [list of options](form-elements.html#concept-select-option-list) (including its indent, if any). If the `[select](form-elements.html#the-select-element)` has the `[multiple](form-elements.html#attr-select-multiple)` attribute and is being rendered as a[drop-down box](#drop-down-box), then the width should also be wide enough to accomodate the text rendered in the `[select](form-elements.html#the-select-element)` with any combination of `[option](form-elements.html#the-option-element)`s selected.

The [width of the select's labels](#width-of-the-select's-labels) has an accomodation for`[multiple](form-elements.html#attr-select-multiple)` because some implementations use special text to represent multiple options being selected, such as "2 selected." In this case, the select needs to be wide enough to render "2 selected" in addition to the individual `[option](form-elements.html#the-option-element)`s.

If a `[select](form-elements.html#the-select-element)` element contains a [placeholder label option](form-elements.html#placeholder-label-option), the user agent is [expected](#expected) to render that `[option](form-elements.html#the-option-element)` in a manner that conveys that it is a label, rather than a valid option of the control. This can include preventing the[placeholder label option](form-elements.html#placeholder-label-option) from being explicitly selected by the user. When the[placeholder label option](form-elements.html#placeholder-label-option)'s [selectedness](form-elements.html#concept-option-selectedness) is true, the control is[expected](#expected) to be displayed in a fashion that indicates that no valid option is currently selected.

User agents are [expected](#expected) to render the labels in a `[select](form-elements.html#the-select-element)` in such a manner that any alignment remains consistent whether the label is being displayed as part of the page or in a menu control.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

The following styles are [expected](#expected) to apply to `[select](form-elements.html#the-select-element)` elements when they are being rendered with [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) or [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance):

```
@namespace "http://www.w3.org/1999/xhtml";

select {
  letter-spacing: initial;
  word-spacing: initial;
  line-height: initial;
}
```

The following styles are [expected](#expected) to apply to `[select](form-elements.html#the-select-element)` elements when they are being rendered as a [drop-down box](#drop-down-box) with [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) or[primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance):

```
@namespace "http://www.w3.org/1999/xhtml";

select {
  display: inline-block;
}
```

The following styles are [expected](#expected) to apply to `[select](form-elements.html#the-select-element)` elements when they are being rendered with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance):

```
@namespace "http://www.w3.org/1999/xhtml";

select {
  background-color: transparent;
  border: 1px solid currentColor;
  user-select: none;
  box-sizing: border-box;
}

select option:enabled:hover {
  background-color: color-mix(currentColor 10%, transparent);
}
select option:enabled:active {
  background-color: color-mix(currentColor 20%, transparent);
}
select option:disabled {
  color: color-mix(currentColor 50%, transparent);
}

select option {
  min-inline-size: 24px;
  min-block-size: max(24px, 1lh);
  padding-inline: 0.5em;
  padding-block-end: 0;
  display: flex;
  align-items: center;
  gap: 0.5em;
  white-space: nowrap;
}

select option::checkmark {
  content: '\2713' / '';
}
select option:not(:checked)::checkmark {
  visibility: hidden;
}

select optgroup {
  display: block;
  font-weight: bolder;
}

select optgroup option {
  font-weight: normal;
}

select optgroup legend {
  padding-inline: 0.5em;
  min-block-size: 1lh;
}
```

The following styles are [expected](#expected) to apply to `[select](form-elements.html#the-select-element)` elements when they are being rendered as a [drop-down box](#drop-down-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance):

```
@namespace "http://www.w3.org/1999/xhtml";

select {
  border-radius: 0.5em;
  padding-block: 0.25em;
  padding-inline: 0.5em;
  min-block-size: calc-size(auto, max(size, 24px, 1lh));
  min-inline-size: calc-size(auto, max(size, 24px));
  display: inline-flex;
  gap: 0.5em;
  border-radius: 0.5em;
  field-sizing: content !important;
}

select > button:first-child {
  all: unset;
  display: contents;
}

select:enabled:hover {
  background-color: color-mix(currentColor 10%, transparent);
}
select:enabled:active {
  background-color: color-mix(currentColor 20%, transparent);
}
select:disabled {
  color: color-mix(currentColor 50%, transparent);
}

::picker(select) {
  box-sizing: border-box;
  border: 1px solid;
  padding: 0;
  color: CanvasText;
  background-color: Canvas;
  margin: 0;
  inset: auto;
  min-inline-size: anchor-size(self-inline);
  max-block-size: stretch;
  overflow: auto;
  position-area: self-block-end span-self-inline-end;
  position-try-order: most-block-size;
  position-try-fallbacks:
    self-block-start span-self-inline-end,
    self-block-end span-self-inline-start,
    self-block-start span-self-inline-start;
}

select::picker-icon {
  content: counter(fake-counter-name, disclosure-open);
  display: block;
  margin-inline-start: auto;
}
```

The following styles are [expected](#expected) to apply to `[select](form-elements.html#the-select-element)` elements when they are being rendered as a [list box](#list-box) with [base appearance](https://drafts.csswg.org/css-ui/#base-appearance):

```
@namespace "http://www.w3.org/1999/xhtml";

select {
  overflow: auto;
  display: inline-block;
  block-size: calc(max(24px, 1lh) * attr(size type(<integer>), 4));
}
```

#### 15.5.17 The textarea element

The `[textarea](form-elements.html#the-textarea-element)` element is a [devolvable widget](https://drafts.csswg.org/css-ui/#devolvable) [expected](#expected) to render as an ['inline-block'](https://drafts.csswg.org/css2/#value-def-inline-block) box depicting a multiline text control. If this multiline text control provides a selection, then, when the user changes the current selection, the user agent is [expected](#expected) to [queue an element task](webappapis.html#queue-an-element-task) on the [user interaction task source](webappapis.html#user-interaction-task-source) given the `[textarea](form-elements.html#the-textarea-element)` element to [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `[select](indices.html#event-select)` at the element, with the `[bubbles](https://dom.spec.whatwg.org/#dom-event-bubbles)` attribute initialized to true.

The `[textarea](form-elements.html#the-textarea-element)` element is an [element with default preferred size](https://drafts.csswg.org/css-ui/#element-with-default-preferred-size), and user agents are [expected](#expected) to apply the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) CSS property to`[textarea](form-elements.html#the-textarea-element)` elements.

If the ['field-sizing'](https://drafts.csswg.org/css-ui/#field-sizing) property on the element has a [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['content'](https://drafts.csswg.org/css-ui/#valdef-field-sizing-content), the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is determined from the text which the element shows. The text is either a[raw value](form-elements.html#concept-textarea-raw-value) or a short hint specified by the`[placeholder](form-elements.html#attr-textarea-placeholder)` attribute. User agents may take the text caret size into account in the [intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size). Otherwise, its[intrinsic size](https://drafts.csswg.org/css-sizing/#intrinsic-size) is computed from [textarea effective width](#textarea-effective-width) and[textarea effective height](#textarea-effective-height) (as defined below).

The textarea effective width of a `[textarea](form-elements.html#the-textarea-element)` element is size×avg \+ sbw, wheresize is the element's [character width](form-elements.html#attr-textarea-cols-value),avg is the average character width of the primary font of the element, in [CSS pixels](https://drafts.csswg.org/css-values/#px), and sbw is the width of a scrollbar, in [CSS pixels](https://drafts.csswg.org/css-values/#px). (The element's ['letter-spacing'](https://drafts.csswg.org/css-text/#letter-spacing-property) property does not affect the result.)

The textarea effective height of a `[textarea](form-elements.html#the-textarea-element)` element is the height in[CSS pixels](https://drafts.csswg.org/css-values/#px) of the number of lines given by the element's [character height](form-elements.html#attr-textarea-rows-value), plus the height of a scrollbar in [CSS pixels](https://drafts.csswg.org/css-values/#px).

User agents are [expected](#expected) to apply the ['white-space'](https://drafts.csswg.org/css-text/#white-space-property) CSS property to`[textarea](form-elements.html#the-textarea-element)` elements. For historical reasons, if the element has a `[wrap](form-elements.html#attr-textarea-wrap)` attribute whose value is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`off`", then the user agent is [expected](#expected) to treat the attribute as a[presentational hint](#presentational-hints) setting the element's['white-space'](https://drafts.csswg.org/css-text/#white-space-property) property to 'pre'.

Need to detail the [native appearance](https://drafts.csswg.org/css-ui/#native-appearance) and [primitive appearance](https://drafts.csswg.org/css-ui/#primitive-appearance).

### 15.6 Frames and framesets

User agents are [expected](#expected) to render `[frameset](obsolete.html#frameset)` elements as a box with the height and width of the [viewport](https://drafts.csswg.org/css2/#viewport), with a surface rendered according to the following layout algorithm:

- The cols and rows variables are lists of zero or more pairs consisting of a number and a unit, the unit being one of _percentage_, _relative_, and*absolute*.  
  Use the [rules for parsing a list of dimensions](common-microsyntaxes.html#rules-for-parsing-a-list-of-dimensions) to parse the value of the element's `cols` attribute, if there is one. Let cols be the result, or an empty list if there is no such attribute.  
  Use the [rules for parsing a list of dimensions](common-microsyntaxes.html#rules-for-parsing-a-list-of-dimensions) to parse the value of the element's `rows` attribute, if there is one. Let rows be the result, or an empty list if there is no such attribute.
- For any of the entries in cols or rows that have the number zero and the unit _relative_, change the entry's number to one.
- If cols has no entries, then add a single entry consisting of the value 1 and the unit _relative_ to cols.  
  If rows has no entries, then add a single entry consisting of the value 1 and the unit _relative_ to rows.
- Invoke the algorithm defined below to [convert a list of dimensions to a list of pixel values](#convert-a-list-of-dimensions-to-a-list-of-pixel-values) using cols as the input list, and the width of the surface that the`[frameset](obsolete.html#frameset)` is being rendered into, in [CSS pixels](https://drafts.csswg.org/css-values/#px), as the input dimension. Let sized cols be the resulting list.  
  Invoke the algorithm defined below to [convert a list of dimensions to a list of pixel values](#convert-a-list-of-dimensions-to-a-list-of-pixel-values) using rows as the input list, and the height of the surface that the`[frameset](obsolete.html#frameset)` is being rendered into, in [CSS pixels](https://drafts.csswg.org/css-values/#px), as the input dimension. Let sized rows be the resulting list.
- Split the surface into a grid of w×h rectangles, where w is the number of entries in sized cols andh is the number of entries in sized rows.  
  Size the columns so that each column in the grid is as many [CSS pixels](https://drafts.csswg.org/css-values/#px) wide as the corresponding entry in the sized cols list.  
  Size the rows so that each row in the grid is as many [CSS pixels](https://drafts.csswg.org/css-values/#px) high as the corresponding entry in the sized rows list.
- Let children be the list of `[frame](obsolete.html#frame)` and `[frameset](obsolete.html#frameset)` elements that are [children](https://dom.spec.whatwg.org/#concept-tree-child) of the `[frameset](obsolete.html#frameset)` element for which the algorithm was invoked.
- For each row of the grid of rectangles created in the previous step, from top to bottom, run these substeps:

1. For each rectangle in the row, from left to right, run these substeps:
   1. If there are any elements left in children, take the first element in the list, and assign it to the rectangle.  
      If this is a `[frameset](obsolete.html#frameset)` element, then recurse the entire `[frameset](obsolete.html#frameset)` layout algorithm for that `[frameset](obsolete.html#frameset)` element, with the rectangle as the surface.  
      Otherwise, it is a `[frame](obsolete.html#frame)` element; render its [content navigable](document-sequences.html#content-navigable), positioned and sized to fit the rectangle.
   2. If there are any elements left in children, remove the first element fromchildren.

If the `[frameset](obsolete.html#frameset)` element [has a border](#has-a-border), draw an outer set of borders around the rectangles, using the element's [frame border color](#frame-border-colour).

For each rectangle, if there is an element assigned to that rectangle, and that element[has a border](#has-a-border), draw an inner set of borders around that rectangle, using the element's [frame border color](#frame-border-colour).

For each (visible) border that does not abut a rectangle that is assigned a`[frame](obsolete.html#frame)` element with a `noresize` attribute (including rectangles in further nested `[frameset](obsolete.html#frameset)` elements), the user agent is [expected](#expected) to allow the user to move the border, resizing the rectangles within, keeping the proportions of any nested `[frameset](obsolete.html#frameset)` grids.

A `[frameset](obsolete.html#frameset)` or `[frame](obsolete.html#frame)` element has a border if the following algorithm returns true:

If the element has a `frameborder` attribute whose value is not the empty string and whose first character is either a U+0031 DIGIT ONE (1) character, a U+0079 LATIN SMALL LETTER Y character (y), or a U+0059 LATIN CAPITAL LETTER Y character (Y), then return true.Otherwise, if the element has a `frameborder` attribute, return false.Otherwise, if the element has a parent element that is a `[frameset](obsolete.html#frameset)` element, then return true if _that_ element [has a border](#has-a-border), and false if it does not.

Otherwise, return true.

The frame border color of a`[frameset](obsolete.html#frameset)` or `[frame](obsolete.html#frame)` element is the color obtained from the following algorithm:

If the element has a `bordercolor` attribute, and applying the[rules for parsing a legacy color value](common-microsyntaxes.html#rules-for-parsing-a-legacy-colour-value) to that attribute's value does not return failure, then return the color so obtained.

- Otherwise, if the element has a parent element that is a `[frameset](obsolete.html#frameset)` element, then return the [frame border color](#frame-border-colour) of that element.

Otherwise, return gray.

The algorithm to convert a list of dimensions to a list of pixel values consists of the following steps:

- Let input list be the list of numbers and units passed to the algorithm.  
  Let output list be a list of numbers the same length as input list, all zero.  
  Entries in output list correspond to the entries in input list that have the same position.
- Let input dimension be the size passed to the algorithm.
- Let total percentage be the sum of all the numbers in input list whose unit is _percentage_.  
  Let total relative be the sum of all the numbers in input list whose unit is _relative_.  
  Let total absolute be the sum of all the numbers in input list whose unit is _absolute_.  
  Let remaining space be the value of input dimension.
- If total absolute is greater than remaining space, then for each entry in input list whose unit is _absolute_, set the corresponding value inoutput list to the number of the entry in input list multiplied byremaining space and divided by total absolute. Then, set remaining space to zero.  
  Otherwise, for each entry in input list whose unit is _absolute_, set the corresponding value in output list to the number of the entry in input list. Then, decrement remaining space by total absolute.
- If total percentage multiplied by the input dimension and divided by 100 is greater than remaining space, then for each entry in input list whose unit is _percentage_, set the corresponding value in output list to the number of the entry in input list multiplied by remaining space and divided by total percentage. Then, set remaining space to zero.  
  Otherwise, for each entry in input list whose unit is _percentage_, set the corresponding value in output list to the number of the entry in input list multiplied by the input dimension and divided by 100\. Then, decrementremaining space by total percentage multiplied by the input dimension and divided by 100.
- For each entry in input list whose unit is _relative_, set the corresponding value in output list to the number of the entry in input list multiplied by remaining space and divided by total relative.

Return output list.

User agents working with integer values for frame widths (as opposed to user agents that can lay frames out with subpixel accuracy) are [expected](#expected) to distribute the remainder first to the last entry whose unit is _relative_, then equally (not proportionally) to each entry whose unit is _percentage_, then equally (not proportionally) to each entry whose unit is _absolute_, and finally, failing all else, to the last entry.

---

The contents of a `[frame](obsolete.html#frame)` element that does not have a `[frameset](obsolete.html#frameset)` parent are [expected](#expected) to be rendered as [transparent black](https://drafts.csswg.org/css-color/#transparent-black); the user agent is[expected](#expected) to not render its [content navigable](document-sequences.html#content-navigable) in this case, and its[content navigable](document-sequences.html#content-navigable) is [expected](#expected) to have a [viewport](https://drafts.csswg.org/css2/#viewport) with zero width and zero height.

### 15.7 Interactive media

#### 15.7.1 Links, forms, and navigation

User agents are [expected](#expected) to allow the user to control aspects of[hyperlink](links.html#hyperlink) activation and [form submission](form-control-infrastructure.html#form-submission-2), such as which[navigable](document-sequences.html#navigable) is to be used for the subsequent [navigation](browsing-the-web.html#navigate).

User agents are [expected](#expected) to allow users to discover the destination of [hyperlinks](links.html#hyperlink) and of [forms](forms.html#the-form-element) before triggering their[navigation](browsing-the-web.html#navigate).

User agents are [expected](#expected) to inform the user of whether a [hyperlink](links.html#hyperlink) includes [hyperlink auditing](links.html#hyperlink-auditing), and to let them know at a minimum which domains will be contacted as part of such auditing.

User agents may allow users to [navigate](browsing-the-web.html#navigate) [navigables](document-sequences.html#navigable) to the URLs [indicated](urls-and-fetching.html#encoding-parsing-a-url) by the `cite` attributes on `[q](text-level-semantics.html#the-q-element)`,`[blockquote](grouping-content.html#the-blockquote-element)`, `[ins](edits.html#the-ins-element)`, and `[del](edits.html#the-del-element)` elements.

User agents may surface [hyperlinks](links.html#hyperlink) created by `[link](semantics.html#the-link-element)` elements in their user interface, as discussed [previously](semantics.html#providing-users-with-a-means-to-follow-hyperlinks-created-using-the-link-element).

#### 15.7.2 The title attribute

User agents are [expected](#expected) to expose the [advisory information](dom.html#advisory-information) of elements upon user request, and to make the user aware of the presence of such information.

On interactive graphical systems where the user can use a pointing device, this could take the form of a tooltip. When the user is unable to use a pointing device, then the user agent is[expected](#expected) to make the content available in some other fashion, e.g. by making the element a [focusable area](interaction.html#focusable-area) and always displaying the [advisory information](dom.html#advisory-information) of the currently [focused](interaction.html#focused) element, or by showing the [advisory information](dom.html#advisory-information) of the elements under the user's finger on a touch device as the user pans around the screen.

U+000A LINE FEED (LF) characters are [expected](#expected) to cause line breaks in the tooltip; U+0009 CHARACTER TABULATION (tab) characters are [expected](#expected) to render as a nonzero horizontal shift that lines up the next glyph with the next tab stop, with tab stops occurring at points that are multiples of 8 times the width of a U+0020 SPACE character.

For example, a visual user agent could make elements with a `[title](dom.html#attr-title)` attribute [focusable](interaction.html#focusable), and could make any [focused](interaction.html#focused) element with a `[title](dom.html#attr-title)` attribute show its tooltip under the element while the element has focus. This would allow a user to tab around the document to find all the advisory text.

As another example, a screen reader could provide an audio cue when reading an element with a tooltip, with an associated key to read the last tooltip for which a cue was played.

#### 15.7.3 Editing hosts

The current text editing caret (i.e. the [active range](https://w3c.github.io/editing/docs/execCommand/#active-range), if it is empty and in an[editing host](interaction.html#editing-host)), if any, is [expected](#expected) to act like an inline[replaced element](https://drafts.csswg.org/css-display/#replaced-element) with the vertical dimensions of the caret and with zero width for the purposes of the CSS rendering model.

This means that even an empty block can have the caret inside it, and that when the caret is in such an element, it prevents [margins from collapsing](https://drafts.csswg.org/css2/#collapsing-margins) through the element.

#### 15.7.4 Text rendered in native user interfaces

User agents are [expected](#expected) to honor the Unicode semantics of text that is exposed in user interfaces, for example supporting the bidirectional algorithm in text shown in dialogs, title bars, popup menus, and tooltips. Text from the contents of elements is[expected](#expected) to be rendered in a manner that honors [the directionality](dom.html#the-directionality) of the element from which the text was obtained. Text from attributes is [expected](#expected) to be rendered in a manner that honours the [directionality of the attribute](dom.html#directionality-of-the-attribute).

Consider the following markup, which has Hebrew text asking for a programming language, the languages being text for which a left-to-right direction is important given the punctuation in some of their names:

```
<p dir="rtl" lang="he">
 <label>
  בחר שפת תכנות:
  <select>
   <option dir="ltr">C++</option>
   <option dir="ltr">C#</option>
   <option dir="ltr">FreePascal</option>
   <option dir="ltr">F#</option>
  </select>
 </label>
</p>
```

If the `[select](form-elements.html#the-select-element)` element was rendered as a drop down box, a correct rendering would ensure that the punctuation was the same both in the drop down, and in the box showing the current selection.

The directionality of attributes depends on the attribute and on the element's `[dir](dom.html#attr-dir)` attribute, as the following example demonstrates. Consider this markup:

```
<table>
 <tr>
  <th abbr="(א" dir=ltr>A
  <th abbr="(א" dir=rtl>A
  <th abbr="(א" dir=auto>A
</table>
```

If the `[abbr](tables.html#attr-th-abbr)` attributes are rendered, e.g. in a tooltip or other user interface, the first will have a left parenthesis (because the direction is 'ltr'), the second will have a right parenthesis (because the direction is 'rtl'), and the third will have a right parenthesis (because the direction is determined _from the attribute value_ to be 'rtl').

However, if instead the attribute was not a [directionality-capable attribute](dom.html#directionality-capable-attribute), the results would be different:

```
<table>
 <tr>
  <th data-abbr="(א" dir=ltr>A
  <th data-abbr="(א" dir=rtl>A
  <th data-abbr="(א" dir=auto>A
</table>
```

In this case, if the user agent were to expose the `data-abbr` attribute in the user interface (e.g. in a debugging environment), the last case would be rendered with a*left* parenthesis, because the direction would be determined from the element's contents.

A string provided by a script (e.g. the argument to `[window.alert()](timers-and-user-prompts.html#dom-alert)`) is [expected](#expected) to be treated as an independent set of one or more bidirectional algorithm paragraphs when displayed, as defined by the bidirectional algorithm, including, for instance, supporting the paragraph-breaking behavior of U+000A LINE FEED (LF) characters. For the purposes of determining the paragraph level of such text in the bidirectional algorithm, this specification does _not_ provide a higher-level override of rules P2 and P3\. [\[BIDI\]](references.html#refsBIDI)

When necessary, authors can enforce a particular direction for a given paragraph by starting it with the Unicode U+200E LEFT-TO-RIGHT MARK or U+200F RIGHT-TO-LEFT MARK characters.

Thus, the following script:

```
alert('\u05DC\u05DE\u05D3 HTML \u05D4\u05D9\u05D5\u05DD!')
```

...would always result in a message reading "למד LMTH היום!" (not "דמל HTML םויה!"), regardless of the language of the user agent interface or the direction of the page or any of its elements.

For a more complex example, consider the following script:

```
/* Warning: this script does not handle right-to-left scripts correctly */
var s;
if (s = prompt('What is your name?')) {
  alert(s + '! Ok, Fred, ' + s + ', and Wilma will get the car.');
}
```

When the user enters "Kitty", the user agent would alert "Kitty! Ok, Fred, Kitty, and Wilma will get the car.". However, if the user enters "لا أفهم", then the bidirectional algorithm will determine that the direction of the paragraph is right-to-left, and so the output will be the following unintended mess: "لا أفهم! derF ,kO, لا أفهم, rac eht teg lliw amliW dna."

To force an alert that starts with user-provided text (or other text of unknown directionality) to render left-to-right, the string can be prefixed with a U+200E LEFT-TO-RIGHT MARK character:

```
var s;
if (s = prompt('What is your name?')) {
  alert('\u200E' + s + '! Ok, Fred, ' + s + ', and Wilma will get the car.');
}
```

### 15.8 Print media

User agents are [expected](#expected) to allow the user to request the opportunity toobtain a physical form (or a representation of a physical form) of a`[Document](dom.html#document)`. For example, selecting the option to print a page or convert it to PDF format. [\[PDF\]](references.html#refsPDF)

When the user actually [obtains a physical form](#obtain-a-physical-form) (or a representation of a physical form) of a `[Document](dom.html#document)`, the user agent is[expected](#expected) to create a new rendering of the `[Document](dom.html#document)` for the print media.

### 15.9 Unstyled XML documents

HTML user agents may, in certain circumstances, find themselves rendering non-HTML documents that use vocabularies for which they lack any built-in knowledge. This section provides for a way for user agents to handle such documents in a somewhat useful manner.

While a `[Document](dom.html#document)` is an [unstyled document](#unstyled-document), the user agent is[expected](#expected) to render [an unstyled document view](#an-unstyled-document-view).

A `[Document](dom.html#document)` is an unstyled document while it matches the following conditions:

- The `[Document](dom.html#document)` has no author style sheets (whether referenced by HTTP headers, processing instructions, elements like `[link](semantics.html#the-link-element)`, inline elements like `[style](semantics.html#the-style-element)`, or any other mechanism).
- None of the elements in the `[Document](dom.html#document)` have any [presentational hints](#presentational-hints).
- None of the elements in the `[Document](dom.html#document)` have any [style attributes](https://drafts.csswg.org/css-style-attr/#style-attribute).
- None of the elements in the `[Document](dom.html#document)` are in any of the following namespaces: [HTML namespace](https://infra.spec.whatwg.org/#html-namespace), [SVG namespace](https://infra.spec.whatwg.org/#svg-namespace), [MathML namespace](https://infra.spec.whatwg.org/#mathml-namespace)
- The `[Document](dom.html#document)` has no [focusable area](interaction.html#focusable-area) (e.g. from XLink) other than the [viewport](https://drafts.csswg.org/css2/#viewport).
- The `[Document](dom.html#document)` has no [hyperlinks](links.html#hyperlink) (e.g. from XLink).
- There exists no [script](webappapis.html#concept-script) whose [settings object](webappapis.html#settings-object)'s [global object](webappapis.html#concept-settings-object-global) is a `[Window](nav-history-apis.html#window)` object with this `[Document](dom.html#document)` as its [associatedDocument](nav-history-apis.html#concept-document-window).
- None of the elements in the `[Document](dom.html#document)` have any registered event listeners.

An unstyled document view is one where the DOM is not rendered according to CSS (which would, since there are no applicable styles in this context, just result in a wall of text), but is instead rendered in a manner that is useful for a developer. This could consist of just showing the `[Document](dom.html#document)` object's source, maybe with syntax highlighting, or it could consist of displaying just the DOM tree, or simply a message saying that the page is not a styled document.

If a `[Document](dom.html#document)` stops being an [unstyled document](#unstyled-document), then the conditions above stop applying, and thus a user agent following these requirements will switch to using the regular CSS rendering.
