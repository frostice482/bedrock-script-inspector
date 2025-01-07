declare global {
	interface Node {
		cloneNode(deep?: boolean): this
	}

	type RowList<L extends string> = Record<L, HTMLTableCellElement> & { row: HTMLTableRowElement }
}

declare module 'codemirror' {
	interface EditorConfiguration {
		autoCloseBrackets?: boolean
	}
}

export {}