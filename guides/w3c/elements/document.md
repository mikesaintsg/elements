# HTML Standard — §4.1 The document element · §4.2 Document metadata

> Source: <https://html.spec.whatwg.org/multipage/semantics.html>

The elements a DOM-walking inspector meets first: the document root and
its metadata head. A walk that starts at `document` descends into `html`
→ (`head`, `body`); the `body` subtree is covered by the other element
files, `head` metadata is covered here.

## Contents

- [4.1.1 The `html` element](#411-the-html-element)
- [4.2.1 The `head` element](#421-the-head-element)
- [4.2.2 The `title` element](#422-the-title-element)
- [4.2.3 The `base` element](#423-the-base-element)
- [4.2.4 The `link` element](#424-the-link-element)
- [4.2.5 The `meta` element](#425-the-meta-element)
- [4.2.6 The `style` element](#426-the-style-element)

---

### 4.1.1 The `html` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-html-element>

**Categories:** None.

**Contexts:** As the document's document element; wherever a subdocument fragment is allowed in a compound document.

**Content model:** A `head` element followed by a `body` element.

**Tag omission:** An `html` element's start tag can be omitted if the first thing inside the element is not a comment. An `html` element's end tag can be omitted if the element is not immediately followed by a comment.

**Attributes:** Global attributes; `manifest` (obsolete).

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-html).

[For implementers](https://w3c.github.io/html-aam/#el-html).

**DOM interface:** `HTMLHtmlElement`.

The `html` element represents the root of an HTML document. Authors are strongly encouraged to specify a `lang` attribute on it to aid speech-synthesis and translation tools. **DOM-checkable:** exactly two element children in order — one `head` then one `body`.

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Swapping Songs</title>
	</head>
	<body>
		<h1>Swapping Songs</h1>
	</body>
</html>
```

### 4.2.1 The `head` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-head-element>

**Categories:** None.

**Contexts:** As the first element in an `html` element.

**Content model:** If the document is an `iframe` `srcdoc` document or if title information is available from a higher-level protocol: zero or more elements of metadata content, of which no more than one is a `title` element and no more than one is a `base` element. Otherwise: one or more elements of metadata content, of which exactly one is a `title` element and no more than one is a `base` element.

**Tag omission:** A `head` element's start tag can be omitted if the element is empty, or if the first thing inside it is an element. A `head` element's end tag can be omitted if it is not immediately followed by ASCII whitespace or a comment.

**Attributes:** Global attributes.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-head).

[For implementers](https://w3c.github.io/html-aam/#el-head).

**DOM interface:** `HTMLHeadElement`.

The `head` element represents a collection of metadata for the `Document`. **DOM-checkable:** must be the first child of `html`; children must be metadata content; at most one `title` and at most one `base`; a `title` is required unless the document gets its title from elsewhere.

```html
<!doctype html>
<html lang="en">
	<head>
		<title>A document with a short head</title>
	</head>
	<body>
		...
	</body>
</html>
```

### 4.2.2 The `title` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-title-element>

**Categories:** Metadata content.

**Contexts:** In a `head` element containing no other `title` elements.

**Content model:** Text that is not inter-element whitespace.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-title).

[For implementers](https://w3c.github.io/html-aam/#el-title).

**DOM interface:** `HTMLTitleElement`.

The `title` element represents the document's title or name. It must contain only text (no descendant elements) and there must be no more than one per document. It should identify the document even out of context (search results, bookmarks, history).

```html
<title>Introduction to The Mating Rituals of Bees</title>
```

### 4.2.3 The `base` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-base-element>

**Categories:** Metadata content.

**Contexts:** In a `head` element containing no other `base` elements.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `href`, `target`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-base).

[For implementers](https://w3c.github.io/html-aam/#el-base).

**DOM interface:** `HTMLBaseElement`.

The `base` element allows authors to specify the document base URL for URL parsing and the default navigable for following hyperlinks. There must be no more than one `base` element per document; it must have an `href` and/or a `target`. It is a void element (no children).

```html
<base href="https://www.example.com/news/index.html" />
```

### 4.2.4 The `link` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-link-element>

**Categories:** Metadata content; if the element is allowed in the body: flow content and phrasing content.

**Contexts:** Where metadata content is expected; in a `noscript` element that is a child of a `head` element; if the element is allowed in the body: where phrasing content is expected.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `href`, `crossorigin`, `rel`, `media`, `integrity`, `hreflang`, `type`, `referrerpolicy`, `sizes`, `imagesrcset`, `imagesizes`, `as`, `blocking`, `color`, `disabled`, `fetchpriority`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-link).

[For implementers](https://w3c.github.io/html-aam/#el-link).

**DOM interface:** `HTMLLinkElement`.

The `link` element allows authors to link their document to other resources. The destination is given by `href`; the relationship by `rel`. A `link` may appear in the body **only** if its `rel` carries a body-ok keyword (see [`links.md`](links.md)); otherwise it must be in the `head`. It is a void element.

```html
<link rel="stylesheet" href="default.css" />
```

### 4.2.5 The `meta` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element>

**Categories:** Metadata content; if the `itemprop` attribute is present: flow content and phrasing content.

**Contexts:** If the `charset` attribute is present, or if the element's `http-equiv` attribute is in the Encoding declaration state: in a `head` element. If the `http-equiv` attribute is present but not in the Encoding declaration state: in a `head` element, or in a `noscript` element that is a child of a `head` element. If the `name` attribute is present: where metadata content is expected. If the `itemprop` attribute is present: where metadata content is expected, or where phrasing content is expected.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `name`, `http-equiv`, `content`, `charset`, `media`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-meta).

[For implementers](https://w3c.github.io/html-aam/#el-meta).

**DOM interface:** `HTMLMetaElement`.

The `meta` element represents metadata that cannot be expressed using `title`/`base`/`link`/`style`/`script`. Exactly one of `name`, `http-equiv`, `charset`, or `itemprop` must be present (and `content` is required unless `charset` is present). It is a void element.

```html
<meta name="keywords" content="british,typeface,font,highway" />
```

### 4.2.6 The `style` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style) · Source: <https://html.spec.whatwg.org/multipage/semantics.html#the-style-element>

**Categories:** Metadata content.

**Contexts:** Where metadata content is expected; in a `noscript` element that is a child of a `head` element.

**Content model:** Text that is a CSS stylesheet.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `media`, `blocking`, `title` (alternative-stylesheet semantics).

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-style).

[For implementers](https://w3c.github.io/html-aam/#el-style).

**DOM interface:** `HTMLStyleElement`.

The `style` element allows authors to embed CSS style sheets in their documents. Its content must be a conforming CSS style sheet (text only — no descendant elements). The `media` attribute scopes the styles to a media query.

```html
<style>
	body {
		color: black;
		background: white;
	}
</style>
```
