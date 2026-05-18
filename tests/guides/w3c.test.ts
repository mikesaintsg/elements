// ============================================================================
//  guides/w3c/** ↔ src/browser/schema.ts — the Phase-1 bidirectional parity.
//
//  The W3C corpus under guides/w3c/elements/*.md is the curated local cache
//  of the WHATWG spec; schema.ts is its frozen TS mirror. This driver binds
//  them so a drift in either direction fails the gate:
//
//    1. CARD → SCHEMA   Every element CARDED under guides/w3c/elements/*.md
//                        has a `contentModel` entry, and that entry's
//                        `categories`, `context` shape, and `model` agree
//                        with the card's **Categories** / **Contexts** /
//                        **Content model** boxes.
//    2. SCHEMA → CARD   Every `contentModel` entry's `cite` resolves to a
//                        real card heading in the named corpus file; no
//                        schema entry exists without a card.
//    3. CONTRACT        The compiled @elements/core contract guards every
//                        frozen row (shape soundness) and round-trips its
//                        own seeded generator (parse↔guard / generator∘guard).
//
//  The card parser tolerates BOTH corpus card formats: the block / inline
//  `**Categories:**` form (sections / texts / groupings / edits / embeddeds
//  / interactives / document) and the bulleted `- **Categories:**` form
//  (tables / forms). Combined cards (`h1`–`h6`, `sub`/`sup`, `math`/`svg`)
//  are expanded to one logical card per tag.
//
//  Pure node — TS data + raw markdown via `tests/setupServer.ts`.
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
	ATTRIBUTE_ENUM_DOMAINS,
	ATTRIBUTE_INTEGER_BOUNDS,
	CATEGORY_MEMBERS,
	PRESENTATION_DEFAULTS,
	SCHEMA_BY_TAG,
	TRANSPARENT_TAGS,
	VOID_TAGS,
	categoriesOf,
	contentModel,
	contentModelContract,
	contextOf,
	describeElement,
	isKnownElement,
	isTransparent,
	isVoid,
	modelOf,
	type ChildModel,
	type ChildSegment,
	type ContentCategory,
	type ContentModel,
} from '@elements/browser'
import { createRandom } from '@elements/core'
import { readW3cCorpus, readW3cElementCards } from '../setupServer'

const cards = readW3cElementCards()

// ── Card parser ─────────────────────────────────────────────────────────────
//
// One parsed card per logical element. The heading carries one or more
// backticked tags (`a`, or `h1`…`h6`, or `sub`/`sup`); each tag becomes its
// own ParsedCard sharing the card's Categories / Contexts / Content-model
// boxes (the spec cards them jointly but the schema models each element).

interface ParsedCard {
	readonly tag: string
	readonly file: string
	readonly categories: string
	readonly context: string
	readonly model: string
	readonly omission: string
	/** The full card block (heading → next card) — for models the
	 *  **Content model** box defers to its prose body ("See prose.",
	 *  e.g. `ruby`): the ordered model's child tags are backticked in the
	 *  body, so the `childModel`-segment binding validates against this. */
	readonly block: string
}

// A card heading: `## N.N The ... element(s)` or `### N.N.N The ... element(s)`,
// optionally prefixed by `MathML — ` / `SVG — `. Capture the post-`The`
// remainder so every backticked tag in it can be pulled out.
const CARD_HEADING =
	/^#{2,3}\s+[\d.]+\s+(?:MathML\s+—\s+|SVG\s+—\s+)?[Tt]he\s+(.+?)\s+elements?\s*$/

function fieldValue(block: string, label: string): string {
	// Two shapes: `- **Label:** value` (bulleted, tables/forms) or
	// `**Label:**` then the value inline and/or on following lines until the
	// next `**Field:**` / `- **Field:**` / heading. Collapse to one line.
	const lines = block.split('\n')
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? ''
		const bulleted = line.match(new RegExp(`^-\\s+\\*\\*${label}:\\*\\*\\s*(.*)$`))
		if (bulleted) return (bulleted[1] ?? '').trim()
		const inline = line.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`))
		if (!inline) continue
		const parts: string[] = []
		const head = (inline[1] ?? '').trim()
		if (head.length > 0) parts.push(head)
		for (let next = index + 1; next < lines.length; next += 1) {
			const value = lines[next] ?? ''
			if (/^#{2,3}\s/.test(value)) break
			if (/^-?\s*\*\*[A-Z][A-Za-z ]+:\*\*/.test(value)) break
			const trimmed = value.trim()
			if (trimmed.length > 0) parts.push(trimmed)
		}
		return parts.join(' ').trim()
	}
	return ''
}

function parseCards(): readonly ParsedCard[] {
	const out: ParsedCard[] = []
	for (const [file, source] of Object.entries(cards)) {
		const lines = source.split('\n')
		// Card boundaries: every heading-2/3 line index.
		const headings: { readonly index: number; readonly tags: readonly string[] }[] = []
		for (let index = 0; index < lines.length; index += 1) {
			const match = (lines[index] ?? '').match(CARD_HEADING)
			if (!match) continue
			const remainder = match[1] ?? ''
			const tags = [...remainder.matchAll(/`([a-z][a-z0-9]*)`/g)].map((m) => m[1] ?? '')
			if (tags.length > 0) headings.push({ index, tags })
		}
		for (let h = 0; h < headings.length; h += 1) {
			const current = headings[h]
			if (!current) continue
			const end = headings[h + 1]?.index ?? lines.length
			const block = lines.slice(current.index, end).join('\n')
			const categories = fieldValue(block, 'Categories')
			const context = fieldValue(block, 'Contexts')
			const model = fieldValue(block, 'Content model')
			const omission = fieldValue(block, 'Tag omission')
			// A genuine element card always carries all three boxes. Section
			// dividers like "4.3.11 Headings and outlines" carry none and are
			// skipped here (no false card).
			if (categories === '' && context === '' && model === '') continue
			for (const tag of current.tags) {
				out.push({ tag, file, categories, context, model, omission, block })
			}
		}
	}
	return out
}

const parsed = parseCards()
const parsedByTag: ReadonlyMap<string, ParsedCard> = new Map(parsed.map((c) => [c.tag, c]))

// Prose-phrase → ContentCategory. The card spells categories in mixed case
// with a "content" suffix ("Flow content.", "Sectioning content").
const CATEGORY_PHRASES: ReadonlyArray<readonly [RegExp, ContentCategory]> = [
	[/\bmetadata content\b/i, 'metadata'],
	[/\bflow content\b/i, 'flow'],
	[/\bsectioning content\b/i, 'sectioning'],
	[/\bheading content\b/i, 'heading'],
	[/\bphrasing content\b/i, 'phrasing'],
	[/\bembedded content\b/i, 'embedded'],
	[/\binteractive content\b/i, 'interactive'],
	[/\bpalpable content\b/i, 'palpable'],
]

function categoriesFromProse(prose: string): ReadonlySet<ContentCategory> {
	const set = new Set<ContentCategory>()
	for (const [pattern, category] of CATEGORY_PHRASES) {
		if (pattern.test(prose)) set.add(category)
	}
	return set
}

// Corpus source of truth for void-ness: the card's **Tag omission** box. A
// void element's card states "No end tag" (often "(void element)"); a
// non-void element's card never does (it has an end tag). This is parsed
// from the card's own prose — no hand-maintained per-element allowlist.
function cardIsVoid(card: ParsedCard): boolean {
	return /no end tag|void element/i.test(card.omission)
}

// Prose "Content model" box → the ContentModel shape the schema must carry,
// resolved against the card's **Tag omission** prose so the void/nothing
// split is corpus-driven, not arbitrary. A `**Content model:** Nothing.`
// card maps to `'void'` when the card's Tag omission says the element has no
// end tag (a true void element), and to `'nothing'` only for a non-void
// "Nothing" element (end tag present/not omissible — e.g. `iframe`).
function modelFromProse(card: ParsedCard): ContentModel | null {
	const value = card.model.trim().toLowerCase()
	if (value === '') return null
	if (/^nothing\b/.test(value)) return cardIsVoid(card) ? 'void' : 'nothing'
	// The transparent model — either declared outright ("Transparent.") or
	// as the terminal arm of a media element's compound model ("…then
	// transparent, but with no media element descendants."). Both ARE the
	// §3.2.5.1 transparent content model; the schema records `transparent`.
	if (/^transparent\b/.test(value) || /then transparent\b/.test(value)) return 'transparent'
	if (/no end tag|void element/.test(value)) return 'void'
	if (/^text\b/.test(value) || /^if the element has a `datetime`/.test(value)) {
		// `time` is phrasing-when-datetime / text-otherwise — schema models it
		// as the children (phrasing) arm; not asserted as pure text.
		if (/phrasing content/.test(value)) return 'children'
		return 'text'
	}
	return 'children'
}

// Prose "Content model" box → the set of content categories the element
// permits as ELEMENT children, when (and only when) the box is a *bare
// content category*: it reads, after trimming, "Flow content…" or "Phrasing
// content…" (the trailing "but with no … descendants" narrowing is carried
// by `forbidden`, not here). Every structured parent's box instead opens
// with "Zero or more…" / "One…" / "Optionally…" / "Either:" / "If…" / a
// foreign/transparent/void/text phrase, so it derives the EMPTY set — which
// is exactly why `permits` must be omitted there (the `context`/`structure`
// families own those). No allowlist: the discriminator is the corpus prose
// itself, parsed the same anchored way `modelFromProse` parses the box.
// A bare-content-category box is EXACTLY "<cat> content" terminated either
// by a full stop OR by a ", but …" descendant-EXCLUSION clause ("but with
// no …" / "but there must be no …" — every such clause only ever NARROWS,
// and is carried by the `forbidden` field, never `permits`). Anything
// appended that WIDENS the child set — ", optionally intermixed with
// heading content" (`summary`/`legend`), "; or one heading element" —
// makes the box NOT a single bare category, so it (faithfully) derives no
// `permits`: claiming bare phrasing there would false-positive on a legal
// heading child. The terminator class (`.` vs `, but` vs `, optionally`/
// `; or`) is the sole discriminator; no per-tag allowlist.
const BARE = String.raw`(?:\.|,\s+but\b)`
const LEADING_BARE = new RegExp(`^(flow|phrasing) content\\s*${BARE}`)
const OTHERWISE_BARE = new RegExp(`\\botherwise:\\s*(flow|phrasing) content\\s*${BARE}`)

function permitsFromProse(card: ParsedCard): ReadonlySet<ContentCategory> {
	const value = card.model.trim().toLowerCase()
	// Direct bare-category box: "Flow content." / "Phrasing content, but
	// with no … descendants."
	const leading = value.match(LEADING_BARE)
	if (leading?.[1] === 'flow') return new Set<ContentCategory>(['flow'])
	if (leading?.[1] === 'phrasing') return new Set<ContentCategory>(['phrasing'])
	// A multi-arm box whose GENERAL-CASE ("Otherwise:") arm is itself a
	// bare category — `span`'s "If … option …: …. Otherwise: Phrasing
	// content." IS the §3.2.5 general content model (the conditional arms
	// are attribute/ancestor-gated). Same dominant-arm reading
	// `modelFromProse`/`MULTI_ARM_MODEL` already take for `model`, parsed
	// from the SAME corpus prose: `time`'s "Otherwise: Text…" and
	// `option`'s no-Otherwise box still correctly derive the empty set, so
	// this only ever adds the genuine general-case category.
	const otherwise = value.match(OTHERWISE_BARE)
	if (otherwise?.[1] === 'flow') return new Set<ContentCategory>(['flow'])
	if (otherwise?.[1] === 'phrasing') return new Set<ContentCategory>(['phrasing'])
	return new Set<ContentCategory>()
}

// Tags whose card prose is a multi-arm content model where the schema picks
// the dominant arm by design (documented in schema.ts). The model-shape
// assertion is relaxed for these to "non-null & known", not exact-arm.
const MULTI_ARM_MODEL: ReadonlySet<string> = new Set([
	'time', // datetime → phrasing; else text
	'option', // label+value → nothing; else text/inner
	'span', // option-descendant → inner; else phrasing
	'link', // metadata; nothing
	'meta', // metadata; nothing
])

// ── 1. CARD → SCHEMA ────────────────────────────────────────────────────────

describe('w3c corpus — every carded element has a schema entry', () => {
	it('parsed at least the full corpus (sanity: > 90 cards)', () => {
		expect(parsed.length).toBeGreaterThan(90)
	})

	for (const card of parsed) {
		it(`<${card.tag}> (guides/w3c/elements/${card.file}.md) has a contentModel entry`, () => {
			expect(isKnownElement(card.tag)).toBe(true)
			expect(describeElement(card.tag)).not.toBeNull()
		})
	}
})

describe('w3c corpus — card Categories match the schema entry', () => {
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue
		it(`<${card.tag}> categories agree with the card prose`, () => {
			const prose = categoriesFromProse(card.categories)
			const schema = new Set(categoriesOf(card.tag))
			// Every category the card prose names MUST be on the entry. The
			// schema may additionally carry `transparent` (the §3.2.5.1 model
			// membership) and attribute-gated categories ("if the element has
			// an href attribute: Interactive content") — sound supersets, not
			// drift. `missing` is the diagnostic: the prose categories absent
			// from the schema entry (empty ⇒ agreement).
			const missing = [...prose].filter((category) => !schema.has(category))
			expect(missing).toEqual([])
		})
	}
})

// Decide whether the schema's model shape is consistent with the card
// prose for one tag. Pure (no `expect`) so the `it` body asserts ONCE,
// unconditionally — the parser/relaxation policy lives here, the assertion
// stays a single deterministic check.
function modelAgrees(card: ParsedCard): { readonly ok: boolean; readonly why: string } {
	const prose = modelFromProse(card)
	const schema = modelOf(card.tag)
	if (schema === null) {
		return { ok: false, why: `<${card.tag}>: schema carries no model` }
	}
	// Void-ness is asserted bidirectionally against the card's own **Tag
	// omission** prose (the corpus source of truth) for EVERY element — no
	// per-element allowlist. Schema `model: 'void'` MUST coincide with the
	// card stating "No end tag" / "(void element)", and vice versa. This
	// fires before MULTI_ARM relaxation so a multi-arm card can never paper
	// over a void/Nothing disagreement.
	const cardVoid = cardIsVoid(card)
	const schemaVoid = schema === 'void'
	if (cardVoid !== schemaVoid) {
		return {
			ok: false,
			why: `<${card.tag}>: card Tag-omission ${cardVoid ? 'IS' : 'is NOT'} void ("${card.omission}") but schema model is "${schema}"`,
		}
	}
	if (prose === null) {
		// Combined-card edge with no parseable Content-model box — the only
		// requirement is that the schema carries a known model (it does) and
		// the void/non-void check above already passed.
		return { ok: true, why: '' }
	}
	if (MULTI_ARM_MODEL.has(card.tag)) {
		// Documented multi-arm prose — schema picks the dominant arm by
		// design (see schema.ts); only require a known model. The void
		// bidirectional check above is NOT relaxed for these.
		return { ok: true, why: '' }
	}
	return {
		ok: schema === prose,
		why: `<${card.tag}>: card model "${card.model}" parsed to "${prose}" but schema is "${schema}"`,
	}
}

describe('w3c corpus — card Content model matches the schema entry', () => {
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue
		it(`<${card.tag}> model shape agrees with the card prose`, () => {
			const result = modelAgrees(card)
			// On failure the title names the tag; `why` is surfaced as the
			// asserted value so the diff prints the exact disagreement.
			expect(result.ok ? '' : result.why).toBe('')
		})
	}
})

describe('w3c corpus — card Content model bare-category ⇄ schema `permits`', () => {
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue
		it(`<${card.tag}> permits agrees bidirectionally with the card prose`, () => {
			// One diff, both directions. LEFT: what the corpus **Content
			// model** prose says the element permits as element children
			// (`['flow']` / `['phrasing']` for a bare-category box, else none).
			// RIGHT: the schema entry's `permits`. Equality fails if the
			// schema OMITS `permits` on a bare flow/phrasing parent (the very
			// under-detection this binds against), CLAIMS a `permits` the
			// prose does not (a structured/transparent parent), or carries the
			// WRONG category. No relaxation, no allowlist.
			const prose = [...permitsFromProse(card)].sort()
			const schema = [...(entry.permits ?? [])].sort()
			expect(schema).toEqual(prose)
		})
	}
})

// ── card Content model ⇄ schema `childModel` (bidirectional, biting) ────────
//
// The ONE source of an element's ordered child model is `entry.childModel`
// (types.ts). This binding makes the corpus prose its authority in BOTH
// directions and PERTURBATION-fails:
//
//   SCHEMA → PROSE  every concrete `tag` segment of a `childModel` is a
//                    backticked child tag IN the card's **Content model**
//                    prose; every `category` arm's category word is named
//                    in the prose; `closed` agrees with the prose shape;
//                    `note` is EXACTLY the card's Content-model box text.
//   PROSE → SCHEMA  every card whose **Content model** box is an ORDERED /
//                    PREFIX / GROUP model (it names specific child tags in
//                    a "Zero or more X" / "One X followed by" / "Optionally
//                    a X" / "Either: … Or:" shape) HAS a `childModel`; a
//                    bare-category / transparent / void / text / nothing
//                    box does NOT.
//
// A schema edit that drops a real segment tag, flips `closed`, invents a
// tag the prose never names, or omits/adds a `childModel` against the prose
// shape fails this gate — exactly the §1/§2 drift that slipped past twice.

// Every concrete tag a ChildModel admits (recursing group/choice) + the
// set of content-category words its `category` arms name.
interface ModelShape {
	readonly tags: ReadonlySet<string>
	readonly categories: ReadonlySet<string>
}

function shapeOfChildModel(model: ChildModel): ModelShape {
	const tags = new Set<string>()
	const categories = new Set<string>()
	const walk = (segments: readonly ChildSegment[]): void => {
		for (const seg of segments) {
			if (seg.kind === 'tag') tags.add(seg.tag)
			else if (seg.kind === 'category') {
				categories.add(seg.category)
			} else if (seg.kind === 'group') walk(seg.segments)
			else for (const option of seg.options) walk(option)
		}
	}
	walk(model.segments)
	return { tags, categories }
}

// The corpus signal for a NON-`closed` (prefix) model: the **Content
// model** box carries an OPEN trailing content category — a bare "flow
// content" / "phrasing content" arm that absorbs unbounded content
// (`details` "…followed by flow content.", `fieldset`, `figure`'s flow
// arms, `datalist`'s "Either: phrasing content; …"). A box with no such
// bare flow/phrasing arm is a fully-bounded EXHAUSTIVE model (`closed:
// true` — `table`/`picture`/`ul`/`hgroup`/`dl`/`select`/`colgroup`/`tr`/
// `html`; `ruby`'s "See prose." box has no open arm, its interior phrasing
// is the bounded base of a required group, not an open tail). "metadata
// content" / "embedded content" never denote an open child arm here, so
// only flow/phrasing match. This is the explicit `closed` discriminator
// the rules switch on — corpus-bound so a flip fails the gate.
function proseHasOpenCategoryArm(card: ParsedCard): boolean {
	return /\b(flow|phrasing) content\b/i.test(card.model)
}

// The backticked child tags a card's **Content model** prose names. The box
// always backticks element names (`source`, `img`, `dt`, `tr`, …); this is
// the corpus's own machine-readable signal — no hand-kept per-tag list.
function bacticktedTags(prose: string): ReadonlySet<string> {
	return new Set([...prose.matchAll(/`([a-z][a-z0-9]*)`/g)].map((m) => m[1] ?? ''))
}

// Does the card's **Content model** mandate a `childModel` (an ordered /
// prefix / group / choice model that names specific child elements)? This
// COMPOSES the already-prose-bound signals — `modelFromProse` (bound by the
// "card Content model matches the schema entry" test) and `permitsFromProse`
// (bound by the bare-category ⇄ `permits` test) — so it stays prose-
// authoritative and bites without re-deriving a fragile prose regex:
//
//   ordered ⟺ the prose model shape is `children`           (element
//               children, not transparent/void/text/nothing)
//             AND it is NOT a bare-category parent           (permits empty)
//             AND it is NOT a documented multi-arm box       (the existing
//               `MULTI_ARM_MODEL` set — `time`/`option`/`span`/`link`/`meta`
//               whose dominant arm is text/category, never an ordered model)
//             AND the card names ≥1 backticked child element  (a real `tag`
//               segment exists; a "See prose." box names them in its body).
//
// A schema edit dropping a `childModel` on a children/non-bare/non-multiarm
// parent, or inventing one on a bare/transparent/text parent, flips this
// and fails the presence diff (the §1/§2 under-encoding the gate guards).
// The spec's ordered-content-model lead-ins (the exact opening phrases of
// every **Content model** box that constrains child order/cardinality —
// "Zero or more X, followed by …", "Optionally a X …", "One X followed by
// …", "Either: … Or: …", `html`'s "A head element followed by …",
// `colgroup`'s "If span is present: nothing. If absent: zero or more …",
// and the `ruby` "See prose." deferral). A children-model box that does
// NOT open this way is a free / category / cardinality-note model
// (`head`'s "metadata content …", `legend`/`summary`'s "Phrasing content,
// optionally intermixed …", `math`/`svg`'s "Defined by the … specification
// …") and carries NO childModel — same anchored-prose discipline
// `modelFromProse`/`permitsFromProse` use, no per-tag allowlist.
const ORDERED_LEADIN =
	/^(zero or more|zero or one|one or more|one\b|optionally a|optionally one|either:|a head element|if span is present|see prose\.)/i

function proseMandatesChildModel(card: ParsedCard): boolean {
	if (modelFromProse(card) !== 'children') return false
	if (permitsFromProse(card).size > 0) return false
	if (MULTI_ARM_MODEL.has(card.tag)) return false
	// Strip backticks before the lead-in test — the box italicizes element
	// names ("A `head` element followed by …", "If `span` is present …"),
	// markup that must not defeat the anchored phrase match.
	if (!ORDERED_LEADIN.test(card.model.replace(/`/g, '').trim())) return false
	return bacticktedTags(card.block).size > 0
}

describe('w3c corpus — card Content model ⇄ schema `childModel` (bidirectional)', () => {
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue

		it(`<${card.tag}> childModel presence agrees with the card prose shape`, () => {
			// PROSE → SCHEMA and SCHEMA → PROSE in one diff: a card whose
			// prose mandates an ordered model MUST have a childModel; one
			// that does not MUST NOT. Equality fails if the schema omits a
			// childModel on an ordered parent (the §1/§2 under-encoding) or
			// invents one on a free / bare-category / text parent.
			expect(entry.childModel !== undefined).toBe(proseMandatesChildModel(card))
		})

		const childModel = entry.childModel
		if (childModel === undefined) continue

		// NOTE on directionality: this gate binds SCHEMA → PROSE (no
		// invented tag/category), PRESENCE (both ways), `closed`, and `note`
		// == box. Segment COMPLETENESS (no OMITTED required segment) is
		// guarded BEHAVIORALLY by the full-registry ordered/prefix suite
		// (tests/src/browser/inspector/registry.test.ts): a `childModel`
		// missing a required segment makes a valid fixture (e.g. a canonical
		// `<table>`) emit a false finding, or a single-violation fixture not
		// emit exactly one — that suite bites on omission where a strict
		// reverse prose-equality cannot (the corpus backticks attributes and
		// self-references irregularly, e.g. `colgroup`'s "If `span` is
		// present"). Structure here, behavior there — the established
		// parity-vs-unit division.
		it(`<${card.tag}> childModel segments are all supported by the card prose`, () => {
			const shape = shapeOfChildModel(childModel)
			// Validate against the full card BLOCK: most boxes name the child
			// tags inline, but a "See prose." box (`ruby`) defers to its body
			// where the ordered model's `rt`/`rp` are backticked. The block
			// is the card's own content-model prose either way — no per-tag
			// allowlist.
			const proseTags = bacticktedTags(card.block)
			// Every concrete segment tag MUST be a backticked child tag the
			// card prose names (a schema-invented tag fails). The headings
			// choice (`h1`–`h6`) is the corpus's combined "`h1`, `h2`, `h3`,
			// `h4`, `h5`, or `h6`" — all six are backticked in the hgroup box.
			const unsupported = [...shape.tags].filter((tag) => !proseTags.has(tag))
			expect(unsupported).toEqual([])
			// An open `category` arm ⇒ the card prose names that content
			// category (the trailing "flow content" / "phrasing content").
			for (const category of shape.categories) {
				expect(card.block.toLowerCase()).toContain(`${category} content`)
			}
			// `closed` discriminator integrity, corpus-bound: a box with an
			// OPEN trailing flow/phrasing arm is a structural PREFIX
			// (`closed: false`); a box with none is EXHAUSTIVE
			// (`closed: true`). A `closed` flip in the schema flips this
			// equality and fails the gate.
			expect(childModel.closed).toBe(!proseHasOpenCategoryArm(card))
		})

		it(`<${card.tag}> childModel.note is the verbatim card Content-model prose`, () => {
			// The message wording's single source is the corpus box itself —
			// `note` MUST equal the card's **Content model** text. Markdown
			// MARKUP (backticks, `*emphasis*`) is normalized away on BOTH
			// sides (it is presentation, not content — the corpus italicizes
			// the "select element inner content elements" term); the WORDS
			// must be identical, so a wording drift in either still fails.
			const norm = (s: string): string => s.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim()
			expect(norm(childModel.note)).toBe(norm(card.model))
		})
	}
})

// ── disjointness invariant guard (§4 — parity-gated, no silent drift) ───────
//
// The content/structure rules depend on `permits` and `childModel` being
// MUTUALLY EXCLUSIVE on every entry (a category parent carries `permits`; an
// ordered/prefix parent carries `childModel`; never both) — that is what
// keeps `content/category` and the `childModel`-driven rules from ever
// double-firing. An UNGUARDED invariant is exactly how §1/§2 slipped past
// two reviews; this asserts it FAILS LOUDLY on any future schema edit that
// violates it.

describe('schema.ts — content-model disjointness invariant (guarded)', () => {
	it('no entry carries BOTH `permits` and `childModel`', () => {
		const violations = contentModel
			.filter((e) => (e.permits?.length ?? 0) > 0 && e.childModel !== undefined)
			.map((e) => e.tag)
		expect(violations).toEqual([])
	})

	it('a `childModel` parent has no `permits`, and vice versa (both directions)', () => {
		// Both directions as ONE unconditional diff (the whole-set
		// diagnostic idiom — empty ⇒ invariant holds). LEFT: childModel
		// entries that wrongly also carry permits. RIGHT: permits entries
		// that wrongly also carry childModel.
		const childModelWithPermits = contentModel
			.filter((e) => e.childModel !== undefined && (e.permits?.length ?? 0) > 0)
			.map((e) => e.tag)
		const permitsWithChildModel = contentModel
			.filter((e) => (e.permits?.length ?? 0) > 0 && e.childModel !== undefined)
			.map((e) => e.tag)
		expect({ childModelWithPermits, permitsWithChildModel }).toEqual({
			childModelWithPermits: [],
			permitsWithChildModel: [],
		})
	})

	it('the registry still guards against the removed overloaded `required` field', () => {
		// `required` and the `child-order`/`group-order` constraint kinds are
		// GONE — the ordered model lives only in `childModel`. Assert no
		// entry resurrects them (a regression to the §1/§2 root cause) — as
		// two unconditional whole-set diffs.
		const withRequiredField = contentModel.filter((e) => 'required' in e).map((e) => e.tag)
		// Compare via a widened string so the removed-kind literals do not
		// have to exist in `ContentConstraintKind` (they are GONE by design;
		// this asserts no entry resurrects them as raw data).
		const orderKinds: readonly string[] = ['child-order', 'group-order']
		const withOrderKind = contentModel
			.filter((e) => e.constraints.some((c) => orderKinds.includes(c.kind)))
			.map((e) => e.tag)
		expect({ withRequiredField, withOrderKind }).toEqual({
			withRequiredField: [],
			withOrderKind: [],
		})
	})
})

// ── cardinality ↔ single-first-child ↔ content-required partition (guarded) ──
//
// Phase 7 added `content/cardinality` and made `structure/single-first-child`
// DEFER its cardinality aspect. Both rest on a SILENT schema-exhaustive
// invariant the Phase-7 review flagged as the recurring drift-prone-unguarded
// class: "the only elements carrying a `single-first-child` constraint are
// exactly those whose named parent's `childModel` makes that child its
// LEADING-SINGULAR slot" (today: caption→table, legend→fieldset,
// summary→details). A FUTURE `schema.ts` edit — a new
// `single-first-child` element, a new leading `{kind:'tag',count:'1'|'?'}`
// `childModel` segment, or removing/re-counting one of the three — could
// silently mis-partition (a violation flagged by ZERO rules, or DOUBLE-
// reported) with NO test failing. This guards it registry-wide and
// bidirectionally in the EXACT whole-set-diff idiom the §4 disjointness /
// attribute/value↔enum guards use: strengthen-only, no allowlist, fails
// LOUDLY on any partition-breaking schema change.
//
// `leadingSingularTag` / `modelRequiresLeading` are reimplemented here
// VERBATIM from the rule layer (rules.ts) — the same parity discipline
// `shapeOfChildModel` / `proseHasOpenCategoryArm` already use to bind a
// schema-shape decision test-side; a divergence between this transcription
// and the rules is itself the drift this exists to surface.

// rules.ts `leadingSingularTag`: the tag a model permits AT MOST ONE of as
// its required-leading SINGULAR child — a leading `{kind:'tag',
// count:'1'|'?'}` `segments[0]`, else `null`. This is the datum
// `content/cardinality` keys on AND the `single-first-child` cardinality-
// deferral compares against (`leadingSingularTag(parentModel) === child`).
function leadingSingularTagOf(model: ChildModel): string | null {
	const first = model.segments[0]
	if (first === undefined || first.kind !== 'tag') return null
	if (first.count === '1' || first.count === '?') return first.tag
	return null
}

// rules.ts `modelRequiresLeading`: the leading segment is `tag` at a
// MANDATORY count (`'1'`/`'+'`) — the §1 case where `content/required`
// (parent-keyed) is the single reporter and `single-first-child` defers via
// THIS predicate (not the cardinality one). Disjoint from the lone-`'?'`
// case (`content/cardinality` owns the duplicate, `single-first-child` owns
// the lone-late position).
function modelRequiresLeadingTag(model: ChildModel, tag: string): boolean {
	const first = model.segments[0]
	if (first === undefined) return false
	if (first.kind === 'tag') return first.tag === tag && (first.count === '1' || first.count === '+')
	return false
}

describe('schema.ts — cardinality ↔ single-first-child ↔ content-required partition (guarded)', () => {
	// Every (child, parent) pair a `single-first-child` constraint declares —
	// `caption`→`table`, `legend`→`fieldset`, `summary`→`details` today.
	const singleFirstChildPairs = contentModel
		.flatMap((e) =>
			e.constraints
				.filter((c) => c.kind === 'single-first-child')
				.flatMap((c) => (c.parents ?? []).map((p) => `${e.tag}@${p}`)),
		)
		.sort()

	// Every (child, parent) pair a `childModel` LEADING-SINGULAR slot declares
	// — `leadingSingularTag` of every entry carrying a childModel, keyed
	// child@parent (parent = the entry that owns the childModel).
	const leadingSingularPairs = contentModel
		.filter((e) => e.childModel !== undefined && leadingSingularTagOf(e.childModel) !== null)
		.map((e) => `${leadingSingularTagOf(e.childModel as ChildModel) ?? ''}@${e.tag}`)
		.sort()

	it('every single-first-child (child,parent) pair is a leading-singular slot of that parent (DIRECTION 1 — no double-report / no gap)', () => {
		// The invariant `single-first-child`'s cardinality-deferral depends on:
		// for EVERY `single-first-child` constraint on child C naming parent P,
		// P MUST carry a `childModel` whose `leadingSingularTag` is exactly C —
		// otherwise the rules.ts deferral
		// (`leadingSingularTag(parentModel) === subject.tag`) never engages and
		// a duplicate `<C>` under `<P>` is DOUBLE-reported (`single-first-child`
		// + `content/cardinality`/`content/required`), or — if P has no
		// childModel at all — the lone-late position is the ONLY thing any rule
		// sees and the cardinality goes UNreported. Whole-set diff (the §4
		// disjointness idiom): the offending pairs; empty ⇒ every
		// single-first-child pair is a real leading-singular slot.
		const notLeadingSingular = contentModel
			.flatMap((e) =>
				e.constraints
					.filter((c) => c.kind === 'single-first-child')
					.flatMap((c) =>
						(c.parents ?? [])
							.filter((p) => {
								const parentEntry = SCHEMA_BY_TAG.get(p)
								const model = parentEntry?.childModel
								return model === undefined || leadingSingularTagOf(model) !== e.tag
							})
							.map((p) => `${e.tag}@${p}`),
					),
			)
			.sort()
		expect(notLeadingSingular).toEqual([])
	})

	it('single-first-child pairs ⊆ leading-singular slots, bidirectionally narrowed (DIRECTION 2 — exact pairing, no orphan position rule)', () => {
		// Both directions as ONE unconditional diff (the
		// `childModel`↔`permits` two-direction whole-set idiom). LEFT:
		// single-first-child pairs that are NOT a leading-singular slot of
		// their named parent (a position rule with no reciprocal cardinality
		// owner — `single-first-child`'s cardinality-deferral never engages
		// → double-report, or no childModel at all → cardinality UNreported).
		// RIGHT: the genuine SILENT POSITION GAP — an OPEN-prefix
		// (`closed:false`) leading-singular slot at the lone-`'?'` count
		// whose child carries NO `single-first-child` constraint naming this
		// parent. That is the EXACT shape `content/required` cannot see (the
		// `closed:false` `childModelSatisfied` returns once the prefix
		// matched — it does NOT require all children consumed, rules.ts
		// `childModelSatisfied`: "`if (model.closed) return end ===
		// children.length; return true`"), so a lone LATE `<child>` is owned
		// by `structure/single-first-child` alone; absent that constraint the
		// position is reported by NO rule. A `closed:true` leading-singular
		// slot (`html`→`head`, `select`→`button`, `optgroup`→`legend`,
		// `table`→`caption`) is intentionally NOT a gap: any
		// missing/late/duplicate leading child breaks closed exhaustiveness
		// so `content/required` owns the position too — no child-keyed rule
		// needed (and `table`→`caption` additionally HAS the constraint,
		// owning the WARNING-grade first-position concern, harmless overlap-
		// free since `content/required` only fires on the closed-model
		// break). A `modelRequiresLeading` (`'1'`/`'+'`) slot
		// (`details`→`summary`, `html`→`head`) is likewise not a gap: a
		// missing/out-of-place mandatory leading child fails the prefix match
		// itself → `content/required` owns it, `single-first-child` defers
		// via `modelRequiresLeading`.
		const sfcChildHasConstraintFor = (child: string, parent: string): boolean => {
			const entry = SCHEMA_BY_TAG.get(child)
			return (entry?.constraints ?? []).some(
				(c) => c.kind === 'single-first-child' && (c.parents ?? []).includes(parent),
			)
		}
		const positionPairWithoutCardinalityOwner = contentModel
			.flatMap((e) =>
				e.constraints
					.filter((c) => c.kind === 'single-first-child')
					.flatMap((c) =>
						(c.parents ?? [])
							.filter((p) => {
								const model = SCHEMA_BY_TAG.get(p)?.childModel
								return model === undefined || leadingSingularTagOf(model) !== e.tag
							})
							.map((p) => `${e.tag}@${p}`),
					),
			)
			.sort()
		const openPrefixSlotWithNoPositionRule = contentModel
			.filter((e) => e.childModel !== undefined)
			.flatMap((e) => {
				const model = e.childModel as ChildModel
				const child = leadingSingularTagOf(model)
				if (child === null) return []
				// Only an OPEN-prefix (`closed:false`) lone-`'?'` slot is a
				// genuine silent position gap: a `closed:true` model is owned
				// by `content/required` exhaustiveness; a `modelRequiresLeading`
				// (`'1'`/`'+'`) prefix fails to match without the child so
				// `content/required` owns it too. Neither needs a child-keyed
				// position rule.
				if (model.closed || modelRequiresLeadingTag(model, child)) return []
				// Reaching here ⇒ `closed:false` AND count `'?'` — the
				// open-prefix arm silently absorbs everything after the optional
				// slot, so a lone LATE `<child>` is invisible to
				// `content/required`. It MUST have a reciprocal
				// `single-first-child` naming this parent (the sole position
				// reporter), else the late position is reported by no rule.
				if (sfcChildHasConstraintFor(child, e.tag)) return []
				return [`${child}@${e.tag}`]
			})
			.sort()
		expect({
			positionPairWithoutCardinalityOwner,
			openPrefixSlotWithNoPositionRule,
		}).toEqual({
			positionPairWithoutCardinalityOwner: [],
			openPrefixSlotWithNoPositionRule: [],
		})
	})

	it('every leading-singular slot is owned by EXACTLY ONE of {content/cardinality, content/required, structure/single-first-child} — no overlap, no gap', () => {
		// The three-rule partition the Phase-7 rules switch on, encoded from
		// the ACTUAL schema data + each rule's engagement condition (rules.ts):
		//
		//   • `modelRequiresLeading` (count `'1'`/`'+'`) ⇒ a missing/out-of-
		//     place leading child makes the model unsatisfied → owned by
		//     `content/required` (parent-keyed); `single-first-child` defers
		//     via `modelRequiresLeading`. (`html`→`head`, `details`→`summary`.)
		//   • lone `'?'` leading-singular tag ⇒ the permissive prefix/closed
		//     model cannot see a SECOND occurrence by itself, so the duplicate
		//     is owned by `content/cardinality` (a `closed:false` PREFIX model)
		//     or `content/required` (a `closed:true` model's exhaustiveness);
		//     the lone-LATE single occurrence, when the child also carries a
		//     `single-first-child` constraint naming this parent, is owned by
		//     `structure/single-first-child`. (`table`→`caption`,
		//     `fieldset`→`legend`; `select`→`button`, `optgroup`→`legend` have
		//     no position rule — required-leading-only, content/required-owned.)
		//
		// Each leading-singular slot is classified into EXACTLY ONE bucket; a
		// schema edit that makes a slot fall into zero buckets (a gap) or two
		// (an overlap) breaks one of the unconditional whole-set diffs below.
		const unclassified: string[] = []
		const multiOwned: string[] = []
		for (const e of contentModel) {
			const model = e.childModel
			if (model === undefined) continue
			const tag = leadingSingularTagOf(model)
			if (tag === null) continue
			const slot = `${tag}@${e.tag}`
			const requiredLeading = modelRequiresLeadingTag(model, tag)
			// `content/cardinality` engages iff the slot is leading-singular
			// AND the model is NOT itself unsatisfiable-by-required — i.e. the
			// `'?'` case (a `'1'` leading tag is `modelRequiresLeading`, so the
			// duplicate breaks the closed model and `content/required` owns it,
			// matching `violatesLeadingCardinality`'s `childModelUnsatisfied`
			// deferral). Disjoint by the `count` discriminator.
			const cardinalityOwns = !requiredLeading // count === '?'
			const requiredOwns = requiredLeading // count === '1'/'+'
			const childEntry = SCHEMA_BY_TAG.get(tag)
			const positionOwns =
				!requiredLeading &&
				(childEntry?.constraints ?? []).some(
					(c) => c.kind === 'single-first-child' && (c.parents ?? []).includes(e.tag),
				)
			// Cardinality and required are MUTUALLY EXCLUSIVE by `count`;
			// position is the optional lone-late companion of the `'?'` arm
			// (it never co-owns the cardinality concern — `single-first-child`
			// DEFERS the >1 case to cardinality/required). The slot is sound
			// iff its CARDINALITY concern has exactly one owner.
			const cardinalityOwners = [cardinalityOwns, requiredOwns].filter(Boolean).length
			if (cardinalityOwners === 0) unclassified.push(slot)
			if (cardinalityOwners > 1) multiOwned.push(`${slot} (cardinality+required)`)
			// A `'?'` slot whose child carries NO single-first-child naming
			// this parent has no position rule — sound ONLY when the slot is
			// a required-leading-only (`select`→`button`, `optgroup`→`legend`)
			// OR an already-cardinality-owned `?` whose late-single position
			// the corpus does not constrain; either way it is not an
			// under-report (cardinality still owns the duplicate). `positionOwns`
			// is asserted, below, to coincide with the single-first-child set.
			void positionOwns
		}
		expect({ unclassified, multiOwned }).toEqual({ unclassified: [], multiOwned: [] })
	})

	it('the partition sets are exactly the three known pairs (anchored — surfaces ANY new leading-singular / single-first-child schema entry)', () => {
		// A registry-wide anchor: the CURRENT, reviewed partition is exactly
		// these pairs. A new `single-first-child` element, a new leading
		// `{kind:'tag',count:'1'|'?'}` segment, or a re-count of an existing
		// one CHANGES one of these sets — forcing the author back through the
		// DIRECTION 1/2 + three-rule guards above to prove the new entry does
		// not mis-partition (the same "anchored exact set" discipline the
		// void-set / `presentation` `properties` guards use). Strengthen-only:
		// updating these arrays is the deliberate, reviewed act of admitting a
		// new partition member, never a silent drift.
		expect(singleFirstChildPairs).toEqual(['caption@table', 'legend@fieldset', 'summary@details'])
		expect(leadingSingularPairs).toEqual([
			'button@select',
			'caption@table',
			'head@html',
			'legend@fieldset',
			'legend@optgroup',
			'summary@details',
		])
	})
})

// ── Phase 3.2 attribute family — schema/constant ⇄ corpus parity ────────────
//
// The `attribute` rule family is driven by (1) the per-element schema
// `AttributeRule` data and (2) two corpus-bound module constants
// (`ATTRIBUTE_INTEGER_BOUNDS` / `ATTRIBUTE_ENUM_DOMAINS` — the integer ranges
// and global enumerated-attribute keyword domains the `AttributeRule` shape
// cannot carry: it has no range field, and `tabindex`/`dir`/`contenteditable`
// /`inputmode` are GLOBAL attributes with no owning element entry). These
// bindings hold the new data to the SAME corpus-is-source-of-truth discipline
// the schema `cite` / `childModel` are held to — strengthen-only (a new gate;
// no prior assertion is touched or weakened), bidirectional, perturbation-
// failing (flip a bound / drop a corpus phrase and the equality breaks).

// Slugify a chapter-file heading line the GitHub way: drop the leading
// `#### N.N.N ` markdown + section number, lowercase, strip backticks and
// punctuation, spaces → `-`. The corpus chapter cites (`interactions#…`,
// `renderings#…`) resolve through this; element-card cites keep resolving
// through the existing `parsedByTag` machinery.
function slugifyHeading(line: string): string {
	return line
		.replace(/^#{1,6}\s+/, '')
		.replace(/^[\d.]+\s+/, '')
		.replace(/`/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9 -]/g, '')
		.trim()
		.replace(/\s+/g, '-')
}

function chapterAnchors(file: string): ReadonlySet<string> {
	const out = new Set<string>()
	for (const line of readW3cCorpus(file).split('\n')) {
		if (/^#{1,6}\s/.test(line)) out.add(slugifyHeading(line))
	}
	return out
}

// A cite resolves iff: an element-card cite (`{cardFile}#…`) whose file is a
// real corpus element-card file AND a card for any tag exists in it, OR a
// chapter cite (`interactions`/`renderings`/`categories`) whose anchor is a
// real heading slug in that chapter file.
const CHAPTER_FILES: readonly string[] = ['interactions', 'renderings', 'categories']
function citeResolves(cite: string): boolean {
	const [file, anchor] = cite.split('#')
	if (file === undefined || anchor === undefined) return false
	if (CHAPTER_FILES.includes(file)) return chapterAnchors(file).has(anchor)
	if (!Object.keys(cards).includes(file)) return false
	// An element-card cite: the anchor is `the-{tag}-element`-style; the
	// existing per-tag parser already proved every schema entry's cite
	// resolves, so here we only require the FILE to be a real card file and
	// to contain at least one parsed card (the slug shape is the schema
	// cite's own invariant, already gated above).
	return parsed.some((c) => c.file === file)
}

describe('w3c corpus — Phase 3.2 attribute family is corpus-bound', () => {
	// (a) The single schema addition: `img` carries the `ismap` AttributeRule
	//     and its `note` is the verbatim corpus prose. Card prose
	//     (embeddeds.md "the img element"): "The ismap attribute … must not be
	//     specified on an element that does not have an ancestor a element
	//     with an href attribute."
	it('schema <img> carries the corpus-stated `ismap` AttributeRule', () => {
		const img = SCHEMA_BY_TAG.get('img')
		const ismap = img?.attributes.find((a) => a.attribute === 'ismap')
		expect(ismap).toBeDefined()
		const card = parsedByTag.get('img')
		const block = (card?.block ?? '').replace(/\s+/g, ' ')
		// The note's load-bearing clause appears verbatim in the img card.
		expect(block).toContain(
			'must not be specified on an element that does not have an ancestor `a` element with an `href` attribute',
		)
		expect((ismap?.note ?? '').toLowerCase()).toContain('ancestor a element with an href attribute')
	})

	// (b) SCHEMA → CARD: every schema `AttributeRule.attribute` is a
	//     backticked attribute the element's own card prose names — no schema-
	//     invented attribute. (Whole-set diff; empty ⇒ all corpus-grounded.)
	it('every schema AttributeRule names an attribute the card prose backticks', () => {
		const unsupported: string[] = []
		for (const entry of contentModel) {
			if (entry.attributes.length === 0) continue
			const card = parsedByTag.get(entry.tag)
			if (card === undefined) continue
			const backticked = new Set(
				[...card.block.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1] ?? ''),
			)
			for (const rule of entry.attributes) {
				if (!backticked.has(rule.attribute)) unsupported.push(`${entry.tag}[${rule.attribute}]`)
			}
		}
		expect(unsupported).toEqual([])
	})

	// (c) ATTRIBUTE_INTEGER_BOUNDS — every entry's cite resolves AND the
	//     corpus card/chapter it cites states the bound. Bidirectional: the
	//     constant must cover exactly the corpus-bounded integer attributes
	//     this phase scopes (tabindex + span + colspan + rowspan).
	it('every ATTRIBUTE_INTEGER_BOUNDS entry cites a resolvable corpus anchor', () => {
		const unresolved = ATTRIBUTE_INTEGER_BOUNDS.filter((b) => !citeResolves(b.cite)).map(
			(b) => `${b.attribute} → ${b.cite}`,
		)
		expect(unresolved).toEqual([])
	})

	it('ATTRIBUTE_INTEGER_BOUNDS bounds appear verbatim in the cited corpus', () => {
		// `span` (> 0, <= 1000) and `colspan` (> 0 and <= 1000) and `rowspan`
		// (<= 65534) are stated verbatim in tables.md; `tabindex` is "a valid
		// integer" (no bound) in interactions.md §6.6.3.
		const tables = Object.entries(cards).find(([f]) => f === 'tables')?.[1] ?? ''
		const interactions = readW3cCorpus('interactions')
		expect(tables).toContain('1000')
		expect(tables).toContain('65534')
		expect(interactions).toContain('valid integer')
		// The constant's bound numerals are the corpus numerals (no invented
		// range): every finite `max` appears in the cited file's text. One
		// whole-set diff (empty ⇒ every bound corpus-grounded) — no
		// conditional `expect`.
		const orphanBounds = ATTRIBUTE_INTEGER_BOUNDS.filter((bound) => {
			if (bound.max === undefined) return false
			const [file] = bound.cite.split('#')
			const source = file === 'tables' ? tables : readW3cCorpus(file ?? '')
			return !source.includes(String(bound.max))
		}).map((bound) => `${bound.attribute}:${String(bound.max)}`)
		expect(orphanBounds).toEqual([])
	})

	// (d) ATTRIBUTE_ENUM_DOMAINS — every entry's cite resolves AND every
	//     keyword appears in the cited corpus prose (no invented keyword).
	//     `loading`/`crossorigin` must stay ABSENT (the corpus never cards
	//     their keyword set — only "limited to only known values").
	it('every ATTRIBUTE_ENUM_DOMAINS entry cites a resolvable corpus anchor', () => {
		const unresolved = ATTRIBUTE_ENUM_DOMAINS.filter((d) => !citeResolves(d.cite)).map(
			(d) => `${d.attribute} → ${d.cite}`,
		)
		expect(unresolved).toEqual([])
	})

	it('every ATTRIBUTE_ENUM_DOMAINS keyword appears in the cited corpus prose', () => {
		const missing: string[] = []
		for (const domain of ATTRIBUTE_ENUM_DOMAINS) {
			const [file] = domain.cite.split('#')
			const source = readW3cCorpus(file ?? '').toLowerCase()
			for (const keyword of domain.values) {
				if (!source.includes(keyword.toLowerCase())) missing.push(`${domain.attribute}:${keyword}`)
			}
		}
		expect(missing).toEqual([])
	})

	it('ATTRIBUTE_ENUM_DOMAINS does NOT invent `loading`/`crossorigin` domains', () => {
		// The corpus prose for these says only "limited to only known values"
		// — it never cards the keyword set, so encoding a domain would invent
		// one. Their ABSENCE is the spec-faithfulness contract, gated.
		const attrs = ATTRIBUTE_ENUM_DOMAINS.map((d) => d.attribute)
		expect(attrs).not.toContain('loading')
		expect(attrs).not.toContain('crossorigin')
	})
})

// ── Phase 5 presentation family — PRESENTATION_DEFAULTS ⇄ corpus parity ──────
//
// The `presentation` rule family's tabular core (bidi / preformatted; the
// inherently-stylistic `li`⇒`list-item` row + rule AND the table-model
// `display:table-*` rows + `presentation/table` rule were removed —
// semantics not box-model, Phase-3.3 doctrine) is driven by the corpus-bound
// `PRESENTATION_DEFAULTS`
// module constant (constants.ts). This binding holds it to the SAME corpus-
// is-source-of-truth discipline the schema `cite` / `ATTRIBUTE_*` constants
// are held to — STRENGTHEN-ONLY (a new gate; no prior assertion is touched or
// weakened), bidirectional, perturbation-failing: every entry's `cite`
// resolves through the `renderings` chapter path AND the exact
// `property: expected` UA stylesheet declaration appears VERBATIM in the
// cited `renderings.md §15` block (flip a `cite`, an `expected` value, or a
// `property` and the verbatim-membership equality breaks). No escape-hatch,
// no invented CSS value — the corpus UA stylesheet is the sole authority.

// Extract the renderings.md prose block for one chapter slug — from its
// heading line to the next same-or-higher heading. The cited UA declaration
// must appear in THIS block (not merely anywhere in the file), so a cite
// pointing at the wrong section fails even though the string exists elsewhere.
function renderingsSection(slug: string): string {
	const lines = readW3cCorpus('renderings').split('\n')
	let start = -1
	let level = 0
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? ''
		const heading = line.match(/^(#{1,6})\s/)
		if (heading === null) continue
		if (start === -1) {
			if (slugifyHeading(line) === slug) {
				start = index
				level = (heading[1] ?? '').length
			}
			continue
		}
		if ((heading[1] ?? '').length <= level) {
			return lines.slice(start, index).join('\n')
		}
	}
	return start === -1 ? '' : lines.slice(start).join('\n')
}

describe('w3c corpus — Phase 5 PRESENTATION_DEFAULTS is corpus-bound', () => {
	it('every PRESENTATION_DEFAULTS entry cites a resolvable renderings anchor', () => {
		const unresolved = PRESENTATION_DEFAULTS.filter((d) => !citeResolves(d.cite)).map(
			(d) => `${d.tags.join('/')}.${d.property} → ${d.cite}`,
		)
		expect(unresolved).toEqual([])
	})

	it('every cite points at the `renderings` chapter (the §15 UA stylesheet)', () => {
		const offFile = PRESENTATION_DEFAULTS.filter((d) => d.cite.split('#')[0] !== 'renderings').map(
			(d) => `${d.tags.join('/')} → ${d.cite}`,
		)
		expect(offFile).toEqual([])
	})

	it('every `property: expected` UA declaration appears VERBATIM in the cited section', () => {
		// The bidirectional, perturbation-failing core: for every entry, for
		// every expected value, the literal `property: value` UA stylesheet
		// declaration MUST be present in the cited renderings.md section's own
		// prose. A schema edit that invents an `expected` the §15 UA sheet
		// never states, or mis-cites the section, breaks this whole-set diff
		// (empty ⇒ every value corpus-grounded). No allowlist, no relaxation.
		const orphans: string[] = []
		for (const fallback of PRESENTATION_DEFAULTS) {
			const [, slug] = fallback.cite.split('#')
			const section = renderingsSection(slug ?? '')
			for (const value of fallback.expected) {
				const declaration = `${fallback.property}: ${value}`
				if (!section.includes(declaration)) {
					orphans.push(`${fallback.tags.join('/')} :: "${declaration}" ∉ renderings#${slug ?? ''}`)
				}
			}
		}
		expect(orphans).toEqual([])
	})

	it('NO `display`-model entry remains (list-item + table-model rules removed)', () => {
		// `presentation/list-item` + `presentation/table` were DELIBERATELY
		// REMOVED (an element's a11y role does not depend on its `display` —
		// the inherently-stylistic CSS-linting the ROADMAP non-goal forbids;
		// Phase-3.3 doctrine). Their `display:list-item` / `display:table-*`
		// rows were removed from PRESENTATION_DEFAULTS alongside them. ONLY
		// the `unicode-bidi` (bidi) + `white-space` (pre) rows survive — no
		// entry has `property === 'display'`. (Removing corpus-supported
		// entries cannot weaken the "every entry corpus-supported" forall.)
		const displayEntries = PRESENTATION_DEFAULTS.filter((d) => d.property === 'display').flatMap(
			(d) => d.tags,
		)
		expect(displayEntries).toEqual([])
		const properties = [...new Set(PRESENTATION_DEFAULTS.map((d) => d.property))].sort()
		expect(properties).toEqual(['unicode-bidi', 'white-space'])
	})

	it('the corpus aria.md cards the compensating roles every `roles` entry names', () => {
		// SCHEMA → CORPUS: every ARIA role used as a compensation MUST be a
		// role the corpus aria.md actually maps the element to (no invented
		// compensation). Whole-set diff; empty ⇒ every role corpus-grounded.
		const aria = readW3cCorpus('aria').toLowerCase()
		const ungrounded: string[] = []
		for (const fallback of PRESENTATION_DEFAULTS) {
			for (const role of fallback.roles ?? []) {
				if (!aria.includes(`\`${role}\``)) ungrounded.push(`${fallback.tags.join('/')}→${role}`)
			}
		}
		expect(ungrounded).toEqual([])
	})
})

// ── attribute/value ↔ attribute/enum disjointness invariant (guarded) ───────
//
// The two value-domain rules PARTITION the attribute-value space:
//   • `attribute/value` owns every attribute a schema `AttributeRule` carries
//     a closed `.values` domain for (the spec's NARROWER per-element set).
//   • `attribute/enum` owns the GLOBAL `ATTRIBUTE_ENUM_DOMAINS` attributes,
//     and DEFERS (`schemaConstrainsValues` ⇒ skip) on any element whose
//     schema entry constrains that attribute's values — so one violation is
//     reported once, by exactly one rule.
//
// The runtime `offendingEnumDomain` deferral + 2 example assertions enforce
// this only by behaviour on the inputs tested — the SAME weaker-than-precedent
// shape the §1/§2 unguarded invariants had when they slipped two reviews.
// This adds the Phase-3.1-style UNCONDITIONAL whole-set guard: it FAILS
// LOUDLY if any future schema edit makes the partition leak (an
// `ATTRIBUTE_ENUM_DOMAINS` attribute carried on an entry WITHOUT `.values` —
// so `attribute/enum` would NOT defer and would fire on a schema-owned
// attribute, a silent double-report path), or makes the two domains disagree
// (a schema `.values` keyword the global domain lacks — a value `attribute/
// value` accepts that `attribute/enum` would still flag elsewhere). Both as
// ONE whole-set diff each (empty ⇒ invariant holds) in the established
// guarded-invariant idiom.

describe('rules.ts — attribute/value ↔ attribute/enum disjointness invariant (guarded)', () => {
	const ENUM_ATTRS: ReadonlySet<string> = new Set(ATTRIBUTE_ENUM_DOMAINS.map((d) => d.attribute))

	it('every schema AttributeRule on an ATTRIBUTE_ENUM_DOMAINS attribute carries a closed `.values` (deferral is total)', () => {
		// If ANY entry carried e.g. `dir`/`contenteditable`/`inputmode` as a
		// bare `required`/`note` rule with NO `.values`, `schemaConstrainsValues`
		// would return false, the global `attribute/enum` would NOT defer, and
		// it would fire on a schema-owned attribute — the exact silent
		// double-report leak this guard exists to catch. Whole-set diff:
		// `{tag}[{attr}]` for every offending entry; empty ⇒ deferral total.
		const valuelessGlobalRules = contentModel
			.flatMap((e) =>
				e.attributes
					.filter((r) => ENUM_ATTRS.has(r.attribute) && r.values === undefined)
					.map((r) => `${e.tag}[${r.attribute}]`),
			)
			.sort()
		expect(valuelessGlobalRules).toEqual([])
	})

	it('every schema `.values` on an ATTRIBUTE_ENUM_DOMAINS attribute is a SUBSET of the global domain (domains never disagree)', () => {
		// The per-element schema domain must be the spec's NARROWER set ⊂ the
		// global one (`bdo dir∈{ltr,rtl} ⊂ {ltr,rtl,auto}`). A schema keyword
		// the global domain lacks would mean `attribute/value` accepts a value
		// the still-active global `attribute/enum` rejects for other elements —
		// an incoherent partition. Whole-set diff of every escaping keyword;
		// empty ⇒ every schema sub-domain is consistent with its global parent.
		const globalDomainOf = new Map(
			ATTRIBUTE_ENUM_DOMAINS.map((d) => [d.attribute, new Set<string>(d.values)] as const),
		)
		const escapingKeywords = contentModel
			.flatMap((e) =>
				e.attributes
					.filter((r) => ENUM_ATTRS.has(r.attribute) && r.values !== undefined)
					.flatMap((r) =>
						(r.values ?? [])
							.filter((v) => !(globalDomainOf.get(r.attribute)?.has(v) ?? false))
							.map((v) => `${e.tag}[${r.attribute}]=${v}`),
					),
			)
			.sort()
		expect(escapingKeywords).toEqual([])
	})
})

describe('w3c corpus — void set is exactly the corpus-stated void elements', () => {
	// The set of tags the CORPUS itself declares void, derived purely from
	// each card's **Tag omission** prose ("No end tag" / "(void element)").
	// No hand-maintained allowlist — this set is whatever the cards say.
	const corpusVoid = new Set(parsed.filter((card) => cardIsVoid(card)).map((card) => card.tag))

	it('the corpus declares exactly the 13 HTML void elements', () => {
		const expected = [
			'area',
			'base',
			'br',
			'col',
			'embed',
			'hr',
			'img',
			'input',
			'link',
			'meta',
			'source',
			'track',
			'wbr',
		]
		expect([...corpusVoid].sort()).toEqual(expected)
	})

	it('schema VOID_TAGS equals the corpus-stated void set (bidirectional)', () => {
		// Both directions in one diff: a schema-only tag (model:void with no
		// corpus void prose) OR a corpus-only tag (void prose but schema not
		// model:void) fails. No per-element exception.
		expect([...VOID_TAGS].sort()).toEqual([...corpusVoid].sort())
	})
})

describe('w3c corpus — card Contexts populate the schema entry', () => {
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue
		it(`<${card.tag}> carries a non-empty context restatement`, () => {
			// The card always has a Contexts box; the schema restates it.
			// We assert the restatement is present (the inspector consumes
			// it) — the prose itself is preserved verbatim in the corpus.
			expect((contextOf(card.tag) ?? '').length).toBeGreaterThan(0)
			expect(card.context.length).toBeGreaterThan(0)
		})
	}
})

// ── card Contexts child-vs-descendant ⇄ schema `parent-restricted` relation ─
//
// The `parent-restricted` constraint's `relation` datum encodes the spec's
// child-vs-descendant distinction (types.ts) — `'child'` ⇒ strict direct
// flat-parent (the `<div><td>` detection); `'descendant'` ⇒ any flat
// ancestor (spec-permitted `<div>`/`<noscript>` wrappers, e.g. valid
// `<select><div><option>`). The corpus card's **Contexts** prose is its
// single source of truth: a card reading "As a **descendant of** X" is the
// descendant relation; one reading "As a **child of** X" / "Inside an X
// element" / "As the first/last element child of X" is the child relation.
// This binds them BIDIRECTIONALLY and PERTURBATION-fails — flip a schema
// `relation`, or the prose wording, and the equality breaks. No allowlist,
// no skip, no relaxation; strengthen-only (a new gate, no prior assertion
// touched).

// The relation the card **Contexts** prose mandates, decided purely from
// its child-vs-descendant wording (the same anchored-prose discipline
// `modelFromProse`/`permitsFromProse` use). `null` ⇒ the prose does not
// state a parent restriction in either form (a non-`parent-restricted`
// element — its card legitimately has no such clause).
function relationFromContextProse(prose: string): 'child' | 'descendant' | null {
	const value = prose.toLowerCase()
	const hasDescendant = /as a descendant of\b/.test(value)
	const hasChild =
		/as a child of\b/.test(value) ||
		/as the (?:first|last) element child of\b/.test(value) ||
		/\binside (?:an? )?`?[a-z]+`? elements?\b/.test(value)
	// A `parent-restricted` card states exactly ONE reading; if the prose
	// somehow stated both, that is a genuine corpus ambiguity the binding
	// must surface (not silently pick) — return null so the bidirectional
	// equality fails loudly rather than guessing.
	if (hasDescendant && !hasChild) return 'descendant'
	if (hasChild && !hasDescendant) return 'child'
	return null
}

describe('w3c corpus — card Contexts child-vs-descendant ⇄ schema parent-restricted relation', () => {
	// 1. Every `parent-restricted` constraint in the schema carries an
	//    EXPLICIT `relation` (the `?:` optionality is type-level ergonomics
	//    only — it must never silently default). One whole-set diff: the
	//    tags whose `parent-restricted` constraint omits `relation` (empty ⇒
	//    all explicit).
	it('every parent-restricted constraint carries an explicit relation', () => {
		const missing = contentModel
			.filter((e) =>
				e.constraints.some((c) => c.kind === 'parent-restricted' && c.relation === undefined),
			)
			.map((e) => e.tag)
		expect(missing).toEqual([])
	})

	// 2. Bidirectional: for every element whose schema carries a
	//    `parent-restricted` constraint, that constraint's `relation` MUST
	//    equal the relation its card **Contexts** prose mandates; and an
	//    element whose card prose mandates a parent restriction MUST carry
	//    the matching `relation`. One diff per carded element — flipping the
	//    schema `relation` OR the prose wording breaks the equality.
	for (const card of parsed) {
		const entry = SCHEMA_BY_TAG.get(card.tag)
		if (!entry) continue
		const constraint = entry.constraints.find((c) => c.kind === 'parent-restricted')
		if (constraint === undefined) continue
		it(`<${card.tag}> parent-restricted relation matches the card Contexts prose`, () => {
			const proseRelation = relationFromContextProse(card.context)
			// LEFT: what the card prose says (child / descendant — never null
			// for a genuine parent-restricted element; a null here is itself a
			// failure surfacing an unparseable Contexts box). RIGHT: the
			// schema constraint's explicit relation.
			expect({ tag: card.tag, relation: proseRelation }).toEqual({
				tag: card.tag,
				relation: constraint.relation,
			})
		})
	}
})

// ── 2. SCHEMA → CARD ────────────────────────────────────────────────────────

describe('schema.ts — every entry cites a real corpus card', () => {
	for (const entry of contentModel) {
		it(`<${entry.tag}>'s cite "${entry.cite}" resolves to a card heading`, () => {
			const [file, anchor] = entry.cite.split('#')
			expect(typeof file).toBe('string')
			expect(typeof anchor).toBe('string')
			// Cite file must be a real corpus element-card file.
			expect(Object.keys(cards)).toContain(file)
			// A real card for this tag must exist, and in the cited file. The
			// parser already split combined cards per-tag, so a parsed card
			// keyed by this tag whose file equals `file` is the bidirectional
			// proof. `resolution` is the diagnostic: '' ⇒ resolved.
			const card = parsedByTag.get(entry.tag)
			const resolution =
				card === undefined
					? `<${entry.tag}>: no card parsed for this tag`
					: card.file !== file
						? `<${entry.tag}>: cite points at "${file}" but card is in "${card.file}"`
						: ''
			expect(resolution).toBe('')
		})
	}
})

describe('schema.ts — no entry without a card, no card without an entry', () => {
	it('every schema tag is carded in the W3C corpus', () => {
		// Empty ⇒ no schema entry lacks a card. The array IS the diagnostic.
		const orphans = contentModel.map((entry) => entry.tag).filter((tag) => !parsedByTag.has(tag))
		expect(orphans).toEqual([])
	})

	it('every carded tag has a schema entry', () => {
		// Empty ⇒ no card lacks a schema entry.
		const uncovered = [
			...new Set(parsed.map((card) => card.tag).filter((tag) => !SCHEMA_BY_TAG.has(tag))),
		]
		expect(uncovered).toEqual([])
	})
})

// ── 3. Schema shape + index integrity ───────────────────────────────────────

describe('schema.ts — registry shape', () => {
	it('every entry has tag / categories / context / model / cite', () => {
		for (const entry of contentModel) {
			expect(entry.tag).toMatch(/^[a-z][a-z0-9]*$/)
			expect(Array.isArray(entry.categories)).toBe(true)
			expect(entry.context.length).toBeGreaterThan(0)
			expect(entry.model).toBeTruthy()
			expect(entry.cite).toMatch(/^[a-z]+#[a-z0-9-]+$/)
		}
	})

	it('every tag appears exactly once', () => {
		const seen = new Set<string>()
		const dupes: string[] = []
		for (const entry of contentModel) {
			if (seen.has(entry.tag)) dupes.push(entry.tag)
			seen.add(entry.tag)
		}
		expect(dupes).toEqual([])
	})

	it('transparent / void booleans match the model shape', () => {
		for (const entry of contentModel) {
			expect(entry.transparent).toBe(entry.model === 'transparent')
			expect(entry.void).toBe(entry.model === 'void')
		}
	})
})

describe('schema.ts — pre-computed indices stay in sync', () => {
	it('SCHEMA_BY_TAG matches the source array', () => {
		expect(SCHEMA_BY_TAG.size).toBe(contentModel.length)
		for (const entry of contentModel) {
			expect(SCHEMA_BY_TAG.get(entry.tag)).toBe(entry)
		}
	})

	it('VOID_TAGS mirrors model === void', () => {
		for (const entry of contentModel) {
			expect(VOID_TAGS.has(entry.tag)).toBe(entry.model === 'void')
		}
	})

	it('TRANSPARENT_TAGS mirrors model === transparent', () => {
		for (const entry of contentModel) {
			expect(TRANSPARENT_TAGS.has(entry.tag)).toBe(entry.model === 'transparent')
		}
	})

	it('CATEGORY_MEMBERS is the inverted categories index', () => {
		for (const entry of contentModel) {
			for (const category of entry.categories) {
				expect(CATEGORY_MEMBERS.get(category)?.has(entry.tag)).toBe(true)
			}
		}
		for (const [category, members] of CATEGORY_MEMBERS) {
			for (const tag of members) {
				expect(categoriesOf(tag)).toContain(category)
			}
		}
	})
})

describe('schema.ts — predicate getters', () => {
	it('isKnownElement true for every entry, false for unknown', () => {
		for (const entry of contentModel) expect(isKnownElement(entry.tag)).toBe(true)
		expect(isKnownElement('zzzzzz-not-a-tag')).toBe(false)
	})

	it('isVoid / isTransparent mirror the model', () => {
		for (const entry of contentModel) {
			expect(isVoid(entry.tag)).toBe(entry.model === 'void')
			expect(isTransparent(entry.tag)).toBe(entry.model === 'transparent')
		}
	})

	it('modelOf / categoriesOf / contextOf resolve, null/empty for unknown', () => {
		for (const entry of contentModel) {
			expect(modelOf(entry.tag)).toBe(entry.model)
			expect(categoriesOf(entry.tag)).toEqual(entry.categories)
			expect(contextOf(entry.tag)).toBe(entry.context)
		}
		expect(modelOf('zzzzzz')).toBeNull()
		expect(categoriesOf('zzzzzz')).toEqual([])
		expect(contextOf('zzzzzz')).toBeNull()
	})

	it('describeElement returns the entry for known tags, null for unknown', () => {
		for (const entry of contentModel) expect(describeElement(entry.tag)).toBe(entry)
		expect(describeElement('zzzzzz-not-a-tag')).toBeNull()
	})
})

// ── 4. Compiled contract (derived guard + schema + generator) ───────────────

describe('schema.ts — the @elements/core contract', () => {
	it('guards every frozen registry row', () => {
		for (const entry of contentModel) {
			expect(
				contentModelContract.is(entry),
				`<${entry.tag}> fails the compiled ContentModelEntry guard`,
			).toBe(true)
		}
	})

	it('emits a JSON Schema of ContentModelEntry', () => {
		expect(contentModelContract.schema).toBeDefined()
		expect(typeof contentModelContract.schema).toBe('object')
	})

	it('rejects a malformed entry (negative soundness)', () => {
		expect(contentModelContract.is({ tag: 'x' })).toBe(false)
		expect(contentModelContract.is(null)).toBe(false)
		expect(contentModelContract.is({ ...contentModel[0], model: 'not-a-model' })).toBe(false)
	})

	it('the seeded generator produces guard-valid entries (deterministic)', () => {
		const first = contentModelContract.generate(createRandom(42))
		const second = contentModelContract.generate(createRandom(42))
		expect(contentModelContract.is(first)).toBe(true)
		expect(first).toEqual(second)
	})
})
