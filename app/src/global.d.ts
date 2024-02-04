var hljs: typeof import('highlight.js').default
var uPlot: typeof import('uplot')

declare namespace AceAjax {
    interface Ace {
        config: Config
        Range: typeof Range
        Editor: typeof Editor
        EditSession: IEditSession
        UndoManager: typeof UndoManager
        VirtualRenderer: typeof VirtualRenderer
        version: string
        default: Ace
    }
}

interface Node {
    cloneNode(deep?: boolean): this
}

type RowList<L extends string> = Record<L, HTMLTableCellElement> & { row: HTMLTableRowElement }
