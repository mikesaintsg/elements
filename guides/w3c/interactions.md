# HTML Standard — §6 User Interaction

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#editing>

## Contents

- [6 User interaction](#6-user-interaction)
  - [6.1 The `hidden` attribute](#61-the-hidden-attribute)
  - [6.2 Page visibility](#62-page-visibility)
    - [6.2.1 The `VisibilityStateEntry` interface](#621-the-visibilitystateentry-interface)
  - [6.3 Inert subtrees](#63-inert-subtrees)
    - [6.3.1 Modal dialogs and inert subtrees](#631-modal-dialogs-and-inert-subtrees)
    - [6.3.2 The `inert` attribute](#632-the-inert-attribute)
  - [6.4 Tracking user activation](#64-tracking-user-activation)
    - [6.4.1 Data model](#641-data-model)
    - [6.4.2 Processing model](#642-processing-model)
    - [6.4.3 APIs gated by user activation](#643-apis-gated-by-user-activation)
    - [6.4.4 The `UserActivation` interface](#644-the-useractivation-interface)
    - [6.4.5 User agent automation](#645-user-agent-automation)
  - [6.5 Activation behavior of elements](#65-activation-behavior-of-elements)
    - [6.5.1 The `ToggleEvent` interface](#651-the-toggleevent-interface)
    - [6.5.2 The `CommandEvent` interface](#652-the-commandevent-interface)
  - [6.6 Focus](#66-focus)
    - [6.6.1 Introduction](#661-introduction)
    - [6.6.2 Data model](#662-data-model)
    - [6.6.3 The `tabindex` attribute](#663-the-tabindex-attribute)
    - [6.6.4 Processing model](#664-processing-model)
    - [6.6.5 Sequential focus navigation](#665-sequential-focus-navigation)
    - [6.6.6 Focus management APIs](#666-focus-management-apis)
    - [6.6.7 The `autofocus` attribute](#667-the-autofocus-attribute)
  - [6.7 Assigning keyboard shortcuts](#67-assigning-keyboard-shortcuts)
    - [6.7.1 Introduction](#671-introduction)
    - [6.7.2 The `accesskey` attribute](#672-the-accesskey-attribute)
    - [6.7.3 Processing model](#673-processing-model)
  - [6.8 Editing](#68-editing)
    - [6.8.1 Making document regions editable: the `contenteditable` content attribute](#681-making-document-regions-editable-the-contenteditable-content-attribute)
    - [6.8.2 Making entire documents editable: the `designMode` getter and setter](#682-making-entire-documents-editable-the-designmode-getter-and-setter)
    - [6.8.3 Best practices for in-page editors](#683-best-practices-for-in-page-editors)
    - [6.8.4 Editing APIs](#684-editing-apis)
    - [6.8.5 Spelling and grammar checking](#685-spelling-and-grammar-checking)
    - [6.8.6 Writing suggestions](#686-writing-suggestions)
    - [6.8.7 Autocapitalization](#687-autocapitalization)
    - [6.8.8 Autocorrection](#688-autocorrection)
    - [6.8.9 Input modalities: the `inputmode` attribute](#689-input-modalities-the-inputmode-attribute)
    - [6.8.10 Input modalities: the `enterkeyhint` attribute](#6810-input-modalities-the-enterkeyhint-attribute)
  - [6.9 Find-in-page](#69-find-in-page)
    - [6.9.1 Introduction](#691-introduction)
    - [6.9.2 Interaction with details and hidden=until-found](#692-interaction-with-details-and-hiddenuntil-found)
    - [6.9.3 Interaction with selection](#693-interaction-with-selection)
  - [6.10 Close requests and close watchers](#610-close-requests-and-close-watchers)
    - [6.10.1 Close requests](#6101-close-requests)
    - [6.10.2 Close watcher infrastructure](#6102-close-watcher-infrastructure)
    - [6.10.3 The `CloseWatcher` interface](#6103-the-closewatcher-interface)

---

## 6 User interaction

### 6.1 The `hidden` attribute

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden)

All HTML elements may have the `hidden` content attribute set. The `hidden` attribute is an enumerated attribute with the following keywords and states:

Keyword

State

Brief description

`hidden`

Hidden

Will not be rendered.

`until-found`

Hidden Until Found

Will not be rendered, but content inside will be accessible to find-in-page and fragment navigation.

The attribute's _missing value default_ is the Not Hidden state, and its _invalid value default_ and _empty value default_ are both the Hidden state.

When an element has the `hidden` attribute in the Hidden state, it indicates that the element is not yet, or is no longer, directly relevant to the page's current state, or that it is being used to declare content to be reused by other parts of the page as opposed to being directly accessed by the user. User agents should not render elements that are in the Hidden state.

The requirement for user agents not to render elements that are in the Hidden state can be implemented indirectly through the style layer. For example, a web browser could implement these requirements using the rules suggested in the Rendering section.

When an element has the `hidden` attribute in the Hidden Until Found state, it indicates that the element is hidden like the Hidden state but the content inside the element will be accessible to find-in-page and fragment navigation. When these features attempt to scroll to a target which is in the element's subtree, the user agent will remove the `hidden` attribute in order to reveal the content before scrolling to it by running the ancestor revealing algorithm on the target node.

Web browsers will use 'content-visibility: hidden' instead of 'display: none' when the `hidden` attribute is in the Hidden Until Found state, as specified in the Rendering section.

Because this attribute is typically implemented using CSS, it's also possible to override it using CSS. For instance, a rule that applies 'display: block' to all elements will cancel the effects of the Hidden state. Authors therefore have to take care when writing their style sheets to make sure that the attribute is still styled as expected. In addition, legacy user agents which don't support the Hidden Until Found state will have 'display: none' instead of 'content-visibility: hidden', so authors are encouraged to make sure that their style sheets don't change the 'display' or 'content-visibility' properties of Hidden Until Found elements.

Since elements with the `hidden` attribute in the Hidden Until Found state use 'content-visibility: hidden' instead of 'display: none', there are two caveats of the Hidden Until Found state that make it different from the Hidden state:

The element needs to be affected by [layout containment](https://drafts.csswg.org/css-contain/#containment-layout) in order to be revealed by find-in-page. This means that if the element in the Hidden Until Found state has a 'display' value of 'none', 'contents', or 'inline', then the element will not be revealed by find-in-page.

The element will still have a [generated box](https://drafts.csswg.org/css2/#propdef-visibility) when in the Hidden Until Found state, which means that borders, margin, and padding will still be rendered around the element.

In the following skeletal example, the attribute is used to hide the web game's main screen until the user logs in:

```
  <h1>The Example Game</h1>
  <section id="login">
   <h2>Login</h2>
   <form>
    ...
    <!-- calls login() once the user's credentials have been checked -->
   </form>
   <script>
    function login() {
      // switch screens
      document.getElementById('login').hidden = true;
      document.getElementById('game').hidden = false;
    }
   </script>
  </section>
  <section id="game" hidden>
   ...
  </section>
```

The `hidden` attribute must not be used to hide content that could legitimately be shown in another presentation. For example, it is incorrect to use `hidden` to hide panels in a tabbed dialog, because the tabbed interface is merely a kind of overflow presentation — one could equally well just show all the form controls in one big page with a scrollbar. It is similarly incorrect to use this attribute to hide content just from one presentation — if something is marked `hidden`, it is hidden from all presentations, including, for instance, screen readers.

Elements that are not themselves `hidden` must nothyperlink to elements that are `hidden`. The `for` attributes of `label` and `output` elements that are not themselves `hidden` must similarly not refer to elements that are`hidden`. In both cases, such references would cause user confusion.

Elements and scripts may, however, refer to elements that are `hidden` in other contexts.

For example, it would be incorrect to use the `href` attribute to link to a section marked with the `hidden` attribute. If the content is not applicable or relevant, then there is no reason to link to it.

It would be fine, however, to use the ARIA `[aria-describedby](https://w3c.github.io/aria/#aria-describedby)` attribute to refer to descriptions that are themselves `hidden`. While hiding the descriptions implies that they are not useful alone, they could be written in such a way that they are useful in the specific context of being referenced from the elements that they describe.

Similarly, a `canvas` element with the `hidden` attribute could be used by a scripted graphics engine as an off-screen buffer, and a form control could refer to a hidden `form` element using its `form` attribute.

Elements in a section hidden by the `hidden` attribute are still active, e.g. scripts and form controls in such sections still execute and submit respectively. Only their presentation to the user changes.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/hidden)

The `hidden` getter steps are:

If the `hidden` attribute is in the Hidden Until Found state, then return "`until-found`".If the `hidden` attribute is set, then return true.

Return false.

The `hidden` setter steps are:

If the given value is a string that is an [ASCII case-insensitive](https://infra.spec.whatwg.org/#ascii-case-insensitive) match for "`until-found`", then set the `hidden` attribute to "`until-found`".Otherwise, if the given value is false, then remove the `hidden` attribute.Otherwise, if the given value is the empty string, then remove the `hidden` attribute.Otherwise, if the given value is null, then remove the `hidden` attribute.Otherwise, if the given value is 0, then remove the `hidden` attribute.Otherwise, if the given value is NaN, then remove the `hidden` attribute.

Otherwise, set the `hidden` attribute to the empty string.

An ancestor reveal pair is a [tuple](https://infra.spec.whatwg.org/#tuple) consisting of a node and a string.

The ancestor revealing algorithm given a node target is:

Let ancestorsToReveal be « ».Let ancestor be target.

While ancestor has a parent node within the [flat tree](https://drafts.csswg.org/css-scoping/#flat-tree):

If ancestor has a `hidden` attribute in theHidden Until Found state, then [append](https://infra.spec.whatwg.org/#list-append) (ancestor, "`until-found`") to ancestorsToReveal.If ancestor is slotted into the second slot of a `details` element which does not have an `open` attribute, then[append](https://infra.spec.whatwg.org/#list-append) (ancestor's parent node, "`details`") to ancestorsToReveal.Set ancestor to the parent node of ancestor within the[flat tree](https://drafts.csswg.org/css-scoping/#flat-tree).

For each (ancestorToReveal, revealType) ofancestorsToReveal:

If ancestorToReveal is not [connected](https://dom.spec.whatwg.org/#connected), then return.

If revealType is "`until-found`":

If ancestorToReveal's `hidden` attribute is not in the Hidden Until Found state, then return.[Fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `beforematch` at ancestorToReveal with the `[bubbles](https://dom.spec.whatwg.org/#dom-event-bubbles)` attribute initialized to true.If ancestorToReveal is not [connected](https://dom.spec.whatwg.org/#connected), then return.If ancestorToReveal's `hidden` attribute is not in the Hidden Until Found state, then return.Remove the `hidden` attribute fromancestorToReveal.

Otherwise:

[Assert](https://infra.spec.whatwg.org/#assert): revealType is "`details`".If ancestorToReveal has an `open` attribute, then return.

Set ancestorToReveal's `open` attribute to the empty string.

### 6.2 Page visibility

A traversable navigable's system visibility state, including its initial value upon creation, is determined by the user agent. It represents, for example, whether the browser window is minimized, a browser tab is currently in the background, or a system element such as a task switcher obscures the page.

When a user agent determines that the system visibility state fortraversable navigable traversable has changed to newState, it must run the following steps:

Let navigables be the inclusive descendant navigables oftraversable's active document.

[For each](https://infra.spec.whatwg.org/#list-iterate) navigable of navigables in what order?:

Let document be navigable's active document.

Queue a global task on the user interaction task source givendocument's relevant global object to update the visibility state of document with newState.

A `Document` has a visibility state, which is either "`hidden`" or "`visible`", initially set to "`hidden`".

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState)

The `visibilityState` getter steps are to return[this](https://webidl.spec.whatwg.org/#this)'s visibility state.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/hidden)

The `hidden` getter steps are to return true if [this](https://webidl.spec.whatwg.org/#this)'s visibility state is "`hidden`", otherwise false.

To update the visibility state of `Document` document tovisibilityState:

If document's visibility state equals visibilityState, then return.Set document's visibility state tovisibilityState.

- [Queue](https://w3c.github.io/performance-timeline/#queue-a-performanceentry) a new`VisibilityStateEntry` whosevisibility state isvisibilityState and whose timestamp is the [current high resolution time](https://w3c.github.io/hr-time/#dfn-current-high-resolution-time) given document'srelevant global object.
  Run the [screen orientation change steps](https://w3c.github.io/screen-orientation/#dfn-screen-orientation-change-steps) with document.[\[SCREENORIENTATION\]](references.html#refsSCREENORIENTATION)Run the [view transition page visibility change steps](https://drafts.csswg.org/css-view-transitions/#view-transition-page-visibility-change-steps) withdocument.
- Run any page visibility change steps which may be defined in other specifications, with visibility state and document.  
  It would be better if specification authors sent a pull request to add calls from here into their specifications directly, instead of using the page visibility change steps hook, to ensure well-defined cross-specification call order. As of the time of this writing the following specifications are known to have page visibility change steps, which will be run in an unspecified order: Device Posture API andWeb NFC. [\[DEVICEPOSTURE\]](references.html#refsDEVICEPOSTURE) [\[WEBNFC\]](references.html#refsWEBNFC)

[Fire an event](https://dom.spec.whatwg.org/#concept-event-fire) named `visibilitychange` atdocument, with its `[bubbles](https://dom.spec.whatwg.org/#dom-event-bubbles)` attribute initialized to true.

To set the initial visibility state of `Document` document tovisibilityState:

Set document's visibility state tovisibilityState.

[Queue](https://w3c.github.io/performance-timeline/#queue-a-performanceentry) a new`VisibilityStateEntry` whose visibility state is document's visibility state and whose timestamp is 0.

#### 6.2.1 The `VisibilityStateEntry` interface

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisibilityStateEntry)

The `VisibilityStateEntry` interface exposes visibility changes to the document, from the moment the document becomes active.

For example, this allows JavaScript code in the page to examine correlation between visibility changes and paint timing:

```
function wasHiddenBeforeFirstContentfulPaint() {
    const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
    const visibilityStateEntries = performance.getEntriesByType("visibility-state");
    return visibilityStateEntries.some(e =>
                                            e.startTime < fcpEntry.startTime &&
                                            e.name === "hidden");
}
```

Since hiding a page can cause throttling of rendering and other user-agent operations, it is common to use visibility changes as an indication that such throttling has occurred. However, other things could also cause throttling in different browsers, such as long periods of inactivity.

```
[Exposed=(Window)]
interface VisibilityStateEntry : PerformanceEntry {
  readonly attribute DOMString name;                 // shadows inherited name
  readonly attribute DOMString entryType;            // shadows inherited entryType
  readonly attribute DOMHighResTimeStamp startTime;  // shadows inherited startTime
  readonly attribute unsigned long duration;         // shadows inherited duration
};
```

The `VisibilityStateEntry` has an associated[DOMHighResTimeStamp](https://w3c.github.io/hr-time/#dom-domhighrestimestamp) timestamp.

The `VisibilityStateEntry` has an associated "`visible`" or "`hidden`" visibility state.

The `name` getter steps are to return[this](https://webidl.spec.whatwg.org/#this)'s visibility state.

The `entryType` getter steps are to return "`visibility-state`".

The `startTime` getter steps are to return[this](https://webidl.spec.whatwg.org/#this)'s timestamp.

The `duration` getter steps are to return zero.

### 6.3 Inert subtrees

See also `inert` for an explanation of the attribute of the same name.

A node (in particular elements and text nodes) can be inert. When a node isinert:

Hit-testing must act as if the ['pointer-events'](https://drafts.csswg.org/css-ui-4/#pointer-events-control) CSS property were set to 'none'.Text selection functionality must act as if the ['user-select'](https://drafts.csswg.org/css-ui-4/#content-selection) CSS property were set to 'none'.If it is [editable](https://w3c.github.io/editing/docs/execCommand/#editable), the node behaves as if it were non-editable.

The user agent should ignore the node for the purposes of find-in-page.

Inert nodes generally cannot be focused, and user agents do not expose the inert nodes to accessibility APIs or assistive technologies. Inert nodes that are commands will become inoperable to users, in the manner described above.

User agents may allow the user to override the restrictions on find-in-page and text selection, however.

By default, a node is not inert.

#### 6.3.1 Modal dialogs and inert subtrees

A `Document` document is blocked by a modal dialog subject if subject is the topmost `dialog` element indocument's [top layer](https://drafts.csswg.org/css-position-4/#document-top-layer). While document is so blocked, every node that is [connected](https://dom.spec.whatwg.org/#connected) to document, with the exception of thesubject element and its [flat tree](https://drafts.csswg.org/css-scoping/#flat-tree) descendants, must becomeinert.

subject can additionally become inert via the `inert` attribute, but only if specified on subject itself (i.e., subject escapes inertness of ancestors); subject's [flat tree](https://drafts.csswg.org/css-scoping/#flat-tree) descendants can become inert in a similar fashion.

The `dialog` element's `showModal()` method causes this mechanism to trigger, by [adding](https://drafts.csswg.org/css-position-4/#add-an-element-to-the-top-layer) the `dialog` element to its[node document](https://dom.spec.whatwg.org/#concept-node-document)'s [top layer](https://drafts.csswg.org/css-position-4/#document-top-layer).

#### 6.3.2 The `inert` attribute

> [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global%5Fattributes/inert)

The `inert` attribute is a boolean attribute that indicates, by its presence, that the element and all its [flat tree](https://drafts.csswg.org/css-scoping/#flat-tree) descendants which don't otherwise escape inertness (such as modal dialogs) are to be made inert by the user agent.

An inert subtree should not contain any content or controls which are critical to understanding or using aspects of the page which are not in the inert state. Content in an inert subtree will not be perceivable by all users, or interactive. Authors should not specify elements as inert unless the content they represent are also visually obscured in some way. In most cases, authors should not specify the `inert` attribute on individual form controls. In these instances, the `disabled` attribute is probably more appropriate.

The following example shows how to mark partially loaded content, visually obscured by a "loading" message, as inert.

```
<section aria-labelledby=s1>
  <h3 id=s1>Population by City</h3>
  <div class=container>
    <div class=loading><p>Loading...</p></div>
    <div inert>
      <form>
        <fieldset>
          <legend>Date range</legend>
          <div>
            <label for=start>Start</label>
            <input type=date id=start>
          </div>
          <div>
            <label for=end>End</label>
            <input type=date id=end>
          </div>
          <div>
            <button>Apply</button>
          </div>
        </fieldset>
      </form>
      <table>
        <caption>From 20-- to 20--</caption>
        <thead>
          <tr>
            <th>City</th>
            <th>State</th>
            <th>20-- Population</th>
            <th>20-- Population</th>
            <th>Percentage change</th>
          </tr>
        </thead>
        <tbody>
          <!-- ... -->
        </tbody>
      </table>
    </div>
  </div>
</section>
```

The "loading" overlay obscures the inert content, making it visually apparent that the inert content is not presently accessible. Notice that the heading and "loading" text are not descendants of the element with the `inert` attribute. This will ensure this text is accessible to all users, while the inert content cannot be interacted with by anyone.

By default, there is no persistent visual indication of an element or its subtree being inert. Appropriate visual styles for such content is often context-dependent. For instance, an inert off-screen navigation panel would not require a default style, as its off-screen position visually obscures the content. Similarly, a modal `dialog` element's backdrop will serve as the means to visually obscure the inert content of the web page, rather than styling the inert content specifically.

However, for many other situations authors are strongly encouraged to clearly mark what parts of their document are active and which are inert, to avoid user confusion. In particular, it is worth remembering that not all users can see all parts of a page at once; for example, users of screen readers, users on small devices or with magnifiers, and even users using particularly small windows might not be able to see the active part of a page and might get frustrated if inert sections are not obviously inert.

### 6.4 Tracking user activation

To prevent abuse of certain APIs that could be annoying to users (e.g., opening popups or vibrating phones), user agents allow these APIs only when the user is actively interacting with the web page or has interacted with the page at least once. This "active interaction" state is maintained through the mechanisms defined in this section.

#### 6.4.1 Data model

For the purpose of tracking user activation, each `Window` W has two relevant values:

A last activation timestamp, which is either a`[DOMHighResTimeStamp](https://w3c.github.io/hr-time/#dom-domhighrestimestamp)`, positive infinity (indicating that W has never been activated), or negative infinity (indicating that the activation has been consumed). Initially positive infinity.

A last history-action activation timestamp, which is either a`[DOMHighResTimeStamp](https://w3c.github.io/hr-time/#dom-domhighrestimestamp)` or positive infinity, initially positive infinity.

A user agent also defines a transient activation duration, which is a constant number indicating how long a user activation is available for certain user activation-gated APIs (e.g., for opening popups).

The transient activation duration is expected be at most a few seconds, so that the user can possibly perceive the link between an interaction with the page and the page calling the activation-gated API.

We then have the following boolean user activation states for W:

Sticky activation

When the [current high resolution time](https://w3c.github.io/hr-time/#dfn-current-high-resolution-time) given W is greater than or equal to the last activation timestamp in W, W is said to have sticky activation.

This is W's historical activation state, indicating whether the user has ever interacted in W. It starts false, then changes to true (and never changes back to false) when W gets the very first activation notification.

Transient activation

When the [current high resolution time](https://w3c.github.io/hr-time/#dfn-current-high-resolution-time) given W is greater than or equal to the last activation timestamp in W, and less than thelast activation timestamp in W plus the transient activation duration, then W is said to have transient activation.

This is W's current activation state, indicating whether the user has interacted in W recently. This starts with a false value, and remains true for a limited time after every activation notification W gets.

The transient activation state is considered expired if it becomes false because the transient activation duration time has elapsed since the last user activation. Note that it can become false even before the expiry time through an activation consumption.

History-action activation

When the last history-action activation timestamp of W is not equal to the last activation timestamp of W, then W is said to havehistory-action activation.

This is a special variant of user activation, used to allow access to certain session history APIs which, if used too frequently, would make it harder for the user to traverse back using browser UI. It starts with a false value, and becomes true whenever the user interacts with W, but is reset to false through history-action activation consumption. This ensures such APIs cannot be used multiple times in a row without an intervening user activation. But unliketransient activation, there is no time limit within which such APIs must be used.

The last activation timestamp and last history-action activation timestamp are retained even after the `Document` changes itsfully active status (e.g., after navigating away from a `Document`, or navigating to a cached `Document`). This means sticky activation state spans multiple navigations as long as the same `Document` gets reused. For the transient activation state, the original expiry time remains unchanged (i.e., the state still expires within the transient activation duration limit from the original activation triggering input event). It is important to consider this when deciding whether to base certain things off sticky activation or transient activation.

#### 6.4.2 Processing model

When a user interaction causes firing of an activation triggering input event in a `Document` document, the user agent must perform the following activation notification steps _before_ [dispatching](https://dom.spec.whatwg.org/#concept-event-dispatch) the event:

[Assert](https://infra.spec.whatwg.org/#assert): document is fully active.Let windows be « document's relevant global object ».[Extend](https://infra.spec.whatwg.org/#list-extend) windows with the active window of each of document's ancestor navigables.[Extend](https://infra.spec.whatwg.org/#list-extend) windows with the active window of each of document's descendant navigables, filtered to include only those navigables whose active document's [origin](https://dom.spec.whatwg.org/#concept-document-origin) is same origin withdocument's [origin](https://dom.spec.whatwg.org/#concept-document-origin).

[For each](https://infra.spec.whatwg.org/#list-iterate) window in windows:

Set window's last activation timestamp to the [current high resolution time](https://w3c.github.io/hr-time/#dfn-current-high-resolution-time).

Notify the close watcher manager about user activation givenwindow.

An activation triggering input event is any event whose `[isTrusted](https://dom.spec.whatwg.org/#dom-event-istrusted)` attribute is true and whose `[type](https://dom.spec.whatwg.org/#dom-event-type)` is one of:

"`[keydown](https://w3c.github.io/uievents/#event-type-keydown)`", provided the key is neither theEsc key nor a shortcut key reserved by the user agent;"`[mousedown](https://w3c.github.io/pointerevents/#mousedown)`";"`[pointerdown](https://w3c.github.io/pointerevents/#the-pointerdown-event)`", provided the event's`[pointerType](https://w3c.github.io/pointerevents/#dom-pointerevent-pointertype)` is "`mouse`";"`[pointerup](https://w3c.github.io/pointerevents/#the-pointerup-event)`", provided the event's`[pointerType](https://w3c.github.io/pointerevents/#dom-pointerevent-pointertype)` is not "`mouse`"; or

"`[touchend](https://w3c.github.io/touch-events/#event-touchend)`".

Activation consuming APIs defined in this and other specifications can consume user activation by performing the following steps, given a `Window` W:

If W's navigable is null, then return.Let top be W's navigable'stop-level traversable.Let navigables be the inclusive descendant navigables oftop's active document.Let windows be the list of `Window` objects constructed by taking the active window of each item innavigables.

[For each](https://infra.spec.whatwg.org/#list-iterate) window in windows, ifwindow's last activation timestamp is not positive infinity, then setwindow's last activation timestamp to negative infinity.

History-action activation-consuming APIs can consume history-action user activation by performing the following steps, given a `Window` W:

If W's navigable is null, then return.Let top be W's navigable'stop-level traversable.Let navigables be the inclusive descendant navigables oftop's active document.Let windows be the list of `Window` objects constructed by taking the active window of each item innavigables.

[For each](https://infra.spec.whatwg.org/#list-iterate) window in windows, setwindow's last history-action activation timestamp to window'slast activation timestamp.

Note the asymmetry in the sets of browsing contexts in the page that are affected by an activation notification vs anactivation consumption: an activation consumption changes (to false) the transient activation states for all browsing contexts in the page, but an activation notification changes (to true) the states for a subset of those browsing contexts. The exhaustive nature of consumption here is deliberate: it prevents malicious sites from making multiple calls to an activation consuming API from a single user activation (possibly by exploiting a deep hierarchy of `iframe`s).

#### 6.4.3 APIs gated by user activation

APIs that are dependent on user activation are classified into different levels:

Sticky activation-gated APIsThese APIs require the sticky activation state to be true, so they are blocked until the very first user activation.Transient activation-gated APIsThese APIs require the transient activation state to be true, but they don'tconsume it, so multiple calls are allowed per user activation until the transient state expires.Transient activation-consuming APIsThese APIs require the transient activation state to be true, and theyconsume user activation in each call to prevent multiple calls per user activation.History-action activation-consuming APIs

These APIs require the history-action activation state to be true, and theyconsume history-action user activation in each call to prevent multiple calls per user activation.

#### 6.4.4 The `UserActivation` interface

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/UserActivation)

Each `Window` has an associated `UserActivation`, which is a`UserActivation` object. Upon creation of the `Window` object, itsassociated UserActivation must be set to a [new](https://webidl.spec.whatwg.org/#new) `UserActivation` object created in the `Window` object's relevant realm.

```
[Exposed=Window]
interface UserActivation {
  readonly attribute boolean hasBeenActive;
  readonly attribute boolean isActive;
};

partial interface Navigator {
  [SameObject] readonly attribute UserActivation userActivation;
};
```

`navigator.userActivation.hasBeenActive`

Returns whether the window has sticky activation.

`navigator.userActivation.isActive`

Returns whether the window has transient activation.

The `userActivation` getter steps are to return[this](https://webidl.spec.whatwg.org/#this)'s relevant global object's associatedUserActivation.

> [MDN](https://developer.mozilla.org/en-US/docs/Web/API/UserActivation/hasBeenActive)

The `hasBeenActive` getter steps are to return true if [this](https://webidl.spec.whatwg.org/#this)'s relevant global object has sticky activation, and false otherwise.

### 6.5 Activation behavior of elements

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#activation>

Certain elements have an **activation behavior** — the action taken when the element is activated (e.g. clicking a `button`, following an `a[href]`, toggling a `details`, showing/hiding a popover via `popovertarget`). Calling `click()` on an element, or a synthetic activation, runs this behavior. The `command`/`commandfor` attributes on a `button` declare a declarative activation that dispatches a `CommandEvent` to the controlled element. **DOM-checkable:** an element with `commandfor` should also have a `command` attribute; `popovertarget` must reference an element that is a popover; an element's activation behavior must not be relied upon for non-interactive elements.

#### 6.5.1 The `ToggleEvent` interface

The `ToggleEvent` is fired (e.g. `toggle`, `beforetoggle`) when an element that can be open/closed changes state — `details`, `dialog`, and popovers. It carries `oldState` and `newState` strings (`"open"` / `"closed"`). Not a content-model rule; relevant to composable behavior.

#### 6.5.2 The `CommandEvent` interface

The `CommandEvent` is dispatched to the element referenced by a `button`'s `commandfor` when the button is activated, with a `command` string and a `source` element. Declarative button-driven commands (e.g. `command="show-modal"`, `command="toggle-popover"`).

### 6.6 Focus

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#focus>

#### 6.6.1 Introduction

Focus determines which element receives keyboard input. Each document has at most one focused area; the chain of focused elements is the focus chain.

#### 6.6.2 Data model

An element is a **focusable area** if it is rendered, not inert, not disabled, and either inherently focusable (e.g. `a[href]`, `button`, `input` not `disabled`/`hidden`, `select`, `textarea`, `summary` that is its `details`' first summary, `iframe`, editing hosts) or made focusable via `tabindex`.

#### 6.6.3 The `tabindex` attribute

**DOM-checkable rules:**

- `tabindex`, if specified, must have a value that is a **valid integer**.
- Negative `tabindex` (e.g. `-1`): the element is a focusable area (scriptable/clickable focus) but is **omitted from sequential focus navigation** (not Tab-reachable).
- `tabindex="0"`: focusable area, included in sequential focus navigation in DOM order.
- Positive `tabindex`: focusable area, included in sequential focus navigation, ordered by ascending value (then DOM order). Positive values are an authoring smell — flag as **advice**.
- A `dialog` element must **not** have a `tabindex` attribute (hard rule — see the structure-lens `dialog`/`tabindex` rule).
- An element inside an `[inert]` subtree (or outside a modal `dialog`) is not a focusable area even with `tabindex` — a Tab-reachable `tabindex>=0` inside `[inert]` is unreachable / mis-marked.

Illustrative:

```html
<!-- programmatically focusable, not Tab-reachable -->
<div tabindex="-1" id="liveregion">…</div>
<!-- made Tab-reachable in DOM order -->
<span role="button" tabindex="0">Custom button</span>
```

#### 6.6.4 Processing model

Focus updates run the focusing steps / focus fixup; blurring runs the unfocusing steps. The `:focus`, `:focus-within`, and `:focus-visible` pseudo-classes reflect the focus chain (the presentation lens checks `:focus-visible` outline replacement).

#### 6.6.5 Sequential focus navigation

The sequential focus navigation order is: positive-`tabindex` elements (ascending, then DOM order), then `tabindex="0"` and inherently-focusable elements in DOM order. `tabindex="-1"` elements are excluded.

#### 6.6.6 Focus management APIs

`focus()`, `blur()`, `HTMLElement.focus(options)`, `document.activeElement`, `document.hasFocus()`. Behavioral; not content-model rules.

#### 6.6.7 The `autofocus` attribute

**DOM-checkable rules:**

- `autofocus` is a **boolean attribute**.
- At most **one** element per document (more precisely, per top document's autofocus candidates) should have `autofocus` specified — multiple `autofocus` elements is a conformance smell; flag the 2nd+ as a finding.
- `autofocus` on an element inside an `[inert]` subtree (or that is not a focusable area) cannot take effect — flag as a finding.

### 6.7 Assigning keyboard shortcuts

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#editing-1>

#### 6.7.1 Introduction

`accesskey` lets authors assign keyboard shortcuts to elements. The user agent picks one assigned key from the candidates.

#### 6.7.2 The `accesskey` attribute

**DOM-checkable rules:**

- `accesskey`, if specified, must be an **ordered set of unique space-separated tokens**, each of which is **exactly one code point** in length.
- Duplicate tokens, or multi-character tokens, are conformance errors.
- Two elements in the same document should not assign the same accesskey (advice-level: ambiguous shortcut).

#### 6.7.3 Processing model

The user agent resolves the element's assigned access key from the `accesskey` candidates and exposes it (e.g. in tooltips). Behavioral.

### 6.8 Editing

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#editing>

#### 6.8.1 Making document regions editable: the `contenteditable` content attribute

**DOM-checkable rules:**

- `contenteditable` is an **enumerated attribute** with keywords `true` (or the empty string), `false`, and `plaintext-only`; its *missing value default* and *invalid value default* are the **inherit** state.
- An element whose `contenteditable` is in the true / plaintext-only state is an **editing host**; it is a focusable area.
- An element inside an `[inert]` subtree is **not** editable even when `contenteditable` is true (inert overrides editability) — relevant to the interaction lens.

Illustrative:

```html
<div contenteditable="true">Rich text region (editing host).</div>
<pre contenteditable="plaintext-only">Plain-text-only editing host.</pre>
<p contenteditable="false">Explicitly non-editable inside an editing host.</p>
```

#### 6.8.2 Making entire documents editable: the `designMode` getter and setter

`document.designMode` ("on"/"off") makes the whole document editable. Document-level; not a per-element content-model rule.

#### 6.8.3 Best practices for in-page editors

Non-normative authoring guidance (selection, undo, sanitization). No checkable rule.

#### 6.8.4 Editing APIs

`document.execCommand()` and friends are legacy editing APIs. Behavioral.

#### 6.8.5 Spelling and grammar checking

`spellcheck` is an **enumerated attribute** (`true`/empty, `false`; default *inherit*). Checkable: value must be one of the keywords if present.

#### 6.8.6 Writing suggestions

`writingsuggestions` is an enumerated attribute (`true`/empty, `false`; default *inherit*) controlling UA-offered inline writing suggestions.

#### 6.8.7 Autocapitalization

`autocapitalize` is an enumerated attribute (`off`/`none`, `on`/`sentences`, `words`, `characters`) inherited by form-associated elements. Checkable: value must be a known keyword.

#### 6.8.8 Autocorrection

`autocorrect` is an enumerated attribute (`on`/empty, `off`) hinting UA autocorrection.

#### 6.8.9 Input modalities: the `inputmode` attribute

`inputmode` is an enumerated attribute (`none`, `text`, `tel`, `url`, `email`, `numeric`, `decimal`, `search`) hinting the virtual-keyboard type for editable regions / form controls. Checkable: value must be a known keyword.

#### 6.8.10 Input modalities: the `enterkeyhint` attribute

`enterkeyhint` is an enumerated attribute (`enter`, `done`, `go`, `next`, `previous`, `search`, `send`) hinting the Enter-key action label. Checkable: value must be a known keyword.

> The `draggable` global attribute (drag-and-drop model) is an **enumerated attribute** with states `true` and `false` (no default keyword — defaults are computed: `img`/`a[href]`/selections default to draggable). Checkable: if present, value must be `true` or `false`.

### 6.9 Find-in-page

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#find-in-page>

#### 6.9.1 Introduction

Find-in-page lets users search rendered text. The user agent reveals matches that are inside closed `details` or `hidden=until-found` subtrees.

#### 6.9.2 Interaction with `details` and `hidden=until-found`

A find-in-page match inside a closed `details` automatically opens it; a match inside a `hidden=until-found` subtree fires `beforematch` and removes the `hidden` attribute. **Presentation-lens relevance:** closed-`details` content must not be `display:none` at the `::details-content` level (it must remain content-visibility-hidden so it stays findable); `hidden=until-found` must compute to `content-visibility:hidden`, not `display:none`.

#### 6.9.3 Interaction with selection

A successful match updates the selection and scrolls the match into view. Behavioral.

### 6.10 Close requests and close watchers

> Source: <https://html.spec.whatwg.org/multipage/interaction.html#close-watchers>

#### 6.10.1 Close requests

A **close request** is a platform-specific "go back / dismiss" signal (Esc on desktop, Back on Android). It closes the topmost of: an open popover, a modal `dialog`, or a registered `CloseWatcher`.

#### 6.10.2 Close watcher infrastructure

Each close watcher has a close behavior; only one "free" close watcher may be created without transient activation. Modal `dialog`s and `popover` elements register close watchers implicitly.

#### 6.10.3 The `CloseWatcher` interface

`new CloseWatcher()` (gated on user activation beyond the free slot) exposes `requestClose()`, `close()`, `destroy()`, and `cancel`/`close` events. Behavioral; relevant to `useDialog`/`usePopover` composable parity, not a content-model rule.

Illustrative:

```javascript
const watcher = new CloseWatcher();
watcher.onclose = () => sidebar.hidden = true;   // run the close behavior
// Esc / Android Back / a programmatic requestClose() all trigger onclose:
closeButton.onclick = () => watcher.requestClose();
```
