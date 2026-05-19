<script lang="ts" setup>
/**
 * InspectorPage — a live, in-page dev-tool that runs the public
 * `Inspector` over real DOM and renders the findings.
 *
 * The `Inspector` (`@elements/browser`) is the framework's semantic-HTML
 * analyzer: it walks a parsed `ParentNode`, evaluates the frozen rule
 * registry against the W3C content-model corpus, and returns an
 * `InspectionResult` — every `Finding` carrying a `severity`
 * (`error` / `warning` / `advice`), the emitting `rule` id, a stable
 * DOM `path`, a human message, the `lens` it belongs to, and the spec
 * `cite` (a `guides/w3c/**` anchor that resolves to the canonical
 * WHATWG paragraph). Two lenses: `structure` (DOM-shape / content-model,
 * schema-driven, never reads style) and `presentation` (computed-style
 * overrides that break the rendered semantics).
 *
 * This page DOGFOODS that API three ways (ROADMAP Phase 7 — "dogfood,
 * live" — extended with the live sandbox), composing only the existing
 * public surface (no inspector / schema / rule change):
 *
 *   1. Audit THIS rendered page. `new Inspector().inspect({ root })`
 *      over the page's own subtree. The page is authored content-model-
 *      conformant, so it surfaces ZERO `error` findings — the live proof
 *      of the dogfood property the Phase-6 `semantics.test.ts` gate
 *      asserts permanently. (Warnings / advice, if any, are reported.)
 *   2. Audit a deliberately-broken fixture. The same `Inspector` over a
 *      DETACHED fixture (`INSPECTOR_DIRTY_FIXTURE`, parsed into an
 *      off-document `<div>` — never inserted, so it can't affect the
 *      page's own conformance) surfaces real, varied violations across
 *      several rule families, rendered as scannable cards.
 *   3. Sandbox — inspect YOUR OWN markup. An editable `<textarea>`
 *      (seeded with `INSPECTOR_SANDBOX_SEED`) parsed into the same kind
 *      of DETACHED off-document `<div>` and re-inspected on demand, so a
 *      visitor can paste arbitrary HTML and watch the findings update
 *      live — the interactive way to "test it out" without touching the
 *      live document or the page's own conformance.
 *
 * Findings are grouped by severity (with counts), filterable by lens +
 * severity, each citing the spec as a real anchor link. An explicit
 * "this subtree conforms" empty state makes the zero-error case a
 * first-class result, not a blank.
 *
 * Authored framework-faithfully: framework elements → the modifier
 * cascade → Tailwind utilities only. No inline styles, no custom CSS,
 * no `<style>` block — the information design is expressed entirely
 * through the framework's own vocabulary (the page IS the proof).
 *
 * Cross-references:
 *   - [w3c.md](../../../guides/w3c.md) — the content-model corpus the
 *     inspector resolves every rule against.
 *   - UseFormPage / UseDialogPage — the sibling interactive-tool pages
 *     this mirrors in structure.
 */
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import type { Finding, FindingSeverity, RuleLens } from '@elements/browser'
import { Inspector, describePath } from '@elements/browser'
import {
	INSPECTOR_CITE_PAGES,
	INSPECTOR_DIRTY_FIXTURE,
	INSPECTOR_SANDBOX_SEED,
	INSPECTOR_SEVERITY_ORDER,
	INSPECTOR_SEVERITY_VARIANT,
	INSPECTOR_SNIPPET_EVENTS,
	INSPECTOR_SNIPPET_RUN,
	INSPECTOR_SPEC_BASE,
} from '../constants.js'

// ─────────────────────────────────────────────────────────────────────
// One inspector instance, re-run on demand. `inspect()` is re-runnable
// (each pass replaces `inspector.findings`); the page keeps an instance
// so the API-reference section can show `inspector.findings` queries.
// ─────────────────────────────────────────────────────────────────────
const inspector = new Inspector()

interface PassResult {
	readonly findings: readonly Finding[]
	readonly counts: Readonly<Record<FindingSeverity, number>>
	readonly walked: number
	readonly duration: number
	readonly ran: boolean
}

const EMPTY: PassResult = {
	findings: [],
	counts: { error: 0, warning: 0, advice: 0 },
	walked: 0,
	duration: 0,
	ran: false,
}

// Filters shared by both panels.
const lens = ref<RuleLens | 'all'>('all')
const severity = ref<FindingSeverity | 'all'>('all')

// ─────────────────────────────────────────────────────────────────────
// Panel 1 — audit THIS page (the dogfood / conform proof). The page's
// sections render as siblings into the route container; the intro
// section's `parentElement` IS that rendered page subtree (the mount
// host under test, the App.vue content region live) — so the inspector
// audits the whole real page without a non-skeleton wrapper element.
// ─────────────────────────────────────────────────────────────────────
const introRef = useTemplateRef<HTMLElement>('introRef')
const pagePass = shallowRef<PassResult>(EMPTY)

function inspectPage(): void {
	const root = introRef.value?.parentElement
	if (!root) return
	const result = inspector.inspect({ root })
	pagePass.value = { ...result, ran: true }
}

// ─────────────────────────────────────────────────────────────────────
// Panel 2 — audit a deliberately-broken DETACHED fixture. Parsed into
// an off-document <div> (never inserted into the live document — so it
// can't influence the page's own conformance / the Phase-6 gate). The
// inspector consumes the PARSED nodes; the page never regex-parses HTML.
// ─────────────────────────────────────────────────────────────────────
const fixturePass = shallowRef<PassResult>(EMPTY)

function inspectFixture(): void {
	const host = document.createElement('div')
	host.innerHTML = INSPECTOR_DIRTY_FIXTURE
	const result = inspector.inspect({ root: host })
	fixturePass.value = { ...result, ran: true }
}

// ─────────────────────────────────────────────────────────────────────
// Panel 3 — the SANDBOX. The visitor's own markup, edited live in a
// <textarea>, parsed into the SAME kind of detached off-document <div>
// the fixture uses (never inserted into the live page — arbitrary pasted
// HTML can't affect this page's conformance / the Phase-6 gate), then
// inspected on demand. Reset restores the seed. The inspector consumes
// the PARSED nodes; the page never regex-parses the HTML itself.
// ─────────────────────────────────────────────────────────────────────
const sandboxHtml = ref<string>(INSPECTOR_SANDBOX_SEED)
const sandboxPass = shallowRef<PassResult>(EMPTY)

function inspectSandbox(): void {
	const host = document.createElement('div')
	host.innerHTML = sandboxHtml.value
	const result = inspector.inspect({ root: host })
	sandboxPass.value = { ...result, ran: true }
}

function resetSandbox(): void {
	sandboxHtml.value = INSPECTOR_SANDBOX_SEED
	sandboxPass.value = EMPTY
}

// ─────────────────────────────────────────────────────────────────────
// Shared view model — group a pass's findings by severity, honoring the
// lens + severity filters. An empty group set ⇒ the conform state.
// ─────────────────────────────────────────────────────────────────────
interface SeverityGroup {
	readonly severity: FindingSeverity
	readonly findings: readonly Finding[]
}

function filtered(pass: PassResult): readonly Finding[] {
	return pass.findings.filter((finding) => {
		if (lens.value !== 'all' && finding.lens !== lens.value) return false
		if (severity.value !== 'all' && finding.severity !== severity.value) return false
		return true
	})
}

function groups(pass: PassResult): readonly SeverityGroup[] {
	const visible = filtered(pass)
	const out: SeverityGroup[] = []
	for (const level of INSPECTOR_SEVERITY_ORDER) {
		const findings = visible.filter((finding) => finding.severity === level)
		if (findings.length > 0) out.push({ severity: level, findings })
	}
	return out
}

const pageGroups = computed(() => groups(pagePass.value))
const fixtureGroups = computed(() => groups(fixturePass.value))
const sandboxGroups = computed(() => groups(sandboxPass.value))

// A pass conforms when it ran and no finding survives the active filter.
function conforms(pass: PassResult): boolean {
	return pass.ran && filtered(pass).length === 0
}

// ── Per-finding display helpers ──────────────────────────────────────
// `Finding.path` is a live `readonly Element[]`; `describePath` is the
// framework's serializable-path adapter (the SAME locator the
// FindingManager keys ids off). The cite is a `{corpusFile}#{anchor}`
// string; map the corpus segment to its canonical WHATWG page.
function pathOf(finding: Finding): string {
	return describePath(finding.element)
}

function citeHref(cite: string): string | null {
	const hash = cite.indexOf('#')
	if (hash < 0) return null
	const file = cite.slice(0, hash)
	const anchor = cite.slice(hash)
	const page = INSPECTOR_CITE_PAGES[file]
	return page ? `${INSPECTOR_SPEC_BASE}${page}${anchor}` : null
}

function severityVariant(level: FindingSeverity): string {
	return INSPECTOR_SEVERITY_VARIANT[level] ?? 'secondary'
}

// Stable per-finding key for the rendered list — the FindingManager's
// own `{rule}@{path}` id shape, computed from the public path adapter.
function findingKey(finding: Finding): string {
	return `${finding.rule}@${pathOf(finding)}`
}
</script>

<template>
	<section id="inspector-intro" ref="introRef">
		<hgroup>
			<h1>Inspector</h1>
			<p>
				A live semantic-HTML analyzer. <code>new Inspector().inspect({ root })</code> walks a parsed
				subtree, evaluates the frozen rule registry against the W3C content-model corpus, and
				returns every <code>Finding</code> — severity, rule id, stable DOM path, message, and the
				spec citation as a real anchor link.
			</p>
		</hgroup>
		<p>
			The inspector reads through <strong>two lenses</strong>. <strong>Structure</strong> is the
			DOM-shape / content-model lens: schema-driven, it never reads computed style — it answers "is
			this element where the spec allows it, with the children the spec permits?" (a
			<code>&lt;div&gt;</code> child of <code>&lt;ul&gt;</code>, a nested <code>&lt;a&gt;</code>, a
			void element with children). <strong>Presentation</strong> is the computed-style lens: it
			catches load-bearing rendering overrides that break the rendered semantics (a list with
			<code>list-style: none</code> and no <code>role</code>, a reversed <code>direction</code>, a
			focusable element painted invisible). Every finding cites the exact WHATWG paragraph it
			enforces.
		</p>
		<aside role="status" class="information" data-alert-open>
			<p>
				<strong>This page:</strong>
				<span v-if="!pagePass.ran">not yet inspected — run the audit below.</span>
				<span v-else>
					walked <code>{{ pagePass.walked }}</code> elements ·
					<code>{{ pagePass.counts.error }}</code> error ·
					<code>{{ pagePass.counts.warning }}</code> warning ·
					<code>{{ pagePass.counts.advice }}</code> advice
				</span>
			</p>
		</aside>
	</section>

	<section id="inspector-filters">
		<h2>1. Lens &amp; severity filter</h2>
		<p>
			Both audits below honor these filters — the same
			<code>inspect({ lens, severity })</code> options the API accepts, applied to the rendered
			result. Narrow to one lens or one severity to scan a large result; the grouped lists and the
			conform state update live.
		</p>
		<div class="cluster">
			<label>
				Lens
				<select v-model="lens">
					<option value="all">All lenses</option>
					<option value="structure">structure</option>
					<option value="presentation">presentation</option>
				</select>
			</label>
			<label>
				Severity
				<select v-model="severity">
					<option value="all">All severities</option>
					<option value="error">error</option>
					<option value="warning">warning</option>
					<option value="advice">advice</option>
				</select>
			</label>
		</div>
		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ INSPECTOR_SNIPPET_EVENTS }}</code></pre>
		</details>
	</section>

	<section id="inspector-live">
		<h2>2. Audit this page (the dogfood)</h2>
		<p>
			Run the inspector over <em>this rendered page's own subtree</em>. The page is authored
			content-model-conformant, so the structure lens reports
			<strong>zero <code>error</code> findings</strong> — the live proof of the dogfood property the
			standing <code>semantics.test.ts</code> gate enforces on every showcase page. The conform
			state below is a first-class result, not a blank.
		</p>
		<menu>
			<li>
				<button type="button" class="primary" @click="inspectPage()">Inspect this page</button>
			</li>
		</menu>

		<aside
			v-if="conforms(pagePass)"
			role="status"
			class="success"
			data-alert-open
			aria-live="polite"
		>
			<p>
				<strong>This subtree conforms.</strong> The inspector walked
				<code>{{ pagePass.walked }}</code> elements in
				<code>{{ pagePass.duration.toFixed(1) }}</code> ms and found nothing matching the active
				filter. Zero errors = the page is content-model-conformant.
			</p>
		</aside>

		<dl v-else-if="pagePass.ran && pageGroups.length > 0">
			<template v-for="group in pageGroups" :key="group.severity">
				<dt>
					<strong :class="severityVariant(group.severity)">{{ group.severity }}</strong>
					<small>· {{ group.findings.length }} finding(s)</small>
				</dt>
				<dd>
					<div class="stack">
						<article
							v-for="finding in group.findings"
							:key="findingKey(finding)"
							:class="severityVariant(finding.severity)"
						>
							<header>
								<code>{{ finding.rule }}</code>
								<small class="badge" :class="severityVariant(finding.severity)">
									{{ finding.severity }}
								</small>
								<small v-if="finding.lens" class="tag">{{ finding.lens }}</small>
							</header>
							<p>{{ finding.message }}</p>
							<p>
								<small>
									Path: <code>{{ pathOf(finding) }}</code>
								</small>
							</p>
							<footer>
								<a
									v-if="citeHref(finding.cite)"
									:href="citeHref(finding.cite) ?? '#'"
									target="_blank"
									rel="noopener noreferrer"
								>
									{{ finding.cite }}
								</a>
								<small v-else
									><code>{{ finding.cite }}</code></small
								>
							</footer>
						</article>
					</div>
				</dd>
			</template>
		</dl>

		<p v-else><small>Not yet inspected — click the button above.</small></p>

		<details>
			<summary><small>Markup</small></summary>
			<pre><code>{{ INSPECTOR_SNIPPET_RUN }}</code></pre>
		</details>
	</section>

	<section id="inspector-fixture">
		<h2>3. Audit a deliberately-broken fixture</h2>
		<p>
			The same <code>Inspector</code> over a DETACHED fixture — markup parsed into an off-document
			<code>&lt;div&gt;</code> that is never inserted into the live page (so it can never affect
			this page's own conformance). Every break is authored to survive HTML parsing intact. It
			produces <strong>six real <code>error</code> findings across four rule families</strong>: a
			bare <code>&lt;div&gt;</code> child of <code>&lt;ul&gt;</code> and a
			<code>&lt;span&gt;</code> child of
			<code>&lt;dl&gt;</code> (<code>context/parent-model</code>), a
			<code>&lt;button&gt;</code> inside an <code>&lt;a href&gt;</code> (both
			<code>content/forbidden</code> and <code>transparent/interactive-descendant</code>), a second
			<code>&lt;summary&gt;</code> in a <code>&lt;details&gt;</code> (<code
				>content/cardinality</code
			>
			— its content model permits exactly one), and a second <code>&lt;figcaption&gt;</code> in a
			<code>&lt;figure&gt;</code>
			(<code>structure/edge-child</code>). Each becomes one scannable, spec-cited finding.
		</p>
		<menu>
			<li>
				<button type="button" class="danger" @click="inspectFixture()">
					Inspect the broken fixture
				</button>
			</li>
		</menu>

		<aside
			v-if="conforms(fixturePass)"
			role="status"
			class="information"
			data-alert-open
			aria-live="polite"
		>
			<p>
				No findings match the active filter. Loosen the lens / severity filter above to see the
				fixture's violations.
			</p>
		</aside>

		<dl v-else-if="fixturePass.ran && fixtureGroups.length > 0">
			<template v-for="group in fixtureGroups" :key="group.severity">
				<dt>
					<strong :class="severityVariant(group.severity)">{{ group.severity }}</strong>
					<small>· {{ group.findings.length }} finding(s)</small>
				</dt>
				<dd>
					<div class="stack">
						<article
							v-for="finding in group.findings"
							:key="findingKey(finding)"
							:class="severityVariant(finding.severity)"
						>
							<header>
								<code>{{ finding.rule }}</code>
								<small class="badge" :class="severityVariant(finding.severity)">
									{{ finding.severity }}
								</small>
								<small v-if="finding.lens" class="tag">{{ finding.lens }}</small>
							</header>
							<p>{{ finding.message }}</p>
							<p v-if="finding.expected || finding.actual">
								<small>
									<span v-if="finding.expected">
										Expected: <code>{{ finding.expected }}</code>
									</span>
									<span v-if="finding.actual">
										· Actual: <code>{{ finding.actual }}</code>
									</span>
								</small>
							</p>
							<p>
								<small>
									Path: <code>{{ pathOf(finding) }}</code>
								</small>
							</p>
							<footer>
								<a
									v-if="citeHref(finding.cite)"
									:href="citeHref(finding.cite) ?? '#'"
									target="_blank"
									rel="noopener noreferrer"
								>
									{{ finding.cite }}
								</a>
								<small v-else
									><code>{{ finding.cite }}</code></small
								>
							</footer>
						</article>
					</div>
				</dd>
			</template>
		</dl>

		<p v-else>
			<small>Not yet inspected — click the button above to see real findings.</small>
		</p>
	</section>

	<section id="inspector-sandbox">
		<h2>4. Sandbox — inspect your own markup</h2>
		<p>
			Edit the HTML below and run the inspector against it. The markup is parsed into a
			<strong>detached, off-document <code>&lt;div&gt;</code></strong> — exactly like the fixture
			above, so whatever you paste can never affect this page's own conformance — and the
			<code>Inspector</code> walks the parsed nodes (the page never regex-parses the string). The
			seed mixes conformant markup with two tree-decidable breaks so findings show immediately; edit
			the breaks away and the sandbox reaches the conform empty state.
		</p>
		<label>
			HTML to inspect
			<textarea v-model="sandboxHtml" class="font-mono" rows="10" spellcheck="false"></textarea>
		</label>
		<menu>
			<li>
				<button type="button" class="primary" @click="inspectSandbox()">Inspect this markup</button>
			</li>
			<li>
				<button type="button" class="subtle" @click="resetSandbox()">Reset to seed</button>
			</li>
		</menu>

		<aside
			v-if="conforms(sandboxPass)"
			role="status"
			class="success"
			data-alert-open
			aria-live="polite"
		>
			<p>
				<strong>This subtree conforms.</strong> The inspector walked
				<code>{{ sandboxPass.walked }}</code> elements in
				<code>{{ sandboxPass.duration.toFixed(1) }}</code> ms and found nothing matching the active
				filter. Your markup is content-model-conformant.
			</p>
		</aside>

		<dl v-else-if="sandboxPass.ran && sandboxGroups.length > 0">
			<template v-for="group in sandboxGroups" :key="group.severity">
				<dt>
					<strong :class="severityVariant(group.severity)">{{ group.severity }}</strong>
					<small>· {{ group.findings.length }} finding(s)</small>
				</dt>
				<dd>
					<div class="stack">
						<article
							v-for="finding in group.findings"
							:key="findingKey(finding)"
							:class="severityVariant(finding.severity)"
						>
							<header>
								<code>{{ finding.rule }}</code>
								<small class="badge" :class="severityVariant(finding.severity)">
									{{ finding.severity }}
								</small>
								<small v-if="finding.lens" class="tag">{{ finding.lens }}</small>
							</header>
							<p>{{ finding.message }}</p>
							<p v-if="finding.expected || finding.actual">
								<small>
									<span v-if="finding.expected">
										Expected: <code>{{ finding.expected }}</code>
									</span>
									<span v-if="finding.actual">
										· Actual: <code>{{ finding.actual }}</code>
									</span>
								</small>
							</p>
							<p>
								<small>
									Path: <code>{{ pathOf(finding) }}</code>
								</small>
							</p>
							<footer>
								<a
									v-if="citeHref(finding.cite)"
									:href="citeHref(finding.cite) ?? '#'"
									target="_blank"
									rel="noopener noreferrer"
								>
									{{ finding.cite }}
								</a>
								<small v-else
									><code>{{ finding.cite }}</code></small
								>
							</footer>
						</article>
					</div>
				</dd>
			</template>
		</dl>

		<p v-else>
			<small>Not yet inspected — edit the markup above, then click "Inspect this markup".</small>
		</p>
	</section>

	<section id="inspector-api">
		<h2>5. API reference</h2>
		<dl>
			<dt><code>new Inspector()</code></dt>
			<dd>
				Construct the analyzer. No options at construction — every pass is configured per
				<code>inspect()</code> call. Re-runnable; each pass replaces
				<code>inspector.findings</code>.
			</dd>
			<dt><code>inspector.inspect(options?): InspectionResult</code></dt>
			<dd>
				Run one pass. <code>options.root</code> defaults to <code>document</code>; pass an
				<code>Element</code> to scope to a subtree. <code>options.severity</code> /
				<code>options.lens</code> filter the collected findings; <code>options.on</code> wires
				<code>start</code> / <code>finding</code> / <code>done</code> listeners for that pass. A
				non-<code>Element</code> / non-<code>Document</code> root throws (programmer error).
			</dd>
			<dt><code>InspectionResult.findings</code> / <code>.counts</code></dt>
			<dd>
				Every <code>Finding</code> in walk order; <code>counts</code> tallies by severity (<code
					>error</code
				>
				/ <code>warning</code> / <code>advice</code>, always present). <code>.walked</code> is the
				element count; <code>.duration</code> the wall-clock ms.
			</dd>
			<dt><code>inspector.findings</code></dt>
			<dd>
				The <code>FindingManager</code> over the last pass: <code>findings()</code> /
				<code>findings(severity)</code> / <code>findings(lens)</code> / <code>findings(root)</code>,
				<code>finding(id)</code> (the <code>{rule}@{path}</code> id), and <code>clear()</code> /
				<code>clear(id)</code> / <code>clear(ids)</code>.
			</dd>
			<dt><code>inspector.rules</code></dt>
			<dd>
				The frozen rule registry the inspector evaluates (read-only). Each
				<code>RuleInterface</code> is a pure
				<code>(element, context) =&gt; Finding | null</code> with a stable <code>id</code>, a
				<code>severity</code>, and a <code>lens</code>.
			</dd>
		</dl>
		<p>
			Full spec: <a href="#/w3c">the W3C content-model corpus</a> the inspector resolves every rule
			against. The inspector's own guide documents the rule catalog, the schema shape, the
			transparent-content-model algorithm, and how to add a rule.
		</p>
	</section>
</template>
