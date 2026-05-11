# HTML Standard — §4.4 Grouping Content

> Source: <https://html.spec.whatwg.org/multipage/grouping-content.html#grouping-content>

## Contents

- [4.4.1 The p element](#441-the-p-element)
- [4.4.2 The hr element](#442-the-hr-element)
- [4.4.3 The pre element](#443-the-pre-element)
- [4.4.4 The blockquote element](#444-the-blockquote-element)
- [4.4.5 The ol element](#445-the-ol-element)
- [4.4.6 The ul element](#446-the-ul-element)
- [4.4.7 The menu element](#447-the-menu-element)
- [4.4.8 The li element](#448-the-li-element)
- [4.4.9 The dl element](#449-the-dl-element)
- [4.4.10 The dt element](#4410-the-dt-element)
- [4.4.11 The dd element](#4411-the-dd-element)
- [4.4.12 The figure element](#4412-the-figure-element)
- [4.4.13 The figcaption element](#4413-the-figcaption-element)
- [4.4.14 The main element](#4414-the-main-element)
- [4.4.15 The search element](#4415-the-search-element)
- [4.4.16 The div element](#4416-the-div-element)

---

## 4.4 Grouping content

### 4.4.1 The `p` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLParagraphElement)

**Categories:**

Flow content.

Palpable content.
**Contexts:**

Where flow content is expected.

As a child of an `hgroup` element.
**Content model:** Phrasing content.
**Tag omission:** A `p` element's end tag can be omitted if the`p` element is immediately followed by an `address`, `article`,`aside`, `blockquote`, `details`, `dialog`,`div`, `dl`, `fieldset`, `figcaption`,`figure`, `footer`, `form`, `h1`, `h2`,`h3`, `h4`, `h5`, `h6`, `header`,`hgroup`, `hr`, `main`, `menu`, `nav`,`ol`, `p`, `pre`, `search`, `section`,`table`, or `ul` element, or if there is no more content in the parent element and the parent element is an HTML element that is not an `a`, `audio`, `del`, `ins`, `map`,`noscript`, or `video` element, or an autonomous custom element.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-p).

[For implementers](https://w3c.github.io/html-aam/#el-p).
**DOM interface:**

```
[Exposed=Window]
interface HTMLParagraphElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `p` element represents a paragraph.

While paragraphs are usually represented in visual media by blocks of text that are physically separated from adjacent blocks through blank lines, a style sheet or user agent would be equally justified in presenting paragraph breaks in a different manner, for instance using inline pilcrows (¶).

The following examples are conforming HTML fragments:

```
<p>The little kitten gently seated herself on a piece of
carpet. Later in her life, this would be referred to as the time the
cat sat on the mat.</p>
```

```
<fieldset>
 <legend>Personal information</legend>
 <p>
   <label>Name: <input name="n"></label>
   <label><input name="anon" type="checkbox"> Hide from other users</label>
 </p>
 <p><label>Address: <textarea name="a"></textarea></label></p>
</fieldset>
```

```
<p>There was once an example from Femley,<br>
Whose markup was of dubious quality.<br>
The validator complained,<br>
So the author was pained,<br>
To move the error from the markup to the rhyming.</p>
```

The `p` element should not be used when a more specific element is more appropriate.

The following example is technically correct:

```
<section>
 <!-- ... -->
 <p>Last modified: 2001-04-23</p>
 <p>Author: fred@example.com</p>
</section>
```

However, it would be better marked-up as:

```
<section>
 <!-- ... -->
 <footer>Last modified: 2001-04-23</footer>
 <address>Author: fred@example.com</address>
</section>
```

Or:

```
<section>
 <!-- ... -->
 <footer>
  <p>Last modified: 2001-04-23</p>
  <address>Author: fred@example.com</address>
 </footer>
</section>
```

List elements (in particular, `ol` and `ul` elements) cannot be children of `p` elements. When a sentence contains a bulleted list, therefore, one might wonder how it should be marked up.

For instance, this fantastic sentence has bullets relating to

- wizards,
- faster-than-light travel, and
- telepathy,

and is further discussed below.

The solution is to realize that a _paragraph_, in HTML terms, is not a logical concept, but a structural one. In the fantastic example above, there are actually*five* paragraphs as defined by this specification: one before the list, one for each bullet, and one after the list.

The markup for the above example could therefore be:

```
<p>For instance, this fantastic sentence has bullets relating to</p>
<ul>
 <li>wizards,
 <li>faster-than-light travel, and
 <li>telepathy,
</ul>
<p>and is further discussed below.</p>
```

Authors wishing to conveniently style such "logical" paragraphs consisting of multiple "structural" paragraphs can use the `div` element instead of the `p` element.

Thus for instance the above example could become the following:

```
<div>For instance, this fantastic sentence has bullets relating to
<ul>
 <li>wizards,
 <li>faster-than-light travel, and
 <li>telepathy,
</ul>
and is further discussed below.</div>
```

This example still has five structural paragraphs, but now the author can style just the`div` instead of having to consider each part of the example separately.

### 4.4.2 The `hr` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLHRElement)

**Categories:**

Flow content.

select element inner content elements.
**Contexts:**

Where flow content is expected.

As a child of a `select` element.
**Content model:** Nothing.
**Tag omission:** No end tag.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-hr).

[For implementers](https://w3c.github.io/html-aam/#el-hr).
**DOM interface:**

```
[Exposed=Window]
interface HTMLHRElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `hr` element represents a paragraph\-level thematic break, e.g., a scene change in a story, or a transition to another topic within a section of a reference book; alternatively, it represents a separator between a set of options of a`select` element.

The following fictional extract from a project manual shows two sections that use the`hr` element to separate topics within the section.

```
<section>
 <h1>Communication</h1>
 <p>There are various methods of communication. This section
 covers a few of the important ones used by the project.</p>
 <hr>
 <p>Communication stones seem to come in pairs and have mysterious
 properties:</p>
 <ul>
  <li>They can transfer thoughts in two directions once activated
  if used alone.</li>
  <li>If used with another device, they can transfer one's
  consciousness to another body.</li>
  <li>If both stones are used with another device, the
  consciousnesses switch bodies.</li>
 </ul>
 <hr>
 <p>Radios use the electromagnetic spectrum in the meter range and
 longer.</p>
 <hr>
 <p>Signal flares use the electromagnetic spectrum in the
 nanometer range.</p>
</section>
<section>
 <h1>Food</h1>
 <p>All food at the project is rationed:</p>
 <dl>
  <dt>Potatoes</dt>
  <dd>Two per day</dd>
  <dt>Soup</dt>
  <dd>One bowl per day</dd>
 </dl>
 <hr>
 <p>Cooking is done by the chefs on a set rotation.</p>
</section>
```

There is no need for an `hr` element between the sections themselves, since the`section` elements and the `h1` elements imply thematic changes themselves.

The following extract from Pandora's Star by Peter F. Hamilton shows two paragraphs that precede a scene change and the paragraph that follows it. The scene change, represented in the printed book by a gap containing a solitary centered star between the second and third paragraphs, is here represented using the `hr` element.

```
<p>Dudley was ninety-two, in his second life, and fast approaching
time for another rejuvenation. Despite his body having the physical
age of a standard fifty-year-old, the prospect of a long degrading
campaign within academia was one he regarded with dread. For a
supposedly advanced civilization, the Intersolar Commonwealth could be
appallingly backward at times, not to mention cruel.</p>
<p><i>Maybe it won't be that bad</i>, he told himself. The lie was
comforting enough to get him through the rest of the night's
shift.</p>
<hr>
<p>The Carlton AllLander drove Dudley home just after dawn. Like the
astronomer, the vehicle was old and worn, but perfectly capable of
doing its job. It had a cheap diesel engine, common enough on a
semi-frontier world like Gralmond, although its drive array was a
thoroughly modern photoneural processor. With its high suspension and
deep-tread tyres it could plough along the dirt track to the
observatory in all weather and seasons, including the metre-deep snow
of Gralmond's winters.</p>
```

The `hr` element does not affect the document'soutline.

### 4.4.3 The `pre` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLPreElement)

**Categories:**

Flow content.

Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Phrasing content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-pre).

[For implementers](https://w3c.github.io/html-aam/#el-pre).
**DOM interface:**

```
[Exposed=Window]
interface HTMLPreElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `pre` element represents a block of preformatted text, in which structure is represented by typographic conventions rather than by elements.

In the HTML syntax, a leading newline character immediately following the `pre` element start tag is stripped.

Some examples of cases where the `pre` element could be used:

- Including an email, with paragraphs indicated by blank lines, lists indicated by lines prefixed with a bullet, and so on.
- Including fragments of computer code, with structure indicated according to the conventions of that language.
- Displaying ASCII art.

Authors are encouraged to consider how preformatted text will be experienced when the formatting is lost, as will be the case for users of speech synthesizers, braille displays, and the like. For cases like ASCII art, it is likely that an alternative presentation, such as a textual description, would be more universally accessible to the readers of the document.

To represent a block of computer code, the `pre` element can be used with a`code` element; to represent a block of computer output the `pre` element can be used with a `samp` element. Similarly, the `kbd` element can be used within a `pre` element to indicate text that the user is to enter.

This element has rendering requirements involving the bidirectional algorithm.

In the following snippet, a sample of computer code is presented.

```
<p>This is the <code>Panel</code> constructor:</p>
<pre><code>function Panel(element, canClose, closeHandler) {
  this.element = element;
  this.canClose = canClose;
  this.closeHandler = function () { if (closeHandler) closeHandler() };
}</code></pre>
```

In the following snippet, `samp` and `kbd` elements are mixed in the contents of a `pre` element to show a session of Zork I.

```
<pre><samp>You are in an open field west of a big white house with a boarded
front door.
There is a small mailbox here.

></samp> <kbd>open mailbox</kbd>

<samp>Opening the mailbox reveals:
A leaflet.

></samp></pre>
```

The following shows a contemporary poem that uses the `pre` element to preserve its unusual formatting, which forms an intrinsic part of the poem itself.

```
<pre>                maxling

it is with a          heart
               heavy

that i admit loss of a feline
        so           loved

a friend lost to the
        unknown
                                (night)

~cdr 11dec07</pre>
```

### 4.4.4 The `blockquote` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLQuoteElement)

**Categories:**

Flow content.

Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:**

Global attributes

`cite` — Link to the source of the quotation or more information about the edit
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-blockquote).

[For implementers](https://w3c.github.io/html-aam/#el-blockquote).
**DOM interface:**

```
[Exposed=Window]
interface HTMLQuoteElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, ReflectURL] attribute USVString cite;
};
```

The `HTMLQuoteElement` interface is also used by the `q` element.

The `blockquote` element represents a section that is quoted from another source.

Content inside a `blockquote` must be quoted from another source, whose address, if it has one, may be cited in the `cite` attribute.

If the `cite` attribute is present, it must be avalid URL potentially surrounded by spaces. To obtain the corresponding citation link, the value of the attribute must be parsed relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document). User agents may allow users to follow such citation links, but they are primarily intended for private use (e.g., by server-side scripts collecting statistics about a site's use of quotations), not for readers.

The content of a `blockquote` may be abbreviated or may have context added in the conventional manner for the text's language.

For example, in English this is traditionally done using square brackets. Consider a page with the sentence "Jane ate the cracker. She then said she liked apples and fish."; it could be quoted as follows:

```
<blockquote>
 <p>[Jane] then said she liked [...] fish.</p>
</blockquote>
```

Attribution for the quotation, if any, must be placed outside the `blockquote` element.

For example, here the attribution is given in a paragraph after the quote:

```
<blockquote>
 <p>I contend that we are both atheists. I just believe in one fewer
 god than you do. When you understand why you dismiss all the other
 possible gods, you will understand why I dismiss yours.</p>
</blockquote>
<p>— Stephen Roberts</p>
```

The other examples below show other ways of showing attribution.

Here a `blockquote` element is used in conjunction with a `figure` element and its `figcaption` to clearly relate a quote to its attribution (which is not part of the quote and therefore doesn't belong inside the `blockquote` itself):

```
<figure>
 <blockquote>
  <p>The truth may be puzzling. It may take some work to grapple with.
  It may be counterintuitive. It may contradict deeply held
  prejudices. It may not be consonant with what we desperately want to
  be true. But our preferences do not determine what's true. We have a
  method, and that method helps us to reach not absolute truth, only
  asymptotic approaches to the truth — never there, just closer
  and closer, always finding vast new oceans of undiscovered
  possibilities. Cleverly designed experiments are the key.</p>
 </blockquote>
 <figcaption>Carl Sagan, in "<cite>Wonder and Skepticism</cite>", from
 the <cite>Skeptical Inquirer</cite> Volume 19, Issue 1 (January-February
 1995)</figcaption>
</figure>
```

This next example shows the use of `cite` alongside `blockquote`:

```
<p>His next piece was the aptly named <cite>Sonnet 130</cite>:</p>
<blockquote cite="https://quotes.example.org/s/sonnet130.html">
  <p>My mistress' eyes are nothing like the sun,<br>
  Coral is far more red, than her lips red,<br>
  ...
```

This example shows how a forum post could use `blockquote` to show what post a user is replying to. The `article` element is used for each post, to mark up the threading.

```
<article>
 <h1><a href="https://bacon.example.com/?blog=109431">Bacon on a crowbar</a></h1>
 <article>
  <header><strong>t3yw</strong> 12 points 1 hour ago</header>
  <p>I bet a narwhal would love that.</p>
  <footer><a href="?pid=29578">permalink</a></footer>
  <article>
   <header><strong>greg</strong> 8 points 1 hour ago</header>
   <blockquote><p>I bet a narwhal would love that.</p></blockquote>
   <p>Dude narwhals don't eat bacon.</p>
   <footer><a href="?pid=29579">permalink</a></footer>
   <article>
    <header><strong>t3yw</strong> 15 points 1 hour ago</header>
    <blockquote>
     <blockquote><p>I bet a narwhal would love that.</p></blockquote>
     <p>Dude narwhals don't eat bacon.</p>
    </blockquote>
    <p>Next thing you'll be saying they don't get capes and wizard
    hats either!</p>
    <footer><a href="?pid=29580">permalink</a></footer>
    <article>
     <article>
      <header><strong>boing</strong> -5 points 1 hour ago</header>
      <p>narwhals are worse than ceiling cat</p>
      <footer><a href="?pid=29581">permalink</a></footer>
     </article>
    </article>
   </article>
  </article>
  <article>
   <header><strong>fred</strong> 1 points 23 minutes ago</header>
   <blockquote><p>I bet a narwhal would love that.</p></blockquote>
   <p>I bet they'd love to peel a banana too.</p>
   <footer><a href="?pid=29582">permalink</a></footer>
  </article>
 </article>
</article>
```

This example shows the use of a `blockquote` for short snippets, demonstrating that one does not have to use `p` elements inside `blockquote` elements:

```
<p>He began his list of "lessons" with the following:</p>
<blockquote>One should never assume that his side of
the issue will be recognized, let alone that it will
be conceded to have merits.</blockquote>
<p>He continued with a number of similar points, ending with:</p>
<blockquote>Finally, one should be prepared for the threat
of breakdown in negotiations at any given moment and not
be cowed by the possibility.</blockquote>
<p>We shall now discuss these points...
```

Examples of how to represent a conversation are shown in a later section; it is not appropriate to use the `cite` and `blockquote` elements for this purpose.

### 4.4.5 The `ol` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOListElement)

**Categories:**

Flow content.

If the element's children include at least one `li` element: Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Zero or more `li` and script-supporting elements.
**Tag omission:** Neither tag is omissible.
**Attributes:**

Global attributes

`reversed` — Number the list backwards

`start` — Starting value of the list

`type` — Kind of list marker
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-ol).

[For implementers](https://w3c.github.io/html-aam/#el-ol).
**DOM interface:**

```
[Exposed=Window]
interface HTMLOListElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, Reflect] attribute boolean reversed;
  [CEReactions, Reflect, ReflectDefault=1] attribute long start;
  [CEReactions, Reflect] attribute DOMString type;

  // also has obsolete members
};
```

The `ol` element represents a list of items, where the items have been intentionally ordered, such that changing the order would change the meaning of the document.

The items of the list are the `li` element child nodes of the `ol` element, in [tree order](https://dom.spec.whatwg.org/#concept-tree-order).

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol#attr-reversed)

The `reversed` attribute is a boolean attribute. If present, it indicates that the list is a descending list (..., 3, 2, 1). If the attribute is omitted, the list is an ascending list (1, 2, 3, ...).

The `start` attribute, if present, must be a valid integer. It is used to determine the starting value of the list.

An `ol` element has a starting value, which is an integer determined as follows:

If the `ol` element has a `start` attribute, then:

Let parsed be the result of parsing the value of the attribute as an integer.If parsed is not an error, then return parsed. If the `ol` element has a `reversed` attribute, then return the number of owned li elements.

Return 1.

The `type` attribute can be used to specify the kind of marker to use in the list, in the cases where that matters (e.g. because items are to be referenced by their number/letter). The attribute, if specified, must have a value that is [identical to](https://infra.spec.whatwg.org/#string-is) one of the characters given in the first cell of one of the rows of the following table. The `type` attribute represents the state given in the cell in the second column of the row whose first cell matches the attribute's value; if none of the cells match, or if the attribute is omitted, then the attribute represents the decimal state.

Keyword

State

Description

Examples for values 1-3 and 3999-4001

`1` (U+0031)

decimal

Decimal numbers

1.

2.

3.

...

3999.

4000.

4001.

...

`a` (U+0061)

lower-alpha

Lowercase latin alphabet

a.

b.

c.

...

ewu.

ewv.

eww.

...

`A` (U+0041)

upper-alpha

Uppercase latin alphabet

A.

B.

C.

...

EWU.

EWV.

EWW.

...

`i` (U+0069)

lower-roman

Lowercase roman numerals

i.

ii.

iii.

...

mmmcmxcix.

i̅v̅.

i̅v̅i.

...

`I` (U+0049)

upper-roman

Uppercase roman numerals

I.

II.

III.

...

MMMCMXCIX.

I̅V̅.

I̅V̅I.

...

User agents should render the items of the list in a manner consistent with the state of the`type` attribute of the `ol` element. Numbers less than or equal to zero should always use the decimal system regardless of the `type` attribute.

For CSS user agents, a mapping for this attribute to the['list-style-type'](https://drafts.csswg.org/css-lists/#propdef-list-style-type) CSS property is given in the Rendering section (the mapping is straightforward: the states above have the same names as their corresponding CSS values).

It is possible to redefine the default CSS list styles used to implement this attribute in CSS user agents; doing so will affect how list items are rendered.

Due to [\[ReflectDefault\]](common-dom-interfaces.html#xattr-reflectdefault) the `start` IDL attribute does not necessarily match the list's starting value, in cases where the `start` content attribute is omitted and the `reversed` content attribute is specified.

The following markup shows a list where the order matters, and where the `ol` element is therefore appropriate. Compare this list to the equivalent list in the `ul` section to see an example of the same items using the `ul` element.

```
<p>I have lived in the following countries (given in the order of when
I first lived there):</p>
<ol>
 <li>Switzerland
 <li>United Kingdom
 <li>United States
 <li>Norway
</ol>
```

Note how changing the order of the list changes the meaning of the document. In the following example, changing the relative order of the first two items has changed the birthplace of the author:

```
<p>I have lived in the following countries (given in the order of when
I first lived there):</p>
<ol>
 <li>United Kingdom
 <li>Switzerland
 <li>United States
 <li>Norway
</ol>
```

### 4.4.6 The `ul` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLUListElement)

**Categories:**

Flow content.

If the element's children include at least one `li` element: Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Zero or more `li` and script-supporting elements.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-ul).

[For implementers](https://w3c.github.io/html-aam/#el-ul).
**DOM interface:**

```
[Exposed=Window]
interface HTMLUListElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `ul` element represents a list of items, where the order of the items is not important — that is, where changing the order would not materially change the meaning of the document.

The items of the list are the `li` element child nodes of the `ul` element.

The following markup shows a list where the order does not matter, and where the`ul` element is therefore appropriate. Compare this list to the equivalent list in the`ol` section to see an example of the same items using the `ol` element.

```
<p>I have lived in the following countries:</p>
<ul>
 <li>Norway
 <li>Switzerland
 <li>United Kingdom
 <li>United States
</ul>
```

Note that changing the order of the list does not change the meaning of the document. The items in the snippet above are given in alphabetical order, but in the snippet below they are given in order of the size of their current account balance in 2007, without changing the meaning of the document whatsoever:

```
<p>I have lived in the following countries:</p>
<ul>
 <li>Switzerland
 <li>Norway
 <li>United Kingdom
 <li>United States
</ul>
```

### 4.4.7 The `menu` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menu)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMenuElement)

**Categories:**

Flow content.

If the element's children include at least one `li` element: Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Zero or more `li` and script-supporting elements.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-menu).

[For implementers](https://w3c.github.io/html-aam/#el-menu).
**DOM interface:**

```
[Exposed=Window]
interface HTMLMenuElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `menu` element represents a toolbar consisting of its contents, in the form of an unordered list of items (represented by `li` elements), each of which represents a command that the user can perform or activate.

The `menu` element is simply a semantic alternative to `ul` to express an unordered list of commands (a "toolbar").

In this example, a text-editing application uses a `menu` element to provide a series of editing commands:

```
<menu>
 <li><button onclick="copy()"><img src="copy.svg" alt="Copy"></button></li>
 <li><button onclick="cut()"><img src="cut.svg" alt="Cut"></button></li>
 <li><button onclick="paste()"><img src="paste.svg" alt="Paste"></button></li>
</menu>
```

Note that the styling to make this look like a conventional toolbar menu is up to the application.

### 4.4.8 The `li` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLIElement)

**Categories:** None.
**Contexts:** Inside `ol` elements.

Inside `ul` elements.

Inside `menu` elements.
**Content model:** Flow content.
**Tag omission:** An `li` element's end tag can be omitted if the`li` element is immediately followed by another `li` element or if there is no more content in the parent element.
**Attributes:**

Global attributes

If the element is not a child of an `ul` or `menu` element: `value` — Ordinal value of the list item
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-li).

[For implementers](https://w3c.github.io/html-aam/#el-li).
**DOM interface:**

```
[Exposed=Window]
interface HTMLLIElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, Reflect] attribute long value;

  // also has obsolete members
};
```

The `li` element represents a list item. If its parent element is an`ol`, `ul`, or `menu` element, then the element is an item of the parent element's list, as defined for those elements. Otherwise, the list item has no defined list-related relationship to any other `li` element.

The `value` attribute, if present, must be a valid integer. It is used to determine the ordinal value of the list item, when the `li`'s list owner is an`ol` element.

---

Any element whose [computed value](https://drafts.csswg.org/css-cascade/#computed-value) of ['display'](https://drafts.csswg.org/css2/#display-prop) is 'list-item' has alist owner, which is determined as follows:

- If the element is not being rendered, return null; the element has nolist owner.
  Let ancestor be the element's parent.

If the element has an `ol`, `ul`, or `menu` ancestor, setancestor to the closest such ancestor element.

- Return the closest inclusive ancestor of ancestor that produces a [CSS box](https://drafts.csswg.org/css-display/#css-box).  
  Such an element will always exist, as at the very least the [document element](https://dom.spec.whatwg.org/#document-element) will always produce a [CSS box](https://drafts.csswg.org/css-display/#css-box).

To determine the ordinal value of each element owned by a given list owner owner, perform the following steps:

Let i be 1.If owner is an `ol` element, let numbering beowner's starting value. Otherwise, letnumbering be 1._Loop_: If i is greater than the number of list items that owner owns, then return; all of owner's owned list items have been assigned ordinal values.

- Let item be the ith of owner's owned list items, in [tree order](https://dom.spec.whatwg.org/#concept-tree-order).

If item is an `li` element that has a `value` attribute, then:

Let parsed be the result of parsing the value of the attribute as an integer.If parsed is not an error, then set numbering toparsed. The ordinal value of item is numbering.If owner is an `ol` element, and owner has a `reversed` attribute, decrement numbering by 1; otherwise, increment numbering by 1.

Increment i by 1.

- Go to the step labeled _loop_.

---

The element's `value` IDL attribute does not directly correspond to its ordinal value; it simply reflects the content attribute. For example, given this list:

```
<ol>
 <li>Item 1
 <li value="3">Item 3
 <li>Item 4
</ol>
```

The ordinal values are 1, 3, and 4, whereas the `value` IDL attributes return 0, 3, 0 on getting.

The following example, the top ten movies are listed (in reverse order). Note the way the list is given a title by using a `figure` element and its `figcaption` element.

```
<figure>
 <figcaption>The top 10 movies of all time</figcaption>
 <ol>
  <li value="10"><cite>Josie and the Pussycats</cite>, 2001</li>
  <li value="9"><cite lang="sh">Црна мачка, бели мачор</cite>, 1998</li>
  <li value="8"><cite>A Bug's Life</cite>, 1998</li>
  <li value="7"><cite>Toy Story</cite>, 1995</li>
  <li value="6"><cite>Monsters, Inc</cite>, 2001</li>
  <li value="5"><cite>Cars</cite>, 2006</li>
  <li value="4"><cite>Toy Story 2</cite>, 1999</li>
  <li value="3"><cite>Finding Nemo</cite>, 2003</li>
  <li value="2"><cite>The Incredibles</cite>, 2004</li>
  <li value="1"><cite>Ratatouille</cite>, 2007</li>
 </ol>
</figure>
```

The markup could also be written as follows, using the `reversed` attribute on the `ol` element:

```
<figure>
 <figcaption>The top 10 movies of all time</figcaption>
 <ol reversed>
  <li><cite>Josie and the Pussycats</cite>, 2001</li>
  <li><cite lang="sh">Црна мачка, бели мачор</cite>, 1998</li>
  <li><cite>A Bug's Life</cite>, 1998</li>
  <li><cite>Toy Story</cite>, 1995</li>
  <li><cite>Monsters, Inc</cite>, 2001</li>
  <li><cite>Cars</cite>, 2006</li>
  <li><cite>Toy Story 2</cite>, 1999</li>
  <li><cite>Finding Nemo</cite>, 2003</li>
  <li><cite>The Incredibles</cite>, 2004</li>
  <li><cite>Ratatouille</cite>, 2007</li>
 </ol>
</figure>
```

While it is conforming to include heading elements (e.g. `h1`) inside`li` elements, it likely does not convey the semantics that the author intended. A heading starts a new section, so a heading in a list implicitly splits the list into spanning multiple sections.

### 4.4.9 The `dl` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDListElement)

**Categories:**

Flow content.

If the element's children include at least one name-value group: Palpable content.
**Contexts:** Where flow content is expected.
**Content model:**

Either: Zero or more groups each consisting of one or more `dt` elements followed by one or more `dd` elements, optionally intermixed with script-supporting elements.

Or: One or more `div` elements, optionally intermixed with script-supporting elements.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-dl).

[For implementers](https://w3c.github.io/html-aam/#el-dl).
**DOM interface:**

```
[Exposed=Window]
interface HTMLDListElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `dl` element represents an association list consisting of zero or more name-value groups (a description list). A name-value group consists of one or more names (`dt` elements, possibly as children of a `div` element child) followed by one or more values (`dd` elements, possibly as children of a `div` element child), ignoring any nodes other than `dt` and `dd` element children, and`dt` and `dd` elements that are children of `div` element children. Within a single `dl` element, there should not be more than one`dt` element for each name.

Name-value groups may be terms and definitions, metadata topics and values, questions and answers, or any other groups of name-value data.

The values within a group are alternatives; multiple paragraphs forming part of the same value must all be given within the same `dd` element.

The order of the list of groups, and of the names and values within each group, may be significant.

In order to annotate groups with microdata attributes, or other global attributes that apply to whole groups, or just for styling purposes, each group in a`dl` element can be wrapped in a `div` element. This does not change the semantics of the `dl` element.

The name-value groups of a `dl` element dl are determined using the following algorithm. A name-value group has a name (a list of `dt` elements, initially empty) and a value (a list of `dd` elements, initially empty).

Let groups be an empty list of name-value groups.Let current be a new name-value group.Let seenDd be false.Let child be dl's [first child](https://dom.spec.whatwg.org/#concept-tree-first-child).Let grandchild be null.

While child is not null:

If child is a `div` element, then:

Let grandchild be child's [first child](https://dom.spec.whatwg.org/#concept-tree-first-child).

While grandchild is not null:

Process dt or dd forgrandchild.Set grandchild to grandchild's [next sibling](https://dom.spec.whatwg.org/#concept-tree-next-sibling). Otherwise, process dt or dd forchild.Set child to child's [next sibling](https://dom.spec.whatwg.org/#concept-tree-next-sibling). If current is not empty, then append current togroups.

Return groups.

To process `dt` or `dd` for a node node means to follow these steps:

Let groups, current, and seenDd be the same variables as those of the same name in the algorithm that invoked these steps.

If node is a `dt` element, then:

If seenDd is true, then append current to groups, setcurrent to a new name-value group, and set seenDd to false.Append node to current's name.

Otherwise, if node is a `dd` element, then append node tocurrent's value and set seenDd to true.

When a name-value group has an empty list as name or value, it is often due to accidentally using `dd` elements in the place of `dt` elements and vice versa. Conformance checkers can spot such mistakes and might be able to advise authors how to correctly use the markup.

In the following example, one entry ("Authors") is linked to two values ("John" and "Luke").

```
<dl>
 <dt> Authors
 <dd> John
 <dd> Luke
 <dt> Editor
 <dd> Frank
</dl>
```

In the following example, one definition is linked to two terms.

```
<dl>
 <dt lang="en-US"> <dfn>color</dfn> </dt>
 <dt lang="en-GB"> <dfn>colour</dfn> </dt>
 <dd> A sensation which (in humans) derives from the ability of
 the fine structure of the eye to distinguish three differently
 filtered analyses of a view. </dd>
</dl>
```

The following example illustrates the use of the `dl` element to mark up metadata of sorts. At the end of the example, one group has two metadata labels ("Authors" and "Editors") and two values ("Robert Rothman" and "Daniel Jackson"). This example also uses the`div` element around the groups of `dt` and `dd` element, to aid with styling.

```
<dl>
 <div>
  <dt> Last modified time </dt>
  <dd> 2004-12-23T23:33Z </dd>
 </div>
 <div>
  <dt> Recommended update interval </dt>
  <dd> 60s </dd>
 </div>
 <div>
  <dt> Authors </dt>
  <dt> Editors </dt>
  <dd> Robert Rothman </dd>
  <dd> Daniel Jackson </dd>
 </div>
</dl>
```

The following example shows the `dl` element used to give a set of instructions. The order of the instructions here is important (in the other examples, the order of the blocks was not important).

```
<p>Determine the victory points as follows (use the
first matching case):</p>
<dl>
 <dt> If you have exactly five gold coins </dt>
 <dd> You get five victory points </dd>
 <dt> If you have one or more gold coins, and you have one or more silver coins </dt>
 <dd> You get two victory points </dd>
 <dt> If you have one or more silver coins </dt>
 <dd> You get one victory point </dd>
 <dt> Otherwise </dt>
 <dd> You get no victory points </dd>
</dl>
```

The following snippet shows a `dl` element being used as a glossary. Note the use of `dfn` to indicate the word being defined.

```
<dl>
 <dt><dfn>Apartment</dfn>, n.</dt>
 <dd>An execution context grouping one or more threads with one or
 more COM objects.</dd>
 <dt><dfn>Flat</dfn>, n.</dt>
 <dd>A deflated tire.</dd>
 <dt><dfn>Home</dfn>, n.</dt>
 <dd>The user's login directory.</dd>
</dl>
```

This example uses microdata attributes in a `dl` element, together with the `div` element, to annotate the ice cream desserts at a French restaurant.

```
<dl>
 <div itemscope itemtype="http://schema.org/Product">
  <dt itemprop="name">Café ou Chocolat Liégeois
  <dd itemprop="offers" itemscope itemtype="http://schema.org/Offer">
   <span itemprop="price">3.50</span>
   <data itemprop="priceCurrency" value="EUR">€</data>
  <dd itemprop="description">
   2 boules Café ou Chocolat, 1 boule Vanille, sauce café ou chocolat, chantilly
 </div>

 <div itemscope itemtype="http://schema.org/Product">
  <dt itemprop="name">Américaine
  <dd itemprop="offers" itemscope itemtype="http://schema.org/Offer">
   <span itemprop="price">3.50</span>
   <data itemprop="priceCurrency" value="EUR">€</data>
  <dd itemprop="description">
   1 boule Crème brûlée, 1 boule Vanille, 1 boule Caramel, chantilly
 </div>
</dl>
```

Without the `div` element the markup would need to use the `itemref` attribute to link the data in the `dd` elements with the item, as follows.

```
<dl>
 <dt itemscope itemtype="http://schema.org/Product" itemref="1-offer 1-description">
  <span itemprop="name">Café ou Chocolat Liégeois</span>
 <dd id="1-offer" itemprop="offers" itemscope itemtype="http://schema.org/Offer">
  <span itemprop="price">3.50</span>
  <data itemprop="priceCurrency" value="EUR">€</data>
 <dd id="1-description" itemprop="description">
  2 boules Café ou Chocolat, 1 boule Vanille, sauce café ou chocolat, chantilly

 <dt itemscope itemtype="http://schema.org/Product" itemref="2-offer 2-description">
  <span itemprop="name">Américaine</span>
 <dd id="2-offer" itemprop="offers" itemscope itemtype="http://schema.org/Offer">
  <span itemprop="price">3.50</span>
  <data itemprop="priceCurrency" value="EUR">€</data>
 <dd id="2-description" itemprop="description">
  1 boule Crème brûlée, 1 boule Vanille, 1 boule Caramel, chantilly
</dl>
```

The `dl` element is inappropriate for marking up dialogue. See some examples of how to mark up dialogue.

### 4.4.10 The `dt` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt)

**Categories:** None.
**Contexts:**

Before `dd` or `dt` elements inside `dl` elements.

Before `dd` or `dt` elements inside `div` elements that are children of a `dl` element.
**Content model:** Flow content, but with no `header`, `footer`, sectioning content, or heading content descendants.
**Tag omission:** A `dt` element's end tag can be omitted if the`dt` element is immediately followed by another `dt` element or a`dd` element.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-dt).

[For implementers](https://w3c.github.io/html-aam/#el-dt).
**DOM interface:** Uses `HTMLElement`.

The `dt` element represents the term, or name, part of a term-description group in a description list (`dl` element).

The `dt` element itself, when used in a `dl` element, does not indicate that its contents are a term being defined, but this can be indicated using the`dfn` element.

This example shows a list of frequently asked questions (a FAQ) marked up using the`dt` element for questions and the `dd` element for answers.

```
<article>
 <h1>FAQ</h1>
 <dl>
  <dt>What do we want?</dt>
  <dd>Our data.</dd>
  <dt>When do we want it?</dt>
  <dd>Now.</dd>
  <dt>Where is it?</dt>
  <dd>We are not sure.</dd>
 </dl>
</article>
```

### 4.4.11 The `dd` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd)

**Categories:** None.
**Contexts:**

After `dt` or `dd` elements inside `dl` elements.

After `dt` or `dd` elements inside `div` elements that are children of a `dl` element.
**Content model:** Flow content.
**Tag omission:** A `dd` element's end tag can be omitted if the`dd` element is immediately followed by another `dd` element or a`dt` element, or if there is no more content in the parent element.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-dd).

[For implementers](https://w3c.github.io/html-aam/#el-dd).
**DOM interface:** Uses `HTMLElement`.

The `dd` element represents the description, definition, or value, part of a term-description group in a description list (`dl` element).

A `dl` can be used to define a vocabulary list, like in a dictionary. In the following example, each entry, given by a `dt` with a `dfn`, has several`dd`s, showing the various parts of the definition.

```
<dl>
 <dt><dfn>happiness</dfn></dt>
 <dd class="pronunciation">/ˈhæpinəs/</dd>
 <dd class="part-of-speech"><i><abbr>n.</abbr></i></dd>
 <dd>The state of being happy.</dd>
 <dd>Good fortune; success. <q>Oh <b>happiness</b>! It worked!</q></dd>
 <dt><dfn>rejoice</dfn></dt>
 <dd class="pronunciation">/rɪˈdʒɔɪs/</dd>
 <dd><i class="part-of-speech"><abbr>v.intr.</abbr></i> To be delighted oneself.</dd>
 <dd><i class="part-of-speech"><abbr>v.tr.</abbr></i> To cause one to be delighted.</dd>
</dl>
```

### 4.4.12 The `figure` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure)

**Categories:**

Flow content.

Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Either: one `figcaption` element followed by flow content.

Or: flow content followed by one `figcaption` element.

Or: flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-figure).

[For implementers](https://w3c.github.io/html-aam/#el-figure).
**DOM interface:** Uses `HTMLElement`.

The `figure` element represents some flow content, optionally with a caption, that is self-contained (like a complete sentence) and is typicallyreferenced as a single unit from the main flow of the document.

"Self-contained" in this context does not necessarily mean independent. For example, each sentence in a paragraph is self-contained; an image that is part of a sentence would be inappropriate for `figure`, but an entire sentence made of images would be fitting.

The element can thus be used to annotate illustrations, diagrams, photos, code listings, etc.

When a `figure` is referred to from the main content of the document by identifying it by its caption (e.g., by figure number), it enables such content to be easily moved away from that primary content, e.g., to the side of the page, to dedicated pages, or to an appendix, without affecting the flow of the document.

If a `figure` element is referenced by its relative position, e.g., "in the photograph above" or "as the next figure shows", then moving the figure would disrupt the page's meaning. Authors are encouraged to consider using labels to refer to figures, rather than using such relative references, so that the page can easily be restyled without affecting the page's meaning.

The first `figcaption` element child of the element, if any, represents the caption of the `figure` element's contents. If there is no child`figcaption` element, then there is no caption.

A `figure` element's contents are part of the surrounding flow. If the purpose of the page is to display the figure, for example a photograph on an image sharing site, the`figure` and `figcaption` elements can be used to explicitly provide a caption for that figure. For content that is only tangentially related, or that serves a separate purpose than the surrounding flow, the `aside` element should be used (and can itself wrap a `figure`). For example, a pull quote that repeats content from an`article` would be more appropriate in an `aside` than in a`figure`, because it isn't part of the content, it's a repetition of the content for the purposes of enticing readers or highlighting key topics.

This example shows the `figure` element to mark up a code listing.

```
<p>In <a href="#l4">listing 4</a> we see the primary core interface
API declaration.</p>
<figure id="l4">
 <figcaption>Listing 4. The primary core interface API declaration.</figcaption>
 <pre><code>interface PrimaryCore {
 boolean verifyDataLine();
 undefined sendData(sequence&lt;byte> data);
 undefined initSelfDestruct();
}</code></pre>
</figure>
<p>The API is designed to use UTF-8.</p>
```

Here we see a `figure` element to mark up a photo that is the main content of the page (as in a gallery).

```
<!DOCTYPE HTML>
<html lang="en">
<title>Bubbles at work — My Gallery™</title>
<figure>
 <img src="bubbles-work.jpeg"
      alt="Bubbles, sitting in his office chair, works on his
           latest project intently.">
 <figcaption>Bubbles at work</figcaption>
</figure>
<nav><a href="19414.html">Prev</a> — <a href="19416.html">Next</a></nav>
```

In this example, we see an image that is _not_ a figure, as well as an image and a video that are. The first image is literally part of the example's second sentence, so it's not a self-contained unit, and thus `figure` would be inappropriate.

```
<h2>Malinko's comics</h2>

<p>This case centered on some sort of "intellectual property"
infringement related to a comic (see Exhibit A). The suit started
after a trailer ending with these words:

<blockquote>
 <img src="promblem-packed-action.png" alt="ROUGH COPY! Promblem-Packed Action!">
</blockquote>

<p>...was aired. A lawyer, armed with a Bigger Notebook, launched a
preemptive strike using snowballs. A complete copy of the trailer is
included with Exhibit B.

<figure>
 <img src="ex-a.png" alt="Two squiggles on a dirty piece of paper.">
 <figcaption>Exhibit A. The alleged <cite>rough copy</cite> comic.</figcaption>
</figure>

<figure>
 <video src="ex-b.mov"></video>
 <figcaption>Exhibit B. The <cite>Rough Copy</cite> trailer.</figcaption>
</figure>

<p>The case was resolved out of court.
```

Here, a part of a poem is marked up using `figure`.

```
<figure>
 <p>'Twas brillig, and the slithy toves<br>
 Did gyre and gimble in the wabe;<br>
 All mimsy were the borogoves,<br>
 And the mome raths outgrabe.</p>
 <figcaption><cite>Jabberwocky</cite> (first verse). Lewis Carroll, 1832-98</figcaption>
</figure>
```

In this example, which could be part of a much larger work discussing a castle, nested`figure` elements are used to provide both a group caption and individual captions for each figure in the group:

```
<figure>
 <figcaption>The castle through the ages: 1423, 1858, and 1999 respectively.</figcaption>
 <figure>
  <figcaption>Etching. Anonymous, ca. 1423.</figcaption>
  <img src="castle1423.jpeg" alt="The castle has one tower, and a tall wall around it.">
 </figure>
 <figure>
  <figcaption>Oil-based paint on canvas. Maria Towle, 1858.</figcaption>
  <img src="castle1858.jpeg" alt="The castle now has two towers and two walls.">
 </figure>
 <figure>
  <figcaption>Film photograph. Peter Jankle, 1999.</figcaption>
  <img src="castle1999.jpeg" alt="The castle lies in ruins, the original tower all that remains in one piece.">
 </figure>
</figure>
```

The previous example could also be more succinctly written as follows (using `title` attributes in place of the nested`figure`/`figcaption` pairs):

```
<figure>
 <img src="castle1423.jpeg" title="Etching. Anonymous, ca. 1423."
      alt="The castle has one tower, and a tall wall around it.">
 <img src="castle1858.jpeg" title="Oil-based paint on canvas. Maria Towle, 1858."
      alt="The castle now has two towers and two walls.">
 <img src="castle1999.jpeg" title="Film photograph. Peter Jankle, 1999."
      alt="The castle lies in ruins, the original tower all that remains in one piece.">
 <figcaption>The castle through the ages: 1423, 1858, and 1999 respectively.</figcaption>
</figure>
```

The figure is sometimes referenced only implicitly from the content:

```
<article>
 <h1>Fiscal negotiations stumble in Congress as deadline nears</h1>
 <figure>
  <img src="obama-reid.jpeg" alt="Obama and Reid sit together smiling in the Oval Office.">
  <figcaption>Barack Obama and Harry Reid. White House press photograph.</figcaption>
 </figure>
 <p>Negotiations in Congress to end the fiscal impasse sputtered on Tuesday, leaving both chambers
 grasping for a way to reopen the government and raise the country's borrowing authority with a
 Thursday deadline drawing near.</p>
 ...
</article>
```

### 4.4.13 The `figcaption` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption)

**Categories:** None.
**Contexts:** As the first or last child of a `figure` element.
**Content model:** Flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-figcaption).

[For implementers](https://w3c.github.io/html-aam/#el-figcaption).
**DOM interface:** Uses `HTMLElement`.

The `figcaption` element represents a caption or legend for the rest of the contents of the `figcaption` element's parent `figure` element, if any.

The element can contain additional information about the source:

```
<figcaption>
 <p>A duck.</p>
 <p><small>Photograph courtesy of 🌟 News.</small></p>
</figcaption>
```

```
<figcaption>
 <p>Average rent for 3-room apartments, excluding non-profit apartments</p>
 <p>Zürich’s Statistics Office — <time datetime=2017-11-14>14 November 2017</time></p>
</figcaption>
```

### 4.4.14 The `main` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main)

**Categories:**

Flow content.

Palpable content.
**Contexts:** Where flow content is expected, but only if it is a hierarchically correctmain element.
**Content model:** Flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-main).

[For implementers](https://w3c.github.io/html-aam/#el-main).
**DOM interface:** Uses `HTMLElement`.

The `main` element represents the dominant contents of the document.

A document must not have more than one `main` element that does not have the `hidden` attribute specified.

A hierarchically correct `main` element is one whose ancestor elements are limited to `html`, `body`, `div`, `form` without an [accessible name](https://w3c.github.io/aria/#dfn-accessible-name), and autonomous custom elements. Each `main` element must be ahierarchically correct main element.

In this example, the author has used a presentation where each component of the page is rendered in a box. To wrap the main content of the page (as opposed to the header, the footer, the navigation bar, and a sidebar), the `main` element is used.

```
<!DOCTYPE html>
<html lang="en">
<title>RPG System 17</title>
<style>
 header, nav, aside, main, footer {
   margin: 0.5em; border: thin solid; padding: 0.5em;
   background: #EFF; color: black; box-shadow: 0 0 0.25em #033;
 }
 h1, h2, p { margin: 0; }
 nav, main { float: left; }
 aside { float: right; }
 footer { clear: both; }
</style>
<header>
 <h1>System Eighteen</h1>
</header>
<nav>
 <a href="../16/">← System 17</a>
 <a href="../18/">RPXIX →</a>
</nav>
<aside>
 <p>This system has no HP mechanic, so there's no healing.
</aside>
<main>
 <h2>Character creation</h2>
 <p>Attributes (magic, strength, agility) are purchased at the cost of one point per level.</p>
 <h2>Rolls</h2>
 <p>Each encounter, roll the dice for all your skills. If you roll more than the opponent, you win.</p>
</main>
<footer>
 <p>Copyright © 2013
</footer>
</html>
```

In the following example, multiple `main` elements are used and script is used to make navigation work without a server roundtrip and to set the `hidden` attribute on those that are not current:

```
<!doctype html>
<html lang=en-CA>
<meta charset=utf-8>
<title> … </title>
<link rel=stylesheet href=spa.css>
<script src=spa.js async></script>
<nav>
 <a href=/>Home</a>
 <a href=/about>About</a>
 <a href=/contact>Contact</a>
</nav>
<main>
 <h1>Home</h1>
 …
</main>
<main hidden>
 <h1>About</h1>
 …
</main>
<main hidden>
 <h1>Contact</h1>
 …
</main>
<footer>Made with ❤️ by <a href=https://example.com/>Example 👻</a>.</footer>
```

### 4.4.15 The `search` element

> [MDN ⚠](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search)

No support in current engines.

FirefoxNoSafariNoChromeNo

---

OperaNoEdgeNo

---

Edge (Legacy)NoInternet ExplorerNo

---

Firefox Android?Safari iOS?Chrome AndroidNoWebView Android?Samsung Internet?Opera Android?

**Categories:**

Flow content.

Palpable content.
**Contexts:** Where flow content is expected.
**Content model:** Flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-search).

[For implementers](https://w3c.github.io/html-aam/#el-search).
**DOM interface:** Uses `HTMLElement`.

The `search` element represents a part of a document or application that contains a set of form controls or other content related to performing a search or filtering operation. This could be a search of the web site or application; a way of searching or filtering search results on the current web page; or a global or Internet-wide search function.

It's not appropriate to use the `search` element just for presenting search results, though suggestions and links as part of "quick search" results can be included as part of a search feature. Rather, a returned web page of search results would instead be expected to be presented as part of the main content of that web page.

In the following example, the author is including a search form within the`header` of the web page:

```
<header>
  <h1><a href="/">My fancy blog</a></h1>
  ...
  <search>
    <form action="search.php">
      <label for="query">Find an article</label>
      <input id="query" name="q" type="search">
      <button type="submit">Go!</button>
    </form>
  </search>
</header>
```

In this example, the author has implemented their web application's search functionality entirely with JavaScript. There is no use of the `form` element to perform server-side submission, but the containing `search` element semantically identifies the purpose of the descendant content as representing search capabilities.

```
<search>
  <label>
    Find and filter your query
    <input type="search" id="query">
  </label>
  <label>
    <input type="checkbox" id="exact-only">
    Exact matches only
  </label>

  <section>
    <h3>Results found:</h3>
    <ul id="results">
      <li>
        <p><a href="services/consulting">Consulting services</a></p>
        <p>
          Find out how can we help you improve your business with our integrated consultants, Bob and Bob.
        </p>
      </li>
      ...
    </ul>
    <!--
      when a query returns or filters out all results
      render the no results message here
    -->
    <output id="no-results"></output>
  </section>
</search>
```

In the following example, the page has two search features. The first is located in the web page's`header` and serves as a global mechanism to search the web site's content. Its purpose is indicated by its specified `title` attribute. The second is included as part of the main content of the page, as it represents a mechanism to search and filter the content of the current page. It contains a heading to indicate its purpose.

```
<body>
  <header>
    ...
    <search title="Website">
      ...
    </search>
  </header>
  <main>
    <h1>Hotels near your location</h1>
     <search>
       <h2>Filter results</h2>
       ...
     </search>
     <article>
      <!-- search result content -->
    </article>
  </main>
</body>
```

### 4.4.16 The `div` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div)

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDivElement)

**Categories:** Flow content.

Palpable content.

select element inner content elements.

optgroup element inner content elements.

option element inner content elements.
**Contexts:**

Where flow content is expected.

As a child of a `dl` element.
**Content model:** If the element is a child of a `dl` element: One or more `dt` elements followed by one or more `dd` elements, optionally intermixed with script-supporting elements.

Otherwise, if the element is a descendant of an `option` element: Zero or moreoption element inner content elements.

Otherwise, if the element is a descendant of an `optgroup` element: Zero or moreoptgroup element inner content elements.

Otherwise, if the element is a descendant of a `select` element: Zero or moreselect element inner content elements.

Otherwise: flow content.
**Tag omission:** Neither tag is omissible.
**Attributes:** Global attributes
**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-div).

[For implementers](https://w3c.github.io/html-aam/#el-div).
**DOM interface:**

```
[Exposed=Window]
interface HTMLDivElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};
```

The `div` element has no special meaning at all. It represents its children. It can be used with the `class`, `lang`, and `title` attributes to mark up semantics common to a group of consecutive elements. It can also be used in a `dl` element, wrapping groups of `dt` and `dd` elements.

Authors are strongly encouraged to view the `div` element as an element of last resort, for when no other element is suitable. Use of more appropriate elements instead of the `div` element leads to better accessibility for readers and easier maintainability for authors.

For example, a blog post would be marked up using `article`, a chapter using`section`, a page's navigation aids using `nav`, and a group of form controls using `fieldset`.

On the other hand, `div` elements can be useful for stylistic purposes or to wrap multiple paragraphs within a section that are all to be annotated in a similar way. In the following example, we see `div` elements used as a way to set the language of two paragraphs at once, instead of setting the language on the two paragraph elements separately:

```
<article lang="en-US">
 <h1>My use of language and my cats</h1>
 <p>My cat's behavior hasn't changed much since her absence, except
 that she plays her new physique to the neighbors regularly, in an
 attempt to get pets.</p>
 <div lang="en-GB">
  <p>My other cat, coloured black and white, is a sweetie. He followed
  us to the pool today, walking down the pavement with us. Yesterday
  he apparently visited our neighbours. I wonder if he recognises that
  their flat is a mirror image of ours.</p>
  <p>Hm, I just noticed that in the last paragraph I used British
  English. But I'm supposed to write in American English. So I
  shouldn't say "pavement" or "flat" or "colour"...</p>
 </div>
 <p>I should say "sidewalk" and "apartment" and "color"!</p>
</article>
```
