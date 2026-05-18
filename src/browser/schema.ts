import type { ContentCategory, ContentModel, ContentModelEntry } from './types.js'
import {
	arrayShape,
	booleanShape,
	compileContract,
	createRandom,
	lazyShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
	unionShape,
} from '@elements/core'
import type { ContractShape } from '@elements/core'
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
//   - childModel   the element's ORDERED child content model when the card
//                   constrains child order/cardinality (the table model,
//                   list models, hgroup, picture, details/fieldset/figure,
//                   …) — the SINGLE source of that shape (closed sequence
//                   vs. structural prefix + open category arm); omitted for
//                   free flow/phrasing parents (those carry `permits`)
//   - forbidden    forbidden descendant categories/tags the card's prose
//                   names (e.g. dt forbids header/footer/sectioning/heading)
//   - constraints  the discrete tree-decidable named constraints encoded as
//                   DATA (no-self-nest, single-first-child, edge-child,
//                   parent-restricted, …) so the Phase-3 rules stay generic,
//                   never per-element hand-code; the pure-ordering kinds are
//                   folded into `childModel` (no second copy of the order)
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
			childModel: {
				closed: true,
				note: 'A head element followed by a body element.',
				segments: [
					{ kind: 'tag', tag: 'head', count: '1' },
					{ kind: 'tag', tag: 'body', count: '1' },
				],
			},
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
		{ permits: ['flow'] },
	),
	defineModel(
		'article',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-article-element',
		{ permits: ['flow'] },
	),
	defineModel(
		'section',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-section-element',
		{ permits: ['flow'] },
	),
	defineModel(
		'nav',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-nav-element',
		{ permits: ['flow'] },
	),
	defineModel(
		'aside',
		['flow', 'sectioning', 'palpable'],
		'Where sectioning content is expected.',
		'children',
		'sections#the-aside-element',
		{ permits: ['flow'] },
	),
	...(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) =>
		defineModel(
			tag,
			['flow', 'heading', 'palpable'],
			'As a child of an hgroup element; where heading content is expected.',
			'children',
			'sections#the-h1-h2-h3-h4-h5-and-h6-elements',
			{ permits: ['phrasing'] },
		),
	),
	defineModel(
		'hgroup',
		['flow', 'heading', 'palpable'],
		'Where heading content is expected.',
		'children',
		'sections#the-hgroup-element',
		{
			childModel: {
				closed: true,
				note: 'Zero or more p elements, followed by one h1, h2, h3, h4, h5, or h6 element, followed by zero or more p elements, optionally intermixed with script-supporting elements.',
				segments: [
					{ kind: 'tag', tag: 'p', count: '*' },
					{
						kind: 'choice',
						options: [
							[{ kind: 'tag', tag: 'h1', count: '1' }],
							[{ kind: 'tag', tag: 'h2', count: '1' }],
							[{ kind: 'tag', tag: 'h3', count: '1' }],
							[{ kind: 'tag', tag: 'h4', count: '1' }],
							[{ kind: 'tag', tag: 'h5', count: '1' }],
							[{ kind: 'tag', tag: 'h6', count: '1' }],
						],
					},
					{ kind: 'tag', tag: 'p', count: '*' },
				],
			},
		},
	),
	defineModel(
		'header',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-header-element',
		{ permits: ['flow'], forbidden: ['header', 'footer'] },
	),
	defineModel(
		'footer',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-footer-element',
		{ permits: ['flow'], forbidden: ['header', 'footer'] },
	),
	defineModel(
		'address',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'sections#the-address-element',
		{ permits: ['flow'], forbidden: ['heading', 'sectioning', 'header', 'footer', 'address'] },
	),

	// §4.4 Grouping content (groupings.md)
	defineModel(
		'p',
		['flow', 'palpable'],
		'Where flow content is expected; as a child of an hgroup element.',
		'children',
		'groupings#the-p-element',
		{ permits: ['phrasing'] },
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
		{ permits: ['phrasing'] },
	),
	defineModel(
		'blockquote',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-blockquote-element',
		{ permits: ['flow'], attributes: [{ attribute: 'cite' }] },
	),
	defineModel(
		'ol',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-ol-element',
		{
			childModel: {
				closed: true,
				note: 'Zero or more li and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'li', count: '*' }],
			},
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
			childModel: {
				closed: true,
				note: 'Zero or more li and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'li', count: '*' }],
			},
		},
	),
	defineModel(
		'menu',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-menu-element',
		{
			childModel: {
				closed: true,
				note: 'Zero or more li and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'li', count: '*' }],
			},
		},
	),
	defineModel(
		'li',
		[],
		'Inside ol elements; inside ul elements; inside menu elements.',
		'children',
		'groupings#the-li-element',
		{
			permits: ['flow'],
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['ul', 'ol', 'menu'],
					// Card Contexts: "Inside ol elements. Inside ul elements.
					// Inside menu elements." -- the direct-child reading.
					relation: 'child',
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
			childModel: {
				closed: true,
				note: 'Either: Zero or more groups each consisting of one or more dt elements followed by one or more dd elements, optionally intermixed with script-supporting elements. Or: One or more div elements, optionally intermixed with script-supporting elements.',
				segments: [
					{
						kind: 'choice',
						options: [
							[
								{
									kind: 'group',
									count: '*',
									segments: [
										{ kind: 'tag', tag: 'dt', count: '+' },
										{ kind: 'tag', tag: 'dd', count: '+' },
									],
								},
							],
							[{ kind: 'tag', tag: 'div', count: '+' }],
						],
					},
				],
			},
		},
	),
	defineModel(
		'dt',
		[],
		'Before dd or dt elements inside dl elements (or inside div children of a dl).',
		'children',
		'groupings#the-dt-element',
		{ permits: ['flow'], forbidden: ['header', 'footer', 'sectioning', 'heading'] },
	),
	defineModel(
		'dd',
		[],
		'After dt or dd elements inside dl elements (or inside div children of a dl).',
		'children',
		'groupings#the-dd-element',
		{ permits: ['flow'] },
	),
	defineModel(
		'figure',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-figure-element',
		{
			childModel: {
				closed: false,
				note: 'Either: one figcaption element followed by flow content. Or: flow content followed by one figcaption element. Or: flow content.',
				segments: [
					{
						kind: 'choice',
						options: [
							[
								{ kind: 'tag', tag: 'figcaption', count: '1' },
								{ kind: 'category', category: 'flow' },
							],
							[
								{ kind: 'category', category: 'flow' },
								{ kind: 'tag', tag: 'figcaption', count: '1' },
							],
							[{ kind: 'category', category: 'flow' }],
						],
					},
				],
			},
		},
	),
	defineModel(
		'figcaption',
		[],
		'As the first or last child of a figure element.',
		'children',
		'groupings#the-figcaption-element',
		{
			permits: ['flow'],
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
		{ permits: ['flow'] },
	),
	defineModel(
		'search',
		['flow', 'palpable'],
		'Where flow content is expected.',
		'children',
		'groupings#the-search-element',
		{ permits: ['flow'] },
	),
	defineModel(
		'div',
		['flow', 'palpable'],
		'Where flow content is expected; as a child of a dl element.',
		'children',
		'groupings#the-div-element',
		{ permits: ['flow'] },
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
		{ permits: ['phrasing'] },
	),
	defineModel(
		'strong',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-strong-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'small',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-small-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		's',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-s-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'cite',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-cite-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'q',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-q-element',
		{ permits: ['phrasing'], attributes: [{ attribute: 'cite' }] },
	),
	defineModel(
		'dfn',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-dfn-element',
		{
			permits: ['phrasing'],
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
		{ permits: ['phrasing'] },
	),
	defineModel(
		'ruby',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-ruby-element',
		{
			// The card's **Content model** BOX is verbatim "See prose." —
			// `note` mirrors the box (the parity gate binds it). The detailed
			// ordered model the box defers to is faithfully transcribed into
			// `segments` below from the ruby card's prose body ("The content
			// model of ruby elements consists of one or more of the following
			// sequences: …").
			childModel: {
				closed: true,
				note: 'See prose.',
				segments: [
					{
						kind: 'group',
						count: '+',
						segments: [
							// base: phrasing content (no ruby) — or a single nested ruby.
							{
								kind: 'choice',
								options: [
									[{ kind: 'category', category: 'phrasing' }],
									[{ kind: 'tag', tag: 'ruby', count: '1' }],
								],
							},
							// annotation: rt+ — or rp ( rt rp )+.
							{
								kind: 'choice',
								options: [
									[{ kind: 'tag', tag: 'rt', count: '+' }],
									[
										{ kind: 'tag', tag: 'rp', count: '1' },
										{
											kind: 'group',
											count: '+',
											segments: [
												{ kind: 'tag', tag: 'rt', count: '1' },
												{ kind: 'tag', tag: 'rp', count: '1' },
											],
										},
									],
								],
							},
						],
					},
				],
			},
		},
	),
	defineModel('rt', [], 'As a child of a ruby element.', 'children', 'texts#the-rt-element', {
		permits: ['phrasing'],
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['ruby'],
				// Card Contexts: "As a child of a ruby element."
				relation: 'child',
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
					// Card Contexts: "As a child of a ruby element, either
					// immediately before or immediately after an rt element."
					relation: 'child',
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
		{ permits: ['phrasing'], attributes: [{ attribute: 'value', required: true }] },
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
		{ permits: ['phrasing'] },
	),
	defineModel(
		'var',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-var-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'samp',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-samp-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'kbd',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-kbd-element',
		{ permits: ['phrasing'] },
	),
	...(['sub', 'sup'] as const).map((tag) =>
		defineModel(
			tag,
			['flow', 'phrasing', 'palpable'],
			'Where phrasing content is expected.',
			'children',
			'texts#the-sub-and-sup-elements',
			{ permits: ['phrasing'] },
		),
	),
	defineModel(
		'i',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-i-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'b',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-b-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'u',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-u-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'mark',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-mark-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'bdi',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-bdi-element',
		{ permits: ['phrasing'] },
	),
	defineModel(
		'bdo',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-bdo-element',
		{
			permits: ['phrasing'],
			attributes: [{ attribute: 'dir', values: ['ltr', 'rtl'], required: true }],
		},
	),
	defineModel(
		'span',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'texts#the-span-element',
		{ permits: ['phrasing'] },
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
			childModel: {
				closed: true,
				note: 'Zero or more source elements, followed by one img element, optionally intermixed with script-supporting elements.',
				segments: [
					{ kind: 'tag', tag: 'source', count: '*' },
					{ kind: 'tag', tag: 'img', count: '1' },
				],
			},
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
					// Card Contexts: "As a child of a picture element, before
					// the img element. As a child of a media element, before
					// any flow content or track elements."
					relation: 'child',
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
		{
			// Card prose (embeddeds.md "the img element"): "The ismap
			// attribute, when used on an element that is a descendant of an a
			// element with an href attribute … The attribute must not be
			// specified on an element that does not have an ancestor a element
			// with an href attribute." Encoded as the established note-only
			// AttributeRule precedent (cf. `dialog`/`tabindex`,
			// `time`/`datetime`) — the `attribute/coupling-domain` rule
			// recognizes the `ismap` datum and applies the corpus-stated
			// flat-ancestor `a[href]` check a DOM-walker can decide.
			attributes: [
				{
					attribute: 'ismap',
					note: 'The ismap attribute must not be specified on an element that does not have an ancestor a element with an href attribute.',
				},
			],
		},
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
			// No `childModel`: the corpus **Content model** box is the
			// transparent model ("...then transparent, but with no media
			// element descendants") -- resolved at WALK time over live
			// ancestors (Phase 2), never a static ordered model; the
			// prose-bound model classification is `transparent`, and the
			// parity gate forbids a childModel on a non-`children` box. The
			// source/track placement is enforced CHILD-side by their
			// `parent-restricted` constraints (naming `video`/`audio`); the
			// no-nested-media restriction by `forbidden`.
			forbidden: ['audio', 'video'],
		},
	),
	defineModel(
		'audio',
		['flow', 'phrasing', 'embedded', 'interactive', 'palpable', 'transparent'],
		'Where embedded content is expected.',
		'transparent',
		'embeddeds#the-audio-element',
		{
			// See <video>: the corpus box is the transparent model
			// (walk-time resolved), so no `childModel` (the parity gate
			// forbids one on a non-`children` box). source/track placement
			// is the child-side `parent-restricted` concern; no-nested-media
			// is `forbidden`.
			forbidden: ['audio', 'video'],
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
					// Card Contexts: "As a child of a media element
					// (audio/video), before any flow content."
					relation: 'child',
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
			childModel: {
				closed: true,
				note: 'Optionally a caption, followed by zero or more colgroup elements, followed optionally by a thead, followed by either zero or more tbody elements or one or more tr elements, followed optionally by a tfoot, optionally intermixed with script-supporting elements.',
				segments: [
					{ kind: 'tag', tag: 'caption', count: '?' },
					{ kind: 'tag', tag: 'colgroup', count: '*' },
					{ kind: 'tag', tag: 'thead', count: '?' },
					{
						kind: 'choice',
						options: [
							[{ kind: 'tag', tag: 'tbody', count: '*' }],
							[{ kind: 'tag', tag: 'tr', count: '+' }],
						],
					},
					{ kind: 'tag', tag: 'tfoot', count: '?' },
				],
			},
		},
	),
	defineModel(
		'caption',
		[],
		'As the first element child of a table element.',
		'children',
		'tables#the-caption-element',
		{
			permits: ['flow'],
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
			childModel: {
				closed: true,
				note: 'If span is present: nothing. If absent: zero or more col and template elements.',
				segments: [{ kind: 'tag', tag: 'col', count: '*' }],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					// Card Contexts: "As a child of a table element, after any
					// caption elements and before any thead/tbody/tfoot/tr."
					relation: 'child',
					note: 'As a child of a table element.',
				},
			],
			// Card prose (tables.md "the colgroup element"): "If it contains
			// no col elements it may have a span attribute (> 0 and <= 1000)"
			// / Content model "If span is present: nothing." The note-only
			// AttributeRule (the `time`/`datetime`, `img`/`ismap` precedent)
			// the `attribute/coupling-domain` rule recognizes — the DOM check
			// (span present ⇒ no col children) a tree-walker can decide.
			attributes: [
				{
					attribute: 'span',
					note: 'If the colgroup element has a span attribute it must not contain any col elements.',
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
					// Card Contexts: "As a child of a colgroup element that
					// doesn't have a span attribute."
					relation: 'child',
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
			childModel: {
				closed: true,
				note: 'Zero or more tr and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'tr', count: '*' }],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					// Card Contexts: "As a child of a table element, after
					// any caption, colgroup, and thead elements, ..."
					relation: 'child',
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
			childModel: {
				closed: true,
				note: 'Zero or more tr and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'tr', count: '*' }],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					// Card Contexts: "As a child of a table element, after
					// any caption and colgroup elements and before any
					// tbody, tfoot, and tr elements, ..."
					relation: 'child',
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
			childModel: {
				closed: true,
				note: 'Zero or more tr and script-supporting elements.',
				segments: [{ kind: 'tag', tag: 'tr', count: '*' }],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['table'],
					// Card Contexts: "As a child of a table element, after
					// any caption, colgroup, thead, tbody, and tr
					// elements, ..."
					relation: 'child',
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
			// "Zero or more td, th, and script-supporting elements" — td/th in
			// ANY order: a repeating group of (one td OR one th), so
			// <tr><th><td><th>… is faithfully clean (a flat [td*, th*]
			// sequence would wrongly forbid th-before-td).
			childModel: {
				closed: true,
				note: 'Zero or more td, th, and script-supporting elements.',
				segments: [
					{
						kind: 'group',
						count: '*',
						segments: [
							{
								kind: 'choice',
								options: [
									[{ kind: 'tag', tag: 'td', count: '1' }],
									[{ kind: 'tag', tag: 'th', count: '1' }],
								],
							},
						],
					},
				],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['thead', 'tbody', 'tfoot', 'table'],
					// Card Contexts: "As a child of thead, tbody, or tfoot; or
					// as a child of a table element after any caption,
					// colgroup, and thead elements, ..."
					relation: 'child',
					note: 'As a child of a thead, tbody, or tfoot element.',
				},
			],
		},
	),
	defineModel('td', [], 'As a child of a tr element.', 'children', 'tables#the-td-element', {
		permits: ['flow'],
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['tr'],
				// Card Contexts: "As a child of a tr element."
				relation: 'child',
				note: 'As a child of a tr element.',
			},
		],
	}),
	defineModel('th', [], 'As a child of a tr element.', 'children', 'tables#the-th-element', {
		permits: ['flow'],
		forbidden: ['header', 'footer', 'sectioning', 'heading'],
		constraints: [
			{
				kind: 'parent-restricted',
				parents: ['tr'],
				// Card Contexts: "As a child of a tr element."
				relation: 'child',
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
			permits: ['flow'],
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
			permits: ['phrasing'],
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
			permits: ['phrasing'],
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
			childModel: {
				closed: true,
				note: 'Zero or one button elements if the select is a drop-down box, followed by zero or more select element inner content elements (option, optgroup, hr, and script-supporting elements; plus div/noscript per the inner-content category).',
				segments: [
					{ kind: 'tag', tag: 'button', count: '?' },
					{
						kind: 'group',
						count: '*',
						segments: [
							{
								kind: 'choice',
								options: [
									[{ kind: 'tag', tag: 'option', count: '1' }],
									[{ kind: 'tag', tag: 'optgroup', count: '1' }],
									[{ kind: 'tag', tag: 'hr', count: '1' }],
									[{ kind: 'tag', tag: 'div', count: '1' }],
								],
							},
						],
					},
				],
			},
		},
	),
	defineModel(
		'datalist',
		['flow', 'phrasing'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-datalist-element',
		{
			// Corpus: "Either: phrasing content; or: zero or more option and
			// script-supporting elements." A choice — the phrasing arm is an
			// OPEN category arm (closed:false). The schema's single ordered
			// encoding (no `permits`: the box is not a bare leading category,
			// so the parity gate keeps `permits` empty and `childModel` is the
			// one source — disjointness preserved).
			childModel: {
				closed: false,
				note: 'Either: phrasing content; or: zero or more option and script-supporting elements.',
				segments: [
					{
						kind: 'choice',
						options: [
							[{ kind: 'category', category: 'phrasing' }],
							[{ kind: 'tag', tag: 'option', count: '*' }],
						],
					},
				],
			},
		},
	),
	defineModel(
		'optgroup',
		[],
		'As a descendant of a select element.',
		'children',
		'forms#the-optgroup-element',
		{
			childModel: {
				closed: true,
				note: 'Zero or one legend element, followed by zero or more optgroup element inner content elements (option and script-supporting elements; plus div/noscript).',
				segments: [
					{ kind: 'tag', tag: 'legend', count: '?' },
					{
						kind: 'group',
						count: '*',
						segments: [
							{
								kind: 'choice',
								options: [
									[{ kind: 'tag', tag: 'option', count: '1' }],
									[{ kind: 'tag', tag: 'div', count: '1' }],
								],
							},
						],
					},
				],
			},
			constraints: [
				{
					kind: 'parent-restricted',
					parents: ['select'],
					// Card Contexts: "As a descendant of a select element."
					relation: 'descendant',
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
					// Card Contexts: "As a descendant of a select element;
					// as a descendant of a datalist element; as a
					// descendant of an optgroup element."
					relation: 'descendant',
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
		{ permits: ['phrasing'], attributes: [{ attribute: 'for' }] },
	),
	defineModel(
		'progress',
		['flow', 'phrasing', 'palpable'],
		'Where phrasing content is expected.',
		'children',
		'forms#the-progress-element',
		{
			permits: ['phrasing'],
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
			permits: ['phrasing'],
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
			// PREFIX model: optional legend, THEN open flow content. The
			// child-side "legend must be first child of fieldset" placement
			// lives on the <legend> entry's single-first-child constraint —
			// the parent's ordered model is here, ONCE.
			childModel: {
				closed: false,
				note: 'Optionally a legend element, followed by flow content.',
				segments: [
					{ kind: 'tag', tag: 'legend', count: '?' },
					{ kind: 'category', category: 'flow' },
				],
			},
		},
	),
	defineModel(
		'legend',
		[],
		'As the first child of a fieldset element.',
		'children',
		'forms#the-legend-element',
		{
			// No `permits`: the box is "Phrasing content, optionally
			// intermixed with heading content; or one heading element
			// (h1–h6)." — heading content widens the child set beyond a single
			// bare category, so the faithful corpus derivation yields none.
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
			// PREFIX model: exactly one summary, THEN open flow content. The
			// child-side "summary must be first child of details" placement
			// lives on the <summary> entry's single-first-child constraint —
			// the parent's ordered model is here, ONCE (so a valid
			// <details><summary>…</summary><p>…</p></details> no longer
			// double-false-positives, §1).
			childModel: {
				closed: false,
				note: 'One summary element followed by flow content.',
				segments: [
					{ kind: 'tag', tag: 'summary', count: '1' },
					{ kind: 'category', category: 'flow' },
				],
			},
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
			// No `permits`: the box is "Phrasing content, optionally
			// intermixed with heading content." — the heading-content arm
			// widens the child set beyond a single bare category, so a faithful
			// corpus derivation yields none (claiming bare phrasing would
			// false-positive on a legal heading child).
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
			permits: ['flow'],
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
// shape is its compiled contract. The entry tree IS recursive: a
// `ChildSegment` `group` nests a `ChildSegment[]` and a `choice` nests
// segment lists, so the contract needs a real recursion boundary —
// `childSegmentShape` below uses `lazyShape` (the sole sanctioned boundary,
// shapers.md) for exactly that reason, NOT speculative generality. The
// transparent content model is the one shape NOT encoded self-referentially:
// it is resolved at WALK time (Phase 2) over live ancestors, so the schema
// only records `model: 'transparent'`.

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

const countShape = literalShape('?', '*', '+', '1')

// `ChildSegment` is a recursive discriminated union (a `group` segment
// nests `ChildSegment`s; a `choice` nests segment lists). `lazyShape` is the
// ONLY sanctioned recursion boundary (shapers.md) — the `group`/`choice`
// arms defer to it so the contract compiles (acyclic via the lazy terminal)
// while staying fully recursive at guard time. The union is tagged by
// `kind`, mirroring the {@link ChildSegment} type one-for-one.
const childSegmentShape: ContractShape = unionShape(
	objectShape({
		kind: literalShape('tag'),
		tag: stringShape({ min: 1 }),
		count: countShape,
	}),
	objectShape({
		kind: literalShape('category'),
		category: categoryShape,
	}),
	objectShape({
		kind: literalShape('group'),
		count: countShape,
		segments: arrayShape(lazyShape((): ContractShape => childSegmentShape)),
	}),
	objectShape({
		kind: literalShape('choice'),
		options: arrayShape(arrayShape(lazyShape((): ContractShape => childSegmentShape))),
	}),
)

const childModelShape = objectShape({
	segments: arrayShape(childSegmentShape),
	closed: booleanShape(),
	note: stringShape({ min: 1 }),
})

const constraintShape = objectShape({
	kind: literalShape(
		'no-self-nest',
		'no-interactive-descendant',
		'no-tabindex-descendant',
		'single-first-child',
		'edge-child',
		'parent-restricted',
	),
	parents: optionalShape(arrayShape(stringShape({ min: 1 }))),
	// `relation` qualifies a `parent-restricted` constraint with the spec's
	// child-vs-descendant distinction (corpus-derived from the card Contexts
	// prose). Shape-level optional (mirrors the `ContentConstraint` `?:`
	// ergonomics); the schema populates it on EVERY `parent-restricted`
	// constraint and tests/guides/w3c.test.ts asserts that bidirectionally,
	// so the optionality can never hide drift.
	relation: optionalShape(literalShape('child', 'descendant')),
	child: optionalShape(stringShape({ min: 1 })),
	edge: optionalShape(literalShape('first', 'last', 'first-or-last')),
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
		childModel: optionalShape(childModelShape),
		permits: optionalShape(arrayShape(categoryShape)),
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

// ============================================================================
// The Finding contract (Phase 4 — derived, not duplicated)
// ============================================================================
//
// `FindingRecord` (the JSON-serializable projection of a `Finding`, the
// single source of truth in types.ts) is expressed ONCE here as an
// @elements/core ContractShape and run through compileContract() — EXACTLY
// the Phase-1 `contentModelContract` precedent above. That derives — for
// free, never hand-maintained:
//
//   - findingContract.is        a runtime Guard<FindingRecord> consumers
//                               (CI / agents) import to validate a findings
//                               report
//   - findingContract.schema    a JSON Schema of the findings record (the
//                               machine-consumable findings-report contract)
//   - findingContract.generate  a seeded synthetic-finding generator
//
// `FindingRecord` is the one declaration; the in-memory `Finding`
// (types.ts) is its ADDITIVE runtime composition (live `element` + the
// `readonly Element[]` `path`, the serializable `path` string replaced) —
// `Finding extends Omit<FindingRecord,'path'>`, so the contract and the
// in-memory record cannot drift: there is no second hand-maintained finding
// interface. The Phase-3 `Finding` / rule contract is untouched (it still
// resolves structurally identical), reconciled additively, not churned.
//
// The shape is flat (no recursion): `path` is the serializable stable DOM
// path STRING (the faithful projection of `Finding.path` — derived from the
// same `nodePath` / `getPathToAncestor()` ancestor walk, never live
// `Element`s); the live `element` ref is deliberately absent (not
// serializable). `severity` is the closed `FindingSeverity` union;
// `expected` / `actual` are optional, mirroring `FindingRecord` one-for-one.

const severityShape = literalShape('error', 'warning', 'advice')

/**
 * The compiled contract for one serializable {@link FindingRecord}. Derived
 * from the single source-of-truth type — guard + JSON Schema + seeded
 * generator from one declaration ([guides/shapers.md] · [guides/compilers.md]),
 * the machine-consumable findings-report contract Phase 6+ CI / agents
 * import. Mirrors {@link FindingRecord} field-for-field.
 */
export const findingContract = compileContract(
	objectShape({
		severity: severityShape,
		rule: stringShape({ min: 1 }),
		path: stringShape({ min: 1 }),
		message: stringShape({ min: 1 }),
		cite: stringShape({ min: 1 }),
		expected: optionalShape(stringShape({ min: 1 })),
		actual: optionalShape(stringShape({ min: 1 })),
	}),
)

/**
 * The compiled contract validated at module load — the `generate ∘ is`
 * soundness invariant the contract must satisfy (a seeded synthetic record
 * must pass its own guard), mirroring how {@link CONTRACT_GUARDED} validates
 * the Phase-1 contract at load. There is no frozen finding REGISTRY to walk
 * (findings are produced at runtime by the Phase-3 rules), so the load-time
 * proof is that the derived guard/schema/generator agree — a drift between
 * the shape and `FindingRecord` is a programmer error surfaced immediately
 * (AGENTS.md §13), not a latent bug a Phase-4 consumer trips over.
 */
export const FINDING_CONTRACT_GUARDED: boolean = (() => {
	const sample = findingContract.generate(createRandom(1))
	if (!findingContract.is(sample)) {
		throw new Error(
			'schema.ts: findingContract generator output violates the FindingRecord contract',
		)
	}
	return true
})()
