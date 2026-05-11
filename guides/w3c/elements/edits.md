# HTML Standard — §4.7 Edits

> Source: <https://html.spec.whatwg.org/multipage/edits.html#edits>

## Contents

- [4.7.1 The `ins` element](#471-the-ins-element)
- [4.7.2 The `del` element](#472-the-del-element)
- [4.7.3 Attributes common to `ins` and `del` elements](#473-attributes-common-to-ins-and-del-elements)
- [4.7.4 Edits and paragraphs](#474-edits-and-paragraphs)
- [4.7.5 Edits and lists](#475-edits-and-lists)
- [4.7.6 Edits and tables](#476-edits-and-tables)

---

## 4.7 Edits

The `ins` and `del` elements represent edits to the document.

### 4.7.1 The `ins` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins)

**Categories:** Flow content, Phrasing content, Palpable content.

**Contexts:** Where phrasing content is expected.

**Content model:** Transparent.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `cite` — link to the source of the quotation or more information about the edit; `datetime` — date and (optionally) time of the change.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-ins).

[For implementers](https://w3c.github.io/html-aam/#el-ins).

**DOM interface:** Uses `HTMLModElement`.

The `ins` element represents an addition to the document.

The following represents the addition of a single paragraph:

```
<aside>
 <ins>
  <p> I like fruit. </p>
 </ins>
</aside>
```

As does the following, because everything in the `aside` element here counts asphrasing content and therefore there is just one paragraph:

```
<aside>
 <ins>
  Apples are <em>tasty</em>.
 </ins>
 <ins>
  So are pears.
 </ins>
</aside>
```

`ins` elements should not cross implied paragraph boundaries.

The following example represents the addition of two paragraphs, the second of which was inserted in two parts. The first `ins` element in this example thus crosses a paragraph boundary, which is considered poor form.

```
<aside>
 <!-- don't do this -->
 <ins datetime="2005-03-16 00:00Z">
  <p> I like fruit. </p>
  Apples are <em>tasty</em>.
 </ins>
 <ins datetime="2007-12-19 00:00Z">
  So are pears.
 </ins>
</aside>
```

Here is a better way of marking this up. It uses more elements, but none of the elements cross implied paragraph boundaries.

```
<aside>
 <ins datetime="2005-03-16 00:00Z">
  <p> I like fruit. </p>
 </ins>
 <ins datetime="2005-03-16 00:00Z">
  Apples are <em>tasty</em>.
 </ins>
 <ins datetime="2007-12-19 00:00Z">
  So are pears.
 </ins>
</aside>
```

### 4.7.2 The `del` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del)

**Categories:** Flow content, Phrasing content, Palpable content.

**Contexts:** Where phrasing content is expected.

**Content model:** Transparent.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes; `cite` — link to the source of the quotation or more information about the edit; `datetime` — date and (optionally) time of the change.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-del).

[For implementers](https://w3c.github.io/html-aam/#el-del).

**DOM interface:** Uses `HTMLModElement`.

The `del` element represents a removal from the document.

`del` elements should not cross implied paragraph boundaries.

The following shows a "to do" list where items that have been done are crossed-off with the date and time of their completion.

```
<h1>To Do</h1>
<ul>
 <li>Empty the dishwasher</li>
 <li><del datetime="2009-10-11T01:25-07:00">Watch Walter Lewin's lectures</del></li>
 <li><del datetime="2009-10-10T23:38-07:00">Download more tracks</del></li>
 <li>Buy a printer</li>
</ul>
```

### 4.7.3 Attributes common to `ins` and `del` elements

The `cite` attribute may be used to specify the [URL](https://dom.spec.whatwg.org/#concept-document-url) of a document that explains the change. When that document is long, for instance the minutes of a meeting, authors are encouraged to include a [fragment](https://url.spec.whatwg.org/#concept-url-fragment) pointing to the specific part of that document that discusses the change.

If the `cite` attribute is present, it must be a valid URL potentially surrounded by spaces that explains the change. To obtain the corresponding citation link, the value of the attribute must be parsed relative to the element's [node document](https://dom.spec.whatwg.org/#concept-node-document). User agents may allow users to follow such citation links, but they are primarily intended for private use (e.g., by server-side scripts collecting statistics about a site's edits), not for readers.

The `datetime` attribute may be used to specify the time and date of the change.

If present, the `datetime` attribute's value must be avalid date string with optional time.

User agents must parse the `datetime` attribute according to the parse a date or time string algorithm. If that doesn't return a date or a global date and time, then the modification has no associated timestamp (the value is non-conforming; it is not avalid date string with optional time). Otherwise, the modification is marked as having been made at the given date or global date and time. If the given value is a global date and time, then user agents should use the associated time-zone offset information to determine which time zone to present the given datetime in.

This value may be shown to the user, but it is primarily intended for private use.

The `ins` and `del` elements must implement the`HTMLModElement` interface:

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLModElement)

```
[Exposed=Window]
interface HTMLModElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, ReflectURL] attribute USVString cite;
  [CEReactions, Reflect] attribute DOMString dateTime;
};
```

### 4.7.4 Edits and paragraphs

_This section is non-normative._

Since the `ins` and `del` elements do not affect paragraphing, it is possible, in some cases where paragraphs are implied (without explicit `p` elements), for an`ins` or `del` element to span both an entire paragraph or other non-phrasing content elements and part of another paragraph. For example:

```
<section>
 <ins>
  <p>
   This is a paragraph that was inserted.
  </p>
  This is another paragraph whose first sentence was inserted
  at the same time as the paragraph above.
 </ins>
 This is a second sentence, which was there all along.
</section>
```

By only wrapping some paragraphs in `p` elements, one can even get the end of one paragraph, a whole second paragraph, and the start of a third paragraph to be covered by the same`ins` or `del` element (though this is very confusing, and not considered good practice):

```
<section>
 This is the first paragraph. <ins>This sentence was
 inserted.
 <p>This second paragraph was inserted.</p>
 This sentence was inserted too.</ins> This is the
 third paragraph in this example.
 <!-- (don't do this) -->
</section>
```

However, due to the way implied paragraphs are defined, it is not possible to mark up the end of one paragraph and the start of the very next one using the same`ins` or `del` element. You instead have to use one (or two) `p` element(s) and two `ins` or `del` elements, as for example:

```
<section>
 <p>This is the first paragraph. <del>This sentence was
 deleted.</del></p>
 <p><del>This sentence was deleted too.</del> That
 sentence needed a separate &lt;del&gt; element.</p>
</section>
```

Partly because of the confusion described above, authors are strongly encouraged to always mark up all paragraphs with the `p` element, instead of having `ins` or`del` elements that cross implied paragraphs boundaries.

### 4.7.5 Edits and lists

_This section is non-normative._

The content models of the `ol` and `ul` elements do not allow`ins` and `del` elements as children. Lists always represent all their items, including items that would otherwise have been marked as deleted.

To indicate that an item is inserted or deleted, an `ins` or `del` element can be wrapped around the contents of the `li` element. To indicate that an item has been replaced by another, a single `li` element can have one or more`del` elements followed by one or more `ins` elements.

In the following example, a list that started empty had items added and removed from it over time. The bits in the example that have been emphasized show the parts that are the "current" state of the list. The list item numbers don't take into account the edits, though.

```
<h1>Stop-ship bugs</h1>
<ol>
 <li><ins datetime="2008-02-12T15:20Z">Bug 225:
 Rain detector doesn't work in snow</ins></li>
 <li><del datetime="2008-03-01T20:22Z"><ins datetime="2008-02-14T12:02Z">Bug 228:
 Water buffer overflows in April</ins></del></li>
 <li><ins datetime="2008-02-16T13:50Z">Bug 230:
 Water heater doesn't use renewable fuels</ins></li>
 <li><del datetime="2008-02-20T21:15Z"><ins datetime="2008-02-16T14:25Z">Bug 232:
 Carbon dioxide emissions detected after startup</ins></del></li>
</ol>
```

In the following example, a list that started with just fruit was replaced by a list with just colors.

```
<h1>List of <del>fruits</del><ins>colors</ins></h1>
<ul>
 <li><del>Lime</del><ins>Green</ins></li>
 <li><del>Apple</del></li>
 <li>Orange</li>
 <li><del>Pear</del></li>
 <li><ins>Teal</ins></li>
 <li><del>Lemon</del><ins>Yellow</ins></li>
 <li>Olive</li>
 <li><ins>Purple</ins></li>
</ul>
```

### 4.7.6 Edits and tables

_This section is non-normative._

The elements that form part of the table model have complicated content model requirements that do not allow for the `ins` and `del` elements, so indicating edits to a table can be difficult.

To indicate that an entire row or an entire column has been added or removed, the entire contents of each cell in that row or column can be wrapped in `ins` or `del` elements (respectively).

Here, a table's row has been added:

```
<table>
 <thead>
  <tr> <th> Game name           <th> Game publisher   <th> Verdict
 <tbody>
  <tr> <td> Diablo 2            <td> Blizzard         <td> 8/10
  <tr> <td> Portal              <td> Valve            <td> 10/10
  <tr> <td> <ins>Portal 2</ins> <td> <ins>Valve</ins> <td> <ins>10/10</ins>
</table>
```

Here, a column has been removed (the time at which it was removed is given also, as is a link to the page explaining why):

```
<table>
 <thead>
  <tr> <th> Game name           <th> Game publisher   <th> <del cite="/edits/r192" datetime="2011-05-02 14:23Z">Verdict</del>
 <tbody>
  <tr> <td> Diablo 2            <td> Blizzard         <td> <del cite="/edits/r192" datetime="2011-05-02 14:23Z">8/10</del>
  <tr> <td> Portal              <td> Valve            <td> <del cite="/edits/r192" datetime="2011-05-02 14:23Z">10/10</del>
  <tr> <td> Portal 2            <td> Valve            <td> <del cite="/edits/r192" datetime="2011-05-02 14:23Z">10/10</del>
</table>
```

Generally speaking, there is no good way to indicate more complicated edits (e.g. that a cell was removed, moving all subsequent cells up or to the left).
