declare global {
    var CodeMirror: typeof import('codemirror')
    var uPlot: typeof import('uplot')

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