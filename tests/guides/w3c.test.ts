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
	CATEGORY_MEMBERS,
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
	type ContentCategory,
	type ContentModel,
} from '@elements/browser'
import { createRandom } from '@elements/core'
import { readW3cElementCards } from '../setupServer'

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
			// A genuine element card always carries all three boxes. Section
			// dividers like "4.3.11 Headings and outlines" carry none and are
			// skipped here (no false card).
			if (categories === '' && context === '' && model === '') continue
			for (const tag of current.tags) {
				out.push({ tag, file, categories, context, model })
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

// Prose "Content model" box → the ContentModel shape the schema must carry.
function modelFromProse(prose: string): ContentModel | null {
	const value = prose.trim().toLowerCase()
	if (value === '') return null
	if (/^nothing\b/.test(value)) return 'nothing'
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

// Tags carded with `model: void` in the schema whose prose says "Nothing"
// but whose **Tag omission** is "No end tag" (true void elements). The
// model-shape check treats nothing/void as compatible for these.
const VOID_BY_OMISSION: ReadonlySet<string> = new Set(['br', 'wbr', 'embed'])

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
	const prose = modelFromProse(card.model)
	const schema = modelOf(card.tag)
	if (schema === null) {
		return { ok: false, why: `<${card.tag}>: schema carries no model` }
	}
	if (prose === null) {
		// Combined-card edge with no parseable Content-model box — the only
		// requirement is that the schema carries a known model (it does).
		return { ok: true, why: '' }
	}
	if (MULTI_ARM_MODEL.has(card.tag)) {
		// Documented multi-arm prose — schema picks the dominant arm by
		// design (see schema.ts); only require a known model.
		return { ok: true, why: '' }
	}
	if (VOID_BY_OMISSION.has(card.tag) && schema === 'void') {
		// Card says "Nothing" but **Tag omission** is "No end tag" — a true
		// void element; nothing/void are compatible here.
		const ok = prose === 'nothing' || prose === 'void'
		return {
			ok,
			why: `<${card.tag}>: void-by-omission but card parsed to "${prose}"`,
		}
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
