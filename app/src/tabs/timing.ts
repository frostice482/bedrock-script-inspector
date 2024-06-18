import BedrockInspector from "#debug.js"
import { tabchange } from "#tab.js"
import ArrayAverage from "@arrayavg.js"
import { getIdThrow, pushLimit } from "@misc.js"
import { timeUnit } from "@units.js"
import { uPlotResizer } from "@uplotutil.js"

const tab = getIdThrow('tab-timing')

//// plot ////

const plotInst = new uPlotResizer('timing-plot', {
    width: 0,
    height: 0,
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
            label: 'World',
            scale: 'ms',
            stroke: '#33c',
            value: (plot, value) => timeUnit(value),
        }, {
            label: 'WorldAvg',
            scale: 'ms',
            stroke: 'cyan',
            value: (plot, value) => timeUnit(value),
        }, {
            label: 'Run',
            scale: 'ms',
            stroke: 'rgb(192, 96, 0)',
            value: (plot, value) => timeUnit(value),
        }, {
            label: 'RunAvg',
            scale: 'ms',
            stroke: 'yellow',
            value: (plot, value) => timeUnit(value),
        }, {
            label: 'RunHead',
            stroke: 'rgb(255, 0, 0)',
            scale: 'ms',
            value: (plot, value) => timeUnit(value),
            show: false,
        }, {
            label: 'Events',
            scale: 'ms',
            stroke: 'green',
            value: (plot, value) => timeUnit(value),
        }
    ],
    axes: [
        { stroke: 'gray' },
        {
            scale: 'ms',
            stroke: 'white',
            values: (plot, splits) => splits.map(timeUnit),
            grid: { stroke: '#222' },
            size: 60,
        }
    ]
})

const namedDatas = {
    label: [] as number[],
    world: [] as number[],
    worldAvg: [] as number[],
    runs: [] as number[],
    runAvg: [] as number[],
    runHead: [] as number[],
    events: [] as number[],
}
const worldAvg = new ArrayAverage
const runAvg = new ArrayAverage
const maxDatas = 20 * 180

//// updater ////

let updateState = false
const updateDatas = [ namedDatas.label, namedDatas.world, namedDatas.worldAvg, namedDatas.runs, namedDatas.runAvg, namedDatas.runHead, namedDatas.events ] as [number[], ...number[][]]
{
    setInterval(updateChart, 150)
    tabchange.addEventListener('timing', () => updateChart(true))

    function updateChart(forceFocus = false) {
        if (!updateState || !forceFocus && tab.hidden) return
        
        plotInst.setData(updateDatas)
        updateState = false
    }
}

//// events ////

{
    let eventMs = 0

    BedrockInspector.bedrockEvents.addEventListener('event', ({ detail: data }) => eventMs += data.delta)

    BedrockInspector.bedrockEvents.addEventListener('tick', ({ detail: data }) => {
        const run = data.run
        const effectiveRunTime = run.jobs.reduce((a, b) => a + b.delta, 0) + run.runs.reduce((a, b) => a + b.delta, 0)

        pushLimit(namedDatas.world, data.delta, maxDatas)
        pushLimit(namedDatas.worldAvg, worldAvg.pushAndAverage(data.delta), maxDatas)
        pushLimit(namedDatas.runs, effectiveRunTime, maxDatas)
        pushLimit(namedDatas.runAvg, runAvg.pushAndAverage(effectiveRunTime), maxDatas)
        pushLimit(namedDatas.runHead, run.delta - effectiveRunTime, maxDatas)
        pushLimit(namedDatas.events, eventMs, maxDatas)
        pushLimit(namedDatas.label, data.time / 1000, maxDatas)
        updateState = true

        eventMs = 0
    })

    BedrockInspector.events.addEventListener('script_connect', () => {
        for (const v of updateDatas) v.splice(0)
    })
}
