# HTML Standard — §4.10 Forms

> Source: <https://html.spec.whatwg.org/multipage/forms.html#forms>

## Contents

- [4.10.1 Introduction](#4101-introduction)
  - [4.10.1.1 Writing a form's user interface](#41011-writing-a-forms-user-interface)
  - [4.10.1.2 Implementing server-side processing](#41012-implementing-server-side-processing)
  - [4.10.1.3 Configuring a form to communicate with a server](#41013-configuring-a-form-to-communicate-with-a-server)
  - [4.10.1.4 Client-side form validation](#41014-client-side-form-validation)
  - [4.10.1.5 Enabling client-side autofill](#41015-enabling-client-side-autofill)
  - [4.10.1.6 Improving UX on mobile devices](#41016-improving-ux-on-mobile-devices)
  - [4.10.1.7 The difference between type, autocomplete, and inputmode](#41017-the-difference-between-type-autocomplete-and-inputmode)
  - [4.10.1.8 Date, time, and number formats](#41018-date-time-and-number-formats)
- [4.10.2 Categories](#4102-categories)
- [4.10.3 The `form` element](#4103-the-form-element)
- [4.10.4 The `label` element](#4104-the-label-element)

---

## 4.10.1 Introduction

_This section is non-normative._

A form is a component of a web page that has form controls — text, buttons, checkboxes, range, or color pickers. Users interact with controls which can send data to a server for processing. No client-side scripting is needed in many cases, though an API is available for scripts to augment the experience or use forms for purposes other than data submission.

### 4.10.1.1 Writing a form's user interface

_This section is non-normative._

Any form starts with a `<form>` element. Most controls are represented by `<input>`, which by default provides a text control. To label a control, use `<label>`; the label text and the control go inside the `<label>`. Each part of a form is a _paragraph_, typically separated using `<p>` elements.

```html
<form>
	<p>
		<label>Customer name: <input /></label>
	</p>
</form>
```

Radio buttons use `<input type="radio">`. Give them a common `name` to make them work as a group. Group related controls — especially radios — with `<fieldset>` and title the group with `<legend>`:

```html
<fieldset>
	<legend>Pizza Size</legend>
	<p>
		<label><input type="radio" name="size" value="small" /> Small</label>
	</p>
	<p>
		<label><input type="radio" name="size" value="medium" /> Medium</label>
	</p>
	<p>
		<label><input type="radio" name="size" value="large" /> Large</label>
	</p>
</fieldset>
```

Checkboxes use `<input type="checkbox">`. Multiple controls may share the same `name`; each checked box submits its own entry:

```html
<fieldset>
	<legend>Pizza Toppings</legend>
	<p>
		<label><input type="checkbox" name="topping" value="bacon" /> Bacon</label>
	</p>
	<p>
		<label><input type="checkbox" name="topping" value="cheese" /> Extra Cheese</label>
	</p>
</fieldset>
```

Use semantic input types for better keyboard hints and mobile experience:

| Control          | Type            |
| ---------------- | --------------- |
| Telephone number | `type="tel"`    |
| Email address    | `type="email"`  |
| Delivery time    | `type="time"`   |
| Search           | `type="search"` |
| URL              | `type="url"`    |
| Number           | `type="number"` |
| Date             | `type="date"`   |
| File upload      | `type="file"`   |
| Color picker     | `type="color"`  |

`min`, `max`, and `step` constrain numeric and time controls:

```html
<label
	>Preferred delivery time:
	<input type="time" min="11:00" max="21:00" step="900" name="delivery" />
</label>
```

`<textarea>` provides multi-line text input. `<button>` makes the form submittable:

```html
<p>
	<label>Delivery instructions: <textarea name="comments"></textarea></label>
</p>
<p><button>Submit order</button></p>
```

### 4.10.1.2 Implementing server-side processing

_This section is non-normative._

Server-side processing is out of scope for this specification. In practice, a server endpoint receives a URL-encoded body (or multipart, or JSON) and processes the submitted entries by their `name` attributes.

### 4.10.1.3 Configuring a form to communicate with a server

_This section is non-normative._

| Attribute | Purpose                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| `action`  | URL that receives the submission                                                             |
| `method`  | HTTP method: `get` (default) or `post`                                                       |
| `enctype` | Encoding: `application/x-www-form-urlencoded` (default), `multipart/form-data`, `text/plain` |
| `name`    | Submission name for a control                                                                |
| `value`   | Submission value for a control (especially radios/checkboxes)                                |

Full working example:

```html
<form
	method="post"
	enctype="application/x-www-form-urlencoded"
	action="https://pizza.example.com/order.cgi"
>
	<p>
		<label>Customer name: <input name="custname" required /></label>
	</p>
	<p>
		<label>Telephone: <input type="tel" name="custtel" autocomplete="shipping tel" /></label>
	</p>
	<p>
		<label>Email: <input type="email" name="custemail" autocomplete="shipping email" /></label>
	</p>
	<fieldset>
		<legend>Pizza Size</legend>
		<p>
			<label><input type="radio" name="size" value="small" required /> Small</label>
		</p>
		<p>
			<label><input type="radio" name="size" value="medium" /> Medium</label>
		</p>
		<p>
			<label><input type="radio" name="size" value="large" /> Large</label>
		</p>
	</fieldset>
	<fieldset>
		<legend>Pizza Toppings</legend>
		<p>
			<label><input type="checkbox" name="topping" value="bacon" /> Bacon</label>
		</p>
		<p>
			<label><input type="checkbox" name="topping" value="cheese" /> Extra Cheese</label>
		</p>
	</fieldset>
	<p>
		<label
			>Delivery time:
			<input type="time" min="11:00" max="21:00" step="900" name="delivery" required
		/></label>
	</p>
	<p>
		<label>Instructions: <textarea name="comments" maxlength="1000"></textarea></label>
	</p>
	<p><button>Submit order</button></p>
</form>
```

Sample encoded submission:

```
custname=Denise+Lawrence&custtel=555-321-8642&custemail=&size=medium&topping=cheese&topping=mushroom&delivery=19%3A00&comments=
```

### 4.10.1.4 Client-side form validation

_This section is non-normative._

Forms can be annotated so the user agent checks input before submission. The server must still validate (client-side validation can be bypassed), but it improves user experience.

| Attribute       | Effect                                    |
| --------------- | ----------------------------------------- |
| `required`      | Field must have a value before submission |
| `maxlength`     | Limits input to N characters              |
| `minlength`     | Requires at least N characters            |
| `min` / `max`   | Numeric / date / time bounds              |
| `step`          | Constrains numeric / time increments      |
| `pattern`       | Regex that the value must match           |
| `type="email"`  | Value must be a valid email address       |
| `type="url"`    | Value must be a valid URL                 |
| `type="number"` | Value must be numeric                     |

When a form is submitted, `invalid` events fire at each invalid control before the `submit` event. This lets you display a full error summary rather than relying on the browser's single-message default.

```html
<form id="checkout">
	<p>
		<label>Customer name: <input name="custname" required /></label>
	</p>
	<p>
		<label>Delivery instructions: <textarea name="comments" maxlength="1000"></textarea></label>
	</p>
	<p><button>Submit order</button></p>
</form>
```

### 4.10.1.5 Enabling client-side autofill

_This section is non-normative._

The `autocomplete` attribute hints the browser's autofill engine about the meaning of a field value. It is independent of `type` — a phone-number field has `type="tel"` always, but `autocomplete` distinguishes _billing_ from _shipping_ phone numbers.

```html
<input name="custname" autocomplete="shipping name" />
<input type="tel" name="custtel" autocomplete="shipping tel" />
<input type="email" name="custemail" autocomplete="shipping email" />
```

Common `autocomplete` tokens: `name`, `email`, `tel`, `tel-national`, `cc-number`, `billing street-address`, `shipping city`, `new-password`, `current-password`, `one-time-code`, `language`.

Use `section-*` prefixes to prevent autofill from copying one field's value into another named field in the same section:

```html
<label>Japanese name: <input type="text" autocomplete="section-jp name" /></label>
<label>Romanized name: <input type="text" autocomplete="section-en name" /></label>
```

### 4.10.1.6 Improving UX on mobile devices

_This section is non-normative._

`inputmode` controls which virtual keyboard appears on touch devices. It is separate from `type` — use it when the input type is `text` but a numeric or URL keyboard is more appropriate:

| `inputmode` value | Virtual keyboard               |
| ----------------- | ------------------------------ |
| `numeric`         | Digits 0–9 only                |
| `decimal`         | Digits and decimal separator   |
| `tel`             | Telephone digits               |
| `email`           | Letter keys + `@`              |
| `url`             | Letter keys + `/`, `.`         |
| `search`          | Letter keys + go/search action |
| `none`            | No keyboard (custom input UI)  |

```html
<!-- Credit card: text type to preserve leading zeros, numeric keyboard -->
<label
	>Credit card number:
	<input type="text" inputmode="numeric" pattern="[0-9]{8,19}" autocomplete="cc-number" />
</label>

<!-- Buzzer code: numeric keyboard without type="number" constraints -->
<label>Buzzer code: <input name="custbuzz" inputmode="numeric" /></label>
```

### 4.10.1.7 The difference between type, autocomplete, and inputmode

_This section is non-normative._

| Attribute      | Controls                                 | Example                                              |
| -------------- | ---------------------------------------- | ---------------------------------------------------- |
| `type`         | Which form **control** is shown          | `type="tel"` shows a telephone input UI              |
| `autocomplete` | What **value** represents (for autofill) | `autocomplete="billing tel"` fills the billing phone |
| `inputmode`    | Which **keyboard** appears on touch      | `inputmode="numeric"` shows digit keys               |

They are orthogonal — a credit card number field uses `type="text"` (preserves formatting), `autocomplete="cc-number"` (fills the saved card), and `inputmode="numeric"` (digit keyboard).

### 4.10.1.8 Date, time, and number formats

_This section is non-normative._

HTML forms use ISO 8601 wire formats regardless of the user's locale:

| Type           | Wire format                | Example             |
| -------------- | -------------------------- | ------------------- |
| Date           | `YYYY-MM-DD`               | `2003-02-01`        |
| Time           | `HH:MM[:SS]`               | `19:00`, `14:30:00` |
| Month          | `YYYY-MM`                  | `2003-02`           |
| Week           | `YYYY-Www`                 | `2003-W06`          |
| Datetime-local | `YYYY-MM-DDTHH:MM`         | `2003-02-01T19:00`  |
| Number         | Decimal with `.` separator | `3.14`              |

The browser translates between the wire format and the user's locale for display and data entry. Scripts always see and submit the wire format.

---

## 4.10.2 Categories

Form elements fall into several overlapping categories.

### Form-associated elements

Elements that can have a [form owner](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-owner) (via the `form` content attribute):

`button` · `fieldset` · `input` · `object` · `output` · `select` · `textarea` · form-associated custom elements · `img` (for historical reasons)

### Listed elements

Appear in `form.elements` and `fieldset.elements`. Have a `form` content attribute linking them to a form owner:

`button` · `fieldset` · `input` · `object` · `output` · `select` · `textarea` · form-associated custom elements

### Submittable elements

Participate in [constructing the entry list](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-form-data-set) when the form is submitted:

`button` · `input` · `select` · `textarea` · form-associated custom elements

Some submittable elements are **buttons**; some buttons are specifically **submit buttons**. Only submit buttons trigger form submission.

### Resettable elements

Affected when the form is reset:

`input` · `output` · `select` · `textarea` · form-associated custom elements

### Labelable elements

Can be associated with a `<label>` element:

`button` · `input` (unless `type="hidden"`) · `meter` · `output` · `progress` · `select` · `textarea` · form-associated custom elements

---

## 4.10.3 The `form` element

- **Categories:** Flow content, palpable content.
- **Contexts:** Where flow content is expected.
- **Content model:** Flow content, but with no `<form>` element descendants.
- **Tag omission:** Neither tag is omissible.
- **Content attributes:** Global attributes plus the ones below.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-form) · [For implementers](https://w3c.github.io/html-aam/#el-form).

The `form` element represents a hyperlink manipulated through a collection of form-associated elements, some of which can hold editable values that can be submitted to a server.

### Attributes

| Attribute        | Type                        | Purpose                                                                                            |
| ---------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `accept-charset` | string                      | Character encodings for submission. Must be ASCII case-insensitive `UTF-8` if present.             |
| `action`         | URL                         | Endpoint that receives the submission.                                                             |
| `autocomplete`   | `on` \| `off`               | Default autofill behavior for all controls. Missing/invalid value defaults to `on`.                |
| `enctype`        | enum                        | Encoding type: `application/x-www-form-urlencoded` (default), `multipart/form-data`, `text/plain`. |
| `method`         | `get` \| `post` \| `dialog` | HTTP method variant.                                                                               |
| `name`           | string                      | Form's name in `document.forms`. Must be non-empty and unique.                                     |
| `novalidate`     | boolean                     | Bypasses constraint validation on submission.                                                      |
| `rel`            | token list                  | Link relation. Supported tokens: `noreferrer`, `noopener`, `opener`.                               |
| `target`         | browsing context            | Where to display the response.                                                                     |

### DOM interface

```webidl
[Exposed=Window, LegacyOverrideBuiltIns, LegacyUnenumerableNamedProperties]
interface HTMLFormElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, Reflect="accept-charset"] attribute DOMString acceptCharset;
  [CEReactions, ReflectSetter] attribute USVString action;
  [CEReactions] attribute DOMString autocomplete;
  [CEReactions] attribute DOMString enctype;
  [CEReactions] attribute DOMString encoding;
  [CEReactions] attribute DOMString method;
  [CEReactions, Reflect] attribute DOMString name;
  [CEReactions, Reflect] attribute boolean noValidate;
  [CEReactions, Reflect] attribute DOMString target;
  [CEReactions, Reflect] attribute DOMString rel;
  [SameObject, PutForwards=value, Reflect="rel"] readonly attribute DOMTokenList relList;

  [SameObject] readonly attribute HTMLFormControlsCollection elements;
  readonly attribute unsigned long length;
  getter Element (unsigned long index);
  getter (RadioNodeList or Element) (DOMString name);

  undefined submit();
  undefined requestSubmit(optional HTMLElement? submitter = null);
  [CEReactions] undefined reset();
  boolean checkValidity();
  boolean reportValidity();
};
```

### DOM API

`form.elements`
: Returns an `HTMLFormControlsCollection` of all listed form controls (excluding image buttons for historical reasons).

`form.length`
: Number of form controls in `form.elements`.

`form[index]`
: Returns the *index*th element in `form.elements`.

`form[name]`
: Returns the control (or `RadioNodeList`) whose `id` or `name` matches. Once a name is used, it persists in a **past names map** even after the element's attribute changes.

`form.submit()`
: Submits the form, **bypassing** constraint validation and without firing a `submit` event. Prefer `requestSubmit()` in most cases.

`form.requestSubmit([submitter])`
: Requests submission as if the user clicked a submit button. Runs constraint validation and fires the `submit` event (both can cancel submission). The `submitter` argument points to a specific submit button whose `formaction`, `formenctype`, `formmethod`, `formnovalidate`, and `formtarget` attributes take effect. The submitter is included in the entry list.

`form.reset()`
: Resets all resettable controls to their defaults. Protected by a "locked for reset" flag to prevent re-entrant resets.

`form.checkValidity()`
: Returns `true` if all controls satisfy their constraints (static check, no UI). Fires `invalid` at each failing control.

`form.reportValidity()`
: Returns `true` if all controls are valid; otherwise returns `false` and also shows the browser's native validation UI for the first failing control.

### Examples

Two search forms — each uses a different search engine:

```html
<form action="https://www.google.com/search" method="get">
	<label>Google: <input type="search" name="q" /></label>
	<input type="submit" value="Search…" />
</form>
<form action="https://www.bing.com/search" method="get">
	<label>Bing: <input type="search" name="q" /></label>
	<input type="submit" value="Search…" />
</form>
```

---

## 4.10.4 The `label` element

- **Categories:** Flow content, phrasing content, interactive content, palpable content.
- **Contexts:** Where phrasing content is expected.
- **Content model:** Phrasing content, but with no descendant labelable elements unless it is the element's _labeled control_, and no descendant `<label>` elements.
- **Tag omission:** Neither tag is omissible.
- **Content attributes:** Global attributes + `for`.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-label) · [For implementers](https://w3c.github.io/html-aam/#el-label).

The `label` element represents a caption in a user interface. The caption can be associated with a specific form control — the _labeled control_ — in two ways:

1. **`for` attribute:** Set `for` to the `id` of a labelable element in the same tree. The first such element in tree order becomes the labeled control.
2. **Implicit wrapping:** If no `for` is present, the first labelable descendant in tree order becomes the labeled control.

Activating a label (e.g., clicking) typically activates or focuses its labeled control. **The activation behavior of interactive content inside a label does not propagate to the label's labeled control** — only events targeted at the label itself or non-interactive descendants trigger the labeled-control activation.

### The `for` attribute

`for` must be the `id` of a labelable element in the same tree. If the first matching element is not labelable, the label has no labeled control.

```html
<!-- Explicit for= -->
<label for="username">Username</label>
<input id="username" type="text" />

<!-- Implicit wrapping (no for= needed) -->
<label>Username <input type="text" /></label>

<!-- format hint inside label -->
<p>
	<label>Full name: <input name="fn" /> <small>Format: First Last</small></label>
</p>
<p>
	<label>Post code: <input name="pc" /> <small>Format: AB12 3CD</small></label>
</p>
```

### DOM interface

```webidl
[Exposed=Window]
interface HTMLLabelElement : HTMLElement {
  [HTMLConstructor] constructor();

  readonly attribute HTMLFormElement? form;
  [CEReactions, Reflect="for"] attribute DOMString htmlFor;
  readonly attribute HTMLElement? control;
};
```

### DOM API

`label.htmlFor [ = value ]`
: Reflects the `for` content attribute. Set to change which control the label is associated with.

`label.control`
: Returns the label's labeled control, or `null` if none.

`label.form`
: Returns the form owner of the labeled control, or `null` if the label has no labeled control or the labeled control is not form-associated.

`control.labels`
: Available on all labelable elements (`HTMLButtonElement`, `HTMLInputElement`, `HTMLSelectElement`, `HTMLTextAreaElement`, `HTMLMeterElement`, `HTMLOutputElement`, `HTMLProgressElement`). Returns a live `NodeList` of all `<label>` elements whose labeled control is this element, in tree order. Returns `null` on `<input type="hidden">`. Form-associated custom elements expose `labels` through `ElementInternals.labels`.

### Example — `labels` live list behavior

```html
<!DOCTYPE html>
<p>
	<label><input /></label>
</p>
<script>
	const input = document.querySelector('input')
	const labels = input.labels
	console.assert(labels.length === 1)

	input.type = 'hidden'
	console.assert(labels.length === 0) // no longer the labeled control
	console.assert(input.labels === null)

	input.type = 'checkbox'
	console.assert(labels.length === 1) // labeled control again
	console.assert(input.labels === labels) // same NodeList object
</script>
```

---

## Notes for `createForm` / `useForm`

Key spec behaviors that the factory implements or must respect:

| Behavior                                                   | Spec reference        | Implementation                                          |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| `form.elements` includes all listed controls               | §4.10.2               | `readFormFields` → `Array.from(form.elements)`          |
| `checkValidity()` fires `invalid` at each failing control  | §4.10.3               | native `el.checkValidity()` + `onInvalid` listener      |
| `reportValidity()` shows browser UI for first failure      | §4.10.3               | native `el.reportValidity()`                            |
| `requestSubmit()` fires `submit` and validates             | §4.10.3               | `submit()` calls `el.requestSubmit()`                   |
| `new FormData(form)` fires `formdata` event synchronously  | spec                  | `readFormData` → `onFormData` → `mailbox:form:formdata` |
| Custom validity via `setCustomValidity(message)`           | constraint validation | `validity.mark()` / `validity.clear()`                  |
| `fieldset[disabled]` excludes controls from validation     | constraint validation | `willValidate` guard in `readFormErrors`                |
| `aria-invalid="true"` on invalid controls after validation | ARIA                  | `apply()` in `createForm`                               |
| `aria-invalid="false"` on valid controls after validation  | ARIA                  | `apply()` in `createForm`                               |
| Touched tracking (field visited via blur)                  | UX                    | `focusout` listener in `createForm`                     |

### `formdata` event timing

Every call to `new FormData(form)` fires the **native `formdata` event** synchronously. The factory's `onFormData` handler re-dispatches this as `mailbox:form:formdata`, giving consumers the chance to inject entries **before** the snapshot is captured. This means `mailbox:form:formdata` fires on mount, on every `input`/`change`, on `check`/`report`, and on `submit` — not only on actual form submission.

### Constraint validation — `willValidate`

A field's `willValidate` is `false` when:

- The element is `disabled`.
- The element is inside a `disabled` `<fieldset>`.
- The element has no `name` (or an empty name).
- `<input type="hidden">`, `<input type="reset">`, `<input type="button">`.
- `<button type="button">` or `<button type="reset">`.
- The element is `readonly` (for `<input>` but not `<textarea>`).

These elements are excluded from `readFormErrors` and `validity.field()`.

### `ValidityState` is a live object

`FormError.validity` holds a reference to the field's live `ValidityState` DOM object. Constraint flags (e.g., `valueMissing`, `typeMismatch`) reflect the field's **current** state, not the state at snapshot time. Store the error message string if you need a stable value.
