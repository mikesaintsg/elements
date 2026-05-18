import type { ContentCategory, ContentModel, ContentModelEntry } from './types.js'
import {
	arrayShape,
	booleanShape,
	compileContract,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
} from '@elements/core'
import { defineModel } from './helpers.js'

// ============================================================================
// HTML Content-Model Schema Registry (TS mirror of guides/w3c/**)
//
// One ContentModelEntry per HTML element the WHATWG spec cards. This is the
// frozen TS mirror of the curated W3C corpus under guides/w3c/** — shaped
// exactly like taxonomy.ts: a frozen array authored through a typed
// `defineModel(...)` helper, pre-computed ReadonlyMap / ReadonlySet indices,
// and single-word predicate getters.
//
// Each entry carries:
//
//   - tag          the HTML tag name (lowercase, no chevrons)
//   - categories   the content categories the element belongs to, derived
//                   verbatim from the card's **Categories** box and the
//                   guides/w3c/categories.md §3.2.5 vocabulary
//   - context      a faithful restatement of the card's **Contexts** box
//   - model        the content-model shape (transparent/void/text/nothing/
//                   children) read from the card's **Content model** box
//   - required     the ordered/cardinal child spec when the card constrains
//                   the child list (the table model, list models, hgroup,
//                   picture, …); empty for free flow/phrasing content
//   - forbidden    forbidden descendant categories/tags the card's prose
//                   names (e.g. dt forbids header/footer/sectioning/heading)
//   - constraints  the discrete tree-decidable named constraints encoded as
//                   DATA (no-self-nest, single-first-child, edge-child,
//                   parent-restricted, group-order, child-order, …) so the
//                   Phase-3 rules stay generic, never per-element hand-code
//   - attributes   the attribute-coupling rules the card states
//   - transparent  derived: model === 'transparent'
//   - void         derived: model === 'void'
//   - cite         the guides/w3c card anchor — `{file}#the-{tag}-element`
//                   (the canonical WHATWG anchor convention); the Phase-1
//                   parity test resolves it bidirectionally
//
// Source of truth: the live WHATWG spec, mirrored by guides/w3c/**. The
// parity test at tests/guides/w3c.test.ts fails when:
//   - a guides/w3c/** carded element has no contentModel entry;
//   - a contentModel entry has no card;
//   - an entry's categories/context/model contradict the card prose;
//   - an entry's `cite` does not resolve to a real card heading.
//
// The frozen array below is the AUTHORING surface; `contentModelContract`
// (an @elements/core ContractShape run through compileContract) is its
// compiled contract — a runtime guard + JSON Schema + seeded generator,
// DERIVED from ContentModelEntry, never duplicated. The registry is
// validated against the guard at module load (see CONTRACT_GUARDED below).
// ============================================================================

// ── Registry ────────────────────────────────────────────────────────────────
//
// Grouped by the W3C corpus file the entry mirrors, in corpus order, so the
// schema ↔ guides/w3c/** diff is a clean visual map.

export const contentModel: readonly ContentModelEntry[] = [
	// §4.1–4.2 The document element + document metadata (document.md)
	defineModel(
		'html',
		[],
		'As the document’s document element.',
		'children',
		'document#the-html-element',
		{
			required: [
				{ tag: 'head', count: '1' },
				{ tag: 'body', count: '1' },
			],
			attributes: [{ attribute: 'manifest', note: 'obsolete' }],
		},
	),
	defineModel(
		'head',
		[],
		'As the first element in an html element.',
		'children',
		'document#the-head-element',
	),
	defineModel(
		'title',
		['metadata'],
		'In a head element containing no other title elements.',
		'text',
		'document#the-title-element',
	),
	defineModel(
		'base',
		['metadata'],
		'In a head element containing no other base elements.',
		'void',
		'document#the-base-element',
		{ attributes: [{ attribute: 'href' }, { attribute: 'target' }] },
	),
	defineModel(
		'link',
		['metadata', 'flow', 'phrasing'],
		'Where metadata content is expected; in a noscript child of head; if body-OK where phrasing content is expected.',
		'void',
		'document#the-link-element',
	),
	defineModel(
		'meta',
		['metadata', 'flow', 'phrasing'],
		'Where metadata content is expected; if itemprop is present where flow/phrasing content is expected.',
		'void',
		'document#the-meta-element',
	),
	defineModel(
		'style',
		['metadata'],
		'Where metadata content is expected; in a noscript child of head.',
		'text',
		'document#the-style-element',
	),

	// §4.3 Sections (sections.md)
	defineModel(
		'body',
		[],
		'As the second element in an html element.',
		'children',
		'sections#the-body-element',
	),
	defineModel(
		'article',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-article-element',
	),
	defineModel(
		'section',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-section-element',
	),
	defineModel(
		'nav',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-nav-element',
	),
	defineModel(
		'aside',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-aside-element',
	),
	...(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) =>
		defineModel(
			tag,
			['flow', 'heading', 'palpable'],
			'As a child of an hgroup element; where heading content is expected.',
			'children',
			'sections#the-h1-h2-h3-h4-h5-and-h6-elements',
		),
	),
	defineModel(
		'hgroup',
		['flow', 'heading', 'palpable'],
		'Where heading content is expected.',
		'children',
		'sections#the-hgroup-element',
		{
			required: [
				{ tag: 'p', count: '*' },
				{ tag: 'h1', count: '1' },
				{ tag: 'p', count: '*' },
			],
			constraints: [
				{
					kind: 'child-order',
					sequence: [
						{ tag: 'p', count: '*' },
						{ tag: 'h1', count: '1' },
						{ tag: 'p', count: '*' },
					],
					note: 'Zero or more p, then one h1–h6, then zero or more p, optionally intermixed with script-supporting elements.',
				},
			],
		},
	),
	defineModel(
		'header',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-header-element',
		{ forbidden: ['header', 'footer'] },
	),
	defineModel(
		'footer',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-footer-element',
		{ forbidden: ['header', 'footer'] },
	),
	defineModel(
		'address',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-address-element',
		{ forbidden: ['heading', 'sectioning', 'header', 'footer', 'address'] },
	),

	// §4.4 Grouping content (groupings.md)
	defineModel(
		'p',
		['flow', 'palpable'],
		'Where flow content is expected; as a child of an hgroup element.',
		'children',
		'groupings#the-p-element',
	),
	defineModel(
		'hr',
		['flow'],
		'Where flow content is expected; as a child of a select element.',
		'void',
		'groupings#the-hr-element',
	),
	defineModel(
		'pre',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-pre-element',
	),
	defineModel(
		'blockquote',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-blockquote-element',
		{ attributes: [{ attribute: 'cite' }] },
	),
	defineModel(
		'ol',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-ol-element',
		{
			required: [
				{ tag: 'li', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
			attributes: [{ attribute: 'reversed' }, { attribute: 'start' }, { attribute: 'type' }],
		},
	),
	defineModel(
		'ul',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-ul-element',
		{
			required: [
				{ tag: 'li', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
		},
	),
	defineModel(
		'menu',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-menu-element',
		{
			required: [
				{ tag: 'li', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
		},
	),
	defineModel(
		'li',
		[],
		'Inside ol elements; inside ul elements; inside menu elements.',
		'children',
		'groupings#the-li-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['ul', 'ol', 'menu'],
					note: 'An li element must be a child of an ol, ul, or menu element.',
				},
			],
			attributes: [{ attribute: 'value', note: 'only if not a child of ul/menu' }],
		},
	),
	defineModel(
		'dl',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-dl-element',
		{
			constraints: [
				{
					kind: 'group-order',
					sequence: [
						{ tag: 'dt', count: '+' },
						{ tag: 'dd', count: '+' },
					],
					note: 'Either: zero or more groups of one or more dt followed by one or more dd, optionally intermixed with script-supporting elements. Or: one or more div elements, optionally intermixed with script-supporting elements.',
				},
			],
		},
	),
	defineModel(
		'dt',
		[],
		'Before dd or dt elements inside dl elements (or inside div children of a dl).',
		'children',
		'groupings#the-dt-element',
		{ forbidden: ['header', 'footer', 'sectioning', 'heading'] },
	),
	defineModel(
		'dd',
		[],
		'After dt or dd elements inside dl elements (or inside div children of a dl).',
		'children',
		'groupings#the-dd-element',
	),
	defineModel(
		'figure',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-figure-element',
		{
			constraints: [
				{
					kind: 'child-order',
					child: 'figcaption',
					note: 'Either one figcaption followed by flow content, or flow content followed by one figcaption, or flow content.',
				},
			],
		},
	),
	defineModel(
		'figcaption',
		[],
		'As the first or last child of a figure element.',
		'children',
		'groupings#the-figcaption-element',
		{
			constraints: [
				{
					kind: 'edge-child',
					parents: ['figure'],
					edge: 'first-or-last',
					note: 'As the first or last child of a figure element.',
				},
			],
		},
	),
	defineModel(
		'main',
		['flow', 'palpable'],
		'Where flow content is expected, but only if it is a hierarchically correct main element.',
		'children',
		'groupings#the-main-element',
	),
	defineModel(
		'search',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-search-element',
	),
	defineModel(
		'div',
		['flow', 'palpable'],
		'Where flow content is expected; as a child of a dl element.',
		'children',
		'groupings#the-div-element',
	),

	// §4.5 Text-level semantics (texts.md)
	defineModel(
		'a',
		['flow', 'phrasing', 'interactive', 'palpable', 'transparent'],
		'Where phrasing content is expected.',
		'transparent',
		'texts#the-a-element',
		{
			forbidden: ['interactive', 'a'],
			constraints: [
				{ kind: 'no-self-nest', note: 'No a element descendant.' },
				{
					kind: 'no-interactive-descendant',
					note: 'No interactive content descendant.',
				},
				{
					kind: 'no-tabindex-descendant',
					note: 'No descendant with the tabindex attribute specified.',
				},
			],
			attributes: [
				{ attribute: 'target', requires: 'href' },
				{ attribute: 'download', requires: 'href' },
				{ attribute: 'ping', requires: 'href' },
				{ attribute: 'rel', requires: 'href' },
				{ attribute: 'hreflang', requires: 'href' },
				{ attribute: 'type', requires: 'href' },
				{ attribute: 'referrerpolicy', requires: 'href' },
			],
		},
	),
	defineModel(
		'em',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-em-element',
	),
	defineModel(
		'strong',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-strong-element',
	),
	defineModel(
		'small',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-small-element',
	),
	defineModel(
		's',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-s-element',
	),
	defineModel(
		'cite',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-cite-element',
	),
	defineModel(
		'q',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-q-element',
		{ attributes: [{ attribute: 'cite' }] },
	),
	defineModel(
		'dfn',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-dfn-element',
		{
			forbidden: ['dfn'],
			constraints: [{ kind: 'no-self-nest', note: 'No dfn element descendants.' }],
		},
	),
	defineModel(
		'abbr',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-abbr-element',
	),
	defineModel(
		'ruby',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-ruby-element',
		{
			constraints: [
				{
					kind: 'group-order',
					sequence: [
						{ tag: 'rp', count: '?' },
						{ tag: 'rt', count: '+' },
						{ tag: 'rp', count: '?' },
					],
					note: 'Phrasing content interleaved with rt elements, each optionally bracketed by rp elements (see prose).',
				},
			],
		},
	),
	defineModel('rt', [], 'As a child of a ruby element.', 'children', 'texts#the-rt-element', {
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['ruby'],
				note: 'As a child of a ruby element.',
			},
		],
	}),
	defineModel(
		'rp',
		[],
		'As a child of a ruby element, immediately before or after an rt element.',
		'text',
		'texts#the-rp-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['ruby'],
					note: 'As a child of a ruby element, immediately before or after an rt element.',
				},
			],
		},
	),
	defineModel(
		'data',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-data-element',
		{ attributes: [{ attribute: 'value', required: true }] },
	),
	defineModel(
		'time',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-time-element',
		{
			attributes: [
				{
					attribute: 'datetime',
					note: 'Without datetime the text content must be a valid datetime.',
				},
			],
		},
	),
	defineModel(
		'code',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-code-element',
	),
	defineModel(
		'var',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-var-element',
	),
	defineModel(
		'samp',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-samp-element',
	),
	defineModel(
		'kbd',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-kbd-element',
	),
	...(['sub', 'sup'] as const).map((tag) =>
		defineModel(
			tag,
			['flow', 'phrasing', 'palpable'],
			'Where phrasing content is expected.',
			'children',
			'texts#the-sub-and-sup-elements',
		),
	),
	defineModel(
		'i',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-i-element',
	),
	defineModel(
		'b',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-b-element',
	),
	defineModel(
		'u',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-u-element',
	),
	defineModel(
		'mark',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-mark-element',
	),
	defineModel(
		'bdi',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-bdi-element',
	),
	defineModel(
		'bdo',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-bdo-element',
		{ attributes: [{ attribute: 'dir', values: ['ltr', 'rtl'], required: true }] },
	),
	defineModel(
		'span',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-span-element',
	),
	defineModel(
		'br',
		['flow', 'phrasing'],
		'Where phrasing content is expected.',
		'void',
		'texts#the-br-element',
	),
	defineModel(
		'wbr',
		['flow', 'phrasing'],
		'Where phrasing content is expected.',
		'void',
		'texts#the-wbr-element',
	),

	// §4.7 Edits (edits.md)
	defineModel(
		'ins',
		['flow', 'phrasing', 'palpable', 'transparent'],
		'Where phrasing content is expected.',
		'transparent',
		'edits#the-ins-element',
		{ attributes: [{ attribute: 'cite' }, { attribute: 'datetime' }] },
	),
	defineModel(
		'del',
		['flow', 'phrasing', 'palpable', 'transparent'],
		'Where phrasing content is expected.',
		'transparent',
		'edits#the-del-element',
		{ attributes: [{ attribute: 'cite' }, { attribute: 'datetime' }] },
	),

	// §4.8 Embedded content (embeddeds.md)
	defineModel(
		'picture',
		['flow', 'phrasing', 'embedded', 'palpable'],
		'Where embedded content is expected.',
		'children',
		'embeddeds#the-picture-element',
		{
			required: [
				{ tag: 'source', count: '*' },
				{ tag: 'img', count: '1' },
			],
			constraints: [
				{
					kind: 'child-order',
					sequence: [
						{ tag: 'source', count: '*' },
						{ tag: 'img', count: '1' },
					],
					note: 'Zero or more source elements, followed by one img element, optionally intermixed with script-supporting elements.',
				},
			],
		},
	),
	defineModel(
		'source',
		[],
		'As a child of a picture element before img; as a child of a media element before flow content / track.',
		'void',
		'embeddeds#the-source-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['picture', 'audio', 'video'],
					note: 'As a child of a picture element or a media element.',
				},
			],
		},
	),
	defineModel(
		'img',
		['flow', 'phrasing', 'embedded', 'palpable', 'interactive'],
		'Where embedded content is expected; as a child of a picture element after all source elements.',
		'void',
		'embeddeds#the-img-element',
	),
	defineModel(
		'iframe',
		['flow', 'phrasing', 'embedded', 'interactive', 'palpable'],
		'Where embedded content is expected.',
		'nothing',
		'embeddeds#the-iframe-element',
	),
	defineModel(
		'embed',
		['flow', 'phrasing', 'embedded', 'interactive', 'palpable'],
		'Where embedded content is expected.',
		'void',
		'embeddeds#the-embed-element',
	),
	defineModel(
		'object',
		['flow', 'phrasing', 'embedded', 'palpable', 'transparent'],
		'Where embedded content is expected.',
		'transparent',
		'embeddeds#the-object-element',
		{
			attributes: [
				{ attribute: 'data' },
				{ attribute: 'type' },
				{ attribute: 'name' },
				{ attribute: 'form' },
			],
		},
	),
	defineModel(
		'video',
		['flow', 'phrasing', 'embedded', 'interactive', 'palpable', 'transparent'],
		'Where embedded content is expected.',
		'transparent',
		'embeddeds#the-video-element',
		{
			forbidden: ['audio', 'video'],
			constraints: [
				{
					kind: 'child-order',
					sequence: [
						{ tag: 'source', count: '*' },
						{ tag: 'track', count: '*' },
					],
					note: 'Zero or more source (if no src) then zero or more track, then transparent, but with no media element descendants.',
				},
			],
		},
	),
	defineModel(
		'audio',
		['flow', 'phrasing', 'embedded', 'interactive', 'palpable', 'transparent'],
		'Where embedded content is expected.',
		'transparent',
		'embeddeds#the-audio-element',
		{
			forbidden: ['audio', 'video'],
			constraints: [
				{
					kind: 'child-order',
					sequence: [
						{ tag: 'source', count: '*' },
						{ tag: 'track', count: '*' },
					],
					note: 'Zero or more source (if no src) then zero or more track, then transparent, but with no media element descendants.',
				},
			],
		},
	),
	defineModel(
		'track',
		[],
		'As a child of a media element (audio/video), before any flow content.',
		'void',
		'embeddeds#the-track-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['audio', 'video'],
					note: 'As a child of a media element (audio/video).',
				},
			],
		},
	),
	defineModel(
		'map',
		['flow', 'phrasing', 'palpable', 'transparent'],
		'Where phrasing content is expected.',
		'transparent',
		'embeddeds#the-map-element',
		{ attributes: [{ attribute: 'name', required: true }] },
	),
	defineModel(
		'area',
		['flow', 'phrasing'],
		'Where phrasing content is expected, but only if there is a map element ancestor.',
		'void',
		'embeddeds#the-area-element',
		{
			attributes: [
				{ attribute: 'target', requires: 'href' },
				{ attribute: 'download', requires: 'href' },
				{ attribute: 'ping', requires: 'href' },
				{ attribute: 'rel', requires: 'href' },
				{ attribute: 'referrerpolicy', requires: 'href' },
			],
		},
	),
	defineModel(
		'canvas',
		['flow', 'phrasing', 'embedded', 'palpable', 'transparent'],
		'Where embedded content is expected.',
		'transparent',
		'embeddeds#the-canvas-element',
		{
			constraints: [
				{
					kind: 'no-interactive-descendant',
					note: 'No interactive content descendants except a, img[usemap], button, certain input, and multi-select.',
				},
			],
		},
	),
	defineModel(
		'math',
		['flow', 'phrasing', 'embedded', 'palpable'],
		'Where embedded content is expected.',
		'children',
		'embeddeds#mathml-the-math-element',
	),
	defineModel(
		'svg',
		['flow', 'phrasing', 'embedded', 'palpable'],
		'Where embedded content is expected.',
		'children',
		'embeddeds#svg-the-svg-element',
	),

	// §4.9 Tabular data (tables.md)
	defineModel(
		'table',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'tables#the-table-element',
		{
			required: [
				{ tag: 'caption', count: '?' },
				{ tag: 'colgroup', count: '*' },
				{ tag: 'thead', count: '?' },
				{ tag: 'tbody', count: '*' },
				{ tag: 'tfoot', count: '?' },
			],
			constraints: [
				{
					kind: 'child-order',
					sequence: [
						{ tag: 'caption', count: '?' },
						{ tag: 'colgroup', count: '*' },
						{ tag: 'thead', count: '?' },
						{ tag: 'tbody', count: '*' },
						{ tag: 'tfoot', count: '?' },
					],
					note: 'Optionally a caption, then zero or more colgroup, then optionally a thead, then zero or more tbody or one or more tr, then optionally a tfoot, optionally intermixed with script-supporting elements.',
				},
			],
		},
	),
	defineModel(
		'caption',
		[],
		'As the first element child of a table element.',
		'children',
		'tables#the-caption-element',
		{
			forbidden: ['table'],
			constraints: [
				{
					kind: 'single-first-child',
					parents: ['table'],
					note: 'As the first element child of a table element.',
				},
			],
		},
	),
	defineModel(
		'colgroup',
		[],
		'As a child of a table element, after any caption and before any thead/tbody/tfoot/tr.',
		'children',
		'tables#the-colgroup-element',
		{
			required: [
				{ tag: 'col', count: '*' },
				{ tag: 'template', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					note: 'As a child of a table element.',
				},
			],
		},
	),
	defineModel(
		'col',
		[],
		'As a child of a colgroup element that doesn’t have a span attribute.',
		'void',
		'tables#the-col-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['colgroup'],
					note: 'As a child of a colgroup element without a span attribute.',
				},
			],
		},
	),
	defineModel(
		'tbody',
		[],
		'As a child of a table element, after any caption/colgroup/thead.',
		'children',
		'tables#the-tbody-element',
		{
			required: [
				{ tag: 'tr', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					note: 'As a child of a table element.',
				},
			],
		},
	),
	defineModel(
		'thead',
		[],
		'As a child of a table element, after any caption/colgroup and before any tbody/tfoot/tr.',
		'children',
		'tables#the-thead-element',
		{
			required: [
				{ tag: 'tr', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					note: 'As a child of a table element.',
				},
			],
		},
	),
	defineModel(
		'tfoot',
		[],
		'As a child of a table element, after any caption/colgroup/thead/tbody/tr.',
		'children',
		'tables#the-tfoot-element',
		{
			required: [
				{ tag: 'tr', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					note: 'As a child of a table element.',
				},
			],
		},
	),
	defineModel(
		'tr',
		[],
		'As a child of thead, tbody, or tfoot; or as a child of a table (legacy).',
		'children',
		'tables#the-tr-element',
		{
			required: [
				{ tag: 'td', count: '*' },
				{ tag: 'th', count: '*' },
				{ tag: 'script', count: '*' },
				{ tag: 'template', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['thead', 'tbody', 'tfoot', 'table'],
					note: 'As a child of a thead, tbody, or tfoot element.',
				},
			],
		},
	),
	defineModel('td', [], 'As a child of a tr element.', 'children', 'tables#the-td-element', {
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['tr'],
				note: 'As a child of a tr element.',
			},
		],
	}),
	defineModel('th', [], 'As a child of a tr element.', 'children', 'tables#the-th-element', {
		forbidden: ['header', 'footer', 'sectioning', 'heading'],
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['tr'],
				note: 'As a child of a tr element.',
			},
		],
		attributes: [{ attribute: 'scope', values: ['row', 'col', 'rowgroup', 'colgroup'] }],
	}),

	// §4.10 Forms (forms.md)
	defineModel(
		'form',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'forms#the-form-element',
		{
			forbidden: ['form'],
			constraints: [{ kind: 'no-self-nest', note: 'No form element descendants.' }],
		},
	),
	defineModel(
		'label',
		['flow', 'phrasing', 'interactive', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-label-element',
		{
			forbidden: ['label'],
			attributes: [{ attribute: 'for' }],
		},
	),
	defineModel(
		'input',
		['flow', 'phrasing', 'interactive', 'palpable'],
		'Where phrasing content is expected.',
		'void',
		'forms#the-input-element',
		{ attributes: [{ attribute: 'type' }, { attribute: 'name' }, { attribute: 'value' }] },
	),
	defineModel(
		'button',
		['flow', 'phrasing', 'interactive', 'palpable'],
		'Where phrasing content is expected; as the first child of a select element.',
		'children',
		'forms#the-button-element',
		{
			forbidden: ['interactive'],
			constraints: [
				{
					kind: 'no-interactive-descendant',
					note: 'No interactive content descendant.',
				},
				{
					kind: 'no-tabindex-descendant',
					note: 'No descendant with the tabindex attribute specified.',
				},
			],
			attributes: [{ attribute: 'type' }, { attribute: 'name' }, { attribute: 'value' }],
		},
	),
	defineModel(
		'select',
		['flow', 'phrasing', 'interactive', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-select-element',
		{
			required: [
				{ tag: 'button', count: '?' },
				{ tag: 'option', count: '*' },
				{ tag: 'optgroup', count: '*' },
				{ tag: 'hr', count: '*' },
			],
		},
	),
	defineModel(
		'datalist',
		['flow', 'phrasing'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-datalist-element',
	),
	defineModel(
		'optgroup',
		[],
		'As a descendant of a select element.',
		'children',
		'forms#the-optgroup-element',
		{
			required: [
				{ tag: 'legend', count: '?' },
				{ tag: 'option', count: '*' },
			],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['select'],
					note: 'As a descendant of a select element.',
				},
			],
			attributes: [{ attribute: 'label' }],
		},
	),
	defineModel(
		'option',
		[],
		'As a descendant of a select element; of a datalist element; of an optgroup element.',
		'text',
		'forms#the-option-element',
		{
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['select', 'optgroup', 'datalist'],
					note: 'As a descendant of a select, datalist, or optgroup element.',
				},
			],
		},
	),
	defineModel(
		'textarea',
		['flow', 'phrasing', 'interactive', 'palpable'],
		'Where phrasing content is expected.',
		'text',
		'forms#the-textarea-element',
	),
	defineModel(
		'output',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-output-element',
		{ attributes: [{ attribute: 'for' }] },
	),
	defineModel(
		'progress',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-progress-element',
		{
			forbidden: ['progress'],
			constraints: [{ kind: 'no-self-nest', note: 'No progress element descendants.' }],
		},
	),
	defineModel(
		'meter',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-meter-element',
		{
			forbidden: ['meter'],
			constraints: [{ kind: 'no-self-nest', note: 'No meter element descendants.' }],
		},
	),
	defineModel(
		'fieldset',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'forms#the-fieldset-element',
		{
			constraints: [
				{
					kind: 'single-first-child',
					child: 'legend',
					note: 'Optionally a legend element, followed by flow content.',
				},
			],
		},
	),
	defineModel(
		'legend',
		[],
		'As the first child of a fieldset element.',
		'children',
		'forms#the-legend-element',
		{
			constraints: [
				{
					kind: 'single-first-child',
					parents: ['fieldset'],
					note: 'As the first child of a fieldset element.',
				},
			],
		},
	),

	// §4.11 Interactive elements (interactives.md)
	defineModel(
		'details',
		['flow', 'interactive', 'palpable'],
		'Where flow content is expected.',
		'children',
		'interactives#the-details-element',
		{
			required: [{ tag: 'summary', count: '1' }],
			constraints: [
				{
					kind: 'single-first-child',
					child: 'summary',
					note: 'One summary element followed by flow content.',
				},
			],
			attributes: [{ attribute: 'name' }, { attribute: 'open' }],
		},
	),
	defineModel(
		'summary',
		[],
		'As the first child of a details element.',
		'children',
		'interactives#the-summary-element',
		{
			constraints: [
				{
					kind: 'single-first-child',
					parents: ['details'],
					note: 'As the first child of a details element.',
				},
			],
		},
	),
	defineModel(
		'dialog',
		['flow'],
		'Where flow content is expected.',
		'children',
		'interactives#the-dialog-element',
		{
			attributes: [
				{ attribute: 'closedby', values: ['any', 'closerequest', 'none'] },
				{ attribute: 'open' },
				{
					attribute: 'tabindex',
					note: 'The tabindex attribute must not be specified on dialog elements.',
				},
			],
		},
	),
] as const

// ── Indices ─────────────────────────────────────────────────────────────────
// Pre-computed lookups so consumers don't `.find()` every call — same shape
// as taxonomy.ts's TAXONOMY_BY_TAG / SUBSTANTIVE_TAGS.

export const SCHEMA_BY_TAG: ReadonlyMap<string, ContentModelEntry> = new Map(
	contentModel.map((row) => [row.tag, row]),
)

export const VOID_TAGS: ReadonlySet<string> = new Set(
	contentModel.filter((row) => row.void).map((row) => row.tag),
)

export const TRANSPARENT_TAGS: ReadonlySet<string> = new Set(
	contentModel.filter((row) => row.transparent).map((row) => row.tag),
)

// Foreign content (`guides/w3c/categories.md` §3.2.5.2.6): "Elements that are
// from namespaces other than the HTML namespace … (e.g. MathML, or SVG)".
// Derived — not a hand-maintained literal — from the corpus signal the
// Phase-1 parity test already binds bidirectionally: a foreign element's card
// is the only kind headed by a non-HTML namespace marker (`MathML — …` /
// `SVG — …`), mirrored in its `cite` anchor as a `mathml-` / `svg-` slug
// prefix. Every HTML-namespace card is `{file}#the-{tag}-element`; only the
// two foreign cards carry the namespace prefix, so this stays in lock-step
// with the carded prose with no second source of truth.
export const FOREIGN_TAGS: ReadonlySet<string> = new Set(
	contentModel.filter((row) => /#(?:mathml|svg)-/.test(row.cite)).map((row) => row.tag),
)

/** Inverted lookup: content category → tags that declare it. */
export const CATEGORY_MEMBERS: ReadonlyMap<ContentCategory, ReadonlySet<string>> = (() => {
	const map = new Map<ContentCategory, Set<string>>()
	for (const row of contentModel) {
		for (const category of row.categories) {
			const set = map.get(category) ?? new Set<string>()
			set.add(row.tag)
			map.set(category, set)
		}
	}
	return map
})()

// ── Predicates ──────────────────────────────────────────────────────────────
// Single-word entity getters, per AGENTS.md §4 — mirrors taxonomy.ts's
// isKnownTag / describeTag.

/** True when the tag is enumerated in the content-model registry. */
export function isKnownElement(tag: string): boolean {
	return SCHEMA_BY_TAG.has(tag)
}

/** True when the element is a void element (no children, no end tag). */
export function isVoid(tag: string): boolean {
	return VOID_TAGS.has(tag)
}

/** True when the element has the transparent content model. */
export function isTransparent(tag: string): boolean {
	return TRANSPARENT_TAGS.has(tag)
}

/**
 * True when the element is foreign content (`<svg>` / `<math>`): a non-HTML
 * namespace whose subtree follows its own (SVG / MathML) content model, not
 * the HTML ones the inspector enforces (`guides/w3c/categories.md`
 * §3.2.5.2.6). The Walker yields a foreign host but never descends into it.
 */
export function isForeign(tag: string): boolean {
	return FOREIGN_TAGS.has(tag)
}

/** The element's content-model shape, or `null` if the tag is unknown. */
export function modelOf(tag: string): ContentModel | null {
	return SCHEMA_BY_TAG.get(tag)?.model ?? null
}

/** The element's content categories (empty array if the tag is unknown). */
export function categoriesOf(tag: string): readonly ContentCategory[] {
	return SCHEMA_BY_TAG.get(tag)?.categories ?? []
}

/** The element's allowed-context restatement, or `null` if unknown. */
export function contextOf(tag: string): string | null {
	return SCHEMA_BY_TAG.get(tag)?.context ?? null
}

/** Read the content-model entry for a tag, or `null` if unknown. */
export function describeElement(tag: string): ContentModelEntry | null {
	return SCHEMA_BY_TAG.get(tag) ?? null
}

// ============================================================================
// The ContentModelEntry contract (derived, not duplicated)
// ============================================================================
//
// `ContentModelEntry` (the single source of truth in types.ts) is expressed
// ONCE here as an @elements/core ContractShape and run through
// compileContract(). That derives — for free, never hand-maintained:
//
//   - contentModelContract.is       a runtime Guard<ContentModelEntry>
//                                    (validates the frozen registry at
//                                    module load + fixture inputs in tests)
//   - contentModelContract.schema   a JSON Schema of ContentModelEntry
//                                    (machine-readable corpus export)
//   - contentModelContract.generate a seeded synthetic-entry generator
//                                    (Phase-3 fixtures)
//
// The frozen `contentModel` array above stays the AUTHORING surface; this
// shape is its compiled contract. The entry tree is finite and acyclic
// (a `ContentSequenceSegment` is a flat `{ tag, count }` — it does not
// nest), so no recursion boundary is needed; `lazyShape` would be
// speculative generality (YAGNI) here. The transparent content model is
// resolved at WALK time (Phase 2) over live ancestors, not encoded as a
// self-referential shape — the schema only records `model: 'transparent'`.

const categoryShape = literalShape(
	'metadata',
	'flow',
	'sectioning',
	'heading',
	'phrasing',
	'embedded',
	'interactive',
	'palpable',
	'script-supporting',
	'transparent',
)

const modelShape = literalShape('transparent', 'void', 'text', 'nothing', 'children')

const sequenceSegmentShape = objectShape({
	tag: stringShape({ min: 1 }),
	count: literalShape('?', '*', '+', '1'),
})

const constraintShape = objectShape({
	kind: literalShape(
		'no-self-nest',
		'no-interactive-descendant',
		'no-tabindex-descendant',
		'single-first-child',
		'edge-child',
		'parent-restricted',
		'group-order',
		'child-order',
	),
	parents: optionalShape(arrayShape(stringShape({ min: 1 }))),
	child: optionalShape(stringShape({ min: 1 })),
	edge: optionalShape(literalShape('first', 'last', 'first-or-last')),
	sequence: optionalShape(arrayShape(sequenceSegmentShape)),
	note: optionalShape(stringShape({ min: 1 })),
})

const attributeRuleShape = objectShape({
	attribute: stringShape({ min: 1 }),
	requires: optionalShape(stringShape({ min: 1 })),
	values: optionalShape(arrayShape(stringShape({ min: 1 }))),
	required: optionalShape(booleanShape()),
	note: optionalShape(stringShape({ min: 1 })),
})

/**
 * The compiled contract for one {@link ContentModelEntry}. Derived from the
 * single source-of-truth type — guard + JSON Schema + seeded generator from
 * one declaration ([guides/shapers.md] · [guides/compilers.md]).
 */
export const contentModelContract = compileContract(
	objectShape({
		tag: stringShape({ min: 1 }),
		categories: arrayShape(categoryShape),
		context: stringShape({ min: 1 }),
		model: modelShape,
		required: arrayShape(sequenceSegmentShape),
		forbidden: arrayShape(stringShape({ min: 1 })),
		constraints: arrayShape(constraintShape),
		attributes: arrayShape(attributeRuleShape),
		transparent: booleanShape(),
		void: booleanShape(),
		// `cite` is shape-guarded as a non-empty string only. Its
		// `{file}#{slug}` ANCHOR FORMAT is a corpus invariant proven
		// bidirectionally by tests/guides/w3c.test.ts (every cite resolves
		// to a real card heading) — encoding the regex here would both
		// duplicate that proof and break generator∘guard soundness (the
		// seeded string generator does not honor `pattern`). Shape vs.
		// corpus-binding are deliberately separated.
		cite: stringShape({ min: 1 }),
	}),
)

/**
 * Every frozen registry row validated against the compiled guard at module
 * load. A row that drifts out of {@link ContentModelEntry} shape is a
 * programmer error surfaced immediately (AGENTS.md §13), not a latent bug
 * the Walker trips over in Phase 2+.
 */
export const CONTRACT_GUARDED: boolean = (() => {
	for (const row of contentModel) {
		// Read `tag` before the guard call: `compileContract` returns a
		// `Guard<unknown>`, so a negative narrowing would collapse `row` to
		// `never` (ContentModelEntry minus unknown). The valid/invalid
		// decision is the guard's job; the message just needs the tag.
		const tag = row.tag
		if (!contentModelContract.is(row)) {
			throw new Error(
				`schema.ts: contentModel entry for <${tag}> violates the ContentModelEntry contract`,
			)
		}
	}
	return true
})()
