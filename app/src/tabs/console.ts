import BedrockInspector from "#debug.js"
import { tabchange } from "#tab.js"
import BedrockType from "@globaltypes/bedrock.js"
import handleResizer from "@handle_resizer.js"
import IteatorUtil from "@iterator.js"
import JSONUninspector from "@jsonuninspector.js"
import { getIdThrow, formatStack, pushLimit, querySelectorThrow, errNotif } from "@misc.js"
import { initFilter } from "@text_filter.js"
import { uPlotResizer, plotNonSelectable } from "@uplotutil.js"

const tab = getIdThrow('tab-console')

//// table log ////

const logContainer = getIdThrow('console-log-cnt')
const logTable = getIdThrow('console-log', HTMLTableElement)
const logTbody = logTable.tBodies.item(0) ?? logTable.createTBody()

//// filter ////

const fiLevelPref = 'level-'
const fiDisplayPref = '_fi-display-'

initFilter('console-fi-levels', fiLevelPref, logTable)
initFilter('console-fi-displays', fiDisplayPref, logTable)

//// function ////

function row(data: BedrockType.Console.Data) {
    const { level, data: content, stack } = data

    // row
    const row = document.createElement('tr')
    row.classList.add(fiLevelPref + level) // level

    // level
    const levelCell = row.insertCell()
    levelCell.classList.add('text-level-' + level)
    levelCell.append(level)

    // message
    let first = false
    const contents = row.insertCell()
    for (const data of content) {
        if (first) contents.append(' ')
        else first = true
        contents.append(typeof data === 'string' ? data : JSONUninspector(data))
    }

    // stack
    row.insertCell().append(formatStack(stack))

    return row
}

class ConsoleGraphing {
    static get selection() { return this.list.get(this.select.value) }

    constructor(name: string) {
        this.name = name
        this.optElm = document.createElement('option')
        this.optElm.value = this.optElm.textContent = name

        ConsoleGraphing.list.set(name, this)
    }

    readonly name: string
    readonly optElm: HTMLOptionElement
    
    readonly plot = new uPlotResizer(ConsoleGraphing.plotArea, {
        width: 1280,
        height: 720,
        select: plotNonSelectable,
        series: [ {} ],
        axes: [
            { stroke: 'gray' },
            {
                scale: 'y',
                stroke: 'white',
                grid: { stroke: '#222' }
            }
        ]
    })

    readonly labels: number[] = []
    readonly datas = new Map<string, (number | null)[]>()

    paused = false
    max = 200

    hasUpdate = false

    dataOf(name: string) {
        let d = this.datas.get(name)
        if (!d) {
            this.datas.set(name, d = [])
            this.plot.addSeries({
                label: name,
                stroke: '#' + autoColor[this.datas.size % autoColor.length],
                scale: 'y'
            })
        }
        return d
    }

    push(datas: Iterable<readonly [string, any]>, label = Date.now() / 1000, limit = this.max) {
        pushLimit(this.labels, label, limit)
        const unusedData = new Set(this.datas.keys())
        for (const [k, v] of datas) {
            unusedData.delete(k)
            pushLimit(this.dataOf(k), v, limit)
        }
        for (const k of unusedData) pushLimit(this.dataOf(k), null, limit)

        this.hasUpdate = true
    }

    createUpdateArray() {
        return [this.labels, ...this.datas.values()] as uPlot.AlignedData
    }

    destroy() {
        this.plot.destroy()
        this.optElm.remove()
        ConsoleGraphing.list.delete(this.name)
    }
}

namespace ConsoleGraphing {
    export const select = getIdThrow('console-gr-select', HTMLSelectElement)
    export const container = getIdThrow('console-graphing')
    export const plotArea = getIdThrow('console-gr-content')
    export const tooltip = getIdThrow('console-gr-tooltip')
    
    export const list = new Map<string, ConsoleGraphing>()

    export function update() {
        const e = ConsoleGraphing.selection?.plot.root ?? tooltip
        ConsoleGraphing.plotArea.replaceChildren(e)
        return e
    }
}

const autoColor: string[] = [
    '337', '733', 'f33', '33f',
    '737', 'f37', '373', '73f',
    'f3f', '377', '773', 'f73',
    '37f', '77f', 'f77', '3f3',
    '7f3', 'f7f', '3f7', '7f7',
    'ff3', '3ff', '7ff', 'ff7'
]

//// graphing ////

const grOptsSelect = ConsoleGraphing.select
{
    handleResizer(ConsoleGraphing.container, 'console-resize', 0, -1)

    const optsSideHide = getIdThrow('console-graphing-hide')
    optsSideHide.addEventListener('click', () => {
        ConsoleGraphing.container.hidden = !ConsoleGraphing.container.hidden
        const arr = optsSideHide.firstElementChild?.classList
        if (arr) {
            arr.add(ConsoleGraphing.container.hidden ? 'fa-angles-up' : 'fa-angles-down')
            arr.remove(!ConsoleGraphing.container.hidden ? 'fa-angles-up' : 'fa-angles-down')
        }
    })

    grOptsSelect.addEventListener('change', () => {
        const cg = ConsoleGraphing.selection
        if (!cg) return
    
        ConsoleGraphing.plotArea.replaceChildren(cg.plot.root)
    
        grOptsPause.textContent = cg.paused ? 'resume' : 'pause'
        grOptsMaxData.value = cg.max + ''
    })
    
    const grOptsPause = getIdThrow('console-gr-pause', HTMLButtonElement)
    grOptsPause.addEventListener('click', () => {
        const cg = ConsoleGraphing.selection
        if (!cg) return
    
        cg.paused = !cg.paused
        grOptsPause.textContent = cg.paused ? 'resume' : 'pause'
    })
    
    const grOptsClear = getIdThrow('console-gr-clear', HTMLButtonElement)
    grOptsClear.addEventListener('click', () => {
        const cg = ConsoleGraphing.selection
        if (!cg) return
    
        for (const data of cg.datas.values()) data.splice(0)
        cg.labels.splice(0)
    
        cg.plot.setData(cg.createUpdateArray())
    })
    
    const grOptsDelete = getIdThrow('console-gr-delete', HTMLButtonElement)
    grOptsDelete.addEventListener('click', () => {
        const cg = ConsoleGraphing.selection
        if (!cg) return
    
        cg.destroy()
        ConsoleGraphing.list.delete(grOptsSelect.value)
        ConsoleGraphing.update()
    })
    
    const grOptsMaxData = getIdThrow('console-gr-max', HTMLInputElement)
    grOptsMaxData.addEventListener('change', () => {
        const cg = ConsoleGraphing.selection
        if (!cg) return
    
        cg.max = grOptsMaxData.valueAsNumber
    })
}

//// process ////

const { consoles: initLog, limits: { console: logLimit } } = BedrockInspector.initData
if (initLog.length > logLimit) initLog.splice(logLimit)

const logQueue: BedrockType.Console.Data[] = initLog.filter(v => v.data[0] !== '[[debugGraph]]')

//// events ////

{
    BedrockInspector.bedrockEvents.addEventListener('console', ({ detail: log }) => {
        // console graphing override
        {
            const [a, b, c] = log.data
            if (a === "[[debugGraph]]" && typeof b === 'string' && typeof c === 'object' && c.type === 'object') {
                let cg = ConsoleGraphing.list.get(b)
                if (cg?.paused) return
                if (!cg) {
                    cg = new ConsoleGraphing(b)

                    grOptsSelect.options.add(cg.optElm)
                    ConsoleGraphing.list.set(b, cg)
                    ConsoleGraphing.update()
                }

                // push & update
                cg.push(IteatorUtil.map(c.properties ?? [], ({ key, value }) => [key.key, value?.type === 'number' ? +value.value : undefined]), undefined, cg.max)

                return
            }
        }

        pushLimit(logQueue, log, logLimit)

        if (tab.hidden) {
            if (log.level === 'warn') notifWarnCnt++
            if (log.level === 'error') notifErrCnt++
        }
    })

    BedrockInspector.events.addEventListener('script_connect', () => logTbody.replaceChildren())
}

//// updater ////

let notifErrCnt = 0
let notifWarnCnt = 0
{
    const navtab = querySelectorThrow('#nav > button[tab="console"]')
    const notifErrElm = errNotif('error')
    const notifWarnElm = errNotif('warn')
    navtab.append(notifErrElm, ' ', notifWarnElm, ' ')
    
    setInterval(updateNotif, 500)
    setInterval(updateQueue, 150)
    setInterval(updateGraph, 200)

    tabchange.addEventListener('console', () => {
        updateQueue(true)
        updateGraph(true)
    
        notifWarnCnt = notifErrCnt = 0
        updateNotif()
    })

    function updateGraph(forceUpdate = false) {
        if (tab.hidden && !forceUpdate) return

        const cg = ConsoleGraphing.selection
        if (cg?.hasUpdate) {
            cg.hasUpdate = false
            cg.plot.setData(cg.createUpdateArray())
        }
    }

    function updateQueue(forceFocus = false) {
        if (!logQueue.length || !forceFocus && (tab.hidden || document.hidden)) return
    
        // remove extra elements
        for (let delCnt = logTable.rows.length + logQueue.length - logLimit; delCnt > 0; delCnt--) logTbody.rows.item(0)?.remove()

        // scroll
        const scroll = logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight
    
        // prepend log (reverse) & clear
        logTbody.append.apply(logTbody, logQueue.map(row))
        logQueue.splice(0)

        // scroll
        if (scroll) requestAnimationFrame(() => logContainer.scroll(0, logContainer.scrollHeight))
    }

    function updateNotif() {
        notifErrElm.textContent = notifErrCnt ? notifErrCnt >= 100 ? '99+' : notifErrCnt + '' : ''
        notifWarnElm.textContent = notifWarnCnt ? notifWarnCnt >= 100 ? '99+' : notifWarnCnt + '' : ''
    }
}