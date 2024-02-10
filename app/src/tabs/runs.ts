import BedrockType from "../../../globaltypes/bedrock.js";
import BedrockInterpreterType from "../../../globaltypes/interpreter.js";
import JSONInspectData from "../../../globaltypes/jsoninspect.js";
import BedrockInspector from "../debug.js";
import ArrayAverage from "../lib/arrayavg.js";
import JSONUninspector from "../lib/jsonuninspector.js";
import { cellBar, errNotif, formatStack, getIdThrow, initFilter, pushLimit, querySelectorThrow } from "../lib/misc.js";
import { timeUnit } from "../lib/units.js";
import { uPlotResizer } from "../lib/uplotutil.js";
import { tabchange } from "../tab.js";

const tab = getIdThrow('tab-runs')

//// run list ////

const runsTable = getIdThrow('runs-functions', HTMLTableElement)
const runsTbody = runsTable.tBodies.item(0) ?? runsTable.createTBody()

const runList = new Map<number, RowRunData>()
const runListJobs = new Map<number, RowRunDataJob>()
const runClearCache = new Map<number, RowRunData>()

const runDetailTimeoutTemp = getIdThrow('runs-functions-detail-timeout-template', HTMLTemplateElement).content
const runDetailIntervalTemp = getIdThrow('runs-functions-detail-interval-template', HTMLTemplateElement).content
const runDetailJobTemp = getIdThrow('runs-functions-detail-job-template', HTMLTemplateElement).content

//// filter ////

const fiTypePref = '_fi-type-'
const fiStatusPref = '_fi-status-'

initFilter('runs-fi-type', fiTypePref, runsTable)
initFilter('runs-fi-status', fiStatusPref, runsTable)

//// function ////

const intervalBar = cellBar([128, 128, 255, 0.2], [64, 64, 255, 0.5])
const runTimeBar = cellBar([255, 255, 128, 0.4], [255, 64, 64, 0.8])

abstract class RowRunData {
    constructor(data: BedrockType.Run.InfoWithFn) { 
        this.runData = {
            type: data.type,
            id: data.id,
            interval: data.interval,
            fid: data.fid,
            fn: data.fn
        }
        
        const row = this.row = document.createElement('tr')

        // attr
        row.classList.add(fiTypePref + data.type)
        row.classList.add(fiStatusPref + 'active')

        // row
        row.insertCell().append(data.type)
        row.insertCell().append(data.id + '')
        const ie = row.insertCell()
        ie.append(data.interval + '')
        ie.style.background = intervalBar(1 / (1 + Math.log2(data.interval)))
        row.insertCell().append(JSONUninspector.t_function_tiny(data.fn))
        row.insertCell().append(data.fid + '')
        this._statusCell = row.insertCell()
        this._statusCell.append('active')
        this._avgTimeCell = row.insertCell()

        // detail row
        const detailRow = this.detailRow = document.createElement('tr')
        detailRow.hidden = true
        row.addEventListener('click', () => {
            detailRow.hidden = !detailRow.hidden
            row.classList.remove('level-error')
        })

        this._detailCell = detailRow.insertCell()
        this._detailCell.colSpan = 10

    }

    readonly runData: Readonly<BedrockType.Run.InfoWithFn>

    readonly row: HTMLTableRowElement
    readonly detailRow: HTMLTableRowElement

    abstract elm: RunElmStd

    protected _statusCell: HTMLTableCellElement
    protected _avgTimeCell: HTMLTableCellElement
    protected _detailCell: HTMLTableCellElement

    protected _prevUpdate = 'active'

    protected _updateStatusCell() {
        const [text, color] = this._cleared ? ['cleared', 'gray'] : this._suspended ? ['suspended', 'yellow'] : ['active', '']
        this._statusCell.textContent = text
        this._statusCell.style.color = color

        this.row.classList.remove(fiStatusPref + this._prevUpdate)
        this.row.classList.add(fiStatusPref + text)
        this._prevUpdate = text
    }

    protected _suspended = false
    get suspended() { return this._suspended }
    set suspended(v) {
        if (this._suspended === v) return
        this._suspended = v

        this._updateStatusCell()
    }

    protected _cleared = false
    get cleared() { return this._cleared }

    abstract exec(data: any, tick: number): void

    clear(tick?: number, stack?: string) {
        this._cleared = true
        this._updateStatusCell()
    }
}

class RowRunDataTimeout extends RowRunData {
    constructor(data: BedrockInterpreterType.RunData | BedrockType.Run.InfoWithFn) {
        super(data)
        
        // container & template
        const detailCnt = this._detailCell.appendChild(document.createElement('div'))
        detailCnt.classList.add('run-detail-timeout')
        const detailTemplate = runDetailTimeoutTemp.cloneNode(true)

        // button
        const suspendBtn = getIdThrow('suspend', HTMLButtonElement, detailTemplate, true)
        suspendBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: this._suspended ? 'resume' : 'suspend'
            })
        )

        const clearBtn = getIdThrow('clear', HTMLButtonElement, detailTemplate, true)
        clearBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: 'clear'
            })
        )

        // stack
        const addStack = getIdThrow('addstack', undefined, detailTemplate, true)
        const clearStack = getIdThrow('clearstack', undefined, detailTemplate, true)

        // data
        const execData = getIdThrow('execdata', undefined, detailTemplate, true)

        // elm
        this.elm = {
            avgTimeCell: this._avgTimeCell,
            statusCell: this._statusCell,
            execData: execData,
            addStack,
            clearBtn,
            clearStack,
            suspendBtn
        }
        detailCnt.appendChild(detailTemplate)

        if ('suspended' in data) {
            addStack.replaceChildren('(' + data.addTick + ')\n', formatStack(data.addStack))
            if (data.suspended) this.suspended = true
            if (data.cleared) this.clear(data.clearTick, data.clearStack)
        }
    }

    readonly elm: Readonly<RunElmStd & { execData: HTMLElement }>

    clear(tick?: number, stack?: string) {
        if (this._cleared) return

        this.elm.clearStack.replaceChildren('(' + tick + ')\n', formatStack(stack ?? ''))
        this.elm.suspendBtn.disabled = this.elm.clearBtn.disabled = true

        super.clear()
    }

    exec(data: BedrockType.Tick.RunData, tick: number) {
        const ed = this.elm.execData
        ed.textContent = [
            'tick  : ' + tick,
            'delay : ' + data.sleep + 'ms',
            'time  : ' + data.delta + 'ms'
        ].join('\n')

        if (data.error) ed.append('\n\n', JSONUninspector(data.error))
    }
}

class RowRunDataInterval extends RowRunData {
    constructor(data: BedrockInterpreterType.RunData | BedrockType.Run.InfoWithFn) {
        super(data)

        // container & template
        const detailCnt = this._detailCell.appendChild(document.createElement('div'))
        detailCnt.classList.add('run-detail-interval')
        const detailTemplate = runDetailIntervalTemp.cloneNode(true)

        // plot
        this.plot = new uPlotResizer(getIdThrow('plot', undefined, detailTemplate, true), {
            width: 1280,
            height: 720,
            select: {
                height: 0,
                left: 0,
                top: 0,
                width: 0,
                show: false,
            },
            series: [
                {},
                {
                    label: 'delay',
                    stroke: 'rgb(192, 96, 0)',
                    scale: 'y',
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'delayavg',
                    stroke: 'yellow',
                    scale: 'y',
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'delayavglatest',
                    stroke: 'lime',
                    scale: 'y',
                    show: false,
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'sleep',
                    stroke: 'white',
                    scale: 'y',
                    show: false,
                    value: (plot, xxx) => timeUnit(xxx)
                }
            ],
            axes: [
                { stroke: 'gray' },
                {
                    scale: 'y',
                    stroke: 'white',
                    grid: { stroke: '#222' },
                    values: (plot, xxx) => xxx.map(timeUnit),
                    size: 60,
                }
            ]
        })

        // button
        const suspendBtn = getIdThrow('suspend', HTMLButtonElement, detailTemplate, true)
        suspendBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: this._suspended ? 'resume' : 'suspend'
            })
        )

        const clearBtn = getIdThrow('clear', HTMLButtonElement, detailTemplate, true)
        clearBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: 'clear'
            })
        )

        this.detailRow.addEventListener('click', () => this.updateDetail())

        // other
        const errLogTable = getIdThrow('errlog', HTMLTableElement, detailTemplate, true)
        const errLog = errLogTable.tBodies.item(0) ?? errLogTable.createTBody()
        const addStack = getIdThrow('addstack', undefined, detailTemplate, true)
        const clearStack = getIdThrow('clearstack', undefined, detailTemplate, true)

        this.elm = {
            suspendBtn,
            clearBtn,
            addStack,
            clearStack,
            errLogTbody: errLog,
            errLogTable: errLogTable,
            avgTimeCell: this._avgTimeCell,
            statusCell: this._detailCell
        }
        detailCnt.appendChild(detailTemplate)

        // data
        if ('suspended' in data) {
            addStack.replaceChildren('(' + data.addTick + ')\n', formatStack(data.addStack))
            if (data.suspended) this.suspended = true
            if (data.cleared) this.clear(data.clearTick, data.clearStack)
        }
    }

    readonly elm: Readonly<RunElmStd & {
        errLogTbody: HTMLTableSectionElement
        errLogTable: HTMLTableElement
    }>

    readonly plot: uPlotResizer
    readonly plotData = {
        labels: <number[]>[],
        delays: <number[]>[],
        delaysAvgs: <number[]>[],
        delayAvgLatest: <number[]>[],
        sleeps: <number[]>[],
    }

    readonly delayAvg = new ArrayAverage()

    readonly plotUpdateData = [this.plotData.labels, this.plotData.delays, this.plotData.delaysAvgs, this.plotData.delayAvgLatest, this.plotData.sleeps] as uPlot.AlignedData

    plotCurTime = 0
    plotMaxData = 20 * 90

    maxErrData = 30
    errQueue: [number, JSONInspectData][] = []

    timingUpdateState = false
    detailUpdateState = false

    get suspended() { return this._suspended }
    set suspended(v) {
        if (this._suspended === v) return
        this._suspended = v

        this._updateStatusCell()
        this.elm.suspendBtn.textContent = v ? 'resume' : 'suspend'
    }

    clear(tick?: number, stack?: string) {
        if (this._cleared) return

        this.elm.clearStack.replaceChildren('(' + tick + ')\n', formatStack(stack ?? ''))
        this.elm.suspendBtn.disabled = this.elm.clearBtn.disabled = true

        super.clear()
    }

    exec(data: BedrockType.Tick.RunData, tick: number) {
        this.plotCurTime ||= Date.now() / 1000
        this.plotCurTime += data.sleep / 1000

        pushLimit(this.plotData.labels, this.plotCurTime, this.plotMaxData)
        pushLimit(this.plotData.delays, data.delta, this.plotMaxData)
        pushLimit(this.plotData.delaysAvgs, this.delayAvg.pushAndAverage(data.delta), this.plotMaxData)
        pushLimit(this.plotData.delayAvgLatest, this.delayAvg._prevLAvg, this.plotMaxData)
        pushLimit(this.plotData.sleeps, data.sleep, this.plotMaxData)

        if (data.error) {
            pushLimit(this.errQueue, [tick, data.error], this.maxErrData)

            if (this.detailRow.hidden) this.row.classList.add('level-error')
            if (tab.hidden) notifErrorCount++
        }

        this.timingUpdateState = this.detailUpdateState = true
    }

    updateTiming() {
        if (!this.timingUpdateState) return false
        this.timingUpdateState = false

        const avg = this.delayAvg._prevAvg
        this.elm.avgTimeCell.textContent = `${avg.toFixed(3).padStart(6)}ms (${this.delayAvg.length})`
        this.elm.avgTimeCell.style.setProperty('background', runTimeBar(avg / (avg + 10)))

        return true
    }

    updateDetail() {
        if (!this.detailUpdateState) return false
        this.detailUpdateState = false

        const errLogRows = this.elm.errLogTbody.rows
        const errQueue = this.errQueue

        for (let delCnt = errLogRows.length + errQueue.length - this.maxErrData; delCnt > 0; delCnt--) errLogRows.item(errLogRows.length - 1)?.remove()
        for (const [tick, err] of errQueue) {
            const row = this.elm.errLogTbody.insertRow(0)
            row.classList.add('level-error')
            row.insertCell().append(tick + '')
            row.insertCell().append(JSONUninspector(err))
        }

        this.plot.setData(this.plotUpdateData)

        return true
    }
}

class RowRunDataJob extends RowRunData {
    constructor(data: BedrockInterpreterType.RunDataBasic) {
        super({
            id: data.id,
            type: 'job',

            interval: 0,
            fid: -1,
            fn: {
                type: 'function',
                name: '',
                source: '',
                isAsync: false,
                isClass: false,
                isGenerator: false
            }
        })

        // container & template
        const detailCnt = this._detailCell.appendChild(document.createElement('div'))
        detailCnt.classList.add('run-detail-job')
        const detailTemplate = runDetailJobTemp.cloneNode(true)

        // plot
        this.plot = new uPlotResizer(getIdThrow('plot', undefined, detailTemplate, true), {
            width: 1280,
            height: 720,
            select: {
                height: 0,
                left: 0,
                top: 0,
                width: 0,
                show: false,
            },
            series: [
                {},
                {
                    label: 'delay',
                    stroke: 'rgb(120, 60, 0)',
                    scale: 'y',
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'delayavg',
                    stroke: 'rgb(192, 96, 0)',
                    scale: 'y',
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'delayavg2',
                    stroke: 'yellow',
                    scale: 'y',
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'delayavg2latest',
                    stroke: 'lime',
                    scale: 'y',
                    show: false,
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'sleep',
                    stroke: 'white',
                    scale: 'y',
                    show: false,
                    value: (plot, xxx) => timeUnit(xxx)
                },
                {
                    label: 'count',
                    stroke: 'cyan',
                    scale: 'y1',
                    show: false
                }
            ],
            axes: [
                { stroke: 'gray' },
                {
                    scale: 'y',
                    stroke: 'white',
                    grid: { stroke: '#222' },
                    values: (plot, xxx) => xxx.map(timeUnit),
                    size: 60
                }, {
                    scale: 'y1',
                    stroke: 'white',
                    side: 1,
                    grid: { show: false },
                    size: 50
                }
            ]
        })

        // button
        const suspendBtn = getIdThrow('suspend', HTMLButtonElement, detailTemplate, true)
        suspendBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: this._suspended ? 'resume' : 'suspend'
            })
        )

        const clearBtn = getIdThrow('clear', HTMLButtonElement, detailTemplate, true)
        clearBtn.addEventListener('click', () =>
            BedrockInspector.send('run_action', {
                id: this.runData.id,
                action: 'clear'
            })
        )

        this.detailRow.addEventListener('click', () => this.updateDetail())

        // other
        const addStack = getIdThrow('addstack', undefined, detailTemplate, true)
        const clearStack = getIdThrow('clearstack', undefined, detailTemplate, true)

        this.elm = {
            suspendBtn,
            clearBtn,
            addStack,
            clearStack,
            avgTimeCell: this._avgTimeCell,
            statusCell: this._detailCell,
            clearErr: getIdThrow('clearerr', undefined, detailTemplate, true)
        }
        detailCnt.appendChild(detailTemplate)

        // data
        if ('suspended' in data) {
            addStack.replaceChildren('(' + data.addTick + ')\n', formatStack(data.addStack))
            if (data.suspended) this.suspended = true
            if (data.cleared) this.clear(data.clearTick, data.clearStack)
        }
    }

    readonly elm: Readonly<RunElmStd & {
        clearErr: HTMLElement
    }>

    readonly plot: uPlotResizer
    readonly plotData = {
        labels: <number[]>[],
        delays: <number[]>[],
        delaysAvgs: <number[]>[],
        delaysAvgs2: <number[]>[],
        delayAvg2Latest: <number[]>[],
        sleeps: <number[]>[],
        execPerTick: <number[]>[],
    }

    readonly delayAvg = new ArrayAverage()

    readonly plotUpdateData = [
        this.plotData.labels,
        this.plotData.delays,
        this.plotData.delaysAvgs,
        this.plotData.delaysAvgs2,
        this.plotData.delayAvg2Latest,
        this.plotData.sleeps,
        this.plotData.execPerTick,
    ] as uPlot.AlignedData

    plotCurTime = 0
    plotMaxData = 20 * 90

    maxErrData = 30
    errQueue: [number, JSONInspectData][] = []

    timingUpdateState = false
    detailUpdateState = false

    get suspended() { return this._suspended }
    set suspended(v) {
        if (this._suspended === v) return
        this._suspended = v

        this._updateStatusCell()
        this.elm.suspendBtn.textContent = v ? 'resume' : 'suspend'
    }

    clear(tick?: number, stack?: string, error?: JSONInspectData) {
        if (this._cleared) return

        this.elm.clearStack.replaceChildren('(' + tick + ')\n', formatStack(stack ?? ''))
        this.elm.suspendBtn.disabled = this.elm.clearBtn.disabled = true

        if (error) {
            this.elm.clearErr.append(JSONUninspector(error))
            
            if (this.detailRow.hidden) this.row.classList.add('level-error')
            if (tab.hidden) notifErrorCount++
        }

        super.clear()
    }

    exec(data: BedrockType.Tick.JobRunData) {
        this.plotCurTime ||= Date.now() / 1000
        this.plotCurTime += data.sleep / 1000
        const deltaAvg = data.delta / data.count

        pushLimit(this.plotData.labels, this.plotCurTime, this.plotMaxData)
        pushLimit(this.plotData.delays, data.delta, this.plotMaxData)
        pushLimit(this.plotData.delaysAvgs, data.delta / data.count, this.plotMaxData)
        pushLimit(this.plotData.delaysAvgs2, this.delayAvg.pushAndAverage(deltaAvg), this.plotMaxData)
        pushLimit(this.plotData.delayAvg2Latest, this.delayAvg._prevLAvg, this.plotMaxData)
        pushLimit(this.plotData.sleeps, data.sleep, this.plotMaxData)
        pushLimit(this.plotData.execPerTick, data.count, this.plotMaxData)

        this.timingUpdateState = this.detailUpdateState = true
    }

    updateTiming() {
        if (!this.timingUpdateState) return false
        this.timingUpdateState = false

        const avg = this.delayAvg._prevAvg
        this.elm.avgTimeCell.textContent = `${avg.toFixed(3).padStart(6)}ms (${this.delayAvg.length})`
        this.elm.avgTimeCell.style.setProperty('background', runTimeBar(avg / (avg + 10)))

        return true
    }

    updateDetail() {
        if (!this.detailUpdateState) return false
        this.detailUpdateState = false

        this.plot.setData(this.plotUpdateData)

        return true
    }
}

//// process ////

const { runs, runJobs: runJobsInit, limits: { runs: runLimit } } = BedrockInspector.initData

for (const lis of runs) {
    const d = lis.type === 'interval' ? new RowRunDataInterval(lis) : new RowRunDataTimeout(lis)
    runsTbody.prepend(d.row, d.detailRow)

    runList.set(lis.id, d)
    if (lis.cleared) {
        if (d instanceof RowRunDataInterval) {
            d.plot.root.parentElement?.remove()
            d.plot.destroy()
            d.elm.errLogTable.remove()
        }
        runClearCache.set(lis.id, d)
    }
}

for (const job of runJobsInit) {
    const d = new RowRunDataJob(job)
    runsTbody.prepend(d.row, d.detailRow)

    runListJobs.set(job.id, d)
    if (d.cleared) {
        d.plot.root.parentElement?.remove()
        d.plot.destroy()
        runClearCache.set(job.id, d)
    }
}

//// updater ////

let notifErrorCount = 0
{    
    const navtab = querySelectorThrow('#nav > button[tab="runs"]')
    const notif = errNotif('error')
    navtab.append(notif, ' ')

    const dataElm = getIdThrow('runs-data')

    setInterval(updateNotif, 500)
    setInterval(updateRuns, 200)
    tabchange.addEventListener('runs', () => {
        notifErrorCount = 0
        updateRuns(true)
        updateNotif()
    })

    function updateRuns(forceUpdate = true) {
        if (tab.hidden || !forceUpdate) return

        let runAvgTtl = 0, runAvgMax = 0,
            runCntTtl = 0, runCntMax = 0

        for (const run of runList.values()) {
            if (!(run instanceof RowRunDataInterval)) continue

            if (!run.suspended && !run.cleared) {
                const avg = run.delayAvg._prevAvg, int = run.runData.interval

                runAvgTtl += avg / int
                runAvgMax += avg
                runCntTtl ++
                runCntMax += 1 / int
            }

            run.updateTiming()
            if (!run.detailRow.hidden) run.updateDetail()
        }

        for (const job of runListJobs.values()) {
            if (!job.suspended && !job.cleared) {
                const avg = job.delayAvg._prevAvg

                runAvgTtl += avg
                runAvgMax += avg
                runCntTtl ++
                runCntMax += 1
            }

            job.updateTiming()
            if (!job.detailRow.hidden) job.updateDetail()
        }

        dataElm.textContent = `active: ${runCntMax.toFixed(2)} (${runCntTtl}) - avg: ${runAvgTtl.toFixed(3)}ms (${runAvgMax.toFixed(3)}ms)`
    }

    function updateNotif() {
        notif.textContent = notifErrorCount ? notifErrorCount >= 100 ? '99+' : notifErrorCount + '' : ''
    }
}

//// events ////

{
    BedrockInspector.bedrockEvents.addEventListener('tick', ({ detail: { tick, run } }) => {
        for (const exec of run.runs) {
            const rd = runList.get(exec.id)
            if (!rd) continue
            
            rd.exec(exec, tick)
        }

        for (const job of run.jobs) {
            runListJobs.get(job.id)?.exec(job)
        }
    })

    BedrockInspector.bedrockEvents.addEventListener('run_add', ({ detail: data }) => {
        const run = data.data
        const runIntVirtual: BedrockInterpreterType.RunData = Object.assign({}, data.data, {
            addStack: data.stack,
            addTick: data.tick,
            cleared: false,
            suspended: false
        })

        const d = run.type === 'interval' ? new RowRunDataInterval(runIntVirtual) : new RowRunDataTimeout(runIntVirtual)
        runsTbody.prepend(d.row, d.detailRow)

        runList.set(run.id, d)
        if (runList.size + runListJobs.size > runLimit) {
            for (const [id, run] of runClearCache) {
                run.row.remove()
                run.detailRow.remove()
                runList.delete(id) || runListJobs.delete(id)
            }
            runClearCache.clear()
        }
    })

    BedrockInspector.bedrockEvents.addEventListener('job_add', ({ detail: data }) => {
        const d = new RowRunDataJob({
            id: data.data,
            type: 'job',
            addStack: data.stack,
            addTick: data.tick,
            cleared: false,
            suspended: false
        })
        runsTbody.prepend(d.row, d.detailRow)

        runListJobs.set(data.data, d)
        if (runList.size + runListJobs.size > runLimit) {
            for (const [id, run] of runClearCache) {
                run.row.remove()
                run.detailRow.remove()
                runListJobs.delete(id) || runListJobs.delete(id)
            }
            runClearCache.clear()
        }
    })

    BedrockInspector.bedrockEvents.addEventListener('run_clear', ({ detail: data }) => {
        const run = runList.get(data.data)
        if (!run) return

        runClearCache.set(data.data, run)
        run.clear(data.tick, data.stack)
    })

    BedrockInspector.bedrockEvents.addEventListener('job_clear', ({ detail: data }) => {
        const { id, error } = data.data
        const run = runListJobs.get(id)
        if (!run) return

        runClearCache.set(id, run)
        run.clear(data.tick, data.stack, error)
    })

    BedrockInspector.bedrockEvents.addEventListener('run_suspend', ({ detail: data }) => {
        const run = runList.get(data) ?? runListJobs.get(data)
        if (run) run.suspended = true
    })

    BedrockInspector.bedrockEvents.addEventListener('run_resume', ({ detail: data }) => {
        const run = runList.get(data) ?? runListJobs.get(data)
        if (run) run.suspended = false
    })

    BedrockInspector.events.addEventListener('script_connect', () => {
        runList.clear()
        runClearCache.clear()
        runsTbody.replaceChildren()
    })

    BedrockInspector.events.addEventListener('script_disconnect', () => {
        for (const run of runList.values()) run.elm.clearBtn.disabled = run.elm.suspendBtn.disabled = true
    })
}

interface RunElmStd {
    statusCell: HTMLTableCellElement
    avgTimeCell: HTMLTableCellElement
    addStack: HTMLElement
    clearStack: HTMLElement
    suspendBtn: HTMLButtonElement
    clearBtn: HTMLButtonElement
}
