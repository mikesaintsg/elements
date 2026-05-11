# HTML Standard — §4.3 Sections

> Source: <https://html.spec.whatwg.org/multipage/sections.html#sections>

## Contents

- [4.3.1 The `body` element](#431-the-body-element)
- [4.3.2 The `article` element](#432-the-article-element)
- [4.3.3 The `section` element](#433-the-section-element)
- [4.3.4 The `nav` element](#434-the-nav-element)
- [4.3.5 The `aside` element](#435-the-aside-element)
- [4.3.6 The `h1`–`h6` elements](#436-the-h1-h2-h3-h4-h5-and-h6-elements)
- [4.3.7 The `hgroup` element](#437-the-hgroup-element)
- [4.3.8 The `header` element](#438-the-header-element)
- [4.3.9 The `footer` element](#439-the-footer-element)
- [4.3.10 The `address` element](#4310-the-address-element)
- [4.3.11 Headings and outlines](#4311-headings-and-outlines)
- [4.3.11.1 Heading levels & offsets](#43111-heading-levels--offsets)
- [4.3.11.2 Sample outlines](#43112-sample-outlines)
- [4.3.11.3 Exposing outlines to users](#43113-exposing-outlines-to-users)
- [4.3.12 Usage summary](#4312-usage-summary)
- [4.3.12.1 Article or section?](#43121-article-or-section)

---

## 4.3 Sections

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Introduction%5Fto%5FHTML/Document%5Fand%5Fwebsite%5Fstructure#HTML%5Ffor%5Fstructuring%5Fcontent)

### 4.3.1 The `body` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body) � [HTMLBodyElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLBodyElement)

**Categories:** None.

**Contexts:** As the second element in an `html` element.

**Content model:** Flow content.

**Tag omission:**

A `body` element's start tag can be omitted if the element is empty, or if the first thing inside the `body` element is not [ASCII whitespace](https://infra.spec.whatwg.org/#ascii-whitespace) or a comment, except if the first thing inside the `body` element is a `meta`, `noscript`, `link`, `script`, `style`, or `template` element.

A `body` element's end tag can be omitted if the `body` element is not immediately followed by a comment.

**Attributes:** Global attributes; `onafterprint`, `onbeforeprint`, `onbeforeunload`, `onhashchange`, `onlanguagechange`, `onmessage`, `onmessageerror`, `onoffline`, `ononline`, `onpageswap`, `onpagehide`, `onpagereveal`, `onpageshow`, `onpopstate`, `onrejectionhandled`, `onstorage`, `onunhandledrejection`, `onunload`.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-body).

[For implementers](https://w3c.github.io/html-aam/#el-body).

**DOM interface:**

```
[Exposed=Window]
interface HTMLBodyElement : HTMLElement {
  [HTMLConstructor] constructor();

  // also has obsolete members
};

HTMLBodyElement includes WindowEventHandlers;
```

The `body` element represents the contents of the document.

In conforming documents, there is only one `body` element. The `document.body` IDL attribute provides scripts with easy access to a document's `body` element.

Some DOM operations (for example, parts of the drag and drop model) are defined in terms of "the body element". This refers to a particular element in the DOM, as per the definition of the term, and not any arbitrary `body` element.

The `body` element exposes as event handler content attributes a number of the event handlers of the `Window` object. It also mirrors theirevent handler IDL attributes.

The event handlers of the `Window` object named by theWindow\-reflecting body element event handler set, exposed on the`body` element, replace the generic event handlers with the same names normally supported by HTML elements.

Thus, for example, a bubbling `error` event dispatched on a child of the body element of a `Document` would first trigger the `onerror` event handler content attributes of that element, then that of the root `html` element, and only*then* would it trigger the `onerror` event handler content attribute on the`body` element. This is because the event would bubble from the target, to the`body`, to the `html`, to the `Document`, to the`Window`, and the event handler on the`body` is watching the `Window` not the `body`. A regular event listener attached to the `body` using `addEventListener()`, however, would be run when the event bubbled through the `body` and not when it reaches the `Window` object.

This page updates an indicator to show whether or not the user is online:

```
<!DOCTYPE HTML>
<html lang="en">
 <head>
  <title>Online or offline?</title>
  <script>
   function update(online) {
     document.getElementById('status').textContent =
       online ? 'Online' : 'Offline';
   }
  </script>
 </head>
 <body ononline="update(true)"
       onoffline="update(false)"
       onload="update(navigator.onLine)">
  <p>You are: <span id="status">(Unknown)</span></p>
 </body>
</html>
```

### 4.3.2 The `article` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article)

**Categories:** Flow content, Sectioning content, Palpable content.

**Contexts:** Where sectioning content is expected.

**Content model:** Flow content.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-article).

[For implementers](https://w3c.github.io/html-aam/#el-article).

**DOM interface:** Uses `HTMLElement`.

The `article` element represents a complete, or self-contained, composition in a document, page, application, or site and that is, in principle, independently distributable or reusable, e.g. in syndication. This could be a forum post, a magazine or newspaper article, a blog entry, a user-submitted comment, an interactive widget or gadget, or any other independent item of content.

When `article` elements are nested, the inner `article` elements represent articles that are in principle related to the contents of the outer article. For instance, a blog entry on a site that accepts user-submitted comments could represent the comments as `article` elements nested within the `article` element for the blog entry.

Author information associated with an `article` element (q.v. the`address` element) does not apply to nested `article` elements.

When used specifically with content to be redistributed in syndication, the`article` element is similar in purpose to the `entry` element in Atom. [\[ATOM\]](references.html#refsATOM)

The schema.org microdata vocabulary can be used to provide the publication date for an `article` element, using one of the CreativeWork subtypes.

When the main content of the page (i.e. excluding footers, headers, navigation blocks, and sidebars) is all one single self-contained composition, that content may be marked with an`article`, but it is technically redundant in that case (since it's self-evident that the page is a single composition, as it is a single document).

This example shows a blog post using the `article` element, with some schema.org annotations:

```
<article itemscope itemtype="http://schema.org/BlogPosting">
 <header>
  <h2 itemprop="headline">The Very First Rule of Life</h2>
  <p><time itemprop="datePublished" datetime="2009-10-09">3 days ago</time></p>
  <link itemprop="url" href="?comments=0">
 </header>
 <p>If there's a microphone anywhere near you, assume it's hot and
 sending whatever you're saying to the world. Seriously.</p>
 <p>...</p>
 <footer>
  <a itemprop="discussionUrl" href="?comments=1">Show comments...</a>
 </footer>
</article>
```

Here is that same blog post, but showing some of the comments:

```
<article itemscope itemtype="http://schema.org/BlogPosting">
 <header>
  <h2 itemprop="headline">The Very First Rule of Life</h2>
  <p><time itemprop="datePublished" datetime="2009-10-09">3 days ago</time></p>
  <link itemprop="url" href="?comments=0">
 </header>
 <p>If there's a microphone anywhere near you, assume it's hot and
 sending whatever you're saying to the world. Seriously.</p>
 <p>...</p>
 <section>
  <h1>Comments</h1>
  <article itemprop="comment" itemscope itemtype="http://schema.org/Comment" id="c1">
   <link itemprop="url" href="#c1">
   <footer>
    <p>Posted by: <span itemprop="creator" itemscope itemtype="http://schema.org/Person">
     <span itemprop="name">George Washington</span>
    </span></p>
    <p><time itemprop="dateCreated" datetime="2009-10-10">15 minutes ago</time></p>
   </footer>
   <p>Yeah! Especially when talking about your lobbyist friends!</p>
  </article>
  <article itemprop="comment" itemscope itemtype="http://schema.org/Comment" id="c2">
   <link itemprop="url" href="#c2">
   <footer>
    <p>Posted by: <span itemprop="creator" itemscope itemtype="http://schema.org/Person">
     <span itemprop="name">George Hammond</span>
    </span></p>
    <p><time itemprop="dateCreated" datetime="2009-10-10">5 minutes ago</time></p>
   </footer>
   <p>Hey, you have the same first name as me.</p>
  </article>
 </section>
</article>
```

Notice the use of `footer` to give the information for each comment (such as who wrote it and when): the `footer` element _can_ appear at the start of its section when appropriate, such as in this case. (Using `header` in this case wouldn't be wrong either; it's mostly a matter of authoring preference.)

In this example, `article` elements are used to host widgets on a portal page. The widgets are implemented as customized built-in elements in order to get specific styling and scripted behavior.

```
<!DOCTYPE HTML>
<html lang=en>
<title>eHome Portal</title>
<script src="/scripts/widgets.js"></script>
<link rel=stylesheet href="/styles/main.css">
<article is="stock-widget">
 <h2>Stocks</h2>
 <table>
  <thead> <tr> <th> Stock <th> Value <th> Delta
  <tbody> <template> <tr> <td> <td> <td> </template>
 </table>
 <p> <input type=button value="Refresh" onclick="this.parentElement.refresh()">
</article>
<article is="news-widget">
 <h2>News</h2>
 <ul>
  <template>
   <li>
    <p><img> <strong></strong>
    <p>
  </template>
 </ul>
 <p> <input type=button value="Refresh" onclick="this.parentElement.refresh()">
</article>
```

### 4.3.3 The `section` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section)

**Categories:** Flow content, Sectioning content, Palpable content.

**Contexts:** Where sectioning content is expected.

**Content model:** Flow content.

**Tag omission:** Neither tag is omissible.

**Attributes:** Global attributes.

**Accessibility:**

[For authors](https://w3c.github.io/html-aria/#el-section).

[For implementers](https://w3c.github.io/html-aam/#el-section).

**DOM interface:** Uses `HTMLElement`.

The `section` element represents a generic section of a document or application. A section, in this context, is a thematic grouping of content, typically with a heading.

Examples of sections would be chapters, the various tabbed pages in a tabbed dialog box, or the numbered sections of a thesis. A web site's home page could be split into sections for an introduction, news items, and contact information.

Authors are encouraged to use the `article` element instead of the`section` element when it would make sense to syndicate the contents of the element.

The `section` element is not a generic container element. When an element is needed only for styling purposes or as a convenience for scripting, authors are encouraged to use the `div` element instead. A general rule is that the `section` element is appropriate only if the element's contents would be listed explicitly in the document's outline.

In the following example, we see an article (part of a larger web page) about apples, containing two short sections.

```
<article>
 <hgroup>
  <h2>Apples</h2>
  <p>Tasty, delicious fruit!</p>
 </hgroup>
 <p>The apple is the pomaceous fruit of the apple tree.</p>
 <section>
  <h3>Red Delicious</h3>
  <p>These bright red apples are the most common found in many
  supermarkets.</p>
 </section>
 <section>
  <h3>Granny Smith</h3>
  <p>These juicy, green apples make a great filling for
  apple pies.</p>
 </section>
</article>
```

Here is a graduation programme with two sections, one for the list of people graduating, and one for the description of the ceremony. (The markup in this example features an uncommon style sometimes used to minimize the amount of inter-element whitespace.)

```
<!DOCTYPE Html>
<Html Lang=En
 ><Head
   ><Title
     >Graduation Ceremony Summer 2022</Title
   ></Head
 ><Body
   ><H1
     >Graduation</H1
   ><Section
     ><H2
       >Ceremony</H2
     ><P
       >Opening Procession</P
     ><P
       >Speech by Valedictorian</P
     ><P
       >Speech by Class President</P
     ><P
       >Presentation of Diplomas</P
     ><P
       >Closing Speech by Headmaster</P
   ></Section
   ><Section
     ><H2
       >Graduates</H2
     ><Ul
       ><Li
         >Molly Carpenter</Li
       ><Li
         >Anastasia Luccio</Li
       ><Li
         >Ebenezar McCoy</Li
       ><Li
         >Karrin Murphy</Li
       ><Li
         >Thomas Raith</Li
       ><Li
         >Susan Rodriguez</Li
     ></Ul
   ></Section
 ></Body
></Html>
```

In this example, a book author has marked up some sections as chapters and some as appendices, and uses CSS to style the headers in these two classes of section differently.

```
<style>
 section { border: double medium; margin: 2em; }
 section.chapter h2 { font: 2em Roboto, Helvetica Neue, sans-serif; }
 section.appendix h2 { font: small-caps 2em Roboto, Helvetica Neue, sans-serif; }
</style>
<header>
 <hgroup>
  <h1>My Book</h1>
  <p>A sample with not much content</p>
 </hgroup>
 <p><small>Published by Dummy Publicorp Ltd.</small></p>
</header>
<section class="chapter">
 <h2>My First Chapter</h2>
 <p>This is the first of my chapters. It doesn't say much.</p>
 <p>But it has two paragraphs!</p>
</section>
<section class="chapter">
 <h2>It Continues: The Second Chapter</h2>
 <p>Bla dee bla, dee bla dee bla. Boom.</p>
</section>
<section class="chapter">
 <h2>Chapter Three: A Further Example</h2>
 <p>It's not like a battle between brightness and earthtones would go
 unnoticed.</p>
 <p>But it might ruin my story.</p>
</section>
<section class="appendix">
 <h2>Appendix A: Overview of Examples</h2>
 <p>These are demonstrations.</p>
</section>
<section class="appendix">
 <h2>Appendix B: Some Closing Remarks</h2>
 <p>Hopefully this long example shows that you <em>can</em> style
 sections, so long as they are used to indicate actual sections.</p>
</section>
```

### 4.3.4 The `nav` element

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav)
