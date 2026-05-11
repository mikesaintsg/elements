# HTML Standard — §4.6 Links

> Source: <https://html.spec.whatwg.org/multipage/links.html#links>

## Contents

- [4.6.1 Introduction](#461-introduction)
- [4.6.2 Links created by  and rea elements](#462-links-created-by-a-and-area-elements)
- [4.6.3 API for hyperlink elements](#463-api-for-hyperlink-elements)
- [4.6.4 API for  and rea elements](#464-api-for-a-and-area-elements)
- [4.6.5 Following hyperlinks](#465-following-hyperlinks)
- [4.6.6 Downloading resources](#466-downloading-resources)
- [4.6.7 Hyperlink auditing](#467-hyperlink-auditing)
  - [4.6.7.1 The Ping-From and Ping-To headers](#4671-the-ping-from-and-ping-to-headers)
- [4.6.8 Link types](#468-link-types)
  - [4.6.8.1 Link type "alternate"](#4681-link-type-alternate)
  - [4.6.8.2 Link type "author"](#4682-link-type-author)
  - [4.6.8.3 Link type "bookmark"](#4683-link-type-bookmark)
  - [4.6.8.4 Link type "canonical"](#4684-link-type-canonical)
  - [4.6.8.5 Link type "dns-prefetch"](#4685-link-type-dns-prefetch)
  - [4.6.8.6 Link type "expect"](#4686-link-type-expect)
  - [4.6.8.7 Link type "external"](#4687-link-type-external)
  - [4.6.8.8 Link type "help"](#4688-link-type-help)
  - [4.6.8.9 Link type "icon"](#4689-link-type-icon)
  - [4.6.8.10 Link type "license"](#46810-link-type-license)
  - [4.6.8.11 Link type "manifest"](#46811-link-type-manifest)
  - [4.6.8.12 Link type "modulepreload"](#46812-link-type-modulepreload)
  - [4.6.8.13 Link type "nofollow"](#46813-link-type-nofollow)
  - [4.6.8.14 Link type "noopener"](#46814-link-type-noopener)
  - [4.6.8.15 Link type "noreferrer"](#46815-link-type-noreferrer)
  - [4.6.8.16 Link type "opener"](#46816-link-type-opener)
  - [4.6.8.17 Link type "pingback"](#46817-link-type-pingback)
  - [4.6.8.18 Link type "preconnect"](#46818-link-type-preconnect)
  - [4.6.8.19 Link type "prefetch"](#46819-link-type-prefetch)
  - [4.6.8.20 Link type "preload"](#46820-link-type-preload)
  - [4.6.8.21 Link type "privacy-policy"](#46821-link-type-privacy-policy)
  - [4.6.8.22 Link type "search"](#46822-link-type-search)
  - [4.6.8.23 Link type "stylesheet"](#46823-link-type-stylesheet)
  - [4.6.8.24 Link type "tag"](#46824-link-type-tag)
  - [4.6.8.25 Link type "terms-of-service"](#46825-link-type-terms-of-service)
  - [4.6.8.26 Sequential link types](#46826-sequential-link-types)
    - [4.6.8.26.1 Link type "next"](#468261-link-type-next)
    - [4.6.8.26.2 Link type "prev"](#468262-link-type-prev)
  - [4.6.8.27 Other link types](#46827-other-link-types)

---

## 4.6 Links

### 4.6.1 Introduction

Links are a conceptual construct, created by `a`, `area`,`form`, and `link` elements, that represent a connection between two resources, one of which is the current `Document`. There are three kinds of links in HTML:

Links to external resourcesThese are links to resources that are to be used to augment the current document, generally automatically processed by the user agent. All external resource links have a fetch and process the linked resource algorithm which describes how the resource is obtained.HyperlinksThese are links to other resources that are generally exposed to the user by the user agent so that the user can cause the user agent to navigate to those resources, e.g. to visit them in a browser or download them.Internal resource links

These are links to resources within the current document, used to give those resources special meaning or behavior.

For `link` elements with an `href` attribute and a`rel` attribute, links must be created for the keywords of the`rel` attribute, as defined for those keywords in the link types section.

Similarly, for `a` and `area` elements with an `href` attribute and a `rel` attribute, links must be created for the keywords of the`rel` attribute as defined for those keywords in the link types section. Unlike `link` elements, however,`a` and `area` elements with an `href` attribute that either do not have a `rel` attribute, or whose `rel` attribute has no keywords that are defined as specifying hyperlinks, must also create a hyperlink. This implied hyperlink has no special meaning (it has no link type) beyond linking the element's [node document](https://dom.spec.whatwg.org/#concept-node-document) to the resource given by the element's `href` attribute.

Similarly, for `form` elements with a `rel` attribute, links must be created for the keywords of the `rel` attribute as defined for those keywords in the link types section.`form` elements that do not have a `rel` attribute, or whose `rel` attribute has no keywords that are defined as specifying hyperlinks, must also create a hyperlink.

A hyperlink can have one or more hyperlink annotations that modify the processing semantics of that hyperlink.

### 4.6.2 Links created by `a` and `area` elements

The `href` attribute on `a` and `area` elements must have a value that is a valid URL potentially surrounded by spaces.

The `href` attribute on `a` and`area` elements is not required; when those elements do not have `href` attributes they do not create hyperlinks.

The `target` attribute, if present, must be a valid navigable target name or keyword. It gives the name of the navigable that will be used. User agents use this name when following hyperlinks.

The `download` attribute, if present, indicates that the author intends the hyperlink to be used for downloading a resource. The attribute may have a value; the value, if any, specifies the default filename that the author recommends for use in labeling the resource in a local file system. There are no restrictions on allowed values, but authors are cautioned that most file systems have limitations with regard to what punctuation is supported in filenames, and user agents are likely to adjust filenames accordingly.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-ping)

The `ping` attribute, if present, gives the URLs of the resources that are interested in being notified if the user follows the hyperlink. The value must be a set of space-separated tokens, each of which must be a valid non-empty URL whose [scheme](https://url.spec.whatwg.org/#concept-url-scheme) is an [HTTP(S) scheme](https://fetch.spec.whatwg.org/#http-scheme). The value is used by the user agent for hyperlink auditing.

The `rel` attribute on `a` and `area` elements controls what kinds of links the elements create. The attribute's value must be anunordered set of unique space-separated tokens. The allowed keywords and their meanings are defined below.

`rel`'s [supported tokens](https://dom.spec.whatwg.org/#concept-supported-tokens) are the keywords defined in HTML link types which are allowed on `a` and `area` elements, impact the processing model, and are supported by the user agent. The possible [supported tokens](https://dom.spec.whatwg.org/#concept-supported-tokens) are `noreferrer`, `noopener`, and `opener`. `rel`'s [supported tokens](https://dom.spec.whatwg.org/#concept-supported-tokens) must only include the tokens from this list that the user agent implements the processing model for.

The `rel` attribute has no default value. If the attribute is omitted or if none of the values in the attribute are recognized by the user agent, then the document has no particular relationship with the destination resource other than there being a hyperlink between the two.

The `hreflang` attribute on `a` elements that create hyperlinks, if present, gives the language of the linked resource. It is purely advisory. The value must be a valid BCP 47 language tag. [\[BCP47\]](references.html#refsBCP47) User agents must not consider this attribute authoritative — upon fetching the resource, user agents must use only language information associated with the resource to determine its language, not metadata included in the link to the resource.

The `type` attribute, if present, gives the [MIME type](https://mimesniff.spec.whatwg.org/#mime-type) of the linked resource. It is purely advisory. The value must be a [valid MIME type string](https://mimesniff.spec.whatwg.org/#valid-mime-type). User agents must not consider the `type` attribute authoritative — upon fetching the resource, user agents must not use metadata included in the link to the resource to determine its type.

The `referrerpolicy` attribute is a referrer policy attribute. Its purpose is to set the [referrer policy](https://w3c.github.io/webappsec-referrer-policy/#referrer-policy) used whenfollowing hyperlinks. [\[REFERRERPOLICY\]](references.html#refsREFERRERPOLICY)

---

When an `a` or `area` element's [activation behavior](https://dom.spec.whatwg.org/#eventtarget-activation-behavior) is invoked, the user agent may allow the user to indicate a preference regarding whether the hyperlink is to be used for navigation or whether the resource it specifies is to be downloaded.

In the absence of a user preference, the default should be navigation if the element has no`download` attribute, and should be to download the specified resource if it does.

The [activation behavior](https://dom.spec.whatwg.org/#eventtarget-activation-behavior) of an `a` or `area` elementelement given an event event is:

If element has no `href` attribute, then return.Let hyperlinkSuffix be null.

If element is an `a` element, and event's [target](https://dom.spec.whatwg.org/#concept-event-target) is an `img` with an `ismap` attribute specified, then:

Let x and y be 0.If event's `[isTrusted](https://dom.spec.whatwg.org/#dom-event-istrusted)` attribute is initialized to true, then set x to the distance in [CSS pixels](https://drafts.csswg.org/css-values/#px) from the left edge of the image to the location of the click, and sety to the distance in [CSS pixels](https://drafts.csswg.org/css-values/#px) from the top edge of the image to the location of the click.If x is negative, set x to 0.If y is negative, set y to 0.Set hyperlinkSuffix to the concatenation of U+003F (?), the value ofx expressed as a base-ten integer using [ASCII digits](https://infra.spec.whatwg.org/#ascii-digit), U+002C (,), and the value of y expressed as a base-ten integer using [ASCII digits](https://infra.spec.whatwg.org/#ascii-digit). Let userInvolvement be event's user navigation involvement.

- If the user has expressed a preference to download the hyperlink, then setuserInvolvement to "`browser UI`".  
  That is, if the user has expressed a specific preference for downloading, this no longer counts as merely "`activation`".
  If element has a `download` attribute, or if the user has expressed a preference to download the hyperlink, then download the hyperlink created by element with*hyperlinkSuffix* set to hyperlinkSuffix and*userInvolvement* set touserInvolvement.

Otherwise, follow the hyperlink created byelement with _hyperlinkSuffix_ set tohyperlinkSuffix and _userInvolvement_ set touserInvolvement.

### 4.6.3 API for hyperlink elements

```
interface mixin HyperlinkElementUtils {
  readonly attribute USVString origin;
  [CEReactions] attribute USVString protocol;
  [CEReactions] attribute USVString username;
  [CEReactions] attribute USVString password;
  [CEReactions] attribute USVString host;
  [CEReactions] attribute USVString hostname;
  [CEReactions] attribute USVString port;
  [CEReactions] attribute USVString pathname;
  [CEReactions] attribute USVString search;
  [CEReactions] attribute USVString hash;
};
```

`hyperlink.origin`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/origin)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/origin)

Returns the hyperlink's URL's origin.`hyperlink.protocol`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/protocol)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/protocol)

Returns the hyperlink's URL's scheme.

Can be set, to change the URL's scheme.

`hyperlink.username`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/username)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/username)

Returns the hyperlink's URL's username.

Can be set, to change the URL's username.

`hyperlink.password`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/password)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/password)

Returns the hyperlink's URL's password.

Can be set, to change the URL's password.

`hyperlink.host`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/host)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/host)

Returns the hyperlink's URL's host and port (if different from the default port for the scheme).

Can be set, to change the URL's host and port.

`hyperlink.hostname`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/hostname)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/hostname)

Returns the hyperlink's URL's host.

Can be set, to change the URL's host.

`hyperlink.port`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/port)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/port)

Returns the hyperlink's URL's port.

Can be set, to change the URL's port.

`hyperlink.pathname`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/pathname)

[HTMLAreaElement/pathname](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/pathname).")

Returns the hyperlink's URL's path.

Can be set, to change the URL's path.

`hyperlink.search`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/search)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/search)

Returns the hyperlink's URL's query (includes leading "`?`" if non-empty).

Can be set, to change the URL's query (ignores leading "`?`").

`hyperlink.hash`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/hash)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/hash)

Returns the hyperlink's URL's fragment (includes leading "`#`" if non-empty).

Can be set, to change the URL's fragment (ignores leading "`#`").

An element implementing the `HyperlinkElementUtils` mixin has an associated url (null or a [URL](https://url.spec.whatwg.org/#concept-url)). It is initially null.

An element implementing the `HyperlinkElementUtils` mixin has the followingextract an origin steps:

If [this](https://webidl.spec.whatwg.org/#this)'s url is null, then return null.

Return [this](https://webidl.spec.whatwg.org/#this)'s url's[origin](https://url.spec.whatwg.org/#concept-url-origin).

An element implementing the `HyperlinkElementUtils` mixin must have an associatedset the url algorithm.

When elements implementing the `HyperlinkElementUtils` mixin are created, the user agent must set the url.

An element implementing the `HyperlinkElementUtils` mixin has an associatedreinitialize url algorithm, which runs these steps:

If the element's url is non-null, its [scheme](https://url.spec.whatwg.org/#concept-url-scheme) is "`blob`", and it has an[opaque path](https://url.spec.whatwg.org/#url-opaque-path), then terminate these steps.

Set the url.

An element implementing the `HyperlinkElementUtils` mixin must have an associatedupdate `href` algorithm.

---

The `origin` getter steps are:

Reinitialize url.If [this](https://webidl.spec.whatwg.org/#this)'s url is null, return the empty string.

Return the serialization of[this](https://webidl.spec.whatwg.org/#this)'s url's [origin](https://url.spec.whatwg.org/#concept-url-origin).

The `protocol` getter steps are:

Reinitialize url.If [this](https://webidl.spec.whatwg.org/#this)'s url is null, return "`:`".

Return [this](https://webidl.spec.whatwg.org/#this)'s url's [scheme](https://url.spec.whatwg.org/#concept-url-scheme), followed by "`:`".

The `protocol` setter steps are:

Reinitialize url.If [this](https://webidl.spec.whatwg.org/#this)'s url is null, then return.

- [Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) the given value, followed by "`:`", with [this](https://webidl.spec.whatwg.org/#this)'s url as[_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [scheme start state](https://url.spec.whatwg.org/#scheme-start-state) as[_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).  
  Because the URL parser ignores multiple consecutive colons, providing a value of "`https:`" (or even "`https::::`") is the same as providing a value of "`https`".

Update href.

The `username` getter steps are:

Reinitialize url.If [this](https://webidl.spec.whatwg.org/#this)'s url is null, return the empty string.

Return [this](https://webidl.spec.whatwg.org/#this)'s url's [username](https://url.spec.whatwg.org/#concept-url-username).

The `username` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url [cannot have a username/password/port](https://url.spec.whatwg.org/#cannot-have-a-username-password-port), then return.[Set the username](https://url.spec.whatwg.org/#set-the-username), given url and the given value.

Update href.

The `password` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, then return the empty string.

Return url's [password](https://url.spec.whatwg.org/#concept-url-password).

The `password` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url [cannot have a username/password/port](https://url.spec.whatwg.org/#cannot-have-a-username-password-port), then return.[Set the password](https://url.spec.whatwg.org/#set-the-password), given url and the given value.

Update href.

The `host` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url or url's [host](https://url.spec.whatwg.org/#concept-url-host) is null, return the empty string.If url's [port](https://url.spec.whatwg.org/#concept-url-port) is null, returnurl's [host](https://url.spec.whatwg.org/#concept-url-host), [serialized](https://url.spec.whatwg.org/#concept-host-serializer).

Return url's [host](https://url.spec.whatwg.org/#concept-url-host), [serialized](https://url.spec.whatwg.org/#concept-host-serializer), followed by "`:`" and url's [port](https://url.spec.whatwg.org/#concept-url-port), [serialized](https://url.spec.whatwg.org/#serialize-an-integer).

The `host` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url has an [opaque path](https://url.spec.whatwg.org/#url-opaque-path), then return.[Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) the given value, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [host state](https://url.spec.whatwg.org/#host-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

The `hostname` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url or url's [host](https://url.spec.whatwg.org/#concept-url-host) is null, return the empty string.

Return url's [host](https://url.spec.whatwg.org/#concept-url-host), [serialized](https://url.spec.whatwg.org/#concept-host-serializer).

The `hostname` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url has an [opaque path](https://url.spec.whatwg.org/#url-opaque-path), then return.[Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) the given value, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [hostname state](https://url.spec.whatwg.org/#hostname-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

The `port` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url or url's [port](https://url.spec.whatwg.org/#concept-url-port) is null, return the empty string.

Return url's [port](https://url.spec.whatwg.org/#concept-url-port), [serialized](https://url.spec.whatwg.org/#serialize-an-integer).

The `port` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url [cannot have a username/password/port](https://url.spec.whatwg.org/#cannot-have-a-username-password-port), then return.If the given value is the empty string, then set url's [port](https://url.spec.whatwg.org/#concept-url-port) to null.Otherwise, [basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) the given value, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [port state](https://url.spec.whatwg.org/#port-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

The `pathname` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, then return the empty string.

Return the result of [URL path serializing](https://url.spec.whatwg.org/#url-path-serializer) url.

The `pathname` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null or url has an [opaque path](https://url.spec.whatwg.org/#url-opaque-path), then return.Set url's [path](https://url.spec.whatwg.org/#concept-url-path) to the empty list.[Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) the given value, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [path start state](https://url.spec.whatwg.org/#path-start-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

The `search` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, or url's [query](https://url.spec.whatwg.org/#concept-url-query) is either null or the empty string, return the empty string.

Return "`?`", followed by url's [query](https://url.spec.whatwg.org/#concept-url-query).

The `search` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, terminate these steps.If the given value is the empty string, set url's [query](https://url.spec.whatwg.org/#concept-url-query) to null.

Otherwise:

Let input be the given value with a single leading "`?`" removed, if any.Set url's [query](https://url.spec.whatwg.org/#concept-url-query) to the empty string.[Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) input, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [query state](https://url.spec.whatwg.org/#query-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

The `hash` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, or url's [fragment](https://url.spec.whatwg.org/#concept-url-fragment) is either null or the empty string, return the empty string.

Return "`#`", followed by url's [fragment](https://url.spec.whatwg.org/#concept-url-fragment).

The `hash` setter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null, then return.If the given value is the empty string, set url's [fragment](https://url.spec.whatwg.org/#concept-url-fragment) to null.

Otherwise:

Let input be the given value with a single leading "`#`" removed, if any.Set url's [fragment](https://url.spec.whatwg.org/#concept-url-fragment) to the empty string.[Basic URL parse](https://url.spec.whatwg.org/#concept-basic-url-parser) input, withurl as [_url_](https://url.spec.whatwg.org/#basic-url-parser-url) and [fragment state](https://url.spec.whatwg.org/#fragment-state) as [_state override_](https://url.spec.whatwg.org/#basic-url-parser-state-override).

Update href.

### 4.6.4 API for `a` and `area` elements

```
interface mixin HTMLHyperlinkElementUtils {
  [CEReactions, ReflectSetter] stringifier attribute USVString href;
};
```

`hyperlink.toString()`

`hyperlink.href`

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/href)

[HTMLAnchorElement/toString](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/toString) stringifier method returns a string containing the whole URL. It is a read-only version of HTMLAnchorElement.href.')

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/href)

[HTMLAreaElement/toString](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement/toString) stringifier method returns a string containing the whole URL. It is a read-only version of HTMLAreaElement.href.')

Returns the hyperlink's URL.

Can be set, to change the URL.

The `href` getter steps are:

Reinitialize url.Let url be [this](https://webidl.spec.whatwg.org/#this)'s url.If url is null and [this](https://webidl.spec.whatwg.org/#this) has no `href` content attribute, return the empty string.Otherwise, if url is null, return [this](https://webidl.spec.whatwg.org/#this)'s `href` content attribute's value.

Return url, [serialized](https://url.spec.whatwg.org/#concept-url-serializer).

The HTML element insertion steps for `a` and `area` elements, given insertedNode, are:

If insertedNode is not [connected](https://dom.spec.whatwg.org/#connected), then return.

Consider speculative loads given insertedNode's [node document](https://dom.spec.whatwg.org/#concept-node-document).

The HTML element removing steps for `a` and `area` elements, given removedNode, isSubtreeRoot, and oldAncestor are:

If oldAncestor is not [connected](https://dom.spec.whatwg.org/#connected), then return.

Consider speculative loads given oldAncestor's [node document](https://dom.spec.whatwg.org/#concept-node-document).

The HTML element moving steps for `a` and `area` elements, given movedNode, are:

Consider speculative loads given movedNode's [node document](https://dom.spec.whatwg.org/#concept-node-document).

The following [attribute change steps](https://dom.spec.whatwg.org/#concept-element-attributes-change-ext), given element, localName, oldValue,value, and namespace, are used for all `a` and `area` elements:

If namespace is not null, then return.If oldValue equals value, then return.

- If localName is `href`, then set the url given element.  
  This is only observable for `[blob:](https://w3c.github.io/FileAPI/#DefinitionOfScheme)` URLs as[parsing](https://url.spec.whatwg.org/#concept-url-parser) them involves a [Blob URL Store](https://w3c.github.io/FileAPI/#BlobURLStore) lookup.

If localName is `href`, `referrerpolicy`, or `rel`, then consider speculative loads givenelement's [node document](https://dom.spec.whatwg.org/#concept-node-document).

To update href for an `HTMLAnchorElement` or`HTMLAreaElement` element, set the element's `href` content attribute's value to the element's url, [serialized](https://url.spec.whatwg.org/#concept-url-serializer).

The set the url algorithm for`HTMLAnchorElement` and `HTMLAreaElement` elements is as follows:

Set this element's url to null.If this element's `href` content attribute is absent, then return.Let url be the result of encoding-parsing a URL given this element's `href` content attribute's value, relative to this element's [node document](https://dom.spec.whatwg.org/#concept-node-document).

If url is not failure, then set this element's url to url.

### 4.6.5 Following hyperlinks

An element element cannot navigate if any of the following are true:

element's [node document](https://dom.spec.whatwg.org/#concept-node-document) is not fully active; or

element is not an `a` element and is not[connected](https://dom.spec.whatwg.org/#connected).

This is also used by form submission for the `form` element. The exception for `a` elements is for compatibility with web content.

To get an element's noopener, given an `a`, `area`, or`form` element element, a [URL record](https://url.spec.whatwg.org/#concept-url) url, and a string target, perform the following steps. They return a boolean.

If element's link types include the `noopener` or `noreferrer` keyword, then return true.If element's link types do not include the `opener` keyword and target is an[ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for "`_blank`", then return true.

If url's [blob URL entry](https://url.spec.whatwg.org/#concept-url-blob-entry) is not null:

Let blobOrigin be url's [blob URL entry](https://url.spec.whatwg.org/#concept-url-blob-entry)'s [environment](https://w3c.github.io/FileAPI/#blob-url-entry-environment)'s origin.Let topLevelOrigin be element's relevant settings object's top-level origin.If blobOrigin is not same site with topLevelOrigin, then return true.

Return false.

To follow the hyperlink created by an elementsubject, given an optional hyperlinkSuffix (default null) and an optional userInvolvement (default "`none`"):

If subject cannot navigate, then return.Let targetAttributeValue be the empty string.If subject is an `a` or `area` element, then settargetAttributeValue to the result of getting an element's target given subject.Let urlRecord be the result of encoding-parsing a URL givensubject's `href` attribute value, relative tosubject's [node document](https://dom.spec.whatwg.org/#concept-node-document).If urlRecord is failure, then return.Let noopener be the result of getting an element's noopener with subject, urlRecord, andtargetAttributeValue.Let targetNavigable be the first return value of applying the rules for choosing a navigable given targetAttributeValue, subject'snode navigable, and noopener.If targetNavigable is null, then return.Let urlString be the result of applying the [URL serializer](https://url.spec.whatwg.org/#concept-url-serializer) to urlRecord.

If hyperlinkSuffix is non-null, then append it tourlString.

- Navigate targetNavigable tourlString using subject's [node document](https://dom.spec.whatwg.org/#concept-node-document), with _referrerPolicy_ set to subject'shyperlink referrer policy, _userInvolvement_ set to userInvolvement, and*sourceElement* set to subject.  
  Unlike many other types of navigations, following hyperlinks does not have special "`replace`" behavior for when documents are not completely loaded. This is true for both user-initiated instances of following hyperlinks, as well as script-triggered ones via, e.g., `aElement.click()`.

The hyperlink referrer policy for an element subject is the value returned by the following steps:

If subject's link types includes the `noreferrer` keyword, then return "`no-referrer`".

Return the current state of subject's `referrerpolicy` content attribute.

### 4.6.6 Downloading resources

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download)

In some cases, resources are intended for later use rather than immediate viewing. To indicate that a resource is intended to be downloaded for use later, rather than immediately used, the`download` attribute can be specified on the`a` or `area` element that creates the hyperlink to that resource.

The attribute can furthermore be given a value, to specify the filename that user agents are to use when storing the resource in a file system. This value can be overridden by the \` `[Content-Disposition](https://httpwg.org/specs/rfc6266.html)`\` HTTP header's filename parameters.[\[RFC6266\]](references.html#refsRFC6266)

In cross-origin situations, the `download` attribute has to be combined with the \` `[Content-Disposition](https://httpwg.org/specs/rfc6266.html)`\` HTTP header, specifically with the`attachment` disposition type, to avoid the user being warned of possibly nefarious activity. (This is to protect users from being made to download sensitive personal or confidential information without their full understanding.)

---

To download the hyperlink created by an element subject, given an optional hyperlinkSuffix (default null) and an optional userInvolvement (default "`none`"):

If subject cannot navigate, then return.If subject's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s active sandboxing flag set has the sandboxed downloads browsing context flag set, then return.Let urlString be the result of encoding-parsing-and-serializing a URL given subject's `href` attribute value, relative to subject's [node document](https://dom.spec.whatwg.org/#concept-node-document).If urlString is failure, then return.If hyperlinkSuffix is non-null, then append it tourlString.

If userInvolvement is not "`browser UI`", then:

[Assert](https://infra.spec.whatwg.org/#assert): subject has a `download` attribute.Let navigation be subject's relevant global object'snavigation API.Let filename be the value of subject's `download` attribute.Let continue be the result of firing a download request navigate event atnavigation with _destinationURL_ set to urlString, _userInvolvement_ set touserInvolvement, _sourceElement_ set to subject, and _filename_ set tofilename.If continue is false, then return.

- Inform the navigation API about aborting navigation given subject's node navigable.

Run these steps in parallel:

Optionally, the user agent may abort these steps, if it believes doing so would safeguard the user from a potentially hostile download.Let request be a new [request](https://fetch.spec.whatwg.org/#concept-request) whose[URL](https://fetch.spec.whatwg.org/#concept-request-url) is urlString, [client](https://fetch.spec.whatwg.org/#concept-request-client) is entry settings object, [initiator](https://fetch.spec.whatwg.org/#concept-request-initiator) is "`download`", [destination](https://fetch.spec.whatwg.org/#concept-request-destination) is the empty string, and whose[synchronous flag](https://fetch.spec.whatwg.org/#synchronous-flag) and [use-URL-credentials flag](https://fetch.spec.whatwg.org/#concept-request-use-url-credentials-flag) are set.Let response be the result of [fetching](https://fetch.spec.whatwg.org/#concept-fetch) request.

Handle as a download response withsubject's node navigable and null.

To handle as a download a [response](https://fetch.spec.whatwg.org/#concept-response) response with a navigable navigable and a navigation ID or null navigationId:

Let suggestedFilename be the result of getting the suggested filename for response.Let download behavior be the result of [WebDriver BiDi download will begin](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-download-will-begin) with navigable and a new [WebDriver BiDi navigation status](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-navigation-status) whose [id](https://w3c.github.io/webdriver-bidi/#navigation-status-id) is navigationId, [status](https://w3c.github.io/webdriver-bidi/#navigation-status-status) is "`[pending](https://w3c.github.io/webdriver-bidi/#navigation-status-pending)`", [url](https://w3c.github.io/webdriver-bidi/#navigation-status-url) is response's [URL](https://fetch.spec.whatwg.org/#concept-response-url), and [suggestedFilename](https://w3c.github.io/webdriver-bidi/#navigation-status-suggested-filename) issuggestedFilename.

If download behavior is not null and download behavior's[allowed](https://w3c.github.io/webdriver-bidi/#download-behavior-struct-allowed) is false:

Invoke [WebDriver BiDi download end](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-download-end) with navigable and a new[WebDriver BiDi navigation status](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-navigation-status) whose [id](https://w3c.github.io/webdriver-bidi/#navigation-status-id) is navigationId, [status](https://w3c.github.io/webdriver-bidi/#navigation-status-status) is "`[canceled](https://w3c.github.io/webdriver-bidi/#navigation-status-canceled)`", [url](https://w3c.github.io/webdriver-bidi/#navigation-status-url) is response's [URL](https://fetch.spec.whatwg.org/#concept-response-url).Return. If download behavior is not null, let destinationFolder bedownload behavior's [destinationFolder](https://w3c.github.io/webdriver-bidi/#download-behavior-struct-destination-folder).

Run these steps in parallel:

Run [implementation-defined](https://infra.spec.whatwg.org/#implementation-defined) steps to save response for later use. If destinationFolder is not null, the user agent should save the file to that path. If the user agent needs a filename, the user agent should use thesuggestedFilename.

If any of the following are true:

the download is canceled by the user;the download is canceled by the user agent;

an error occurs (for example, a network error, not enough storage, an unavailable destination folder);

then:

Invoke [WebDriver BiDi download end](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-download-end) with navigable and a new[WebDriver BiDi navigation status](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-navigation-status) whose [id](https://w3c.github.io/webdriver-bidi/#navigation-status-id) is navigationId, [status](https://w3c.github.io/webdriver-bidi/#navigation-status-status) is "`[canceled](https://w3c.github.io/webdriver-bidi/#navigation-status-canceled)`", [url](https://w3c.github.io/webdriver-bidi/#navigation-status-url) is response's [URL](https://fetch.spec.whatwg.org/#concept-response-url).Return.

When the download completes successfully, invoke [WebDriver BiDi download end](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-download-end) with navigable and a new [WebDriver BiDi navigation status](https://w3c.github.io/webdriver-bidi/#webdriver-bidi-navigation-status) whose [id](https://w3c.github.io/webdriver-bidi/#navigation-status-id) is navigationId, [status](https://w3c.github.io/webdriver-bidi/#navigation-status-status) is "`[complete](https://w3c.github.io/webdriver-bidi/#navigation-status-complete)`", [downloadedFilepath](https://w3c.github.io/webdriver-bidi/#navigation-status-downloaded-filepath) is an absolute path of the downloaded file if available, otherwise null, [url](https://w3c.github.io/webdriver-bidi/#navigation-status-url) is response's [URL](https://fetch.spec.whatwg.org/#concept-response-url).

To get the suggested filename for a [response](https://fetch.spec.whatwg.org/#concept-response) response:

This algorithm is intended to mitigate security dangers involved in downloading files from untrusted sites, and user agents are strongly urged to follow it.

Let filename be the undefined value.If response has a \` `[Content-Disposition](https://httpwg.org/specs/rfc6266.html)`\` header, that header specifies the`attachment` disposition type, and the header includes filename information, then let filename have the value specified by the header, and jump to the step labeled*sanitize* below. [\[RFC6266\]](references.html#refsRFC6266)Let interface origin be the [origin](https://dom.spec.whatwg.org/#concept-document-origin) of the `Document` in which the download or navigate action resulting in the download was initiated, if any.Let response origin be the origin of the URL ofresponse, unless that URL's [scheme](https://url.spec.whatwg.org/#concept-url-scheme) component is `data`, in which case let response origin be the same as theinterface origin, if any.If there is no interface origin, then let trusted operation be true. Otherwise, let trusted operation be true if response origin is thesame origin as interface origin, and false otherwise.If trusted operation is true and response has a \` `[Content-Disposition](https://httpwg.org/specs/rfc6266.html)`\` header and that header includes filename information, then let filename have the value specified by the header, and jump to the step labeled _sanitize_ below. [\[RFC6266\]](references.html#refsRFC6266)If the download was not initiated from a hyperlink created by an`a` or `area` element, or if the element of the hyperlink from which it was initiated did not have a `download` attribute when the download was initiated, or if there was such an attribute but its value when the download was initiated was the empty string, then jump to the step labeled _no proposed filename_.Let proposed filename have the value of the `download` attribute of the element of thehyperlink that initiated the download at the time the download was initiated.If trusted operation is true, let filename have the value of proposed filename, and jump to the step labeled _sanitize_ below.If response has a \` `[Content-Disposition](https://httpwg.org/specs/rfc6266.html)`\` header and that header specifies the `attachment` disposition type, let filename have the value ofproposed filename, and jump to the step labeled _sanitize_ below.[\[RFC6266\]](references.html#refsRFC6266)_No proposed filename_: If trusted operation is true, or if the user indicated a preference for having the response in question downloaded, let filename have a value derived from the [URL](https://url.spec.whatwg.org/#concept-url) of response in an[implementation-defined](https://infra.spec.whatwg.org/#implementation-defined) manner, and jump to the step labeled _sanitize_ below.

- Let filename be set to the user's preferred filename or to a filename selected by the user agent, and jump to the step labeled _sanitize_ below.  
  If the algorithm reaches this step, then a download was begun from a different origin thanresponse, and the origin did not mark the file as suitable for downloading, and the download was not initiated by the user. This could be because a `download` attribute was used to trigger the download, or because response is not of a type that the user agent supports.  
  This could be dangerous, because, for instance, a hostile server could be trying to get a user to unknowingly download private information and then re-upload it to the hostile server, by tricking the user into thinking the data is from the hostile server.  
  Thus, it is in the user's interests that the user be somehow notified thatresponse comes from quite a different source, and to prevent confusion, any suggested filename from the potentially hostile interface origin should be ignored.
  _Sanitize_: Optionally, allow the user to influence filename. For example, a user agent could prompt the user for a filename, potentially providing the value offilename as determined above as a default value.
- Adjust filename to be suitable for the local file system.  
  For example, this could involve removing characters that are not legal in filenames, or trimming leading and trailing whitespace.
  If the platform conventions do not in any way use extensions to determine the types of file on the file system, then return filename as the filename.Let claimed type be the type given by response's Content-Type metadata, if any is known. Let named type be the type given by filename's extension, if any is known. For the purposes of this step, a _type_ is a mapping of a [MIME type](https://mimesniff.spec.whatwg.org/#mime-type) to an extension.If named type is consistent with the user's preferences (e.g., because the value of filename was determined by prompting the user), then returnfilename as the filename.If claimed type and named type are the same type (i.e., the type given by response's Content-Type metadata is consistent with the type given by filename's extension), then return filename as the filename.
- If the claimed type is known, then alter filename to add an extension corresponding to claimed type.  
  Otherwise, if named type is known to be potentially dangerous (e.g. it will be treated by the platform conventions as a native executable, shell script, HTML application, or executable-macro-capable document), then optionally alter filename to add a known-safe extension (e.g. "`.txt`").  
  This last step would make it impossible to download executables, which might not be desirable. As always, implementers are forced to balance security and usability in this matter.

Return filename as the filename.

For the purposes of this algorithm, a file extension consists of any part of the filename that platform conventions dictate will be used for identifying the type of the file. For example, many operating systems use the part of the filename following the last dot ("`.`") in the filename to determine the type of the file, and from that the manner in which the file is to be opened or executed.

User agents should ignore any directory or path information provided by the response itself, its [URL](https://url.spec.whatwg.org/#concept-url), and any `download` attribute, in deciding where to store the resulting file in the user's file system.

### 4.6.7 Hyperlink auditing

If a hyperlink created by an `a` or `area` element has a`ping` attribute, and the user follows the hyperlink, and the value of the element's `href` attribute can be parsed, relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document), without failure, then the user agent must take the `ping` attribute's value, [split that string on ASCII whitespace](https://infra.spec.whatwg.org/#split-on-ascii-whitespace), parse each resulting token, relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document), and then run these steps for each resulting [URL](https://url.spec.whatwg.org/#concept-url) ping URL, ignoring when parsing returns failure:

If ping URL's [scheme](https://url.spec.whatwg.org/#concept-url-scheme) is not an[HTTP(S) scheme](https://fetch.spec.whatwg.org/#http-scheme), then return.Optionally, return. (For example, the user agent might wish to ignore any or all ping URLs in accordance with the user's expressed preferences.)Let settingsObject be the element's [node document](https://dom.spec.whatwg.org/#concept-node-document)'srelevant settings object.Let request be a new [request](https://fetch.spec.whatwg.org/#concept-request) whose [URL](https://fetch.spec.whatwg.org/#concept-request-url) is ping URL, [method](https://fetch.spec.whatwg.org/#concept-request-method) is \` `POST`\`, [header list](https://fetch.spec.whatwg.org/#concept-request-header-list) is « (\` `Content-Type`\`, \` `text/ping`\`) », [body](https://fetch.spec.whatwg.org/#concept-request-body) is \` `PING`\`, [client](https://fetch.spec.whatwg.org/#concept-request-client) issettingsObject, [destination](https://fetch.spec.whatwg.org/#concept-request-destination) is the empty string, [credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) is "`include`", [referrer](https://fetch.spec.whatwg.org/#concept-request-referrer) is "`no-referrer`", and whose [use-URL-credentials flag](https://fetch.spec.whatwg.org/#concept-request-use-url-credentials-flag) is set, and whose[initiator type](https://fetch.spec.whatwg.org/#request-initiator-type) is "`ping`".

Let target URL be the result of encoding-parsing-and-serializing a URL given the element's `href` attribute's value, relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document), and then:

If the [URL](https://dom.spec.whatwg.org/#concept-document-url) of the `Document` object containing the hyperlink being audited and ping URL have the same origin

If the origins are different, but the [scheme](https://url.spec.whatwg.org/#concept-url-scheme) of the [URL](https://dom.spec.whatwg.org/#concept-document-url) of the `Document` containing the hyperlink being audited is not "`https`"request must include a \` `Ping-From`\` header with, as its value, the[URL](https://dom.spec.whatwg.org/#concept-document-url) of the document containing the hyperlink, and a \` `Ping-To`\` HTTP header with, as its value, the target URL.Otherwiserequest must include a \` `Ping-To`\` HTTP header with, as its value,target URL. request does not include a \` `Ping-From`\` header.

[Fetch](https://fetch.spec.whatwg.org/#concept-fetch) request.

This may be done in parallel with the primary fetch, and is independent of the result of that fetch.

User agents should allow the user to adjust this behavior, for example in conjunction with a setting that disables the sending of HTTP \` `[Referer](https://httpwg.org/specs/rfc7231.html#header.referer)`\` (sic) headers. Based on the user's preferences, UAs may either ignore the `ping` attribute altogether, or selectively ignore URLs in the list (e.g. ignoring any third-party URLs); this is explicitly accounted for in the steps above.

User agents must ignore any entity bodies returned in the responses. User agents may close the connection prematurely once they start receiving a response body.

[](https://infra.spec.whatwg.org/#tracking-vector) An `a` or `area` element that creates a hyperlink and has the `ping` attribute is present, user agents may indicate to the user that following the hyperlink will also cause secondary requests to be sent in the background, possibly including listing the actual target URLs.

For example, a visual user agent could include the hostnames of the target ping URLs along with the hyperlink's actual URL in a status bar or tooltip.

The `ping` attribute is redundant with pre-existing technologies like HTTP redirects and JavaScript in allowing web pages to track which off-site links are most popular or allowing advertisers to track click-through rates.

However, the `ping` attribute provides these advantages to the user over those alternatives:

- It allows the user to see the final target URL unobscured.
- It allows the UA to inform the user about the out-of-band notifications.
- It allows the UA to optimize the use of available network bandwidth so that the target page loads faster.

#### 4.6.7.1 The \` `Ping-From`\` and \` `Ping-To`\` headers

The \` `Ping-From`\` and \` `Ping-To`\` HTTP request headers are included in hyperlink auditing requests. Their value is a [URL](https://url.spec.whatwg.org/#concept-url), [serialized](https://url.spec.whatwg.org/#concept-url-serializer).

### 4.6.8 Link types

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes)

The following table summarizes the link types that are defined by this specification, by their corresponding keywords. This table is non-normative; the actual definitions for the link types are given in the next few sections.

In this section, the term _referenced document_ refers to the resource identified by the element representing the link, and the term _current document_ refers to the resource within which the element representing the link finds itself.

To determine which link types apply to a `link`, `a`, `area`, or `form` element, the element's `rel` attribute must be [split on ASCII whitespace](https://infra.spec.whatwg.org/#split-on-ascii-whitespace). The resulting tokens are the keywords for the link types that apply to that element.

Except where otherwise specified, a keyword must not be specified more than once per `rel` attribute.

Some of the sections that follow the table below list synonyms for certain keywords. The indicated synonyms are to be handled as specified by user agents, but must not be used in documents (for example, the keyword "`copyright`").

Keywords are always [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive), and must be compared as such.

Thus, `rel="next"` is the same as `rel="NEXT"`.

Keywords that are body-ok affect whether `link` elements areallowed in the body. The body-ok keywords are`dns-prefetch`,`modulepreload`,`pingback`,`preconnect`,`prefetch`,`preload`, and`stylesheet`.

New link types that are to be implemented by web browsers are to be added to this standard. The remainder can be registered as extensions.

Link type

Effect on...

body-ok

Has \` `[Link](https://httpwg.org/specs/rfc8288.html#header)`\` processing

Brief description

`link`

`a` and `area`

`form`

`alternate`

Hyperlink

_not allowed_

·

·

Gives alternate representations of the current document.

`canonical`

Hyperlink

_not allowed_

·

·

Gives the preferred URL for the current document.

`author`

Hyperlink

_not allowed_

·

·

Gives a link to the author of the current document or article.

`bookmark`

_not allowed_

Hyperlink

_not allowed_

·

·

Gives the permalink for the nearest ancestor section.

`dns-prefetch`

External Resource

_not allowed_

Yes

·

Specifies that the user agent should preemptively perform DNS resolution for the target resource's origin.

`expect`

Internal Resource

_not allowed_

·

·

Expect an element with the target ID to appear in the current document.

`external`

_not allowed_

Annotation

·

·

Indicates that the referenced document is not part of the same site as the current document.

`help`

Hyperlink

·

·

Provides a link to context-sensitive help.

`icon`

External Resource

_not allowed_

·

·

Imports an icon to represent the current document.

`manifest`

External Resource

_not allowed_

·

·

Imports or links to an [application manifest](https://w3c.github.io/manifest/#dfn-manifest). [\[MANIFEST\]](references.html#refsMANIFEST)

`modulepreload`

External Resource

_not allowed_

Yes

·

Specifies that the user agent must preemptively fetch the module script and store it in the document's module map for later evaluation. Optionally, the module's dependencies can be fetched as well.

`license`

Hyperlink

·

·

Indicates that the main content of the current document is covered by the copyright license described by the referenced document.

`next`

Hyperlink

·

·

Indicates that the current document is a part of a series, and that the next document in the series is the referenced document.

`nofollow`

_not allowed_

Annotation

·

·

Indicates that the current document's original author or publisher does not endorse the referenced document.

`noopener`

_not allowed_

Annotation

·

·

Creates a top-level traversable with a non-auxiliary browsing context if the hyperlink would otherwise create one that was auxiliary (i.e., has an appropriate `target` attribute value).

`noreferrer`

_not allowed_

Annotation

·

·

No \` `[Referer](https://httpwg.org/specs/rfc7231.html#header.referer)`\` (sic) header will be included. Additionally, has the same effect as `noopener`.

`opener`

_not allowed_

Annotation

·

·

Creates an auxiliary browsing context if the hyperlink would otherwise create a top-level traversable with a non-auxiliary browsing context (i.e., has "`_blank`" as `target` attribute value).

`pingback`

External Resource

_not allowed_

Yes

·

Gives the address of the pingback server that handles pingbacks to the current document.

`preconnect`

External Resource

_not allowed_

Yes

Yes

Specifies that the user agent should preemptively connect to the target resource's origin.

`prefetch`

External Resource

_not allowed_

Yes

·

Specifies that the user agent should preemptively [fetch](https://fetch.spec.whatwg.org/#concept-fetch) and cache the target resource as it is likely to be required for a followup navigation.

`preload`

External Resource

_not allowed_

Yes

Yes

Specifies that the user agent must preemptively [fetch](https://fetch.spec.whatwg.org/#concept-fetch) and cache the target resource for current navigation according to the preload destination given by the `as` attribute (and the [priority](https://fetch.spec.whatwg.org/#request-priority) associated with the [corresponding](https://fetch.spec.whatwg.org/#concept-potential-destination-translate) [destination](https://fetch.spec.whatwg.org/#concept-request-destination)).

`prev`

Hyperlink

·

·

Indicates that the current document is a part of a series, and that the previous document in the series is the referenced document.

`privacy-policy`

Hyperlink

_not allowed_

·

·

Gives a link to information about the data collection and usage practices that apply to the current document.

`search`

Hyperlink

·

·

Gives a link to a resource that can be used to search through the current document and its related pages.

`stylesheet`

External Resource

_not allowed_

Yes

·

Imports a style sheet.

`tag`

_not allowed_

Hyperlink

_not allowed_

·

·

Gives a tag (identified by the given address) that applies to the current document.

`terms-of-service`

Hyperlink

_not allowed_

·

·

Gives a link to information about the agreements between the current document's provider and users who wish to use the current document.

#### 4.6.8.1 Link type "`alternate`"

> [MDN ⚠](https://developer.mozilla.org/en-US/docs/Web/CSS/Alternative%5Fstyle%5Fsheets)

Support in one engine only.

Firefox3+Safari?Chrome1–48

---

OperaYesEdgeNo

---

Edge (Legacy)?Internet Explorer8+

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

The `alternate` keyword may be used with `link`,`a`, and `area` elements.

The meaning of this keyword depends on the values of the other attributes.

If the element is a `link` element and the `rel` attribute also contains the keyword `stylesheet`

The `alternate` keyword modifies the meaning of the `stylesheet` keyword in the way described for that keyword. The`alternate` keyword does not create a link of its own.

Here, a set of `link` elements provide some style sheets:

```
<!-- a persistent style sheet -->
<link rel="stylesheet" href="default.css">

<!-- the preferred alternate style sheet -->
<link rel="stylesheet" href="green.css" title="Green styles">

<!-- some alternate style sheets -->
<link rel="alternate stylesheet" href="contrast.css" title="High contrast">
<link rel="alternate stylesheet" href="big.css" title="Big fonts">
<link rel="alternate stylesheet" href="wide.css" title="Wide screen">
```

If the `alternate` keyword is used with the `type` attribute set to the value `application/rss+xml` or the value `application/atom+xml`

The keyword creates a hyperlink referencing a syndication feed (though not necessarily syndicating exactly the same content as the current page).

For the purposes of feed autodiscovery, user agents should consider all `link` elements in the document with the `alternate` keyword used and with their `type` attribute set to the value `application/rss+xml` or the value `application/atom+xml`. If the user agent has the concept of a default syndication feed, the first such element (in [tree order](https://dom.spec.whatwg.org/#concept-tree-order)) should be used as the default.

The following `link` elements give syndication feeds for a blog:

```
<link rel="alternate" type="application/atom+xml" href="posts.xml" title="Cool Stuff Blog">
<link rel="alternate" type="application/atom+xml" href="posts.xml?category=robots" title="Cool Stuff Blog: robots category">
<link rel="alternate" type="application/atom+xml" href="comments.xml" title="Cool Stuff Blog: Comments">
```

Such `link` elements would be used by user agents engaged in feed autodiscovery, with the first being the default (where applicable).

The following example offers various different syndication feeds to the user, using`a` elements:

```
<p>You can access the planets database using Atom feeds:</p>
<ul>
 <li><a href="recently-visited-planets.xml" rel="alternate" type="application/atom+xml">Recently Visited Planets</a></li>
 <li><a href="known-bad-planets.xml" rel="alternate" type="application/atom+xml">Known Bad Planets</a></li>
 <li><a href="unexplored-planets.xml" rel="alternate" type="application/atom+xml">Unexplored Planets</a></li>
</ul>
```

These links would not be used in feed autodiscovery.

Otherwise

The keyword creates a hyperlink referencing an alternate representation of the current document.

The nature of the referenced document is given by the `hreflang`, and `type` attributes.

If the `alternate` keyword is used with the `hreflang` attribute, and that attribute's value differs from the [document element](https://dom.spec.whatwg.org/#document-element)'s language, it indicates that the referenced document is a translation.

If the `alternate` keyword is used with the `type` attribute, it indicates that the referenced document is a reformulation of the current document in the specified format.

The `hreflang` and `type` attributes can be combined when specified with the `alternate` keyword.

The following example shows how you can specify versions of the page that use alternative formats, are aimed at other languages, and that are intended for other media:

```
<link rel=alternate href="/en/html" hreflang=en type=text/html title="English HTML">
<link rel=alternate href="/fr/html" hreflang=fr type=text/html title="French HTML">
<link rel=alternate href="/en/html/print" hreflang=en type=text/html media=print title="English HTML (for printing)">
<link rel=alternate href="/fr/html/print" hreflang=fr type=text/html media=print title="French HTML (for printing)">
<link rel=alternate href="/en/pdf" hreflang=en type=application/pdf title="English PDF">
<link rel=alternate href="/fr/pdf" hreflang=fr type=application/pdf title="French PDF">
```

This relationship is transitive — that is, if a document links to two other documents with the link type "`alternate`", then, in addition to implying that those documents are alternative representations of the first document, it is also implying that those two documents are alternative representations of each other.

#### 4.6.8.2 Link type "`author`"

The `author` keyword may be used with `link`,`a`, and `area` elements. This keyword creates a hyperlink.

For `a` and `area` elements, the `author` keyword indicates that the referenced document provides further information about the author of the nearest `article` element ancestor of the element defining the hyperlink, if there is one, or of the page as a whole, otherwise.

For `link` elements, the `author` keyword indicates that the referenced document provides further information about the author for the page as a whole.

The "referenced document" can be, and often is, a `[mailto:](https://www.rfc-editor.org/rfc/rfc6068#section-2)` URL giving the email address of the author. [\[MAILTO\]](references.html#refsMAILTO)

**Synonyms**: For historical reasons, user agents must also treat`link`, `a`, and `area` elements that have a `rev` attribute with the value "`made`" as having the `author` keyword specified as a link relationship.

#### 4.6.8.3 Link type "`bookmark`"

The `bookmark` keyword may be used with `a` and`area` elements. This keyword creates a hyperlink.

The `bookmark` keyword gives a permalink for the nearest ancestor `article` element of the linking element in question, or of the section the linking element is most closely associated with, if there are no ancestor `article` elements.

The following snippet has three permalinks. A user agent could determine which permalink applies to which part of the spec by looking at where the permalinks are given.

```
 ...
 <body>
  <h1>Example of permalinks</h1>
  <div id="a">
   <h2>First example</h2>
   <p><a href="a.html" rel="bookmark">This permalink applies to
   only the content from the first H2 to the second H2</a>. The DIV isn't
   exactly that section, but it roughly corresponds to it.</p>
  </div>
  <h2>Second example</h2>
  <article id="b">
   <p><a href="b.html" rel="bookmark">This permalink applies to
   the outer ARTICLE element</a> (which could be, e.g., a blog post).</p>
   <article id="c">
    <p><a href="c.html" rel="bookmark">This permalink applies to
    the inner ARTICLE element</a> (which could be, e.g., a blog comment).</p>
   </article>
  </article>
 </body>
 ...
```

#### 4.6.8.4 Link type "`canonical`"

The `canonical` keyword may be used with `link` element. This keyword creates a hyperlink.

The `canonical` keyword indicates that URL given by the `href` attribute is the preferred URL for the current document. That helps search engines reduce duplicate content, as described in more detail in The Canonical Link Relation. [\[RFC6596\]](references.html#refsRFC6596)

#### 4.6.8.5 Link type "`dns-prefetch`"

MDN

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/dns-prefetch)

Firefox3+Safari?Chrome46+

---

Opera?Edge79+

---

Edge (Legacy)NoInternet Explorer?

---

Firefox Android?Safari iOS?Chrome AndroidYesWebView Android46+Samsung Internet?Opera Android?

The `dns-prefetch` keyword may be used with`link` elements. This keyword creates an external resource link. This keyword is body-ok.

The `dns-prefetch` keyword indicates that preemptively performing DNS resolution for the origin of the specified resource is likely to be beneficial, as it is highly likely that the user will require resources located at thatorigin, and the user experience would be improved by preempting the latency costs associated with DNS resolution.

There is no default type for resources given by the `dns-prefetch` keyword.

The appropriate times to fetch and process this type of link are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.

When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.

The fetch and process the linked resource steps for this type of linked resource, given a `link` element el, are:Let url be the result of encoding-parsing a URL givenel's `href` attribute's value, relative toel's [node document](https://dom.spec.whatwg.org/#concept-node-document).If url is failure, then return.

Let partitionKey be the result of [determining the network partition key](https://fetch.spec.whatwg.org/#determine-the-network-partition-key) given el's[node document](https://dom.spec.whatwg.org/#concept-node-document)'s relevant settings object.

- The user agent should [resolve an origin](https://fetch.spec.whatwg.org/#resolve-an-origin) given partitionKey andurl's [origin](https://url.spec.whatwg.org/#concept-url-origin).  
  As the results of this algorithm can be cached, future fetches could be faster.

#### 4.6.8.6 Link type "`expect`"

The `expect` keyword may be used with `link` elements. This keyword creates an internal resource link.

An internal resource link created by the `expect` keyword can be used to block rendering until the element that it indicates is connected to the document and fully parsed.

There is no default type for resources given by the `expect` keyword.

Whenever any of the following conditions occur for a `link` elementel:

the `expect` internal resource link is created on el that is already browsing-context connected;an `expect` internal resource link has been created on el and el becomesbrowsing-context connected;an `expect` internal resource link has been created on el, el is already browsing-context connected, andel's `href` attribute is set, changed, or removed; or

an `expect` internal resource link has been created on el, el is already browsing-context connected, andel's `media` attribute is set, changed, or removed,

then process el.

To process internal resource link given a `link` element el, run these steps:

Let doc be el's [node document](https://dom.spec.whatwg.org/#concept-node-document).Let url be the result of encoding-parsing a URL givenel's `href` attribute's value, relative todoc.If this fails, or if url does not [equal](https://url.spec.whatwg.org/#concept-url-equals) doc's[URL](https://dom.spec.whatwg.org/#concept-document-url) with _[exclude fragments](https://url.spec.whatwg.org/#url-equals-exclude-fragments)_ set to false, then unblock rendering onel and return.Let indicatedElement be the result of selecting the indicated part given doc and url.

If all of the following are true:

doc's current document readiness is "`loading`";el creates an internal resource link;el is browsing-context connected;el's `rel` attribute contains `expect`;el is potentially render-blocking;el's `media` attributematches the environment; and

- indicatedElement is not an element, or is on astack of open elements of an HTML parser whose associated`Document` is doc,  
  then block rendering on el.

Otherwise, unblock rendering on el.

To process internal resource links given a `Document` doc:

[For each](https://infra.spec.whatwg.org/#list-iterate) `expect` `link` element link indoc's render-blocking element set, process link.

The following [attribute change steps](https://dom.spec.whatwg.org/#concept-element-attributes-change-ext), given element, localName, oldValue,value, and namespace, are used to ensure `expect` `link` elements respond to dynamic `id` and `name` changes:

If namespace is not null, then return.If element is in a stack of open elements of anHTML parser, then return.

If any of the following is true:

localName is `id`; or

- localName is `name` and element is an `a` element,  
  then process internal resource links given element's[node document](https://dom.spec.whatwg.org/#concept-node-document).

#### 4.6.8.7 Link type "`external`"

The `external` keyword may be used with `a`,`area`, and `form` elements. This keyword does not create ahyperlink, but annotates any other hyperlinks created by the element (the implied hyperlink, if no other keywords create one).

The `external` keyword indicates that the link is leading to a document that is not part of the site that the current document forms a part of.

#### 4.6.8.8 Link type "`help`"

The `help` keyword may be used with `link`,`a`, `area`, and `form` elements. This keyword creates ahyperlink.

For `a`, `area`, and `form` elements, the `help` keyword indicates that the referenced document provides further help information for the parent of the element defining the hyperlink, and its children.

In the following example, the form control has associated context-sensitive help. The user agent could use this information, for example, displaying the referenced document if the user presses the "Help" or "F1" key.

```
 <p><label> Topic: <input name=topic> <a href="help/topic.html" rel="help">(Help)</a></label></p>
```

For `link` elements, the `help` keyword indicates that the referenced document provides help for the page as a whole.

For `a` and `area` elements, on some browsers, the `help` keyword causes the link to use a different cursor.

#### 4.6.8.9 Link type "`icon`"

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes#icon)

[caniuse.com table](https://caniuse.com/#feat=link-icon-png)

The `icon` keyword may be used with `link` elements. This keyword creates an external resource link.

The specified resource is an icon representing the page or site, and should be used by the user agent when representing the page in the user interface.

Icons could be auditory icons, visual icons, or other kinds of icons. If multiple icons are provided, the user agent must select the most appropriate icon according to the`type`, `media`, and `sizes` attributes. If there are multiple equally appropriate icons, user agents must use the last one declared in [tree order](https://dom.spec.whatwg.org/#concept-tree-order) at the time that the user agent collected the list of icons. If the user agent tries to use an icon but that icon is determined, upon closer examination, to in fact be inappropriate (e.g. because it uses an unsupported format), then the user agent must try the next-most-appropriate icon as determined by the attributes.

User agents are not required to update icons when the list of icons changes, but are encouraged to do so.

There is no default type for resources given by the `icon` keyword. However, for the purposes of determining the type of the resource, user agents must expect the resource to be an image.

The `sizes` keywords represent icon sizes in raw pixels (as opposed to [CSS pixels](https://drafts.csswg.org/css-values/#px)).

An icon that is 50 [CSS pixels](https://drafts.csswg.org/css-values/#px) wide intended for displays with a device pixel density of two device pixels per [CSS pixel](https://drafts.csswg.org/css-values/#px) (2x, 192dpi) would have a width of 100 raw pixels. This feature does not support indicating that a different resource is to be used for small high-resolution icons vs large low-resolution icons (e.g. 50×50 2x vs 100×100 1x).

To parse and process the attribute's value, the user agent must first [split the attribute's value on ASCII whitespace](https://infra.spec.whatwg.org/#split-on-ascii-whitespace), and must then parse each resulting keyword to determine what it represents.

The `any` keyword represents that the resource contains a scalable icon, e.g. as provided by an SVG image.

Other keywords must be further parsed as follows to determine what they represent:

If the keyword doesn't contain exactly one U+0078 LATIN SMALL LETTER X or U+0058 LATIN CAPITAL LETTER X character, then this keyword doesn't represent anything. Return for that keyword.Let width string be the string before the "`x`" or "`X`".Let height string be the string after the "`x`" or "`X`".If either width string or height string start with a U+0030 DIGIT ZERO (0) character or contain any characters other than [ASCII digits](https://infra.spec.whatwg.org/#ascii-digit), then this keyword doesn't represent anything. Return for that keyword.Apply the rules for parsing non-negative integers to width string to obtain width.Apply the rules for parsing non-negative integers to height string to obtain height.

The keyword represents that the resource contains a bitmap icon with a width of width device pixels and a height of height device pixels.

The keywords specified on the `sizes` attribute must not represent icon sizes that are not actually available in the linked resource.

The linked resource fetch setup steps for this type of linked resource, given a`link` element el and [request](https://fetch.spec.whatwg.org/#concept-request) request, are:

Set request's [destination](https://fetch.spec.whatwg.org/#concept-request-destination) to "`image`".

Return true.

The process a link header steps for this type of linked resource are to do nothing.

In the absence of a `link` with the `icon` keyword, for`Document` objects whose [URL](https://dom.spec.whatwg.org/#concept-document-url)'s[scheme](https://url.spec.whatwg.org/#concept-url-scheme) is an [HTTP(S) scheme](https://fetch.spec.whatwg.org/#http-scheme), user agents may instead run these steps in parallel:

Let request be a new [request](https://fetch.spec.whatwg.org/#concept-request) whose[URL](https://fetch.spec.whatwg.org/#concept-request-url) is the [URL record](https://url.spec.whatwg.org/#concept-url) obtained by resolving the [URL](https://url.spec.whatwg.org/#concept-url) "`/favicon.ico`" against the`Document` object's [URL](https://dom.spec.whatwg.org/#concept-document-url), [client](https://fetch.spec.whatwg.org/#concept-request-client) is the `Document` object'srelevant settings object, [destination](https://fetch.spec.whatwg.org/#concept-request-destination) is "`image`",[synchronous flag](https://fetch.spec.whatwg.org/#synchronous-flag) is set, [credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) is "`include`", and whose [use-URL-credentials flag](https://fetch.spec.whatwg.org/#concept-request-use-url-credentials-flag) is set.Let response be the result of [fetching](https://fetch.spec.whatwg.org/#concept-fetch) request.

Use response's unsafe response as an icon as if it had been declared using the `icon` keyword.

The following snippet shows the top part of an application with several icons.

```
<!DOCTYPE HTML>
<html lang="en">
 <head>
  <title>lsForums — Inbox</title>
  <link rel=icon href=favicon.png sizes="16x16" type="image/png">
  <link rel=icon href=windows.ico sizes="32x32 48x48" type="image/vnd.microsoft.icon">
  <link rel=icon href=mac.icns sizes="128x128 512x512 8192x8192 32768x32768">
  <link rel=icon href=iphone.png sizes="57x57" type="image/png">
  <link rel=icon href=gnome.svg sizes="any" type="image/svg+xml">
  <link rel=stylesheet href=lsforums.css>
  <script src=lsforums.js></script>
  <meta name=application-name content="lsForums">
 </head>
 <body>
  ...
```

For historical reasons, the `icon` keyword may be preceded by the keyword "`shortcut`". If the "`shortcut`" keyword is present, the `rel` attribute's entire value must be an[ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for the string "`shortcut icon`" (with a single U+0020 SPACE character between the tokens and no other [ASCII whitespace](https://infra.spec.whatwg.org/#ascii-whitespace)).

#### 4.6.8.10 Link type "`license`"

The `license` keyword may be used with `link`,`a`, `area`, and `form` elements. This keyword creates ahyperlink.

The `license` keyword indicates that the referenced document provides the copyright license terms under which the main content of the current document is provided.

This specification does not specify how to distinguish between the main content of a document and content that is not deemed to be part of that main content. The distinction should be made clear to the user.

Consider a photo sharing site. A page on that site might describe and show a photograph, and the page might be marked up as follows:

```
<!DOCTYPE HTML>
<html lang="en">
 <head>
  <title>Exampl Pictures: Kissat</title>
  <link rel="stylesheet" href="/style/default">
 </head>
 <body>
  <h1>Kissat</h1>
  <nav>
   <a href="../">Return to photo index</a>
  </nav>
  <figure>
   <img src="/pix/39627052_fd8dcd98b5.jpg">
   <figcaption>Kissat</figcaption>
  </figure>
  <p>One of them has six toes!</p>
  <p><small><a rel="license" href="http://www.opensource.org/licenses/mit-license.php">MIT Licensed</a></small></p>
  <footer>
   <a href="/">Home</a> | <a href="../">Photo index</a>
   <p><small>© copyright 2009 Exampl Pictures. All Rights Reserved.</small></p>
  </footer>
 </body>
</html>
```

In this case the `license` applies to just the photo (the main content of the document), not the whole document. In particular not the design of the page itself, which is covered by the copyright given at the bottom of the document. This could be made clearer in the styling (e.g. making the license link prominently positioned near the photograph, while having the page copyright in light small text at the foot of the page).

**Synonyms**: For historical reasons, user agents must also treat the keyword "`copyright`" like the `license` keyword.

#### 4.6.8.11 Link type "`manifest`"

> [MDN ⚠](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/manifest)

Support in one engine only.

Firefox?Safari?ChromeNo

---

Opera?EdgeNo

---

Edge (Legacy)?Internet Explorer?

---

Firefox Android?Safari iOS?Chrome Android39+WebView Android?Samsung Internet?Opera Android?

The `manifest` keyword may be used with `link` elements. This keyword creates an external resource link.

The `manifest` keyword indicates the manifest file that provides metadata associated with the current document.

There is no default type for resources given by the `manifest` keyword.

When a web application is not [installed](https://w3c.github.io/manifest/#dfn-installed-web-application), the appropriate time to fetch and process the linked resource for this link type is when the user agent deems it necessary. For example, when the user chooses to [install the web application](https://w3c.github.io/manifest/#dfn-installed-web-application).

For an [installed web application](https://w3c.github.io/manifest/#dfn-installed-web-application), the appropriate times to fetch and process the linked resource for this link type are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.

When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.

In any case, only the first `link` element in [tree order](https://dom.spec.whatwg.org/#concept-tree-order) whose `rel` attribute contains the token `manifest` may be used.

A user agent must not delay the load event for this link type.

The linked resource fetch setup steps for this type of linked resource, given a`link` element el and [request](https://fetch.spec.whatwg.org/#concept-request) request, are:

Let navigable be el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s node navigable.If navigable is null, then return false.If navigable is not a top-level traversable, then return false.Set request's [initiator](https://fetch.spec.whatwg.org/#concept-request-initiator) to "`manifest`".Set request's [destination](https://fetch.spec.whatwg.org/#concept-request-destination) to "`manifest`".Set request's [mode](https://fetch.spec.whatwg.org/#concept-request-mode) to "`cors`".Set request's [credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) to the CORS settings attribute credentials mode for el's`crossorigin` content attribute.

Return true.

To process this type of linked resource given a `link` element el, boolean success, [response](https://fetch.spec.whatwg.org/#concept-response) response, and [byte sequence](https://infra.spec.whatwg.org/#byte-sequence) bodyBytes:

If response's Content-Type metadata is not a[JSON MIME type](https://mimesniff.spec.whatwg.org/#json-mime-type), then set success to false.

If success is true:

Let document URL be el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s [URL](https://dom.spec.whatwg.org/#concept-document-url).Let manifest URL be response's [URL](https://fetch.spec.whatwg.org/#concept-response-url).Let client be el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s relevant settings object.

[Process the manifest](https://w3c.github.io/manifest/#dfn-processing-a-manifest) given document URL, manifest URL, bodyBytes, and client. [\[MANIFEST\]](references.html#refsMANIFEST)

The process a link header steps for this type of linked resource are to do nothing.

#### 4.6.8.12 Link type "`modulepreload`"

MDN

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/modulepreload)

Firefox115+Safari?Chrome66+

---

Opera?Edge79+

---

Edge (Legacy)NoInternet Explorer?

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

The `modulepreload` keyword may be used with`link` elements. This keyword creates an external resource link. This keyword is body-ok.

The `modulepreload` keyword is a specialized alternative to the `preload` keyword, with a processing model geared toward preloading module scripts. In particular, it uses the specific fetch behavior for module scripts (including, e.g., a different interpretation of the `crossorigin` attribute), and places the result into the appropriate module map for later evaluation. In contrast, a similar external resource link using the `preload` keyword would place the result in the preload cache, without affecting the document's module map.

Additionally, implementations can take advantage of the fact that module scripts declare their dependencies in order to fetch the specified module's dependency as well. This is intended as an optimization opportunity, since the user agent knows that, in all likelihood, those dependencies will also be needed later. It will not generally be observable without using technology such as service workers, or monitoring on the server side. Notably, the appropriate `load` or `error` events will occur after the specified module is fetched, and will not wait for any dependencies.

A user agent must not delay the load event for this link type.

A module preload destination is "`json`", "`style`", "`text`", or a [script-like destination](https://fetch.spec.whatwg.org/#request-destination-script-like).

The appropriate times to fetch and process the linked resource for such a link are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.

When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.

Unlike some other link relations, changing the relevant attributes (such as `as`, `crossorigin`, and`referrerpolicy`) of such a `link` does not trigger a new fetch. This is because the document's module map has already been populated by a previous fetch, and so re-fetching would be pointless.

The fetch and process the linked resource algorithm for `modulepreload` links, given a `link` elementel, is as follows:

If el's `href` attribute's value is the empty string, then return.Let destination be the current state of el's `as` attribute (a [destination](https://fetch.spec.whatwg.org/#concept-request-destination)), or "`script`" if it is in no state.If destination is not a module preload destination, thenqueue an element task on the networking task source given el to [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `error` at el, and return.Let url be the result of encoding-parsing a URL givenel's `href` attribute's value, relative toel's [node document](https://dom.spec.whatwg.org/#concept-node-document).If url is failure, then return.Let settings object be el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'srelevant settings object.Let credentials mode be the CORS settings attribute credentials mode for el's `crossorigin` attribute.Let cryptographic nonce beel.[\[\[CryptographicNonce\]\]](urls-and-fetching.html#cryptographicnonce).Let integrity metadata be the value of el's `integrity` attribute, if it is specified, or the empty string otherwise.If el does not have an `integrity` attribute, then set integrity metadata to the result of resolving a module integrity metadata with url and settings object.Let referrer policy be the current state of el's `referrerpolicy` attribute.Let fetch priority be the current state of el's `fetchpriority` attribute.Let options be a script fetch options whose cryptographic nonce is cryptographic nonce, integrity metadata isintegrity metadata, parser metadata is "`not-parser-inserted`", credentials mode is credentials mode, referrer policy is referrer policy, and fetch priority isfetch priority.

Fetch a modulepreload module script graph given url,destination, settings object, options, and with the following steps given result:

If result is null, then [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `error` at el, and return.

[Fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `load` at el.

The process a link header steps for this type of linked resource are to do nothing.

The following snippet shows the top part of an application with several modules preloaded:

```
<!DOCTYPE html>
<html lang="en">
<title>IRCFog</title>

<link rel="modulepreload" href="app.mjs">
<link rel="modulepreload" href="helpers.mjs">
<link rel="modulepreload" href="irc.mjs">
<link rel="modulepreload" href="fog-machine.mjs">

<script type="module" src="app.mjs">
...
```

Assume that the module graph for the application is as follows:

Here we see the application developer has used `modulepreload` to declare all of the modules in their module graph, ensuring that the user agent initiates fetches for them all. Without such preloading, the user agent might need to go through multiple network roundtrips before discovering `helpers.mjs`, if technologies such as HTTP/2 Server Push are not in play. In this way, `modulepreload` `link` elements can be used as a sort of "manifest" of the application's modules.

The following code shows how `modulepreload` links can be used in conjunction with `[import()](https://tc39.es/ecma262/#sec-import-calls)` to ensure network fetching is done ahead of time, so that when `[import()](https://tc39.es/ecma262/#sec-import-calls)` is called, the module is already ready (but not evaluated) in the module map:

```
<link rel="modulepreload" href="awesome-viewer.mjs">

<button onclick="import('./awesome-viewer.mjs').then(m => m.view())">
  View awesome thing
</button>
```

#### 4.6.8.13 Link type "`nofollow`"

The `nofollow` keyword may be used with `a`,`area`, and `form` elements. This keyword does not create ahyperlink, but annotates any other hyperlinks created by the element (the implied hyperlink, if no other keywords create one).

The `nofollow` keyword indicates that the link is not endorsed by the original author or publisher of the page, or that the link to the referenced document was included primarily because of a commercial relationship between people affiliated with the two pages.

#### 4.6.8.14 Link type "`noopener`"

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/noopener)

[Link_types/noopener](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/noopener).')

The `noopener` keyword may be used with `a`,`area`, and `form` elements. This keyword does not create ahyperlink, but annotates any other hyperlinks created by the element (the implied hyperlink, if no other keywords create one).

The keyword indicates that any newly created top-level traversable which results from following the hyperlink will not contain an auxiliary browsing context. E.g., the resulting `Window`'s `opener` getter will return null.

See also the processing model.

This typically creates a top-level traversable with an auxiliary browsing context (assuming there is no existing navigable whose target name is "`example`"):

```
<a href=help.html target=example>Help!</a>
```

This creates a top-level traversable with a non-auxiliary browsing context (assuming the same thing):

```
<a href=help.html target=example rel=noopener>Help!</a>
```

These are equivalent and only navigate the parent navigable:

```
<a href=index.html target=_parent>Home</a>
```

```
<a href=index.html target=_parent rel=noopener>Home</a>
```

#### 4.6.8.15 Link type "`noreferrer`"

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/noreferrer)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/noreferrer)

The `noreferrer` keyword may be used with `a`,`area`, and `form` elements. This keyword does not create ahyperlink, but annotates any other hyperlinks created by the element (the implied hyperlink, if no other keywords create one).

It indicates that no referrer information is to be leaked when following the link and also implies the `noopener` keyword behavior under the same conditions.

See also the processing model where referrer is directly manipulated.

`<a href="..." rel="noreferrer" target="_blank">` has the same behavior as `<a href="..." rel="noreferrer noopener" target="_blank">`.

#### 4.6.8.16 Link type "`opener`"

The `opener` keyword may be used with `a`,`area`, and `form` elements. This keyword does not create ahyperlink, but annotates any other hyperlinks created by the element (the implied hyperlink, if no other keywords create one).

The keyword indicates that any newly created top-level traversable which results from following the hyperlink will contain an auxiliary browsing context.

See also the processing model.

In the following example the `opener` is used to allow the help page popup to navigate its opener, e.g., in case what the user is looking for can be found elsewhere. An alternative might be to use a named target, rather than `_blank`, but this has the potential to clash with existing names.

```
<a href="..." rel=opener target=_blank>Help!</a>
```

#### 4.6.8.17 Link type "`pingback`"

The `pingback` keyword may be used with `link` elements. This keyword creates an external resource link. This keyword is body-ok.

For the semantics of the `pingback` keyword, seePingback 1.0. [\[PINGBACK\]](references.html#refsPINGBACK)

#### 4.6.8.18 Link type "`preconnect`"

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/preconnect)

The `preconnect` keyword may be used with `link` elements. This keyword creates an external resource link. This keyword is body-ok.

The `preconnect` keyword indicates that preemptively initiating a connection to the origin of the specified resource is likely to be beneficial, as it is highly likely that the user will require resources located at thatorigin, and the user experience would be improved by preempting the latency costs associated with establishing the connection.

There is no default type for resources given by the `preconnect` keyword.

A user agent must not delay the load event for this link type.

The appropriate times to fetch and process this type of link are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.

When the `crossorigin` attribute of the`link` element of an external resource link that is already browsing-context connected is set, changed, or removed.

The fetch and process the linked resource steps for this type of linked resource, given a `link` element el, are to create link options from el and to preconnect given the result.

The process a link header step for this type of linked resource given a link processing options options are topreconnect given options.

To preconnect given a link processing options options:

If options'shref is an empty string, return.

- Let url be the result of encoding-parsing a URL givenoptions's href, relative tooptions's base URL.  
  Passing the base URL instead of a document or environment is tracked by [issue #9715](https://github.com/whatwg/html/issues/9715).
  If url is failure, then return.If url's [scheme](https://url.spec.whatwg.org/#concept-url-scheme) is not an[HTTP(S) scheme](https://fetch.spec.whatwg.org/#http-scheme), then return.Let partitionKey be the result of [determining the network partition key](https://fetch.spec.whatwg.org/#determine-the-network-partition-key) given options'senvironment.Let useCredentials be true.

If options's crossorigin isAnonymous and options's origin does not have the same origin as url's[origin](https://url.spec.whatwg.org/#concept-url-origin), then set useCredentials to false.

- The user agent should [obtain a connection](https://fetch.spec.whatwg.org/#concept-connection-obtain) given partitionKey,url's [origin](https://url.spec.whatwg.org/#concept-url-origin), anduseCredentials.  
  This connection is obtained but not used directly. It will remain in the[connection pool](https://fetch.spec.whatwg.org/#concept-connection-pool) for subsequent use.  
  The user agent should attempt to initiate a preconnect and perform the full connection handshake (DNS+TCP for HTTP, and DNS+TCP+TLS for HTTPS origins) whenever possible, but is allowed to elect to perform a partial handshake (DNS only for HTTP, and DNS or DNS+TCP for HTTPS origins), or skip it entirely, due to resource constraints or other reasons.  
  The optimal number of connections per origin is dependent on the negotiated protocol, users current connectivity profile, available device resources, global connection limits, and other context specific variables. As a result, the decision for how many connections should be opened is deferred to the user agent.

#### 4.6.8.19 Link type "`prefetch`"

MDN

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/prefetch)

Firefox2+SafariNoChrome8+

---

Opera?Edge79+

---

Edge (Legacy)12+Internet Explorer11

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet1.5+Opera Android?

The `prefetch` keyword may be used with `link` elements. This keyword creates an external resource link. This keyword is body-ok.

The `prefetch` keyword indicates that preemptively [fetching](https://fetch.spec.whatwg.org/#concept-fetch) and caching the specified resource or same-site document is likely to be beneficial, as it is highly likely that the user will require this resource for future navigations.

There is no default type for resources given by the `prefetch` keyword.

The appropriate times to fetch and process this type of link are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.

When the `crossorigin` attribute of the`link` element of an external resource link that is already browsing-context connected is set, changed, or removed.

The fetch and process the linked resource algorithm for `prefetch` links, given a `link` elementel, is as follows:

If el's `href` attribute's value is the empty string, then return.Let options be the result of creating link options from el.Let request be the result of creating a link request given options.If request is null, then return.Set request's [initiator](https://fetch.spec.whatwg.org/#concept-request-initiator) to "`prefetch`".

Let processPrefetchResponse be the following steps given a [response](https://fetch.spec.whatwg.org/#concept-response) response and null, failure, or a[byte sequence](https://infra.spec.whatwg.org/#byte-sequence) bytesOrNull:

If response is a [network error](https://fetch.spec.whatwg.org/#concept-network-error), [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `error` at el.Otherwise, [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `load` at el.

The user agent should [fetch](https://fetch.spec.whatwg.org/#concept-fetch) request, with*[processResponseConsumeBody](https://fetch.spec.whatwg.org/#process-response-end-of-body)* set toprocessPrefetchResponse. User agents may delay the fetching of request to prioritize other requests that are necessary for the current document.

The process a link header steps for this type of linked resource are to do nothing.

#### 4.6.8.20 Link type "`preload`"

> [MDN ⚠](https://developer.mozilla.org/en-US/docs/Web/HTML/Link%5Ftypes/preload)

Support in one engine only.

Firefox85+Safari?Chrome🔰 50+

---

Opera37+Edge🔰 79+

---

Edge (Legacy)NoInternet Explorer?

---

Firefox Android?Safari iOS?Chrome Android?WebView Android50+Samsung Internet5.0+Opera Android?

The `preload` keyword may be used with `link` elements. This keyword creates an external resource link. This keyword is body-ok.

The `preload` keyword indicates that the user agent will preemptively [fetch](https://fetch.spec.whatwg.org/#concept-fetch) and cache the specified resource according to the preload destination given by the `as` attribute, and the [priority](https://fetch.spec.whatwg.org/#request-priority) given by the `fetchpriority` attribute, as it is highly likely that the user will require this resource for the current navigation.

User-agents might perform additional operations when a resource is loaded, such as preemptively decoding images or [creating style sheets](https://drafts.csswg.org/cssom/#create-a-css-style-sheet). However, these additional operations cannot have observable effects.

There is no default type for resources given by the `preload` keyword.

A user agent must not delay the load event for this link type.

The appropriate times to fetch and process the linked resource for such a link are:

When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.When the `as` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.When the `type` attribute of the `link` element of an external resource link that is already browsing-context connected, but was previously not obtained due to the `type` attribute specifying an unsupported type for the request[destination](https://fetch.spec.whatwg.org/#concept-request-destination), is set, removed, or changed.

When the `media` attribute of the `link` element of an external resource link that is already browsing-context connected, but was previously not obtained due to the `media` attribute notmatching the environment, is changed or removed.

A `Document` has a map of preloaded resources, which is an[ordered map](https://infra.spec.whatwg.org/#ordered-map), initially empty.

A preload key is a [struct](https://infra.spec.whatwg.org/#struct). It has the following [items](https://infra.spec.whatwg.org/#struct-item):

URL A [URL](https://url.spec.whatwg.org/#concept-url) destination A preload destination mode A [request mode](https://fetch.spec.whatwg.org/#concept-request-mode), either "`same-origin`", "`cors`", or "`no-cors`"credentials mode A [credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode)

A preload entry is a [struct](https://infra.spec.whatwg.org/#struct). It has the following [items](https://infra.spec.whatwg.org/#struct-item):

integrity metadata A stringresponse Null or a [response](https://fetch.spec.whatwg.org/#concept-response) on response available Null, or an algorithm accepting a [response](https://fetch.spec.whatwg.org/#concept-response) or null

To consume a preloaded resource for `Window` window, given a [URL](https://url.spec.whatwg.org/#concept-url) url, a string destination, a stringmode, a string credentialsMode, a string integrityMetadata, andonResponseAvailable, which is an algorithm accepting a [response](https://fetch.spec.whatwg.org/#concept-response):

Let key be a preload key whose URL is url, destination isdestination, mode is mode, andcredentials mode iscredentialsMode.Let preloads be window's associated Document's map of preloaded resources.If key does not [exist](https://infra.spec.whatwg.org/#map-exists) in preloads, then return false.Let entry be preloads\[key\].Let consumerIntegrityMetadata be the result of[parsing](https://w3c.github.io/webappsec-subresource-integrity/#parse-metadata) integrityMetadata.Let preloadIntegrityMetadata be the result of[parsing](https://w3c.github.io/webappsec-subresource-integrity/#parse-metadata) entry'sintegrity metadata.

If none of the following conditions apply:

- consumerIntegrityMetadata is `no metadata`;
- consumerIntegrityMetadata is equal to preloadIntegrityMetadata; or  
  This comparison would ignore unknown integrity options. See [issue #116.](https://github.com/w3c/webappsec-subresource-integrity/issues/116)  
  then return false.  
  A mismatch in integrity metadata between the preload and the consumer, even if both match the data, would lead to an additional fetch from the network.  
  It is important that [network errors](https://fetch.spec.whatwg.org/#concept-network-error) are added to the preload cache so that if a preload request results in an error, the erroneous response isn't re-requested from the network later. This also has security implications; consider the case where a developer specifies subresource integrity metadata on a preload request, but not the following resource request. If the preload request fails subresource integrity verification and is discarded, the resource request will fetch and consume a potentially-malicious response from the network without verifying its integrity.[\[SRI\]](references.html#refsSRI)
  [Remove](https://infra.spec.whatwg.org/#map-remove) preloads\[key\].If entry's response is null, then setentry's on response available toonResponseAvailable.Otherwise, call onResponseAvailable with entry's response.

Return true.

For the purposes of this section, a string type matches a preload destination destination if the following algorithm returns true:

If type is an empty string, then return true.If destination is "`fetch`", then return true.Let mimeTypeRecord be the result of[parsing](https://mimesniff.spec.whatwg.org/#parse-a-mime-type) type.If mimeTypeRecord is failure, then return false.

- If mimeTypeRecord is not [supported by the user agent](https://mimesniff.spec.whatwg.org/#supported-by-the-user-agent), then return false.

If any of the following are true:

destination is "`script`" andmimeTypeRecord is a [JavaScript MIME type](https://mimesniff.spec.whatwg.org/#javascript-mime-type);destination is "`image`" andmimeTypeRecord is an [image MIME type](https://mimesniff.spec.whatwg.org/#image-mime-type);destination is "`font`" andmimeTypeRecord is a [font MIME type](https://mimesniff.spec.whatwg.org/#font-mime-type);destination is "`style`" andmimeTypeRecord's [essence](https://mimesniff.spec.whatwg.org/#mime-type-essence) is`text/css`; or

- destination is "`track`" andmimeTypeRecord's [essence](https://mimesniff.spec.whatwg.org/#mime-type-essence) is`text/vtt`,  
  then return true.

Return false.

To create a preload key for a [request](https://fetch.spec.whatwg.org/#concept-request) request, return a new preload key whose URL is request's [URL](https://fetch.spec.whatwg.org/#concept-request-url), destination is request's [destination](https://fetch.spec.whatwg.org/#concept-request-destination), mode is request's [mode](https://fetch.spec.whatwg.org/#concept-request-mode), andcredentials mode is request's [credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode).

A preload destination is "`fetch`", "`font`", "`image`", "`script`", "`style`", or "`track`".

To translate a preload destination given a string destination:

If destination is not a preload destination, then return null.

Return the result of [translating](https://fetch.spec.whatwg.org/#concept-potential-destination-translate) destination.

To preload given a link processing options options and an optional processResponse, which is an algorithm accepting a [response](https://fetch.spec.whatwg.org/#concept-response):

If options's type doesn't match options's destination, then return.If options's destination is "`image`" and options's source set is not null, then set options's href to the result of selecting an image source from options's source set.Let request be the result of creating a link request given options.If request is null, then return.Let unsafeEndTime be 0.Let entry be a new preload entry whoseintegrity metadata is options'sintegrity.Let key be the result of creating a preload key given request.If options's document is null, then set request's [initiator type](https://fetch.spec.whatwg.org/#request-initiator-type) to "`early hint`".Let controller be null.Let reportTiming given a `Document` document be to[report timing](https://fetch.spec.whatwg.org/#finalize-and-report-timing) for controller given document's relevant global object.

Set controller to the result of [fetching](https://fetch.spec.whatwg.org/#concept-fetch) request, with _[processResponseConsumeBody](https://fetch.spec.whatwg.org/#process-response-end-of-body)_ set to the following steps given a [response](https://fetch.spec.whatwg.org/#concept-response) response and null, failure, or a [byte sequence](https://infra.spec.whatwg.org/#byte-sequence) bodyBytes:

- If bodyBytes is a [byte sequence](https://infra.spec.whatwg.org/#byte-sequence), then set response's[body](https://fetch.spec.whatwg.org/#concept-response-body) to bodyBytes [as a body](https://fetch.spec.whatwg.org/#byte-sequence-as-a-body).  
  By using _[processResponseConsumeBody](https://fetch.spec.whatwg.org/#process-response-end-of-body)_, we have [extracted](https://fetch.spec.whatwg.org/#bodyinit-safely-extract) the entire [body](https://fetch.spec.whatwg.org/#concept-response-body). This is necessary to ensure the preloader loads the entire body from the network, regardless of whether the preload will be consumed (which is uncertain at this point). This step then resets the request's body to a new body containing the same bytes, so that other specifications can read from it at the time of actual consumption, despite us having already done so once.
  Otherwise, set response to a [network error](https://fetch.spec.whatwg.org/#concept-network-error).Set unsafeEndTime to the [unsafe shared current time](https://w3c.github.io/hr-time/#dfn-unsafe-shared-current-time).If options's document is not null, then call reportTiming given options's document.If entry's on response available is null, then set entry's response to response; otherwise call entry's on response available givenresponse.If processResponse is given, then call processResponse withresponse.

Let commit be the following steps given a `Document` document:

If entry's response is not null, then call reportTiming given document.Set document's map of preloaded resources\[key\] toentry.

If options's document is null, then set options's on document ready to commit. Otherwise, call commit with options's document.

The fetch and process the linked resource steps for this type of linked resource, given a `link` element el, are:

Update the source set for el.Let options be the result of creating link options fromel.Let destination be the result of translating the keyword representing the state of el's `as` attribute.If destination is null, then return.Set options's destination todestination.

Preload options, with the following steps given a [response](https://fetch.spec.whatwg.org/#concept-response) response:

1. If response is a [network error](https://fetch.spec.whatwg.org/#concept-network-error), [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `error` at el. Otherwise, [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named`load` at el.  
   The actual browsers' behavior is different from the spec here, and the feasibility of changing the behavior has not yet been investigated. See [issue #1142](https://github.com/whatwg/html/issues/1142).

The process a link header step for this type of link given a link processing options options is to preload options.

#### 4.6.8.21 Link type "`privacy-policy`"

The `privacy-policy` keyword may be used with`link`, `a`, and `area` elements. This keyword creates ahyperlink.

The `privacy-policy` keyword indicates that the referenced document contains information about the data collection and usage practices that apply to the current document, as described in more detail in Additional Link Relation Types. The referenced document may be a standalone privacy policy, or a specific section of some more general document. [\[RFC6903\]](references.html#refsRFC6903)

#### 4.6.8.22 Link type "`search`"

The `search` keyword may be used with `link`,`a`, `area`, and `form` elements. This keyword creates ahyperlink.

The `search` keyword indicates that the referenced document provides an interface specifically for searching the document and its related resources.

OpenSearch description documents can be used with `link` elements and the `search` link type to enable user agents to autodiscover search interfaces. [\[OPENSEARCH\]](references.html#refsOPENSEARCH)

#### 4.6.8.23 Link type "`stylesheet`"

The `stylesheet` keyword may be used with `link` elements. This keyword creates an external resource link that contributes to the styling processing model. This keyword isbody-ok.

The specified resource is a [CSS style sheet](https://drafts.csswg.org/cssom/#css-style-sheet) that describes how to present the document.

> [MDN ⚠](https://developer.mozilla.org/en-US/docs/Web/CSS/Alternative%5Fstyle%5Fsheets)

Support in one engine only.

Firefox3+Safari?Chrome1–48

---

OperaYesEdgeNo

---

Edge (Legacy)?Internet Explorer8+

---

Firefox Android?Safari iOS?Chrome Android?WebView Android?Samsung Internet?Opera Android?

If the `alternate` keyword is also specified on the`link` element, then the link is an alternative style sheet; in this case, the `title` attribute must be specified on the `link` element, with a non-empty value.

The default type for resources given by the `stylesheet` keyword is `text/css`.

A `link` element of this type is implicitly potentially render-blocking if the element was created by its [node document](https://dom.spec.whatwg.org/#concept-node-document)'s parser.

When the `disabled` attribute of a `link` element with a `stylesheet` keyword is set, [disable](https://drafts.csswg.org/cssom/#disable-a-css-style-sheet) the [associated CSS style sheet](https://drafts.csswg.org/cssom/#associated-css-style-sheet).

The appropriate times to fetch and process this type of link are:When the external resource link is created on a `link` element that is already browsing-context connected.When the external resource link's `link` element becomes browsing-context connected.When the `href` attribute of the `link` element of an external resource link that is already browsing-context connected is changed.When the `disabled` attribute of the`link` element of an external resource link that is alreadybrowsing-context connected is set, changed, or removed.When the `crossorigin` attribute of the`link` element of an external resource link that is already browsing-context connected is set, changed, or removed.When the `type` attribute of the `link` element of an external resource link that is already browsing-context connected is set or changed to a value that does not or no longer matches the Content-Type metadata of the previous obtained external resource, if any.When the `type` attribute of the `link` element of an external resource link that is already browsing-context connected, but was previously not obtained due to the `type` attribute specifying an unsupported type, is removed or changed.

When the external resource link that is already browsing-context connected changes from being an alternative style sheet to not being one, or vice versa.

**Quirk**: If the document has been set to [quirks mode](https://dom.spec.whatwg.org/#concept-document-quirks), has thesame origin as the [URL](https://url.spec.whatwg.org/#concept-url) of the external resource, and the Content-Type metadata of the external resource is not a supported style sheet type, the user agent must instead assume it to be `text/css`.

The linked resource fetch setup steps for this type of linked resource, given a`link` element el and [request](https://fetch.spec.whatwg.org/#concept-request) request, are:

If el's `disabled` attribute is set, then return false.If el contributes a script-blocking style sheet, [append](https://infra.spec.whatwg.org/#set-append) el to its [node document](https://dom.spec.whatwg.org/#concept-node-document)'s script-blocking style sheet set.If el's `media` attribute's valuematches the environment and el ispotentially render-blocking, then block rendering onel.If el is currently render-blocking, then set request's[render-blocking](https://fetch.spec.whatwg.org/#request-render-blocking) to true.

Return true.

See [issue #968](https://github.com/whatwg/html/issues/968) for plans to use the CSSOM [fetch a CSS style sheet](https://drafts.csswg.org/cssom/#fetching-css-style-sheets) algorithm instead of the default fetch and process the linked resource algorithm. In the meantime, any critical subresource [request](https://fetch.spec.whatwg.org/#concept-request) should have its [render-blocking](https://fetch.spec.whatwg.org/#request-render-blocking) set to whether or not the`link` element is currently render-blocking.

To process this type of linked resource given a `link` element el, boolean success, [response](https://fetch.spec.whatwg.org/#concept-response) response, and [byte sequence](https://infra.spec.whatwg.org/#byte-sequence) bodyBytes:

If the resource's Content-Type metadata is not`text/css`, then set success to false.

If el no longer creates an external resource link that contributes to the styling processing model, or if, since the resource in question was fetched, it has become appropriate to fetch it again, then:

[Remove](https://infra.spec.whatwg.org/#list-remove) el from el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s script-blocking style sheet set.Return. If el has an [associated CSS style sheet](https://drafts.csswg.org/cssom/#associated-css-style-sheet), [remove the CSS style sheet](https://drafts.csswg.org/cssom/#remove-a-css-style-sheet).

If success is true, then:

[Create a CSS style sheet](https://drafts.csswg.org/cssom/#create-a-css-style-sheet) with the following properties:

[type](https://drafts.csswg.org/cssom/#concept-css-style-sheet-type)`text/css`[location](https://drafts.csswg.org/cssom/#concept-css-style-sheet-location)

response's [URL list](https://fetch.spec.whatwg.org/#concept-response-url-list)\[0\]

We provide a URL here on the assumption that [w3c/csswg-drafts issue #9316](https://github.com/w3c/csswg-drafts/issues/9316) will be fixed.

[owner node](https://drafts.csswg.org/cssom/#concept-css-style-sheet-owner-node)el[media](https://drafts.csswg.org/cssom/#concept-css-style-sheet-media)

The `media` attribute of el.

This is a reference to the (possibly absent at this time) attribute, rather than a copy of the attribute's current value. CSSOM defines what happens when the attribute is dynamically set, changed, or removed.

[title](https://drafts.csswg.org/cssom/#concept-css-style-sheet-title)

The `title` attribute of el, ifel is [in a document tree](https://dom.spec.whatwg.org/#in-a-document-tree), or the empty string otherwise.

This is similarly a reference to the attribute, rather than a copy of the attribute's current value.

[alternate flag](https://drafts.csswg.org/cssom/#concept-css-style-sheet-alternate-flag)Set if the link is an alternative style sheet and el'sexplicitly enabled is false; unset otherwise.[origin-clean flag](https://drafts.csswg.org/cssom/#concept-css-style-sheet-origin-clean-flag)Set if the resource is CORS-same-origin; unset otherwise.

[parent CSS style sheet](https://drafts.csswg.org/cssom/#concept-css-style-sheet-parent-css-style-sheet)

[owner CSS rule](https://drafts.csswg.org/cssom/#concept-css-style-sheet-owner-css-rule)null[disabled flag](https://drafts.csswg.org/cssom/#concept-css-style-sheet-disabled-flag)Left at its default value.[CSS rules](https://drafts.csswg.org/cssom/#concept-css-style-sheet-css-rules)

Left uninitialized.

This doesn't seem right. Presumably we should be using bodyBytes? Tracked as [issue #2997](https://github.com/whatwg/html/issues/2997).

The CSS [environment encoding](https://drafts.csswg.org/css-syntax/#environment-encoding) is the result of running the following steps:[\[CSSSYNTAX\]](references.html#refsCSSSYNTAX)

If el has a `charset` attribute,[get an encoding](https://encoding.spec.whatwg.org/#concept-encoding-get) from that attribute's value. If that succeeds, return the resulting encoding. [\[ENCODING\]](references.html#refsENCODING)Otherwise, return the [document's character encoding](https://dom.spec.whatwg.org/#concept-document-encoding).[\[DOM\]](references.html#refsDOM) [Fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `load` at el. Otherwise, [fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `error` at el.

If el contributes a script-blocking style sheet, then:

[Assert](https://infra.spec.whatwg.org/#assert): el's [node document](https://dom.spec.whatwg.org/#concept-node-document)'s script-blocking style sheet set [contains](https://infra.spec.whatwg.org/#list-contain) el.[Remove](https://infra.spec.whatwg.org/#list-remove) el from its [node document](https://dom.spec.whatwg.org/#concept-node-document)'s script-blocking style sheet set.

Unblock rendering on el.

The process a link header steps for this type of linked resource are to do nothing.

#### 4.6.8.24 Link type "`tag`"

The `tag` keyword may be used with `a` and`area` elements. This keyword creates a hyperlink.

The `tag` keyword indicates that the _tag_ that the referenced document represents applies to the current document.

Since it indicates that the tag _applies to the current document_, it would be inappropriate to use this keyword in the markup of a tag cloud, which lists the popular tags across a set of pages.

This document is about some gems, and so it is _tagged_ with "`https://en.wikipedia.org/wiki/Gemstone`" to unambiguously categorize it as applying to the "jewel" kind of gems, and not to, say, the towns in the US, the Ruby package format, or the Swiss locomotive class:

```
<!DOCTYPE HTML>
<html lang="en">
 <head>
  <title>My Precious</title>
 </head>
 <body>
  <header><h1>My precious</h1> <p>Summer 2012</p></header>
  <p>Recently I managed to dispose of a red gem that had been
  bothering me. I now have a much nicer blue sapphire.</p>
  <p>The red gem had been found in a bauxite stone while I was digging
  out the office level, but nobody was willing to haul it away. The
  same red gem stayed there for literally years.</p>
  <footer>
   Tags: <a rel=tag href="https://en.wikipedia.org/wiki/Gemstone">Gemstone</a>
  </footer>
 </body>
</html>
```

In _this_ document, there are two articles. The "`tag`" link, however, applies to the whole page (and would do so wherever it was placed, including if it was within the `article` elements).

```
<!DOCTYPE HTML>
<html lang="en">
 <head>
  <title>Gem 4/4</title>
 </head>
 <body>
  <article>
   <h1>801: Steinbock</h1>
   <p>The number 801 Gem 4/4 electro-diesel has an ibex and was rebuilt in 2002.</p>
  </article>
  <article>
   <h1>802: Murmeltier</h1>
   <figure>
    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Trains_de_la_Bernina_en_hiver_2.jpg"
         alt="The 802 was red with pantographs and tall vents on the side.">
    <figcaption>The 802 in the 1980s, above Lago Bianco.</figcaption>
   </figure>
   <p>The number 802 Gem 4/4 electro-diesel has a marmot and was rebuilt in 2003.</p>
  </article>
  <p class="topic"><a rel=tag href="https://en.wikipedia.org/wiki/Rhaetian_Railway_Gem_4/4">Gem 4/4</a></p>
 </body>
</html>
```

#### 4.6.8.25 Link Type "`terms-of-service`"

The `terms-of-service` keyword may be used with`link`, `a`, and `area` elements. This keyword creates ahyperlink.

The `terms-of-service` keyword indicates that the referenced document contains information about the agreements between the current document's provider and users who wish to use the current document, as described in more detail inAdditional Link Relation Types. [\[RFC6903\]](references.html#refsRFC6903)

#### 4.6.8.26 Sequential link types

Some documents form part of a sequence of documents.

A sequence of documents is one where each document can have a _previous sibling_ and a*next sibling*. A document with no previous sibling is the start of its sequence, a document with no next sibling is the end of its sequence.

A document may be part of multiple sequences.

##### 4.6.8.26.1 Link type "`next`"

The `next` keyword may be used with `link`,`a`, `area`, and `form` elements. This keyword creates ahyperlink.

The `next` keyword indicates that the document is part of a sequence, and that the link is leading to the document that is the next logical document in the sequence.

When the `next` keyword is used with a `link` element, user agents should process such links as if they were using one of the `dns-prefetch`, `preconnect`, or`prefetch` keywords. Which keyword the user agent wishes to use is implementation-dependent; for example, a user agent may wish to use the less-costly `preconnect` processing model when trying to conserve data, battery power, or processing power, or may wish to pick a keyword depending on heuristic analysis of past user behavior in similar scenarios.

##### 4.6.8.26.2 Link type "`prev`"

The `prev` keyword may be used with `link`,`a`, `area`, and `form` elements. This keyword creates ahyperlink.

The `prev` keyword indicates that the document is part of a sequence, and that the link is leading to the document that is the previous logical document in the sequence.

**Synonyms**: For historical reasons, user agents must also treat the keyword "`previous`" like the `prev` keyword.

#### 4.6.8.27 Other link types

Extensions to the predefined set of link types may be registered on the [microformats page for existing rel values](https://microformats.org/wiki/existing-rel-values#HTML5%5Flink%5Ftype%5Fextensions). [\[MFREL\]](references.html#refsMFREL)

Anyone is free to edit the microformats page for existing rel values at any time to add a type. Extension types must be specified with the following information:

Keyword

The actual value being defined. The value should not be confusingly similar to any other defined value (e.g. differing only in case).

If the value contains a U+003A COLON character (:), it must also be an [absolute URL](https://url.spec.whatwg.org/#syntax-url-absolute).

Effect on... `link`

One of the following:

Not allowedThe keyword must not be specified on `link` elements.HyperlinkThe keyword may be specified on a `link` element; it creates ahyperlink.External ResourceThe keyword may be specified on a `link` element; it creates an external resource link. Effect on... `a` and `area`

One of the following:

Not allowedThe keyword must not be specified on `a` and `area` elements.HyperlinkThe keyword may be specified on `a` and `area` elements; it creates ahyperlink.External ResourceThe keyword may be specified on `a` and `area` elements; it creates an external resource link.Hyperlink AnnotationThe keyword may be specified on `a` and `area` elements; it annotates other hyperlinks created by the element. Effect on... `form`

One of the following:

Not allowedThe keyword must not be specified on `form` elements.HyperlinkThe keyword may be specified on `form` elements; it creates ahyperlink.External ResourceThe keyword may be specified on `form` elements; it creates an external resource link.Hyperlink AnnotationThe keyword may be specified on `form` elements; it annotates other hyperlinks created by the element. Brief descriptionA short non-normative description of what the keyword's meaning is.SpecificationA link to a more detailed description of the keyword's semantics and requirements. It could be another page on the wiki, or a link to an external page.SynonymsA list of other keyword values that have exactly the same processing requirements. Authors should not use the values defined to be synonyms, they are only intended to allow user agents to support legacy content. Anyone may remove synonyms that are not used in practice; only names that need to be processed as synonyms for compatibility with legacy content are to be registered in this way.Status

One of the following:

ProposedThe keyword has not received wide peer review and approval. Someone has proposed it and is, or soon will be, using it.RatifiedThe keyword has received wide peer review and approval. It has a specification that unambiguously defines how to handle pages that use the keyword, including when they use it in incorrect ways.DiscontinuedThe keyword has received wide peer review and it has been found wanting. Existing pages are using this keyword, but new pages should avoid it. The "brief description" and "specification" entries will give details of what authors should use instead, if anything.

If a keyword is found to be redundant with existing values, it should be removed and listed as a synonym for the existing value.

If a keyword is registered in the "proposed" state for a period of a month or more without being used or specified, then it may be removed from the registry.

If a keyword is added with the "proposed" status and found to be redundant with existing values, it should be removed and listed as a synonym for the existing value. If a keyword is added with the "proposed" status and found to be harmful, then it should be changed to "discontinued" status.

Anyone can change the status at any time, but should only do so in accordance with the definitions above.

Conformance checkers must use the information given on the microformats page for existing rel values to establish if a value is allowed or not: values defined in this specification or marked as "proposed" or "ratified" must be accepted when used on the elements for which they apply as described in the "Effect on..." field, whereas values marked as "discontinued" or not listed in either this specification or on the aforementioned page must be rejected as invalid. Conformance checkers may cache this information (e.g. for performance reasons or to avoid the use of unreliable network connectivity).

When an author uses a new type not defined by either this specification or the wiki page, conformance checkers should offer to add the value to the wiki, with the details described above, with the "proposed" status.

Types defined as extensions in the [microformats page for existing rel values](https://microformats.org/wiki/existing-rel-values#HTML5%5Flink%5Ftype%5Fextensions) with the status "proposed" or "ratified" may be used with the`rel` attribute on `link`, `a`, and `area` elements in accordance to the "Effect on..." field. [\[MFREL\]](references.html#refsMFREL)
