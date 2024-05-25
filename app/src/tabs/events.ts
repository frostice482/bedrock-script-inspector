import BedrockInspector from "#debug.js"
import { tabchange } from "#tab.js"
import BedrockType from "@globaltypes/bedrock.js"
import BedrockInterpreterType from "@globaltypes/interpreter.js"
import JSONInspectData from "@globaltypes/jsoninspect.js"
import JSONUninspector from "@jsonuninspector.js"
import { getIdThrow, textApplier, formatStack, cellBar, errNotif, querySelectorThrow } from "@misc.js"
import { RelativePopupHandle, RelativePopup } from "@popup.js"
import { initFilter, initFilterText, filterTooltip } from "@text_filter.js"

const tab = getIdThrow('tab-events')

const lisList = new Map<string, RowListener>()
const lisClearCache = new Map<string, RowListener>()

// event listener

const lisTable = getIdThrow('events-listeners', HTMLTableElement)
const lisTbody = lisTable.tBodies.item(0) ?? lisTable.createTBody()

const lisDetailTemp = getIdThrow('events-listeners-detail-template', HTMLTemplateElement).content

// event log

const logTable = getIdThrow('events-log', HTMLTableElement)
const logTbody = logTable.tBodies.item(0) ?? logTable.createTBody()

const logTemp = getIdThrow('events-log-detail-template', HTMLTemplateElement).content

// filter

const fiCategoryPref = '_fi-cat-'
const fiTypePref = '_fi-type-'
const fiListenerPref = '_fi-lis-'
const fiNameAttrName = 'fi_name'

initFilter('events-fi-cat', fiCategoryPref, [lisTable, logTable])
initFilter('events-fi-type', fiTypePref, [lisTable, logTable])
initFilter('events-fi-listener', fiListenerPref, lisTable)

const eventsFilterName = getIdThrow('events-fi-name', HTMLInputElement)
initFilterText(
    eventsFilterName,
    fiNameAttrName,
    textApplier(v => v ? `:is(#events-log, #events-listeners) > tbody > tr[${fiNameAttrName}]${v} { display: none; }` : '', document.head.appendChild(document.createElement('style')))
)

new RelativePopupHandle(new RelativePopup(eventsFilterName, filterTooltip.cloneNode(true), eventsFilterName.parentElement!, 'bottomcenter'), 'focus')

// function

class RowListener {
    constructor(data: BedrockInterpreterType.EventListener | BedrockType.Events.Listener) {
        this.listenerData = {
            category: data.category,
            type: data.type,
            name: data.name,
            fid: data.fid
        }
        this.listenerFn = data.fn

        const row = this.row = document.createElement('tr')

        // attr
        row.classList.add(
            fiTypePref + data.type,
            fiCategoryPref + data.category,
            fiListenerPref + 'enabled',
            fiListenerPref + 'subscribed'
        )
        row.setAttribute(fiNameAttrName, data.name)

        // row
        row.insertCell().append(data.category)
        row.insertCell().append(data.type)
        row.insertCell().append(data.name)
        row.insertCell().append(JSONUninspector.t_function_tiny(data.fn))
        row.insertCell().append(data.fid + '')
        const statusCell = row.insertCell()
        statusCell.append('subscribed')
    
        // detail row
        const detailRow = this.detailRow = document.createElement('tr')
        detailRow.hidden = true
        row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)

        const detailCell = detailRow.insertCell()
        detailCell.colSpan = 10
    
        // container & template
        const detailCnt = detailCell.appendChild(document.createElement('div'))
        const detailTemplate = lisDetailTemp.cloneNode(true)
    
        // button
        const disableBtn = getIdThrow('disable', HTMLButtonElement, detailTemplate, true)
        disableBtn.disabled = false
        disableBtn.addEventListener('click', () =>
            BedrockInspector.send('event_action', {
                id: this.listenerData,
                action: this.disabled ? 'enable' : 'disable'
            })
        )
        
        const unsubBtn = getIdThrow('unsub', HTMLButtonElement, detailTemplate, true)
        unsubBtn.disabled = false
        unsubBtn.addEventListener('click', () =>
            BedrockInspector.send('event_action', {
                id: this.listenerData,
                action: 'unsubscribe'
            })
        )
    
        // detail table
        const logTable = getIdThrow('actlog', HTMLTableElement, detailTemplate, true)
        const log = logTable.tBodies.item(0) ?? logTable.createTBody()

        this.elm = { disableBtn, unsubBtn, actionLogTbody: log, statusCell }
        detailCnt.append(detailTemplate)

        if ('log' in data) {
            this.unsubscribed = data.unsubscribed
            this.disabled = data.disabled
            for (const log of data.log) this.addLog(log.action, log.tick, formatStack(log.stack))
        }
    }

    readonly listenerData: BedrockType.Events.ListenerWithId
    readonly listenerFn: JSONInspectData.I_Function

    readonly row: HTMLTableRowElement
    readonly detailRow: HTMLTableRowElement
    readonly elm: Readonly<{
        disableBtn: HTMLButtonElement
        unsubBtn: HTMLButtonElement
        actionLogTbody: HTMLTableSectionElement
        statusCell: HTMLTableCellElement
    }>

    logLimit = eventListenerLogLimit

    #updateStatusCell() {
        const [text, color] = this.#unsubscribed ? ['unsubscribed', 'gray'] : this.#disabled ? ['disabled', 'yellow'] : ['subscribed', '']
        this.elm.statusCell.textContent = text
        this.elm.statusCell.style.color = color
    }

    #disabled = false
    get disabled() { return this.#disabled }
    set disabled(v) {
        if (this.#disabled === v) return
        this.#disabled = v

        this.row.classList[!v ? 'add' : 'remove'](fiListenerPref + 'enabled')
        this.row.classList[v ? 'add' : 'remove'](fiListenerPref + 'disabled')

        this.#updateStatusCell()
        this.elm.disableBtn.textContent = v ? 'enable' : 'disable'
    }

    #unsubscribed = false
    get unsubscribed() { return this.#unsubscribed }
    set unsubscribed(v) {
        if (this.#unsubscribed === v) return
        this.#unsubscribed = v

        this.row.classList[!v ? 'add' : 'remove'](fiListenerPref + 'subscribed')
        this.row.classList[v ? 'add' : 'remove'](fiListenerPref + 'unsubscribed')

        this.#updateStatusCell()
        this.elm.disableBtn.disabled = this.elm.unsubBtn.disabled = v
    }

    addLog(action: string, tick: number, stack: string | HTMLElement) {
        const logRow = this.elm.actionLogTbody.insertRow(0)
        logRow.insertCell().append(tick + '')
        logRow.insertCell().append(action)
        logRow.insertCell().append(stack)

        if (this.elm.actionLogTbody.children.length > this.logLimit) this.elm.actionLogTbody.lastElementChild?.remove()

        return logRow
    }
}

const rowDataListenerBar = cellBar([128, 128, 255, 0.4], [64, 64, 255, 0.8])
const rowDataTimeBar = cellBar([255, 255, 128, 0.4], [255, 64, 64, 0.8])

function rowData(data: BedrockType.Events.Data) {
    const row = document.createElement('tr')

    // attr
    row.classList.add(
        fiTypePref + data.type,
        fiCategoryPref + data.category
    )
    row.setAttribute(fiNameAttrName, data.name)

    // row
    row.insertCell().append(data.category)
    row.insertCell().append(data.type)
    row.insertCell().append(data.name)
    const listenersRow = row.insertCell()
    listenersRow.style.backgroundImage = rowDataListenerBar(data.functions.length / 10)
    listenersRow.append(data.functions.length + '')
    const timeRow = row.insertCell()
    timeRow.style.backgroundImage = rowDataTimeBar(data.delta / 50)
    timeRow.append(data.delta + 'ms')

    // detail row
    const detailRow = document.createElement('tr')
    detailRow.hidden = true
    row.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)

    const detailCell = detailRow.insertCell()
    detailCell.colSpan = 10

    // container & template
    const detailCnt = detailCell.appendChild(document.createElement('div'))
    const detailTemplate = logTemp.cloneNode(true)


    // detail table
    const detailData = getIdThrow('data', undefined, detailTemplate)
    const detailTable = getIdThrow('table', HTMLTableElement, detailTemplate, true)
    const detailTbody = detailTable.tBodies.item(0) ?? detailTable.createTBody()

    // load
    row.addEventListener('click', () => {
        detailData.append(JSONUninspector(data.data))

        for (const fn of data.functions) {
            const row = detailTbody.insertRow()
    
            row.insertCell().append(JSONUninspector.t_function_tiny(fn.fn))
            row.insertCell().append(fn.fid + '')
            
            const timeRow = row.insertCell()
            timeRow.style.backgroundImage = rowDataTimeBar(fn.delta / 50)
            timeRow.append(fn.delta + 'ms')
    
            const errRow = row.insertCell()
            if (fn.error) {
                row.classList.add('level-error')
                errRow.append(JSONUninspector(fn.error))
            }
        }
    }, {once: true})

    const errcnt = data.functions.filter(v => v.error).length
    if (errcnt) listenersRow.append(' ', errNotif('error', errcnt + ''))

    detailCnt.append(detailTemplate)

    return { row, detailRow, errcnt }
}

function eventLisKeyOfId(identifier: BedrockType.Events.ListenerWithId): string {
    return identifier.category + '/' + identifier.type + '/' + identifier.name + '/' + identifier.fid
}

// process

const { eventListeners, eventLogs, limits: { eventListeners: eventListenersLimit, eventListenerLog: eventListenerLogLimit, eventLog: eventLogLimit } } = BedrockInspector.initData

for (const lis of eventListeners) {
    const d = new RowListener(lis), id = eventLisKeyOfId(lis)
    lisTbody.prepend(d.row, d.detailRow)
    lisList.set(id, d)
    if (d.unsubscribed) lisClearCache.set(id, d)
}

for (const log of eventLogs) {
    const d = rowData(log)
    logTbody.append(d.row, d.detailRow)
}

// updater

let notifErrorCount = 0
{   
    const navtab = querySelectorThrow('#nav > button[tab="events"]')
    const notif = errNotif('error')
    navtab.append(notif, ' ')

    setInterval(updateNotif, 500)
    tabchange.addEventListener('events', () => {
        notifErrorCount = 0
        updateNotif()
    })

    function updateNotif() {
        notif.textContent = notifErrorCount ? notifErrorCount >= 100 ? '99+' : notifErrorCount + '' : ''
    }
}

// events
{
    BedrockInspector.bedrockEvents.addEventListener('event', ({ detail: ev }) => {
        const d = rowData(ev)
        logTbody.append(d.row, d.detailRow)

        if (logTbody.children.length > eventLogLimit * 2) {
            logTbody.firstElementChild?.remove()
            logTbody.firstElementChild?.remove()
        }

        if (tab.hidden) notifErrorCount += d.errcnt
    })

    BedrockInspector.bedrockEvents.addEventListener('event_listener_subscribe', ({ detail: ev }) => {
        const id = eventLisKeyOfId(ev.data)
        let data = lisList.get(id)
        if (!data) {
            lisList.set(id, data = new RowListener(ev.data))
            lisTbody.prepend(data.row, data.detailRow)

            if (lisList.size > eventListenersLimit) {
                for (const [id, data] of lisClearCache) {
                    data.row.remove()
                    data.detailRow.remove()
                    lisList.delete(id)
                }
                lisClearCache.clear()
            }
        }
        else {
            lisClearCache.delete(id)
            data.disabled = false
            data.unsubscribed = false
            data.addLog('subscribe', ev.tick, formatStack(ev.stack))
        }
    })

    BedrockInspector.bedrockEvents.addEventListener('event_listener_unsubscribe', ({ detail: ev }) => {
        const id = eventLisKeyOfId(ev.data)
        const data = lisList.get(id)
        if (!data) return

        data.unsubscribed = true
        data.addLog('unsubscribe', ev.tick, formatStack(ev.stack))
        lisClearCache.set(id, data)
    })

    BedrockInspector.bedrockEvents.addEventListener('event_listener_disable', ({ detail: ev }) => {
        const id = eventLisKeyOfId(ev)
        const data = lisList.get(id)
        if (!data) return

        data.disabled = true
    })

    BedrockInspector.bedrockEvents.addEventListener('event_listener_enable', ({ detail: ev }) => {
        const id = eventLisKeyOfId(ev)
        const data = lisList.get(id)
        if (!data) return

        data.disabled = false
    })

    BedrockInspector.events.addEventListener('script_connect', () => {
        lisList.clear()
        lisClearCache.clear()
        lisTbody.replaceChildren()
        logTbody.replaceChildren()
    })

    BedrockInspector.events.addEventListener('script_disconnect', () => {
        for (const lis of lisList.values()) lis.elm.disableBtn.disabled = lis.elm.unsubBtn.disabled = true
    })
}
