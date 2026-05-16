# HTML Standard — §4.8 Embedded Content

> Source: <https://html.spec.whatwg.org/multipage/embedded-content.html#embedded-content>

## Contents

- [4.8.1 The `picture` element](#481-the-picture-element)
- [4.8.2 The `source` element](#482-the-source-element)
- [4.8.3 The `img` element](#483-the-img-element)
- [4.8.5 The `iframe` element](#485-the-iframe-element)
- [4.8.6 The `embed` element](#486-the-embed-element)
- [4.8.7 The `object` element](#487-the-object-element)
- [4.8.8 The `video` element](#488-the-video-element)
- [4.8.9 The `audio` element](#489-the-audio-element)
- [4.8.10 The `track` element](#4810-the-track-element)
- [4.8.13 The `map` element](#4813-the-map-element)
- [4.8.14 The `area` element](#4814-the-area-element)
- [4.8.18 The `canvas` element](#4818-the-canvas-element)

---

## 4.8 Embedded content

### 4.8.1 The `picture` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLPictureElement)

**Categories:** Flow content, Phrasing content, Embedded content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** Zero or more `source` elements, followed by one `img` element, optionally intermixed with script-supporting elements.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-picture).

[For implementers](https://w3c.github.io/html-aam/#el-picture).

**DOM interface:**

```
[Exposed=Window]
interface HTMLPictureElement : HTMLElement {
  [HTMLConstructor] constructor();
};
```

The `picture` element is a container which provides multiple sources to its contained `img` element to allow authors to declaratively control or give hints to the user agent about which image resource to use, based on the screen pixel density, [viewport](https://drafts.csswg.org/css2/#viewport) size, image format, and other factors. It represents its children.

The `picture` element is somewhat different from the similar-looking`video` and `audio` elements. While all of them contain `source` elements, the `source` element's `src` attribute has no meaning when the element is nested within a `picture` element, and the resource selection algorithm is different. Also, the `picture` element itself does not display anything; it merely provides a context for its contained `img` element that enables it to choose from multiple [URLs](https://url.spec.whatwg.org/#concept-url).

### 4.8.2 The `source` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSourceElement)

**Categories:** None.

**Contexts:**

- As a child of a `picture` element, before the `img` element.
- As a child of a media element, before any flow content or `track` elements.

**Content model:** Nothing.

**Tag omission:** No end tag.

**Attributes:**

Global attributes; `type` — type of embedded resource; `media` — applicable media; `src` (in `audio`/`video`) — address of the resource; `srcset` (in `picture`) — images to use in different situations; `sizes` (in `picture`) — image sizes for different page layouts; `width` (in `picture`) — horizontal dimension; `height` (in `picture`) — vertical dimension.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-source).

[For implementers](https://w3c.github.io/html-aam/#el-source).

**DOM interface:**

```
[Exposed=Window]
interface HTMLSourceElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, ReflectURL] attribute USVString src;
  [CEReactions, Reflect] attribute DOMString type;
  [CEReactions, Reflect] attribute USVString srcset;
  [CEReactions, Reflect] attribute DOMString sizes;
  [CEReactions, Reflect] attribute DOMString media;
  [CEReactions, Reflect] attribute unsigned long width;
  [CEReactions, Reflect] attribute unsigned long height;
};
```

The `source` element allows authors to specify multiple alternativesource sets for `img` elements or multiple alternativemedia resources for media elements. It does not represent anything on its own.

The `type` attribute may be present. If present, the value must be a [valid MIME type string](https://mimesniff.spec.whatwg.org/#valid-mime-type).

The `media` attribute may also be present. If present, the value must contain a valid media query list. The user agent will skip to the next `source` element if the value does not match the environment.

The `media` attribute is only evaluated once during the resource selection algorithm for media elements. In contrast, when using the`picture` element, the user agent will react to changes in the environment.

The remainder of the requirements depend on whether the parent is a `picture` element or a media element:

The `source` element's parent is a `picture` element

The `srcset` attribute must be present, and is a srcset attribute.

The `srcset` attribute contributes the image sources to the source set, if the`source` element is selected.

If the `srcset` attribute has any image candidate strings using a width descriptor, the`sizes` attribute may also be present. If, additionally, the following sibling `img` element does not allow auto-sizes, the `sizes` attribute must be present. The `sizes` attribute is a sizes attribute, which contributes the source size to the source set, if the `source` element is selected.

If the `img` element allows auto-sizes, then the `sizes` attribute can be omitted on previous sibling`source` elements. In such cases, it is equivalent to specifying `auto`.

The `source` element supports dimension attributes. The`img` element can use the `width` and `height` attributes of a `source` element, instead of those on the `img` element itself, to determine its rendered dimensions and aspect-ratio, as defined in the Rendering section.

The `type` attribute gives the type of the images in thesource set, to allow the user agent to skip to the next `source` element if it does not support the given type.

If the `type` attribute is _not_ specified, the user agent will not select a different `source` element if it finds that it does not support the image format after fetching it.

When a `source` element has a following sibling `source` element or`img` element with a `srcset` attribute specified, it must have at least one of the following:

A `media` attribute specified with a value that, after [stripping leading and trailing ASCII whitespace](https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace), is not the empty string and is not an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`all`".

A `type` attribute specified.

The `src` attribute must not be present.

The `source` element's parent is a media element

The `src` attribute gives the [URL](https://url.spec.whatwg.org/#concept-url) of the media resource. The value must be a valid non-empty URL potentially surrounded by spaces. This attribute must be present.

The `type` attribute gives the type of the media resource, to help the user agent determine if it can play this media resource before fetching it. The `codecs` parameter, which certain MIME types define, might be necessary to specify exactly how the resource is encoded.[\[RFC6381\]](references.html#refsRFC6381)

Dynamically modifying a `source` element's `src` or `type` attribute when the element is already inserted in a `video` or `audio` element will have no effect. To change what is playing, just use the `src` attribute on the media element directly, possibly making use of the `canPlayType()` method to pick from amongst available resources. Generally, manipulating `source` elements manually after the document has been parsed is an unnecessarily complicated approach.

The following list shows some examples of how to use the `codecs=` MIME parameter in the `type` attribute.

H.264 Constrained baseline profile video (main and extended video compatible) level 3 and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"'>
```

H.264 Extended profile video (baseline-compatible) level 3 and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="avc1.58A01E, mp4a.40.2"'>
```

H.264 Main profile video level 3 and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="avc1.4D401E, mp4a.40.2"'>
```

H.264 'High' profile video (incompatible with main, baseline, or extended profiles) level 3 and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="avc1.64001E, mp4a.40.2"'>
```

MPEG-4 Visual Simple Profile Level 0 video and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="mp4v.20.8, mp4a.40.2"'>
```

MPEG-4 Advanced Simple Profile Level 0 video and Low-Complexity AAC audio in MP4 container

```
<source src='video.mp4' type='video/mp4; codecs="mp4v.20.240, mp4a.40.2"'>
```

MPEG-4 Visual Simple Profile Level 0 video and AMR audio in 3GPP container

```
<source src='video.3gp' type='video/3gpp; codecs="mp4v.20.8, samr"'>
```

Theora video and Vorbis audio in Ogg container

```
<source src='video.ogv' type='video/ogg; codecs="theora, vorbis"'>
```

Theora video and Speex audio in Ogg container

```
<source src='video.ogv' type='video/ogg; codecs="theora, speex"'>
```

Vorbis audio alone in Ogg container

```
<source src='audio.ogg' type='audio/ogg; codecs=vorbis'>
```

Speex audio alone in Ogg container

```
<source src='audio.spx' type='audio/ogg; codecs=speex'>
```

FLAC audio alone in Ogg container

```
<source src='audio.oga' type='audio/ogg; codecs=flac'>
```

Dirac video and Vorbis audio in Ogg container

```
<source src='video.ogv' type='video/ogg; codecs="dirac, vorbis"'>
```

The `srcset` and `sizes` attributes must not be present.

The `source` HTML element insertion steps, giveninsertedNode, are:

Let parent be insertedNode's [parent](https://dom.spec.whatwg.org/#concept-tree-parent).If parent is a media element that has no `src` attribute and whose `networkState` has the value `NETWORK_EMPTY`, then invoke that media element's resource selection algorithm.

If parent is a `picture` element, then [for each](https://infra.spec.whatwg.org/#list-iterate) child of parent's [children](https://dom.spec.whatwg.org/#concept-tree-child), if child is an `img` element, then count this as a relevant mutation forchild.

The `source` HTML element moving steps, given movedNode,isSubtreeRoot, and oldAncestor are:

If isSubtreeRoot is true and oldAncestor is a `picture` element, then [for each](https://infra.spec.whatwg.org/#list-iterate) child ofoldAncestor's [children](https://dom.spec.whatwg.org/#concept-tree-child): if child is an `img` element, then count this as a relevant mutation for child.

The `source` HTML element removing steps, givenremovedNode, isSubtreeRoot, and oldAncestor are:

If isSubtreeRoot is true and oldAncestor is a `picture` element, then [for each](https://infra.spec.whatwg.org/#list-iterate) child ofoldAncestor's [children](https://dom.spec.whatwg.org/#concept-tree-child): if child is an `img` element, then count this as a relevant mutation for child.

If the author isn't sure if user agents will all be able to render the media resources provided, the author can listen to the `error` event on the last`source` element and trigger fallback behavior:

```
<script>
 function fallback(video) {
   // replace <video> with its contents
   while (video.hasChildNodes()) {
     if (video.firstChild instanceof HTMLSourceElement)
       video.removeChild(video.firstChild);
     else
       video.parentNode.insertBefore(video.firstChild, video);
   }
   video.parentNode.removeChild(video);
 }
</script>
<video controls autoplay>
 <source src='video.mp4' type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"'>
 <source src='video.ogv' type='video/ogg; codecs="theora, vorbis"'
         onerror="fallback(parentNode)">
 ...
</video>
```

### 4.8.3 The `img` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement)

**Categories:** Flow content, Phrasing content, Embedded content, Form-associated element, Palpable content; if the element has a `usemap` attribute: Interactive content.

**Contexts:**

- Where embedded content is expected.
- As a child of a `picture` element, after all `source` elements.

**Content model:** Nothing.

**Tag omission:** No end tag.

**Attributes:**

Global attributes; `alt` — replacement text for use when images are not available; `src` — address of the resource; `srcset` — images to use in different situations; `sizes` — image sizes for different page layouts; `crossorigin` — how the element handles crossorigin requests; `usemap` — name of image map to use; `ismap` — whether the image is a server-side image map; `width` — horizontal dimension; `height` — vertical dimension; `referrerpolicy` — referrer policy for fetches; `decoding` — decoding hint; `loading` — loading deferral; `fetchpriority` — fetch priority.

**Accessibility:**

If the element has a non-empty `alt` attribute: [for authors](https://w3c.github.io/html-aria/#el-img); [for implementers](https://w3c.github.io/html-aam/#el-img).

Otherwise: [for authors](https://w3c.github.io/html-aria/#el-img-empty-alt); [for implementers](https://w3c.github.io/html-aam/#el-img-empty-alt).

**DOM interface:**

```
[Exposed=Window,
 LegacyFactoryFunction=Image(optional unsigned long width, optional unsigned long height)]
interface HTMLImageElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, Reflect] attribute DOMString alt;
  [CEReactions, ReflectURL] attribute USVString src;
  [CEReactions, Reflect] attribute USVString srcset;
  [CEReactions, Reflect] attribute DOMString sizes;
  [CEReactions] attribute DOMString? crossOrigin;
  [CEReactions, Reflect] attribute DOMString useMap;
  [CEReactions, Reflect] attribute boolean isMap;
  [CEReactions, Reflect] attribute boolean controls;
  [CEReactions, ReflectSetter] attribute unsigned long width;
  [CEReactions, ReflectSetter] attribute unsigned long height;
  readonly attribute unsigned long naturalWidth;
  readonly attribute unsigned long naturalHeight;
  readonly attribute boolean complete;
  readonly attribute USVString currentSrc;
  [CEReactions] attribute DOMString referrerPolicy;
  [CEReactions] attribute DOMString decoding;
  [CEReactions] attribute DOMString loading;
  [CEReactions] attribute DOMString fetchPriority;

  Promise<undefined> decode();

  // also has obsolete members
};
```

An `img` element represents an image.

An `img` element has a dimension attribute source, initially set to the element itself.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/src)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-srcset)

The image given by the `src` and `srcset` attributes, and any previous sibling `source` elements' `srcset` attributes if the parent is a `picture` element, is the embedded content; the value of the `alt` attribute provides equivalent content for those who cannot process images or who have image loading disabled (i.e., it is the `img` element's fallback content).

The requirements on the `alt` attribute's value are describedin a separate section.

At least one of the `src` and `srcset` attributes must be present.

If the `src` attribute is present, it must contain avalid non-empty URL potentially surrounded by spaces referencing a non-interactive, optionally animated, image resource that is neither paged nor scripted.

The requirements above imply that images can be static bitmaps (e.g. PNGs, GIFs, JPEGs), single-page vector documents (single-page PDFs, XML files with an SVG document element), animated bitmaps (APNGs, animated GIFs), animated vector graphics (XML files with an SVG[document element](https://dom.spec.whatwg.org/#document-element) that use declarative SMIL animation), and so forth. However, these definitions preclude SVG files with script, multipage PDF files, interactive MNG files, HTML documents, plain text documents, and the like. [\[PNG\]](references.html#refsPNG) [\[GIF\]](references.html#refsGIF) [\[JPEG\]](references.html#refsJPEG) [\[PDF\]](references.html#refsPDF) [\[XML\]](references.html#refsXML) [\[APNG\]](references.html#refsAPNG) [\[SVG\]](references.html#refsSVG) [\[MNG\]](references.html#refsMNG)

The `srcset` attribute is a srcset attribute.

The `srcset` attribute and the `src` attribute (if width descriptors are not used) contribute the image sources to the source set (if no `source` element was selected).

If the `srcset` attribute is present and has any image candidate strings using a width descriptor, the `sizes` attribute must also be present. If the `srcset` attribute is _not_ specified, and the`loading` attribute is in the Lazy state, the `sizes` attribute may be specified with the value "`auto`" ([ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive)). The `sizes` attribute is a sizes attribute, which contributes the source size to the source set (if no`source` element was selected).

An `img` element allows auto-sizes if:

- its `loading` attribute is in the Lazy state, and
- its `sizes` attribute's value is "`auto`" ([ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive)), or starts with "`auto,`" ([ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive)).

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)

The `crossorigin` attribute is a CORS settings attribute. Its purpose is to allow images from third-party sites that allow cross-origin access to be used with `canvas`.

The `referrerpolicy` attribute is a referrer policy attribute. Its purpose is to set the [referrer policy](https://w3c.github.io/webappsec-referrer-policy/#referrer-policy) used when [fetching](https://fetch.spec.whatwg.org/#concept-fetch) the image. [\[REFERRERPOLICY\]](references.html#refsREFERRERPOLICY)

The `decoding` attribute indicates the preferred method to decode this image. The attribute, if present, must be an image decoding hint. This attribute's _missing value default_ and _invalid value default_ are both the Auto state.

MDN

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/fetchPriority)

FirefoxNoSafari🔰 preview+Chrome102+

---

Opera?Edge102+

---

Edge (Legacy)?Internet ExplorerNo

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

The `fetchpriority` attribute is a fetch priority attribute. Its purpose is to set the [priority](https://fetch.spec.whatwg.org/#request-priority) used when [fetching](https://fetch.spec.whatwg.org/#concept-fetch) the image.

The `loading` attribute is a lazy loading attribute. Its purpose is to indicate the policy for loading images that are outside the viewport.

When the `loading` attribute's state is changed to theEager state, the user agent must run these steps:

Let resumptionSteps be the `img` element's lazy load resumption steps.If resumptionSteps is null, then return.Set the `img`'s lazy load resumption steps to null.

Invoke resumptionSteps.

```
<img src="1.jpeg" alt="1">
<img src="2.jpeg" loading=eager alt="2">
<img src="3.jpeg" loading=lazy alt="3">
<div id=very-large></div> <!-- Everything after this div is below the viewport -->
<img src="4.jpeg" alt="4">
<img src="5.jpeg" loading=lazy alt="5">
```

In the example above, the images load as follows:

`1.jpeg`, `2.jpeg`,`4.jpeg`The images load eagerly and delay the window's load event.`3.jpeg`The image loads when layout is known, due to being in the viewport, however it does not delay the window's load event.`5.jpeg`

The image loads only once scrolled into the viewport, and does not delay the window's load event.

Developers are encouraged to specify a preferred aspect ratio via `width` and `height` attributes on lazy loaded images, even if CSS sets the image's width and height properties, to prevent the page layout from shifting around after the image loads.

The `img` HTML element insertion steps, given insertedNode, are:

If insertedNode's parent is a `picture` element, then, count this as a relevant mutation forinsertedNode.

The `img` HTML element moving steps, given movedNode,isSubtreeRoot, and oldAncestor are:

If isSubtreeRoot is true and oldAncestor is a `picture` element, then count this as a relevant mutation formovedNode.

The `img` HTML element removing steps, given removedNode,oldAncestor, and isSubtreeRoot are:

If isSubtreeRoot is true and oldAncestor is a `picture` element, then count this as a relevant mutation forremovedNode.

---

The `img` element must not be used as a layout tool. In particular, `img` elements should not be used to display transparent images, as such images rarely convey meaning and rarely add anything useful to the document.

---

What an `img` element represents depends on the `src` attribute and the `alt` attribute.

If the `src` attribute is set and the `alt` attribute is set to the empty string

The image is either decorative or supplemental to the rest of the content, redundant with some other information in the document.

If the image is available and the user agent is configured to display that image, then the element represents the element's image data.

Otherwise, the element represents nothing, and may be omitted completely from the rendering. User agents may provide the user with a notification that an image is present but has been omitted from the rendering.

If the `src` attribute is set and the `alt` attribute is set to a value that isn't empty

The image is a key part of the content; the `alt` attribute gives a textual equivalent or replacement for the image.

If the image is available and the user agent is configured to display that image, then the element represents the element's image data.

Otherwise, the element represents the text given by the `alt` attribute. User agents may provide the user with a notification that an image is present but has been omitted from the rendering.

If the `src` attribute is set and the `alt` attribute is not

The image might be a key part of the content, and there is no textual equivalent of the image available.

In a conforming document, the absence of the `alt` attribute indicates that the image is a key part of the content but that a textual replacement for the image was not available when the image was generated.

If the image is available and the user agent is configured to display that image, then the element represents the element's image data.

If the image has a `src` attribute whose value is the empty string, then the element represents nothing.

Otherwise, the user agent should display some sort of indicator that there is an image that is not being rendered, and may, if requested by the user, or if so configured, or when required to provide contextual information in response to navigation, provide caption information for the image, derived as follows:

If the image has a `title` attribute whose value is not the empty string, then return the value of that attribute.If the image is a descendant of a `figure` element that has a child`figcaption` element, and, ignoring the `figcaption` element and its descendants, the `figure` element has no flow content descendants other than inter-element whitespace and the `img` element, then return the contents of the first such `figcaption` element.Return nothing. (There is no caption information.) If the `src` attribute is not set and either the `alt` attribute is set to the empty string or the `alt` attribute is not set at all

The element represents nothing.

Otherwise

The element represents the text given by the `alt` attribute.

The `alt` attribute does not represent advisory information. User agents must not present the contents of the `alt` attribute in the same way as content of the `title` attribute.

User agents may always provide the user with the option to display any image, or to prevent any image from being displayed. User agents may also apply heuristics to help the user make use of the image when the user is unable to see it, e.g. due to a visual disability or because they are using a text terminal with no graphics capabilities. Such heuristics could include, for instance, optical character recognition (OCR) of text found within the image.

While user agents are encouraged to repair cases of missing `alt` attributes, authors must not rely on such behavior. Requirements for providing text to act as an alternative for images are described in detail below.

The _contents_ of `img` elements, if any, are ignored for the purposes of rendering.

---

The `usemap` attribute, if present, can indicate that the image has an associatedimage map.

The `ismap` attribute, when used on an element that is a descendant of an `a` element with an `href` attribute, indicates by its presence that the element provides access to a server-side image map. This affects how events are handled on the corresponding `a` element.

The `ismap` attribute is aboolean attribute. The attribute must not be specified on an element that does not have an ancestor `a` element with an `href` attribute.

The `usemap` and `ismap` attributes can result in confusing behavior when used together with `source` elements with the `media` attribute specified in a `picture` element.

The `controls` attribute is a boolean attribute. If present, it indicates that the user agent may expose a user interface to the user. The attribute must not be specified on an element that does not have an `alt` attribute, or whose `alt` attribute's value is the empty string.

If the `controls` attribute is present, the user agent may expose controls over the image (e.g., a control for fullscreen viewing). The specific controls provided are [implementation-defined](https://infra.spec.whatwg.org/#implementation-defined), and can be platform-specific or based on the user's preferences.

If the user agent exposes a user interface by displaying controls over the `img` element, then the user agent should suppress any user interaction events while the user agent is interacting with this interface.

[Issue #12318](https://github.com/whatwg/html/issues/12318) tracks the interaction between image controls and animated images. User agents should not expose animation controls for images before that issue is resolved.

---

The `img` element supports dimension attributes.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/crossOrigin)

The `crossOrigin` IDL attribute mustreflect the `crossorigin` content attribute,limited to only known values.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy)

The `referrerPolicy` IDL attribute mustreflect the `referrerpolicy` content attribute, limited to only known values.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SVGImageElement/decoding)

Firefox63+SafariNoChrome65+

---

Opera?Edge79+

---

Edge (Legacy)?Internet ExplorerNo

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

The `decoding` IDL attribute must reflect the `decoding` content attribute, limited to only known values.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading)

The `loading` IDL attribute must reflect the `loading` content attribute, limited to only known values.

The `fetchPriority` IDL attribute must reflect the `fetchpriority` content attribute, limited to only known values.

`image.width [ = value ]`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/width)

`image.height [ = value ]`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/height)

These attributes return the actual rendered dimensions of the image, or 0 if the dimensions are not known.

They can be set, to change the corresponding content attributes.

`image.naturalWidth`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalWidth)

`image.naturalHeight`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalHeight)

These attributes return the density-corrected natural width and height of the image, or 0 if the image is not _available_.

`image.complete`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete)

Returns true if the image has been completely downloaded or if no image is specified; otherwise, returns false.

`image.currentSrc`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc)

Returns the image's [absolute URL](https://url.spec.whatwg.org/#syntax-url-absolute).`image.decode()`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)

[SVGImageElement/decode](https://developer.mozilla.org/en-US/docs/Web/API/SVGImageElement/decode) method of the SVGImageElement interface initiates asynchronous decoding of an image, returning a Promise that resolves once the image data is ready for use.')

Firefox68+SafariNoChrome64+

---

Opera?Edge79+

---

Edge (Legacy)?Internet ExplorerNo

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

This method causes the user agent to decode the image in parallel, returning a promise that fulfills when decoding is complete.

The promise will be rejected with an ["EncodingError"](https://webidl.spec.whatwg.org/#encodingerror) `[DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException)` if the image cannot be decoded.

`image = new Image([ width [, height ] ])`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image)

Returns a new `img` element, with the `width` and `height` attributes set to the values passed in the relevant arguments, if applicable.

The IDL attributes `width` and `height` must return the rendered width and height of the image, in [CSS pixels](https://drafts.csswg.org/css-values/#px), if the image is being rendered; or else the density-corrected natural width and height of the image, in [CSS pixels](https://drafts.csswg.org/css-values/#px), if the image has density-corrected natural width and height and is _available_ but is not being rendered; or else 0, if the image is not _available_ or does not have density-corrected natural width and height. [\[CSS\]](references.html#refsCSS)

The `naturalWidth` and `naturalHeight` getter steps are:

If the image is not _available_, then return 0.

Return the respective component of the image's density-corrected natural width and height, in [CSS pixels](https://drafts.csswg.org/css-values/#px). [\[CSS\]](references.html#refsCSS)

Since the density-corrected natural width and height of an image take into account any orientation specified in its metadata, `naturalWidth` and `naturalHeight` reflect the dimensions after applying any rotation needed to correctly orient the image, regardless of the value of the['image-orientation'](https://drafts.csswg.org/css-images-3/#the-image-orientation) property.

The `complete` getter steps are:

If any of the following are true:

both the `src` attribute and the `srcset` attribute are omitted;the `srcset` attribute is omitted and the `src` attribute's value is the empty string;the `img` element's current request's state is completely available and its pending request is null; or

- the `img` element's current request's state is broken and itspending request is null,  
  then return true.

Return false.

The `currentSrc` IDL attribute must return the`img` element's current request's current URL.

The `decode()` method, when invoked, must perform the following steps:

Let promise be a new promise.

Queue a microtask to perform the following steps:

This is done because updating the image data takes place in a microtask as well. Thus, to make code such as

```
img.src = "stars.jpg";
img.decode();
```

properly decode `stars.jpg`, we need to delay any processing by one microtask.

Let global be [this](https://webidl.spec.whatwg.org/#this)'s relevant global object.

If any of the following are true:

[this](https://webidl.spec.whatwg.org/#this)'s [node document](https://dom.spec.whatwg.org/#concept-node-document) is not fully active; or

- [this](https://webidl.spec.whatwg.org/#this)'s current request's state is broken,  
  then reject promise with an ["EncodingError"](https://webidl.spec.whatwg.org/#encodingerror) `[DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException)`.

Otherwise, in parallel, wait for one of the following cases to occur, and perform the corresponding actions:

This `img` element's [node document](https://dom.spec.whatwg.org/#concept-node-document) stops being fully active

This `img` element's current request changes or is mutated

This `img` element's current request's state becomes brokenQueue a global task on the DOM manipulation task source withglobal to reject promise with an["EncodingError"](https://webidl.spec.whatwg.org/#encodingerror) `[DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException)`.This `img` element's current request's state becomes completely available

Decode the image.

If decoding does not need to be performed for this image (for example because it is a vector graphic) or the decoding process completes successfully, then queue a global task on the DOM manipulation task source with global to resolve promise with undefined.

If decoding fails (for example due to invalid image data), then queue a global task on the DOM manipulation task source with global to reject promise with an ["EncodingError"](https://webidl.spec.whatwg.org/#encodingerror) `[DOMException](https://webidl.spec.whatwg.org/#dfn-DOMException)`.

User agents should ensure that the decoded media data stays readily available until at least the end of the next successful update the rendering step in theevent loop. This is an important part of the API contract, and should not be broken if at all possible. (Typically, this would only be violated in low-memory situations that require evicting decoded image data, or when the image is too large to keep in decoded form for this period of time.)

Animated images will become completely available only after all their frames are loaded. Thus, even though an implementation could decode the first frame before that point, the above steps will not do so, instead waiting until all frames are available.

Return promise.

Without the `decode()` method, the process of loading an`img` element and then displaying it might look like the following:

```
const img = new Image();
img.src = "nebula.jpg";
img.onload = () => {
    document.body.appendChild(img);
};
img.onerror = () => {
    document.body.appendChild(new Text("Could not load the nebula :("));
};
```

However, this can cause notable dropped frames, as the paint that occurs after inserting the image into the DOM causes a synchronous decode on the main thread.

This can instead be rewritten using the `decode()` method:

```
const img = new Image();
img.src = "nebula.jpg";
img.decode().then(() => {
    document.body.appendChild(img);
}).catch(() => {
    document.body.appendChild(new Text("Could not load the nebula :("));
});
```

This latter form avoids the dropped frames of the original, by allowing the user agent to decode the image in parallel, and only inserting it into the DOM (and thus causing it to be painted) once the decoding process is complete.

Because the `decode()` method attempts to ensure that the decoded image data is available for at least one frame, it can be combined with the `requestAnimationFrame()` API. This means it can be used with coding styles or frameworks that ensure that all DOM modifications are batched together as animation frame callbacks:

```
const container = document.querySelector("#container");

const { containerWidth, containerHeight } = computeDesiredSize();
requestAnimationFrame(() => {
 container.style.width = containerWidth;
 container.style.height = containerHeight;
});

// ...

const img = new Image();
img.src = "supernova.jpg";
img.decode().then(() => {
    requestAnimationFrame(() => container.appendChild(img));
});
```

A legacy factory function is provided for creating `HTMLImageElement` objects (in addition to the factory methods from DOM such as `[createElement()](https://dom.spec.whatwg.org/#dom-document-createelement)`): `Image(width, height)`. When invoked, the legacy factory function must perform the following steps:

Let document be the current global object's associated Document.Let img be the result of [creating an element](https://dom.spec.whatwg.org/#concept-create-element) given document, "`img`", and the [HTML namespace](https://infra.spec.whatwg.org/#html-namespace).If width is given, then [set an attribute value](https://dom.spec.whatwg.org/#concept-element-attributes-set-value) for img using "`width`" and width.If height is given, then [set an attribute value](https://dom.spec.whatwg.org/#concept-element-attributes-set-value) for img using "`height`" and height.

Return img.

A single image can have different appropriate alternative text depending on the context.

In each of the following cases, the same image is used, yet the `alt` text is different each time. The image is the coat of arms of the Carouge municipality in the canton Geneva in Switzerland.

Here it is used as a supplementary icon:

```
<p>I lived in <img src="carouge.svg" alt=""> Carouge.</p>
```

Here it is used as an icon representing the town:

```
<p>Home town: <img src="carouge.svg" alt="Carouge"></p>
```

Here it is used as part of a text on the town:

```
<p>Carouge has a coat of arms.</p>
<p><img src="carouge.svg" alt="The coat of arms depicts a lion, sitting in front of a tree."></p>
<p>It is used as decoration all over the town.</p>
```

Here it is used as a way to support a similar text where the description is given as well as, instead of as an alternative to, the image:

```
<p>Carouge has a coat of arms.</p>
<p><img src="carouge.svg" alt=""></p>
<p>The coat of arms depicts a lion, sitting in front of a tree.
It is used as decoration all over the town.</p>
```

Here it is used as part of a story:

```
<p>She picked up the folder and a piece of paper fell out.</p>
<p><img src="carouge.svg" alt="Shaped like a shield, the paper had a
red background, a green tree, and a yellow lion with its tongue
hanging out and whose tail was shaped like an S."></p>
<p>She stared at the folder. S! The answer she had been looking for all
this time was simply the letter S! How had she not seen that before? It all
came together now. The phone call where Hector had referred to a lion's tail,
the time Maria had stuck her tongue out...</p>
```

Here it is not known at the time of publication what the image will be, only that it will be a coat of arms of some kind, and thus no replacement text can be provided, and instead only a brief caption for the image is provided, in the `title` attribute:

```
<p>The last user to have uploaded a coat of arms uploaded this one:</p>
<p><img src="last-uploaded-coat-of-arms.cgi" title="User-uploaded coat of arms."></p>
```

Ideally, the author would find a way to provide real replacement text even in this case, e.g. by asking the previous user. Not providing replacement text makes the document more difficult to use for people who are unable to view images, e.g. blind users, or users or very low-bandwidth connections or who pay by the byte, or users who are forced to use a text-only web browser.

Here are some more examples showing the same picture used in different contexts, with different appropriate alternate texts each time.

```
<article>
 <h1>My cats</h1>
 <h2>Fluffy</h2>
 <p>Fluffy is my favorite.</p>
 <img src="fluffy.jpg" alt="She likes playing with a ball of yarn.">
 <p>She's just too cute.</p>
 <h2>Miles</h2>
 <p>My other cat, Miles just eats and sleeps.</p>
</article>
```

```
<article>
 <h1>Photography</h1>
 <h2>Shooting moving targets indoors</h2>
 <p>The trick here is to know how to anticipate; to know at what speed and
 what distance the subject will pass by.</p>
 <img src="fluffy.jpg" alt="A cat flying by, chasing a ball of yarn, can be
 photographed quite nicely using this technique.">
 <h2>Nature by night</h2>
 <p>To achieve this, you'll need either an extremely sensitive film, or
 immense flash lights.</p>
</article>
```

```
<article>
 <h1>About me</h1>
 <h2>My pets</h2>
 <p>I've got a cat named Fluffy and a dog named Miles.</p>
 <img src="fluffy.jpg" alt="Fluffy, my cat, tends to keep itself busy.">
 <p>My dog Miles and I like go on long walks together.</p>
 <h2>music</h2>
 <p>After our walks, having emptied my mind, I like listening to Bach.</p>
</article>
```

```
<article>
 <h1>Fluffy and the Yarn</h1>
 <p>Fluffy was a cat who liked to play with yarn. She also liked to jump.</p>
 <aside><img src="fluffy.jpg" alt="" title="Fluffy"></aside>
 <p>She would play in the morning, she would play in the evening.</p>
</article>
```

### 4.8.5 The `iframe` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) · Source: <https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element>

**Categories:** Flow content, Phrasing content, Embedded content, Interactive content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** Nothing.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `src`, `srcdoc`, `name`, `sandbox`, `allow`, `allowfullscreen`, `width`, `height`, `referrerpolicy`, `loading`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-iframe).

[For implementers](https://w3c.github.io/html-aam/#el-iframe).

**DOM interface:** `HTMLIFrameElement`.

The `iframe` element represents a nested browsing context (child navigable), embedding another HTML document into the current one. Content loads via `src` or inline via `srcdoc`; `sandbox` applies isolation restrictions. The element is a void content model — any contents are ignored (it has no fallback mechanism).

### 4.8.6 The `embed` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed) · Source: <https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-embed-element>

**Categories:** Flow content, Phrasing content, Embedded content, Interactive content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `src`, `type`, `width`, `height`, plus any other attributes (passed to the plugin).

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-embed).

[For implementers](https://w3c.github.io/html-aam/#el-embed).

**DOM interface:** `HTMLEmbedElement`.

The `embed` element provides an integration point for an external application or interactive content (typically a plugin). It must have a `src` or `type` attribute. It represents the resource directly and has no fallback-content mechanism; it must have no children.

### 4.8.7 The `object` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object) · Source: <https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-object-element>

**Categories:** Flow content, Phrasing content, Embedded content, Listed and form-associated element, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** Transparent.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `data`, `type`, `name`, `form`, `width`, `height`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-object).

[For implementers](https://w3c.github.io/html-aam/#el-object).

**DOM interface:** `HTMLObjectElement`.

The `object` element represents an external resource that, depending on its type, is treated as an image, a child navigable, or an external resource to be processed by a plugin. Its content model is **transparent** — the children act as fallback content used when the resource cannot be displayed, and are validated against the `object`'s own parent's content model.

### 4.8.8 The `video` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) · Source: <https://html.spec.whatwg.org/multipage/media.html#the-video-element>

**Categories:** Flow content, Phrasing content, Embedded content; if it has a `controls` attribute: Interactive content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** If the element has a `src` attribute: zero or more `track` elements, then transparent, but with no media element descendants. If the element does not have a `src` attribute: zero or more `source` elements, then zero or more `track` elements, then transparent, but with no media element descendants.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `src`, `crossorigin`, `poster`, `preload`, `autoplay`, `playsinline`, `loop`, `muted`, `controls`, `width`, `height`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-video).

[For implementers](https://w3c.github.io/html-aam/#el-video).

**DOM interface:** `HTMLVideoElement`.

The `video` element is used for playing videos or movies, and audio files with captions. Its transparent tail is fallback content for legacy user agents; the leading `source`/`track` elements are not fallback. No media element (`audio`/`video`) may be a descendant.

### 4.8.9 The `audio` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio) · Source: <https://html.spec.whatwg.org/multipage/media.html#the-audio-element>

**Categories:** Flow content, Phrasing content, Embedded content; if it has a `controls` attribute: Interactive content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** If the element has a `src` attribute: zero or more `track` elements, then transparent, but with no media element descendants. If the element does not have a `src` attribute: zero or more `source` elements, then zero or more `track` elements, then transparent, but with no media element descendants.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `src`, `crossorigin`, `preload`, `autoplay`, `loop`, `muted`, `controls`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-audio).

[For implementers](https://w3c.github.io/html-aam/#el-audio).

**DOM interface:** `HTMLAudioElement`.

The `audio` element represents a sound or audio stream. It is a media element whose media data is ostensibly audio. The same `source`/`track`-then-transparent content model and no-media-element-descendant restriction as `video` applies.

### 4.8.10 The `track` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) · Source: <https://html.spec.whatwg.org/multipage/media.html#the-track-element>

**Categories:** None.

**Contexts:** As a child of a media element (`audio`/`video`), before any flow content.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `kind`, `src`, `srclang`, `label`, `default`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-track).

[For implementers](https://w3c.github.io/html-aam/#el-track).

**DOM interface:** `HTMLTrackElement`.

The `track` element allows authors to specify explicit external timed text tracks for media elements (subtitles, captions, descriptions, chapters, metadata). It represents nothing on its own and must have no children; it must precede any flow content within its media-element parent.

### 4.8.13 The `map` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map) · Source: <https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element>

**Categories:** Flow content, Phrasing content, Palpable content.

**Contexts:** Where phrasing content is expected.

**Content model:** Transparent.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `name`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-map).

[For implementers](https://w3c.github.io/html-aam/#el-map).

**DOM interface:** `HTMLMapElement`.

The `map` element, in conjunction with an `img` element and any `area` elements (which are its descendants, transparently), defines an image map. It must have a `name` attribute whose value is non-empty and contains no ASCII whitespace.

### 4.8.14 The `area` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area) · Source: <https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element>

**Categories:** Flow content, Phrasing content.

**Contexts:** Where phrasing content is expected, but only if there is a `map` element ancestor.

**Content model:** Nothing.

**Tag omission:** No end tag (void element).

**Attributes:** Global attributes; `alt`, `coords`, `shape`, `href`, `target`, `download`, `ping`, `rel`, `referrerpolicy`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-area).

[For implementers](https://w3c.github.io/html-aam/#el-area).

**DOM interface:** `HTMLAreaElement`.

The `area` element represents either a hyperlink with some text and a corresponding area on an image map, or a dead area on an image map. It is only valid where there is a `map` element ancestor. If `href` is present, `alt` must also be present. It is a void element (no children).

### 4.8.18 The `canvas` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) · Source: <https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element>

**Categories:** Flow content, Phrasing content, Embedded content, Palpable content.

**Contexts:** Where embedded content is expected.

**Content model:** Transparent, but with no interactive content descendants except for `a` elements, `img` elements with `usemap` attributes, `button` elements, `input` elements whose `type` attribute are in the Checkbox or Radio Button states, `input` elements that are buttons, and `select` elements with a `multiple` attribute or a display size greater than 1.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `width`, `height`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-canvas).

[For implementers](https://w3c.github.io/html-aam/#el-canvas).

**DOM interface:** `HTMLCanvasElement`.

The `canvas` element provides a resolution-dependent bitmap canvas, which can be used for rendering graphs, game graphics, art, or other visual images on the fly via its drawing APIs. Its children are fallback content (transparent model) with a restricted interactive-content allowlist so the fallback stays keyboard-accessible.
