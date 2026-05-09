// ============================================================================
//  components/_menu.scss — bare <menu> as toolbar / action row.
//  Article-context menu = card actions (justify-end);
//  Nav-context menu = vertical column.
// ============================================================================

import { afterEach, describe, expect, it } from 'vitest'
import { build, mount, pixels, render, style, token } from '../../../setupStyles'

afterEach(() => {
	for (const child of Array.from(document.body.children)) {
		const tag = child.tagName
		if (tag === 'MAIN' || tag === 'NAV' || tag === 'MENU') {
			child.remove()
		}
	}
})

describe('menu — token surface', () => {
	it('exposes --set-menu-* tokens on a bare <menu>', () => {
		const el = render('menu', '')
		expect(token(el, '--set-menu-color').trim()).not.toBe('')
		expect(token(el, '--set-menu-gap').trim()).not.toBe('')
		expect(token(el, '--set-menu-justify-content').trim()).not.toBe('')
	})
})

describe('menu — bare horizontal toolbar', () => {
	it('flex row with no list markers', () => {
		const el = render('menu', '')
		expect(style(el, 'display')).toBe('flex')
		expect(style(el, 'flex-wrap')).toBe('wrap')
		expect(style(el, 'list-style-type')).toBe('none')
		expect(pixels(el, 'margin-top')).toBe(0)
		expect(pixels(el, 'padding-left')).toBe(0)
	})

	it('justify-content defaults to flex-start', () => {
		const el = render('menu', '')
		expect(style(el, 'justify-content')).toBe('flex-start')
	})

	it('<li> wrappers use display: contents so their children are flex items', () => {
		const menu = build('menu')
		const li = build('li')
		const button = build('button', '', 'Action')
		li.appendChild(button)
		menu.appendChild(li)
		mount(menu)

		expect(style(li, 'display')).toBe('contents')
	})
})

describe('menu — article context = card actions', () => {
	it('article menu has justify-content: flex-end', () => {
		const article = build('article')
		const menu = build('menu')
		article.appendChild(menu)
		mount(article)

		expect(style(menu, 'justify-content')).toBe('flex-end')
	})
})

describe('menu — nav-rail context = vertical column', () => {
	it('menu inside a body-shell nav rail goes vertical', () => {
		const nav = build('nav')
		const menu = build('menu')
		const main = build('main', '', 'Body')
		nav.appendChild(menu)
		document.body.append(nav, main)

		expect(style(menu, 'flex-direction')).toBe('column')
	})
})
