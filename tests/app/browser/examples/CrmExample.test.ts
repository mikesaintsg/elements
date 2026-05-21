// ============================================================================
//  CrmExample — framework-usage assertions.
//
//  Separate from CrmExamplePage.test.ts so the assertions stay focused on
//  the framework idioms the example exercises. The page-level test owns
//  landmarks; this file owns counts + data wiring + drag/drop attributes +
//  chat turn structure + docs panel + dialog.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import CrmExample from '../../../../app/browser/examples/CrmExample.vue'

function mount(): { host: HTMLElement; teardown: () => void } {
	const host = document.createElement('div')
	document.body.appendChild(host)
	const app = createApp(CrmExample)
	app.mount(host)
	return {
		host,
		teardown: () => {
			app.unmount()
			host.remove()
		},
	}
}

describe('CrmExample — body-shell structure', () => {
	it('context rail uses semantic <nav> with the expected id + class="start"', () => {
		const { host, teardown } = mount()
		try {
			const nav = host.querySelector('nav#crm-context')
			expect(nav).not.toBeNull()
			expect(nav?.classList.contains('start')).toBe(true)
			// popover binding is conditional on viewport; assert absent or "auto".
			const popover = nav?.getAttribute('popover')
			expect(popover === null || popover === 'auto').toBe(true)
		} finally {
			teardown()
		}
	})

	it('docs panel uses <aside> with the expected id + class="end"', () => {
		const { host, teardown } = mount()
		try {
			const aside = host.querySelector('aside#crm-docs')
			expect(aside).not.toBeNull()
			expect(aside?.classList.contains('end')).toBe(true)
			const popover = aside?.getAttribute('popover')
			expect(popover === null || popover === 'auto').toBe(true)
		} finally {
			teardown()
		}
	})

	it('<main> has zero-padding token overrides (crm-main class present)', () => {
		const { host, teardown } = mount()
		try {
			const main = host.querySelector('main.crm-main')
			expect(main).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('CrmExample — context rail', () => {
	it('renders 2 pinned entries in the pinned list', () => {
		const { host, teardown } = mount()
		try {
			// Pinned list is the first .crm-context-list.
			const lists = host.querySelectorAll('ul.crm-context-list')
			expect(lists.length).toBeGreaterThanOrEqual(2)
			const pinnedItems = lists[0]?.querySelectorAll('li.crm-entry')
			expect(pinnedItems?.length).toBeGreaterThanOrEqual(2)
		} finally {
			teardown()
		}
	})

	it('renders 5 recent entries in the recent list', () => {
		const { host, teardown } = mount()
		try {
			const lists = host.querySelectorAll('ul.crm-context-list')
			const recentItems = lists[1]?.querySelectorAll('li.crm-entry')
			expect(recentItems?.length).toBeGreaterThanOrEqual(5)
		} finally {
			teardown()
		}
	})

	it('context list entries have [data-index] attributes (useDrag wiring)', () => {
		const { host, teardown } = mount()
		try {
			const entries = host.querySelectorAll('ul.crm-context-list li.crm-entry[data-index]')
			expect(entries.length).toBeGreaterThanOrEqual(5)
		} finally {
			teardown()
		}
	})

	it('drag-handle elements are present on context entries', () => {
		const { host, teardown } = mount()
		try {
			const handles = host.querySelectorAll('ul.crm-context-list li.crm-entry .drag-handle')
			expect(handles.length).toBeGreaterThanOrEqual(5)
		} finally {
			teardown()
		}
	})

	it('context rail has a <form role="search"> input', () => {
		const { host, teardown } = mount()
		try {
			const searchForm = host.querySelector('nav#crm-context form[role="search"]')
			expect(searchForm).not.toBeNull()
			expect(searchForm?.querySelector('input[type="search"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('account footer is present in the context nav with framework .avatar', () => {
		const { host, teardown } = mount()
		try {
			const footer = host.querySelector('nav#crm-context > footer')
			expect(footer).not.toBeNull()
			// Migrated from scoped .crm-avatar-account to framework .avatar.primary
			expect(footer?.querySelector('.avatar.primary')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('CrmExample — chat pane', () => {
	it('renders 7 chat turns in the thread', () => {
		const { host, teardown } = mount()
		try {
			const turns = host.querySelectorAll('ol.crm-turns > li.crm-turn')
			expect(turns.length).toBe(7)
		} finally {
			teardown()
		}
	})

	it('has a tool-call <details> turn (accordion for tool args + result)', () => {
		const { host, teardown } = mount()
		try {
			const toolTurn = host.querySelector('.crm-turn[data-role="tool"] details.crm-turn-tool')
			expect(toolTurn).not.toBeNull()
			expect(toolTurn?.querySelector('summary')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('has an inline form turn (agent paused for structured input)', () => {
		const { host, teardown } = mount()
		try {
			const formTurn = host.querySelector('.crm-turn[data-role="form"] article.crm-turn-form')
			expect(formTurn).not.toBeNull()
			expect(formTurn?.querySelector('form')).not.toBeNull()
			expect(formTurn?.querySelector('select')).not.toBeNull()
			expect(formTurn?.querySelector('input[type="date"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('has rep and agent turns with correct data-role attributes', () => {
		const { host, teardown } = mount()
		try {
			expect(host.querySelector('.crm-turn[data-role="rep"]')).not.toBeNull()
			expect(host.querySelector('.crm-turn[data-role="agent"]')).not.toBeNull()
			expect(host.querySelector('.crm-turn[data-role="thinking"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('reply composer is present with a textarea and send button', () => {
		const { host, teardown } = mount()
		try {
			const composer = host.querySelector('footer.crm-composer')
			expect(composer).not.toBeNull()
			expect(composer?.querySelector('textarea#crm-reply')).not.toBeNull()
			expect(composer?.querySelector('button.primary')).not.toBeNull()
		} finally {
			teardown()
		}
	})

	it('command bar has a <form role="search"> for the ask/search input', () => {
		const { host, teardown } = mount()
		try {
			const form = host.querySelector('header form[role="search"]')
			expect(form).not.toBeNull()
			expect(form?.querySelector('input[type="search"]')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})

describe('CrmExample — documents panel', () => {
	it('renders 4 document rows in the docs panel', () => {
		const { host, teardown } = mount()
		try {
			const docRows = host.querySelectorAll('aside#crm-docs .crm-doc-row')
			expect(docRows.length).toBe(4)
		} finally {
			teardown()
		}
	})

	it('"Add note" button triggers the dialog (button present in docs footer)', () => {
		const { host, teardown } = mount()
		try {
			const footer = host.querySelector('aside#crm-docs > footer')
			expect(footer).not.toBeNull()
			const addBtn = footer?.querySelector('button.primary')
			expect(addBtn).not.toBeNull()
			expect(addBtn?.textContent?.trim()).toMatch(/add note/i)
		} finally {
			teardown()
		}
	})

	it('Add note <dialog> is in the DOM (closed by default)', () => {
		const { host, teardown } = mount()
		try {
			// dialog may be teleported to body by useDialog
			const dialog =
				host.querySelector('dialog[aria-label="Add note"]') ??
				document.querySelector('dialog[aria-label="Add note"]')
			expect(dialog).not.toBeNull()
			expect((dialog as HTMLDialogElement | null)?.open).toBe(false)
		} finally {
			teardown()
		}
	})

	it('Add note dialog contains a textarea and a topic select', () => {
		const { host, teardown } = mount()
		try {
			const dialog =
				host.querySelector('dialog[aria-label="Add note"]') ??
				document.querySelector('dialog[aria-label="Add note"]')
			expect(dialog?.querySelector('textarea#crm-note-text')).not.toBeNull()
			expect(dialog?.querySelector('select#crm-note-topic')).not.toBeNull()
		} finally {
			teardown()
		}
	})
})
