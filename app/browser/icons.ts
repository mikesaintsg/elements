// DEV-ONLY icon inspection harness (see icons.html header). Renders
// every route's `.showcase-nav-icon` glyph large (132 px) + a small
// sanity copy (18 px).
//
// `styles/showcase.css` stays the single source of truth: we PROBE each
// route's resolved `--icon` from an offscreen node that recreates the
// exact shipped selector context (`.showcase-sidebar-scroll
// a[href="#/{id}"] .showcase-nav-icon`), then paint decoupled display
// `<i class="icon">` nodes with that value — so the display grid is
// free of the sidebar's collapsing flex/overflow layout while the glyph
// data still comes straight from showcase.css. Not a Vue route, not in
// the production build, not test-scanned.
import './styles/main.css'
import { routes } from './router.js'

const grid = document.getElementById('grid')

// 1. Offscreen prober — read the per-route `--icon` showcase.css emits.
const prober = document.createElement('div')
prober.className = 'showcase-sidebar-scroll'
prober.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden'
const probeEls = new Map<string, HTMLElement>()
for (const r of routes) {
	const a = document.createElement('a')
	a.setAttribute('href', `#/${r.id}`)
	const i = document.createElement('i')
	i.className = 'showcase-nav-icon'
	a.appendChild(i)
	prober.appendChild(a)
	probeEls.set(r.id, i)
}
document.body.appendChild(prober)

// 2. Build the visible grid from the probed values.
if (grid) {
	for (const r of routes) {
		const probed = probeEls.get(r.id)
		const iconVar = probed ? getComputedStyle(probed).getPropertyValue('--icon').trim() : ''

		const cell = document.createElement('div')
		cell.className = 'inspect-cell'

		const big = document.createElement('i')
		big.className = 'icon inspect-big'
		big.setAttribute('aria-hidden', 'true')

		const small = document.createElement('i')
		small.className = 'icon inspect-small'
		small.setAttribute('aria-hidden', 'true')

		if (iconVar) {
			big.style.setProperty('--icon', iconVar)
			small.style.setProperty('--icon', iconVar)
		}

		const label = document.createElement('div')
		label.className = 'inspect-label'
		label.innerHTML = `${r.title}<br /><code>#/${r.id}</code>`

		cell.append(big, small, label)
		grid.appendChild(cell)
	}
}

// 3. Drop the prober — it has done its job.
prober.remove()
