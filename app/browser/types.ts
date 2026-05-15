import type { Component } from 'vue'

export interface Route {
	readonly id: string
	readonly title: string
	readonly group: string
	readonly page: Component
}

export interface RouteLocation {
	readonly id: string
	readonly section: string | null
}

export interface Group {
	readonly group: string
	readonly entries: readonly Route[]
}

export interface Section {
	readonly id: string
	readonly label: string
	readonly level: number
}
