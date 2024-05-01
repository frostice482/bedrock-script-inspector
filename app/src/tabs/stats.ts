import BedrockInterpreterType from "@globaltypes/interpreter.js"
import BedrockInspector from "../debug.js"
import IteatorUtil from "../lib/iterator.js"
import { getIdThrow, pushLimit } from "../lib/misc.js"
import { byteUnit } from "../lib/units.js"
import { plotNonSelectable, uPlotResizer } from "../lib/uplotutil.js"
import { tabchange } from "../tab.js"

const tab = getIdThrow('tab-stats')

const labels: number[] = []
const maxDatas = 5 * 90

//// memory size data ////

const memSizeData = new Map<RuntimeKeys, uPlot.Series & { data: number[] }>([
    ['memory_allocated_size', { data: [], stroke: '#ffffff', show: false }],
    ['memory_used_size'     , { data: [], stroke: '#bbbbbb' }],
    ['atom_size'            , { data: [], stroke: '#9030ff', show: false }],
    ['string_size'          , { data: [], stroke: '#90ff30' }],
    ['object_size'          , { data: [], stroke: '#ff9030' }],
    ['property_size'        , { data: [], stroke: '#3090ff' }],
    ['function_size'        , { data: [], stroke: '#ffff30', show: false }],
    ['function_code_size'   , { data: [], stroke: '#c6c600', show: false }],
])

const memSizeUpdateData = [labels].concat(Array.from(memSizeData.values(), v => v.data)) as [number[], ...number[][]]

const memSizePlot = new uPlotResizer('stats-mem', {
    width: 1280,
    height: 720,
    select: plotNonSelectable,
    series: [
        {},
        ...IteatorUtil.map(
            memSizeData,
            ([k, v]) => ({
                label: k.slice(0, -5),
                scale: 'bytes',
                value: (plot, value) => byteUnit(value),
                ...v
            } satisfies uPlot.Series)
        )
    ],
    axes: [
        { stroke: 'gray' },
        {
            scale: 'bytes',
            stroke: 'white',
            values: (plot, splits) => splits.map(byteUnit),
            grid: { stroke: '#222' },
            size: 60,
        }
    ]
})

//// memory count data ////

const memCountData = new Map<RuntimeKeys, uPlot.Series & { data: number[] }>([
    ['memory_allocated_count'  , { data: [], stroke: '#ffffff', show: false }],
    ['memory_used_count'       , { data: [], stroke: '#bbbbbb' }],
    ['atom_count'              , { data: [], stroke: '#9030ff', show: false }],
    ['string_count'            , { data: [], stroke: '#90ff30' }],
    ['object_count'            , { data: [], stroke: '#ff9030' }],
    ['property_count'          , { data: [], stroke: '#3090ff' }],
    ['function_count'          , { data: [], stroke: '#ffff30', show: false }],
    ['function_line_count'     , { data: [], stroke: '#c6c600', show: false }],
    ['array_count'             , { data: [], stroke: '#ff30ff', show: false }],
    ['fast_array_count'        , { data: [], stroke: '#ff30ff' }],
    ['fast_array_element_count', { data: [], stroke: '#ff307f' }],
])
const memCountUpdateData = [labels].concat(Array.from(memCountData.values(), v => v.data)) as [number[], ...number[][]]

const memCountPlot = new uPlotResizer('stats-memcount', {
    width: 1280,
    height: 720,
    select: plotNonSelectable,
    series: [
        {},
        ...IteatorUtil.map(
            memCountData,
            ([k, v]) => ({
                label: k.slice(0, -6),
                scale: 'count',
                ...v
            } satisfies uPlot.Series)
        )
    ],
    axes: [
        { stroke: 'gray' },
        {
            scale: 'count',
            stroke: 'white',
            grid: { stroke: '#222' },
            size: 60,
        }
    ]
})

//// plugins ////

{
    const pTable = getIdThrow('stats-plugins', HTMLTableElement)
    const pTbody = pTable.tBodies.item(0) ?? pTable.createTBody()
    const pHandleRow = new Map<string, RowList<'current' | 'peak' | 'total'>>()

    const pSelect = getIdThrow('stats-plugin-select', HTMLSelectElement)
    const pNames = new Set<string>()

    pSelect.addEventListener('change', clearTbody)

    //// events ////

    const updateDatas = new Map( IteatorUtil.map( IteatorUtil.concat([memSizeData, memCountData]), ([k, v]) => [k, v.data] ) )
    let updateState = false

    BedrockInspector.events.addEventListener('stats', ({ detail: { plugins, runtime } }) => {
        updateState = true

        // push data & label
        for (const [k, d] of updateDatas) pushLimit(d, runtime[k], maxDatas)
        pushLimit(labels, Date.now() / 1000, maxDatas)

        // push plugins
        const slcPlugin = pSelect.value
        for (const { handles, name } of plugins) {
            // plugin does not exist in list
            if (!pNames.has(name)) {
                const opt = document.createElement('option')
                opt.value = name
                opt.textContent = name

                pSelect.options.add(opt)
                pNames.add(name)
            }
            // not the selected plugin
            else if (slcPlugin !== name) continue

            // update table if not hidden
            if (!tab.hidden)
                for (const handle of handles) {
                    let rowData = pHandleRow.get(handle.type)
                    if (!rowData) {
                        const row = pTbody.appendChild(document.createElement('tr'))
                        row.insertCell().append(handle.type)

                        pHandleRow.set(handle.type, rowData = {
                            row,
                            current: row.insertCell(),
                            peak: row.insertCell(),
                            total: row.insertCell()
                        })
                    }

                    rowData.current.textContent = handle.current + ''
                    rowData.peak.textContent = handle.peak + ''
                    rowData.total.textContent = handle.total + ''
                }
            }

        updateChart()
    })

    BedrockInspector.events.addEventListener('bds_start', () => {
        for (const d of updateDatas.values()) d.splice(0)
        labels.splice(0)

        clearTbody()
        clearSelection()
        updateChart()
    })

    tabchange.addEventListener('bds', () => updateChart(true))

    //// func ////

    function updateChart(forceUpdate = false) {
        if (!updateState || !forceUpdate && tab.hidden) return
        
        memSizePlot.setData(memSizeUpdateData)
        memCountPlot.setData(memCountUpdateData)
        updateState = false
    }

    function clearTbody() {
        pTbody.replaceChildren()
        pHandleRow.clear()
    }

    function clearSelection() {
        pSelect.replaceChildren()
        pSelect.value = ''
        pNames.clear()
    }
}

type RuntimeKeys = keyof BedrockInterpreterType.WatchdogStats.Runtime
