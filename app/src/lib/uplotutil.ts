import { getIdThrow, querySelectorThrow } from "./misc.js"
import { ResizeListener } from "./resizelis.js"

export const plotNonSelectable: uPlot.Select = {
    height: 0,
    left: 0,
    top: 0,
    width: 0,
    show: false,
}

export class uPlotResizer extends uPlot {
    constructor(
        targ: string | HTMLElement,
        opts: uPlot.Options,
		data?: uPlot.AlignedData,
    ) {
        const parent = typeof targ === 'string' ? getIdThrow(targ) : targ
        super(opts, data, parent)

        const legendTable = querySelectorThrow('table.u-legend', undefined, parent)
        this.resizer = new ResizeListener(parent, ({ contentRect }) => {
            this.setSize({ width: contentRect.width, height: 0 })
    
            requestAnimationFrame(() => {
                const legendRect = legendTable.getBoundingClientRect()
                this.setSize({ width: contentRect.width, height: contentRect.height - legendRect.height })
            })
        })
    }

    readonly resizer: ResizeListener

    destroy(): void {
        this.resizer.detach()
        super.destroy()
    }
}
