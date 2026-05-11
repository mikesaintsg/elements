# HTML Standard — §4.9 Tabular Data

> Source: <https://html.spec.whatwg.org/multipage/tables.html#tables>

## Contents

- [4.9.1 The `table` element](#491-the-table-element)
  - [4.9.1.1 Techniques for describing tables](#4911-techniques-for-describing-tables)
  - [4.9.1.2 Techniques for table design](#4912-techniques-for-table-design)
- [4.9.2 The `caption` element](#492-the-caption-element)
- [4.9.3 The `colgroup` element](#493-the-colgroup-element)
- [4.9.4 The `col` element](#494-the-col-element)
- [4.9.5 The `tbody` element](#495-the-tbody-element)
- [4.9.6 The `thead` element](#496-the-thead-element)
- [4.9.7 The `tfoot` element](#497-the-tfoot-element)
- [4.9.8 The `tr` element](#498-the-tr-element)
- [4.9.9 The `td` element](#499-the-td-element)
- [4.9.10 The `th` element](#4910-the-th-element)
- [4.9.11 Attributes common to `td` and `th`](#4911-attributes-common-to-td-and-th-elements)
- [4.9.12 Processing model](#4912-processing-model)
  - [4.9.12.1 Forming a table](#49121-forming-a-table)
  - [4.9.12.2 Forming relationships between data cells and header cells](#49122-forming-relationships-between-data-cells-and-header-cells)
- [4.9.13 Examples](#4913-examples)

---

## §4.9 Tabular Data

## 4.9.1 The `table` element

- **Categories:** Flow content, palpable content.
- **Contexts:** Where flow content is expected.
- **Content model:** Optionally a `caption`, followed by zero or more `colgroup` elements, followed optionally by a `thead`, followed by either zero or more `tbody` elements or one or more `tr` elements, followed optionally by a `tfoot`, optionally intermixed with script-supporting elements.
- **Tag omission:** Neither tag is omissible.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-table) · [For implementers](https://w3c.github.io/html-aam/#el-table).
  The `table` element represents data with more than one dimension, in the form of a table. Tables have rows, columns, and cells given by their descendants. The rows and columns form a grid; a table's cells must completely cover that grid without overlap.
  Tables must not be used as layout aids. There are a variety of alternatives such as CSS grid layout, flexbox, multi-column layout, and CSS positioning.

---

User agents should clearly delineate cells in a table from each other, unless the table has been classified as a layout table. Feature heuristics for detecting layout vs. data tables:
| Feature | Indication |
| --- | --- |
| `role="presentation"` | Probably a layout table |
| Non-conforming `border="0"` | Probably a layout table |
| `cellspacing="0"` and `cellpadding="0"` | Probably a layout table |
| Use of `caption`, `thead`, or `th` elements | Probably a non-layout table |
| Use of `headers` or `scope` attributes | Probably a non-layout table |
| Non-conforming `border` with value other than 0 | Probably a non-layout table |
| Explicit visible borders set using CSS | Probably a non-layout table |
| The `summary` attribute | Not a good indicator either way |

---

### DOM Interface

```webidl
[Exposed=Window]
interface HTMLTableElement : HTMLElement {
  [HTMLConstructor] constructor();
  [CEReactions] attribute HTMLTableCaptionElement? caption;
  HTMLTableCaptionElement createCaption();
  [CEReactions] undefined deleteCaption();
  [CEReactions] attribute HTMLTableSectionElement? tHead;
  HTMLTableSectionElement createTHead();
  [CEReactions] undefined deleteTHead();
  [CEReactions] attribute HTMLTableSectionElement? tFoot;
  HTMLTableSectionElement createTFoot();
  [CEReactions] undefined deleteTFoot();
  [SameObject] readonly attribute HTMLCollection tBodies;
  HTMLTableSectionElement createTBody();
  [SameObject] readonly attribute HTMLCollection rows;
  HTMLTableRowElement insertRow(optional long index = -1);
  [CEReactions] undefined deleteRow(long index);
  // also has obsolete members
};

```

### DOM API — `HTMLTableElement`

`table.caption [ = value ]`
Returns the table's `caption` element. Can be set to replace it.
`caption = table.createCaption()`
Ensures the table has a `caption` element and returns it.
`table.deleteCaption()`
Removes the first `caption` element child, if any.
`table.tHead [ = value ]`
Returns the table's `thead` element. Setting replaces it; setting to a non-`thead` element throws `HierarchyRequestError`.
`thead = table.createTHead()`
Ensures the table has a `thead` and returns it (inserts before first non-`caption`/non-`colgroup` element).
`table.deleteTHead()`
Removes the first `thead` element child, if any.
`table.tFoot [ = value ]`
Returns the table's `tfoot` element. Setting replaces it; setting to a non-`tfoot` throws `HierarchyRequestError`.
`tfoot = table.createTFoot()`
Ensures the table has a `tfoot` (inserted at end) and returns it.
`table.deleteTFoot()`
Removes the first `tfoot` element child, if any.
`table.tBodies`
Returns an `HTMLCollection` of `tbody` elements that are direct children of the table.
`tbody = table.createTBody()`
Creates a `tbody`, inserts it after the last `tbody` child (or at end), and returns it.
`table.rows`
Returns an `HTMLCollection` of all `tr` elements — children of `thead` first (tree order), then children of `table`/`tbody` (tree order), then children of `tfoot` (tree order).
`tr = table.insertRow([ index ])`
Creates a `tr`, inserts it at the given position in `rows`, and returns it. Index -1 (default) inserts at end. Throws `IndexSizeError` if index < -1 or > rows count.
`table.deleteRow(index)`
Removes the `tr` at the given position in `rows`. Index -1 removes the last. Throws `IndexSizeError` if out of range.

---

Example — Sudoku puzzle (no headers needed):

```html

<table id="sudoku">
 <colgroup><col><col><col>
 <colgroup><col><col><col>
 <colgroup><col><col><col>
 <tbody>
  <tr> <td> 1 <td>   <td> 3 <td> 6 <td>   <td> 4 <td> 7 <td>   <td> 9
  <tr> <td>   <td> 2 <td>   <td>   <td> 9 <td>   <td>   <td> 1 <td>
  <tr> <td> 7 <td>   <td>   <td>   <td>   <td>   <td>   <td>   <td> 6
 <tbody>
  <tr> <td> 2 <td>   <td> 4 <td>   <td> 3 <td>   <td> 9 <td>   <td> 8
  <tr> <td>   <td>   <td>   <td>   <td>   <td>   <td>   <td>   <td>
  <tr> <td> 5 <td>   <td>   <td> 9 <td>   <td> 7 <td>   <td>   <td> 1
 <tbody>
  <tr> <td> 6 <td>   <td>   <td>   <td> 5 <td>   <td>   <td>   <td> 2
  <tr> <td>   <td>   <td>   <td>   <td> 7 <td>   <td>   <td>   <td>
  <tr> <td> 9 <td>   <td>   <td> 8 <td>   <td> 2 <td>   <td>   <td> 5
</table>

```

---

### 4.9.1.1 Techniques for describing tables

For tables with more than just a grid of cells with headers in the first row and column, authors should include explanatory information — purpose, structure, trends, patterns. Especially useful for screen reader users.
Ways to include this information:
**In prose surrounding the table:**

```html
<p>Characteristics are given in the second column, with the negative
side in the left column and the positive side in the right column.</p>
<table>
 <caption>Characteristics with positive and negative sides</caption>
 <thead>
  <tr> <th id="n"> Negative <th> Characteristic <th> Positive
 <tbody>
  <tr> <td headers="n r1"> Sad    <th id="r1"> Mood  <td> Happy
  <tr> <td headers="n r2"> Failing <th id="r2"> Grade <td> Passing
</table>

```

**In the table's `caption`:**

```html
<table>
	<caption>
		<strong>Characteristics with positive and negative sides.</strong>
		<p>
			Characteristics are given in the second column, with the negative side in the left column and
			the positive side in the right column.
		</p>
	</caption>
	...
</table>
```

**In the `caption` inside a `details` element:**

```html
<table>
	<caption>
		<strong>Characteristics with positive and negative sides.</strong>
		<details>
			<summary>Help</summary>
			<p>Characteristics are given in the second column...</p>
		</details>
	</caption>
	...
</table>
```

**In a `figure`'s `figcaption`:**

```html
<figure>
	<figcaption>
		<strong>Characteristics with positive and negative sides</strong>
		<p>Characteristics are given in the second column...</p>
	</figcaption>
	<table>
		...
	</table>
</figure>
```

The best option is to adjust the table so no description is needed — place headers on the top and left:

```html

<table>
 <caption>Characteristics with positive and negative sides</caption>
 <thead>
  <tr> <th> Characteristic <th> Negative <th> Positive
 <tbody>
  <tr> <th> Mood  <td> Sad     <td> Happy
  <tr> <th> Grade <td> Failing <td> Passing
</table>

```

### 4.9.1.2 Techniques for table design

- **Visual media:** Column and row borders, alternating row backgrounds help distinguish complex tables.
- **Numeric data:** Monospaced fonts help users see patterns, especially without borders.
- **Speech media:** Report headers before cell contents; allow grid navigation rather than serializing all content.
  Authors are encouraged to use CSS for these effects. User agents should render tables with these techniques when the page uses no CSS and the table is not a layout table.

---

## 4.9.2 The `caption` element

- **Categories:** None.
- **Contexts:** As the first element child of a `table` element.
- **Content model:** Flow content, but with no descendant `table` elements.
- **Tag omission:** End tag can be omitted if not immediately followed by ASCII whitespace or a comment.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-caption) · [For implementers](https://w3c.github.io/html-aam/#el-caption).

```webidl
[Exposed=Window]
interface HTMLTableCaptionElement : HTMLElement {
  [HTMLConstructor] constructor();
  // also has obsolete members
};

```

The `caption` element represents the title of the `table` that is its parent, if it has a parent and that is a `table` element.
When a `table` element is the only content in a `figure` element other than the `figcaption`, the `caption` element should be omitted in favor of the `figcaption`.
A caption can introduce context for a table, making it significantly easier to understand. For instance, a dice-roll total table with no context is opaque, but a caption clarifying "this table shows the total score from rolling two six-sided dice — first row is die one, first column is die two" makes it immediately clear:

```html
<caption>
	<p>Table 1.</p>
	<p>
		This table shows the total score obtained from rolling two six-sided dice. The first row
		represents the value of the first die, the first column the value of the second die. The total
		is given in the cell that corresponds to the values of the two dice.
	</p>
</caption>
```

---

## 4.9.3 The `colgroup` element

- **Categories:** None.
- **Contexts:** As a child of a `table` element, after any `caption` elements and before any `thead`, `tbody`, `tfoot`, and `tr` elements.
- **Content model:** If `span` is present: nothing. If absent: zero or more `col` and `template` elements.
- **Tag omission:** Start tag can be omitted if the first child is a `col` and not immediately preceded by another `colgroup` whose end tag was omitted. End tag can be omitted if not immediately followed by ASCII whitespace or a comment.
- **Content attributes:** Global attributes; `span` — number of columns spanned (> 0, <= 1000).
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-colgroup) · [For implementers](https://w3c.github.io/html-aam/#el-colgroup).

```webidl
[Exposed=Window]
interface HTMLTableColElement : HTMLElement {
  [HTMLConstructor] constructor();
  [CEReactions, Reflect, ReflectDefault=1, ReflectRange=(1, 1000)] attribute unsigned long span;
  // also has obsolete members
};

```

The `colgroup` element represents a group of one or more columns in its parent `table`. If it contains no `col` elements it may have a `span` attribute (> 0 and <= 1000).

---

## 4.9.4 The `col` element

- **Categories:** None.
- **Contexts:** As a child of a `colgroup` element that doesn't have a `span` attribute.
- **Content model:** Nothing.
- **Tag omission:** No end tag.
- **Content attributes:** Global attributes; `span` — number of columns spanned (> 0, <= 1000).
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-col) · [For implementers](https://w3c.github.io/html-aam/#el-col).
- **DOM interface:** Uses `HTMLTableColElement`, as defined for `colgroup`.
  If a `col` element has a parent `colgroup` that itself has a parent `table`, the `col` element represents one or more columns in the column group.

---

## 4.9.5 The `tbody` element

- **Categories:** None.
- **Contexts:** As a child of a `table` element, after any `caption`, `colgroup`, and `thead` elements, but only if there are no `tr` elements that are direct children of the `table`.
- **Content model:** Zero or more `tr` and script-supporting elements.
- **Tag omission:** Start tag can be omitted if the first child is a `tr` and not immediately preceded by a `tbody`, `thead`, or `tfoot` whose end tag was omitted. End tag can be omitted if immediately followed by a `tbody` or `tfoot`, or if there is no more content in the parent.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-tbody) · [For implementers](https://w3c.github.io/html-aam/#el-tbody).

```webidl
[Exposed=Window]
interface HTMLTableSectionElement : HTMLElement {
  [HTMLConstructor] constructor();
  [SameObject] readonly attribute HTMLCollection rows;
  HTMLTableRowElement insertRow(optional long index = -1);
  [CEReactions] undefined deleteRow(long index);
  // also has obsolete members
};

```

`HTMLTableSectionElement` is also used for `thead` and `tfoot` elements.
The `tbody` element represents a block of rows that form the body of the parent `table`.

### DOM API — `HTMLTableSectionElement`

`tbody.rows`
Returns an `HTMLCollection` of the `tr` elements of this section.
`tr = tbody.insertRow([ index ])`
Creates a `tr`, inserts it at the given position in the section, and returns it. Index -1 (default) inserts at end. Throws `IndexSizeError` if index < -1 or > row count.
`tbody.deleteRow(index)`
Removes the `tr` at the given position. Index -1 removes the last. Throws `IndexSizeError` if out of range.

---

## 4.9.6 The `thead` element

- **Categories:** None.
- **Contexts:** As a child of a `table` element, after any `caption` and `colgroup` elements and before any `tbody`, `tfoot`, and `tr` elements, but only if there are no other `thead` elements that are children of the `table`.
- **Content model:** Zero or more `tr` and script-supporting elements.
- **Tag omission:** End tag can be omitted if immediately followed by a `tbody` or `tfoot`.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-thead) · [For implementers](https://w3c.github.io/html-aam/#el-thead).
- **DOM interface:** Uses `HTMLTableSectionElement`, as defined for `tbody`.
  The `thead` element represents the block of rows that consist of the column labels (headers) and any ancillary non-header cells for the parent `table`.
  Example — `thead` with both `th` header cells and `td` instruction cells:

```html

<table>
 <caption> School auction sign-up sheet </caption>
 <thead>
  <tr>
   <th><label for=e1>Name</label>
   <th><label for=e2>Product</label>
   <th><label for=e3>Picture</label>
   <th><label for=e4>Price</label>
  <tr>
   <td>Your name here
   <td>What are you selling?
   <td>Link to a picture
   <td>Your reserve price
 <tbody>
  <tr>
   <td>Ms Danus
   <td>Doughnuts
   <td><img src="https://example.com/mydoughnuts.png" title="Doughnuts from Ms Danus">
   <td>$45
  <tr>
   <td><input id=e1 type=text name=who required form=f>
   <td><input id=e2 type=text name=what required form=f>
   <td><input id=e3 type=url name=pic form=f>
   <td><input id=e4 type=number step=0.01 min=0 value=0 required form=f>
</table>
<form id=f action="/auction.cgi">
 <input type=button name=add value="Submit">
</form>

```

---

## 4.9.7 The `tfoot` element

- **Categories:** None.
- **Contexts:** As a child of a `table` element, after any `caption`, `colgroup`, `thead`, `tbody`, and `tr` elements, but only if there are no other `tfoot` elements that are children of the `table`.
- **Content model:** Zero or more `tr` and script-supporting elements.
- **Tag omission:** End tag can be omitted if there is no more content in the parent.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-tfoot) · [For implementers](https://w3c.github.io/html-aam/#el-tfoot).
- **DOM interface:** Uses `HTMLTableSectionElement`, as defined for `tbody`.
  The `tfoot` element represents the block of rows that consist of the column summaries (footers) for the parent `table`.

---

## 4.9.8 The `tr` element

- **Categories:** None.
- **Contexts:** As a child of `thead`, `tbody`, or `tfoot`; or as a child of a `table` element after any `caption`, `colgroup`, and `thead` elements, but only if there are no `tbody` children.
- **Content model:** Zero or more `td`, `th`, and script-supporting elements.
- **Tag omission:** End tag can be omitted if immediately followed by another `tr`, or if there is no more content in the parent.
- **Content attributes:** Global attributes.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-tr) · [For implementers](https://w3c.github.io/html-aam/#el-tr).

```webidl
[Exposed=Window]
interface HTMLTableRowElement : HTMLElement {
  [HTMLConstructor] constructor();
  readonly attribute long rowIndex;
  readonly attribute long sectionRowIndex;
  [SameObject] readonly attribute HTMLCollection cells;
  HTMLTableCellElement insertCell(optional long index = -1);
  [CEReactions] undefined deleteCell(long index);
  // also has obsolete members
};

```

The `tr` element represents a row of cells in a table.

### DOM API — `HTMLTableRowElement`

`tr.rowIndex`
Returns the position of this row in the table's `rows` collection. Returns -1 if not in a table.
`tr.sectionRowIndex`
Returns the position of this row in the table section's `rows` collection. Returns -1 if not in a table section.
`tr.cells`
Returns an `HTMLCollection` of the `td` and `th` elements that are children of this row.
`cell = tr.insertCell([ index ])`
Creates a `td`, inserts it at the given position in the row, and returns it. Index -1 (default) inserts at end. Throws `IndexSizeError` if out of range.
`tr.deleteCell(index)`
Removes the `td` or `th` at the given position. Index -1 removes last. Throws `IndexSizeError` if out of range.
The `rowIndex` attribute returns the index in the parent table's `rows` collection, or -1 if there is no such table ancestor. The `sectionRowIndex` attribute returns the index in the parent section's `rows` collection, or -1 if there is no such section.
The `cells` attribute returns an `HTMLCollection` rooted at this `tr`, matching only `td` and `th` children.

---

## 4.9.9 The `td` element

- **Categories:** None.
- **Contexts:** As a child of a `tr` element.
- **Content model:** Flow content.
- **Tag omission:** End tag can be omitted if immediately followed by a `td` or `th`, or if there is no more content in the parent.
- **Content attributes:** Global attributes; `colspan`, `rowspan`, `headers`.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-td) · [For implementers](https://w3c.github.io/html-aam/#el-td).

```webidl
[Exposed=Window]
interface HTMLTableCellElement : HTMLElement {
  [HTMLConstructor] constructor();
  [CEReactions, Reflect, ReflectDefault=1, ReflectRange=(1, 1000)] attribute unsigned long colSpan;
  [CEReactions, Reflect, ReflectDefault=1, ReflectRange=(0, 65534)] attribute unsigned long rowSpan;
  [CEReactions, Reflect] attribute DOMString headers;
  readonly attribute long cellIndex;
  [CEReactions] attribute DOMString scope; // only conforming for th elements
  [CEReactions, Reflect] attribute DOMString abbr; // only conforming for th elements
  // also has obsolete members
};

```

`HTMLTableCellElement` is also used for `th` elements.
The `td` element represents a data cell in a table. Its `colspan`, `rowspan`, and `headers` attributes take part in the table model.
User agents (especially non-visual) may give users context for a cell — its position in the table model, or its associated header cells. When listing header cells, user agents may use the `abbr` attribute value instead of the full header cell content.

```html

<table>
 <tr> <th><input value="Name">  <th><input value="Paid ($)">
 <tr> <td><input value="Jeff">  <td><input value="14">
 <tr> <td><input value="Britta"> <td><input value="9">
 <tr> <td><input value="Abed">  <td><input value="25">
 <tr> <th><input value="Total"> <td><output value="49">
</table>

```

---

## 4.9.10 The `th` element

- **Categories:** None.
- **Contexts:** As a child of a `tr` element.
- **Content model:** Flow content, but with no `header`, `footer`, sectioning content, or heading content descendants.
- **Tag omission:** End tag can be omitted if immediately followed by a `td` or `th`, or if there is no more content in the parent.
- **Content attributes:** Global attributes; `colspan`, `rowspan`, `headers`, `scope`, `abbr`.
- **Accessibility:** [For authors](https://w3c.github.io/html-aria/#el-th) · [For implementers](https://w3c.github.io/html-aam/#el-th).
- **DOM interface:** Uses `HTMLTableCellElement`, as defined for `td`.
  The `th` element represents a header cell in a table.

### The `scope` attribute

Enumerated attribute specifying which cells the header applies to:
| Keyword | State | Description |
| --- | --- | --- |
| `row` | Row | Applies to subsequent cells in the same row(s) |
| `col` | Column | Applies to subsequent cells in the same column(s) |
| `rowgroup` | Row Group | Applies to all remaining cells in the row group |
| `colgroup` | Column Group | Applies to all remaining cells in the column group |
Missing-value default and invalid-value default are both the **Auto** state (applies to a set of cells selected based on context).
A `th`'s `scope` must not be in the Row Group state if the element is not anchored in a row group, nor in the Column Group state if not anchored in a column group.

### The `abbr` attribute

An alternative label for the header cell to use when referencing the cell in other contexts. Typically an abbreviated form, but can also be an expansion or different phrasing.
Example of `scope="rowgroup"`:

```html

<table>
 <thead>
  <tr> <th> ID <th> Measurement <th> Average <th> Maximum
 <tbody>
  <tr> <td> <th scope=rowgroup> Cats <td> <td>
  <tr> <td> 93 <th> Legs <td> 3.5 <td> 4
  <tr> <td> 10 <th> Tails <td> 1 <td> 1
 <tbody>
  <tr> <td> <th scope=rowgroup> English speakers <td> <td>
  <tr> <td> 32 <th> Legs <td> 2.67 <td> 4
  <tr> <td> 35 <th> Tails <td> 0.33 <td> 1
</table>

```

- The first-row headers apply directly down to rows in their column.
- `scope=rowgroup` headers apply to all cells in their row group except the first column.
- Remaining headers apply to cells to the right of them.

---

## 4.9.11 Attributes common to `td` and `th` elements

### `colspan`

Value must be a valid non-negative integer > 0 and <= 1000. Gives the number of columns the cell spans. Must not be used to cause overlap.

### `rowspan`

Value must be a valid non-negative integer <= 65534. A value of zero means the cell spans all remaining rows in the row group. Must not be used to cause overlap.

### `headers`

Must contain an unordered set of unique space-separated tokens, each the ID of a `th` element in the same table. Explicitly associates the cell with specific header cells.
A `th` with ID `id` is _directly targeted_ by any `td`/`th` in the same table whose `headers` attribute includes `id` as a token. Targeting is transitive. A `th` must not be _targeted_ by itself.

### `cellIndex`

`cell.cellIndex`
Returns the position of the cell in the row's `cells` list. Does not necessarily correspond to the visual x-position — earlier cells with `colspan`/`rowspan` may cover multiple columns. Returns -1 if the element is not in a row.

---

## 4.9.12 Processing model

The various table elements and their content attributes together define the table model.
A **table** consists of cells aligned on a two-dimensional grid of slots with coordinates (x, y). The grid is finite; x ranges `0 <= x < xwidth` and y ranges `0 <= y < yheight`. When either dimension is zero the table is empty.
A **cell** is a set of slots anchored at (cellx, celly) with a given width and height, covering all (x, y) where `cellx <= x < cellx+width` and `celly <= y < celly+height`. Cells are either _data cells_ (`td`) or _header cells_ (`th`). Both types can have zero or more associated header cells. It is possible (in error cases) for two cells to occupy the same slot.
A **row** is a complete set of slots from x=0 to x=xwidth-1 for a particular y. Rows correspond to `tr` elements; a row group can also have implied rows at the end from cells spanning multiple rows.
A **column** is a complete set of slots from y=0 to y=yheight-1 for a particular x. Columns correspond to `col` elements; in their absence, columns are implied.
A **row group** is a set of rows anchored at (0, groupy) covering all (x, y) where `groupy <= y < groupy+height`. Row groups correspond to `tbody`, `thead`, and `tfoot`. Not every row must be in a row group.
A **column group** is a set of columns anchored at (groupx, 0) covering all (x, y) where `groupx <= x < groupx+width`. Column groups correspond to `colgroup`. Not every column must be in a column group.
Row groups and column groups must not overlap each other. A cell cannot cover slots from two or more row groups. A cell can be in multiple column groups.
A **table model error** is an error with data represented by `table` elements. Documents must not have table model errors.

### 4.9.12.1 Forming a table

To determine which elements correspond to which slots, their dimensions, and detect table model errors:

1. Let xwidth = 0, yheight = 0, pending `tfoot` elements = empty list.
2. If the `table` has no element children, return an empty table.
3. Associate the first `caption` child with the table.
4. **Column groups phase:** For each `colgroup` child:
   - With `col` children: process each `col`'s `span` (default 1, max 1000), increase xwidth, form column groups.
   - Without `col` children: parse `colgroup`'s `span` (default 1, max 1000), increase xwidth, form column group.
5. Let ycurrent = 0. Let downward-growing cells = empty list.
6. **Rows phase:** For each `thead`, `tbody`, `tfoot`, or `tr` child:
   - If `tr`: run algorithm for processing rows, then advance.
   - If `tfoot`: add to pending list, then advance.
   - If `thead` or `tbody`: run algorithm for processing row groups, then advance.
7. **End:** For each pending `tfoot`, run algorithm for processing row groups.
8. If any row or column contains only unanchored slots, this is a table model error.
9. Return the table.
   **Algorithm for processing row groups** (`thead`, `tbody`, `tfoot`):
10. Let ystart = yheight.
11. For each `tr` child, run algorithm for processing rows.
12. If yheight > ystart, form a new row group anchored at (0, ystart) with height yheight-ystart.
13. Run algorithm for ending a row group.
    **Algorithm for ending a row group:**
14. While ycurrent < yheight: run growing downward-growing cells, then increment ycurrent.
15. Empty the downward-growing cells list.
    **Algorithm for processing rows** (`tr`):
16. If yheight = ycurrent, increment yheight.
17. Let xcurrent = 0. Run growing downward-growing cells.
18. If no `td`/`th` children, increment ycurrent and return.
19. For each `td`/`th` child:
    - Skip already-covered slots (increment xcurrent).
    - Parse `colspan` (default 1, max 1000) and `rowspan` (default 1, max 65534). If rowspan=0, set "grows downward" = true and rowspan=1.
    - Expand xwidth/yheight as needed.
    - Anchor a new cell at (xcurrent, ycurrent). Assign header cells via the header assignment algorithm. If two cells overlap, this is a table model error.
    - If grows downward, add to downward-growing cells list.
    - Increment xcurrent by colspan.
20. Increment ycurrent.
    **Algorithm for growing downward-growing cells:** For each `{cell, cellx, width}`, extend the cell to also cover (x, ycurrent) where `cellx <= x < cellx+width`.

### 4.9.12.2 Forming relationships between data cells and header cells

Each cell is assigned zero or more header cells via the header assignment algorithm:

1. Let header list = empty.
2. **If the cell has a `headers` attribute:** split on whitespace; for each token, if the element with that ID is a `th` in the same table (and not the principal cell), add it to the header list.
3. **If no `headers` attribute:**
   - For each y in the cell's height: scan leftward for header cells.
   - For each x in the cell's width: scan upward for header cells.
   - Add row group headers from the same row group.
   - Add column group headers from the same column group.
4. Remove empty cells, duplicates, and the principal cell from the header list.
5. Assign the remaining headers to the cell.
   **Scanning algorithm:** Walk in the given direction; stop if x or y goes below 0; skip empty slots; for each header cell found, add to header list unless blocked (blocked = a same-axis opaque header with the same span exists, or the cell is not the appropriate kind of header for the scan direction). After passing a data cell, mark preceding header block as opaque.
   **Header cell categorization:**

- **Column header:** `scope="col"`, or `scope` is Auto and no data cells occupy any slot along y..y+height-1.
- **Row header:** `scope="row"`, or `scope` is Auto, cell is not a column header, and no data cells occupy any slot along x..x+width-1.
- **Column group header:** `scope="colgroup"`.
- **Row group header:** `scope="rowgroup"`.
- **Empty cell:** Contains no elements and only ASCII whitespace text.

---

## 4.9.13 Examples

_This section is non-normative._

### Steel castings table (rowspan + colspan)

```html
<table>
 <caption>Specification values: <b>Steel</b>, <b>Castings</b>,
 Ann. A.S.T.M. A27-16, Class B;* P max. 0.06; S max. 0.05.</caption>
 <thead>
  <tr>
   <th rowspan=2>Grade.
   <th rowspan=2>Yield Point.
   <th colspan=2>Ultimate tensile strength
   <th rowspan=2>Per cent elong. 50.8&nbsp;mm or 2&nbsp;in.
   <th rowspan=2>Per cent reduct. area.
  <tr>
   <th>kg/mm<sup>2</sup>
   <th>lb/in<sup>2</sup>
 <tbody>
  <tr> <td>Hard   <td>0.45 ultimate <td>56.2 <td>80,000 <td>15 <td>20
  <tr> <td>Medium <td>0.45 ultimate <td>49.2 <td>70,000 <td>18 <td>25
  <tr> <td>Soft   <td>0.45 ultimate <td>42.2 <td>60,000 <td>22 <td>30
</table>

```

### Apple gross margin table (multiple `tbody` + `tfoot`)

```html
<table>
 <thead>
  <tr> <th> <th>2008 <th>2007 <th>2006
 <tbody>
  <tr> <th>Net sales    <td>$ 32,479 <td>$ 24,006 <td>$ 19,315
  <tr> <th>Cost of sales <td>21,334  <td>15,852   <td>13,717
 <tbody>
  <tr> <th>Gross margin <td>$ 11,145 <td>$  8,154 <td>$  5,598
 <tfoot>
  <tr> <th>Gross margin percentage <td>34.3% <td>34.0% <td>29.0%
</table>

```

### Apple operating expenses table (`colgroup` + `scope=rowgroup`)

```html
<table>
 <colgroup> <col>
 <colgroup> <col> <col> <col>
 <thead>
  <tr> <th> <th>2008 <th>2007 <th>2006
 <tbody>
  <tr> <th scope=rowgroup> Research and development
       <td>$ 1,109 <td>$ 782 <td>$ 712
  <tr> <th scope=row> Percentage of net sales
       <td>3.4% <td>3.3% <td>3.7%
 <tbody>
  <tr> <th scope=rowgroup> Selling, general, and administrative
       <td>$ 3,761 <td>$ 2,963 <td>$ 2,433
  <tr> <th scope=row> Percentage of net sales
       <td>11.6% <td>12.3% <td>12.6%
</table>

```
