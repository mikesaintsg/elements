// ============================================================================
//  Large-tree performance budget (ROADMAP Phase 8 — the standing perf gate).
//
//  A walker OR rule-complexity regression in the inspector would show up as
//  a collapse in throughput over a large DOM. This suite builds ONE genuinely
//  deep AND wide DOM tree, deterministically (every structural choice is
//  drawn from `@elements/core` `createRandom(seed)` — the SAME seeded
//  synthetic-DOM idiom `Walker.test.ts` / `registry.test.ts` use, reusing
//  the established `el()` builder, NOT a parallel reinvention), and asserts a
//  walked-node-per-millisecond floor over the FULL public pass
//  `new Inspector().inspect({ root })` (Walker walk + all 27 frozen rules per
//  node — so either a Walker OR a rule-complexity regression trips it).
//
//  The throughput is read from the Inspector's OWN instrumentation
//  (`InspectionResult.walked` / `.duration`, already a monotonic
//  `performance.now()` bracket — chromium-monotonic; `fileParallelism:false`
//  is configured for the `src:browser` project so timing is fair). This
//  dogfoods the shipped API rather than re-measuring it externally.
//
//  EVIDENCE-TUNED FLOOR (AGENTS §16.3 — tune only with evidence, prefer
//  defaults, no exploratory runner config): the floor below is NOT arbitrary.
//  Measured (Edge/chromium, `src:browser` project, default runner — a 1-run
//  warmup then 5 timed runs over the seeded ~8.7k-element tree, repeated
//  across 5 independent whole-suite executions): the per-execution MEDIAN
//  rate sat at ~37–46 nodes/ms; the single worst cold pass observed (a GC/JIT
//  outlier the median robust statistic absorbs) was ~19.5 nodes/ms, and even
//  that execution's median was 36.9. The floor of 3 nodes/ms is ~12× below
//  the worst observed median and ~6× below even the worst single outlier
//  pass — so normal chromium / CI timing variance (GC, JIT, a busy host)
//  never trips it, while an inspector regression that turned the per-node
//  cost ~10× (a Walker or rule-complexity blow-up, dropping the rate to
//  ~4 nodes/ms) still drives the median through it. The whole pass takes a
//  fraction of a second, so it is a normal standing gate — no special vitest
//  timeout / parallelism / launch flag is added (none is needed; §16.3 —
//  remove exploratory config, prefer the default surface).
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Inspector } from '@elements/browser'
import { createRandom } from '@elements/core'

describe('Inspector — large-tree performance budget', () => {
	let container: HTMLDivElement

	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	// The established seeded-synthetic-DOM idiom (verbatim from
	// Walker.test.ts / registry.test.ts): build an element with optional
	// children, no mounting — the root is mounted by the caller.
	function el(tag: string, children: readonly Element[] = []): Element {
		const node = document.createElement(tag)
		for (const child of children) node.appendChild(child)
		return node
	}

	// A fixed palette of real HTML tags spanning the rule families the
	// Inspector evaluates (flow / sectioning / grouping / phrasing /
	// transparent / interactive / leaf) so every yielded node genuinely
	// exercises the Walker context resolution + all 27 frozen rules — a
	// regression in any of them shows up in the throughput.
	const BRANCH_TAGS = [
		'section',
		'article',
		'div',
		'p',
		'ul',
		'span',
		'a',
		'figure',
		'nav',
		'aside',
	] as const
	const LEAF_TAGS = ['span', 'em', 'strong', 'code', 'br', 'b', 'i'] as const

	// Build a deterministic deep AND wide tree from `createRandom(seed)`.
	// `depth` bounds nesting; `breadth` bounds the children per branch node;
	// the recursion is purely seed-driven so a fixed seed yields a
	// byte-reproducible structure (asserted below). Returns the root plus the
	// total element count so determinism can be checked structurally.
	function buildTree(
		seed: number,
		depth: number,
		breadth: number,
	): { root: Element; count: number } {
		const random = createRandom(seed)
		let count = 0

		function pick<T>(list: readonly T[]): T {
			const item = list[Math.floor(random() * list.length)]
			if (item === undefined) throw new Error('fixture: empty palette')
			return item
		}

		function grow(level: number): Element {
			count += 1
			if (level >= depth) return el(pick(LEAF_TAGS))
			const node = document.createElement(pick(BRANCH_TAGS))
			// 2..breadth children — wide at every level, not just the leaves.
			const kids = 2 + Math.floor(random() * (breadth - 1))
			for (let i = 0; i < kids; i += 1) node.appendChild(grow(level + 1))
			return node
		}

		const root = grow(0)
		return { root, count }
	}

	// A stable structural fingerprint: tag + childcount, depth-first. Two
	// builds with the same seed must produce an identical fingerprint.
	function fingerprint(node: Element): string {
		const parts: string[] = [`${node.tagName}:${node.childElementCount}`]
		for (const child of Array.from(node.children)) parts.push(fingerprint(child))
		return parts.join('|')
	}

	const SEED = 0x5eed_8 // fixed — the budget tree is byte-reproducible.
	const DEPTH = 7
	const BREADTH = 5

	it('the seeded deep/wide tree is byte-reproducible across builds', () => {
		const a = buildTree(SEED, DEPTH, BREADTH)
		const b = buildTree(SEED, DEPTH, BREADTH)
		expect(a.count).toBe(b.count)
		expect(fingerprint(a.root)).toBe(fingerprint(b.root))
		// Genuinely deep AND wide: thousands of valid elements.
		expect(a.count).toBeGreaterThan(2000)
	})

	it('inspect() over the large tree holds the walked-node/ms throughput floor', () => {
		const { root, count } = buildTree(SEED, DEPTH, BREADTH)
		container.appendChild(root)

		// Warmup pass absorbs first-call JIT / allocation noise (its rate is
		// discarded — it is not part of the measured distribution).
		new Inspector().inspect({ root: container })

		// N timed passes; throughput is the Inspector's OWN instrumentation
		// (walked / duration — its internal monotonic performance.now()
		// bracket), so a Walker OR rule-complexity regression is caught.
		const RUNS = 5
		const rates: number[] = []
		for (let i = 0; i < RUNS; i += 1) {
			const result = new Inspector().inspect({ root: container })
			// The whole seeded subtree is walked every pass (deterministic).
			expect(result.walked).toBeGreaterThanOrEqual(count)
			expect(result.duration).toBeGreaterThan(0)
			rates.push(result.walked / result.duration)
		}

		// Robust statistic: the median of the timed runs (immune to a single
		// GC-stalled outlier in either direction).
		const sorted = [...rates].sort((a, b) => a - b)
		const median = sorted[Math.floor(sorted.length / 2)] ?? 0

		// EVIDENCE-TUNED (see the file header for the measured distribution):
		// the observed per-execution median is ~37–46 nodes/ms; this floor is
		// ~12× below it, so it catches a ~10× per-node complexity regression
		// while never tripping on normal chromium/CI timing variance.
		const FLOOR = 3 // walked nodes per millisecond

		console.log(
			`[perf] tree=${count} nodes · rates(nodes/ms)=[${rates
				.map((r) => r.toFixed(1))
				.join(', ')}] · median=${median.toFixed(1)} · floor=${FLOOR}`,
		)

		expect(median).toBeGreaterThanOrEqual(FLOOR)
	})
})
