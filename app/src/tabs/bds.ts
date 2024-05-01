import BedrockInterpreterType from "@globaltypes/interpreter.js"
import BedrockInspector from "../debug.js"
import { inputHistoryElement } from "../lib/inputhistory.js"
import { getIdThrow, pushLimit, querySelectorThrow } from "../lib/misc.js"
import { errNotif, textApplier } from "../lib/misc.js"
import { RelativePopup, RelativePopupHandle } from "../lib/popup.js"
import { initFilter, initFilterText, filterTooltip } from "../lib/text_filter.js"
import { tabchange } from "../tab.js"

const tab = getIdThrow('tab-bds')

//// table log ////

const logContainer = getIdThrow('bds-log-cnt')
const logTable = getIdThrow('bds-log', HTMLTableElement)
const logTbody = logTable.tBodies.item(0) ?? logTable.createTBody()

//// command input ////

const cmdInput = getIdThrow('bds-c-input', HTMLInputElement)
const cmdSend = getIdThrow('bds-c-send', HTMLButtonElement)

new inputHistoryElement(cmdInput)

cmdInput.addEventListener('keydown', (ev) => ev.key === 'Enter' && cmdInput.value && send())
cmdSend.addEventListener('click', (ev) => cmdInput.value && send())

//// filter ////

const fiLevelPref = 'level-'
const fiDisplayPref = '_fi-display-'
const fiCategoryAttrName = 'fi_category'

initFilter('bds-fi-levels', fiLevelPref, logTable)
initFilter('bds-fi-displays', fiDisplayPref, logTable)

const bdsFilterCategory = getIdThrow('bds-fi-cat', HTMLInputElement)
initFilterText(
    bdsFilterCategory,
    fiCategoryAttrName,
    textApplier(v => v ? `#bds-log > tbody > tr${v} { display: none; }` : '', document.head.appendChild(document.createElement('style')))
)

new RelativePopupHandle(new RelativePopup(bdsFilterCategory, filterTooltip.cloneNode(true), bdsFilterCategory.parentElement!, 'bottomcenter'), 'focus')

//// function ////

function row(data: BedrockInterpreterType.BDSLog) {
    const { date, time, level, message, category } = data

    // row
    const row = document.createElement('tr')
    row.classList.add(fiLevelPref + level) // level
    row.setAttribute(fiCategoryAttrName, category ?? 'Unknown') // category

    // timestamp
    const tsCell = row.insertCell()
    if (date || time) tsCell.append(date + ' ' + time)

    // level
    const levelCell = row.insertCell()
    levelCell.classList.add('text-level-' + level)
    levelCell.append(level)

    // category
    const catCell = row.insertCell()
    if (category) catCell.append(category)

    // message
    row.insertCell().append(message)

    return row
}

function send() {
    BedrockInspector.sendInt('command', cmdInput.value)
    cmdInput.value = ''
    logContainer.scroll(0, logContainer.scrollHeight)
}

//// info ////

const infoPid = getIdThrow('bds-i-pid')
const infoStatus = getIdThrow('bds-i-status')
const infoCode = getIdThrow('bds-i-code')

//// info button ////

const info = getIdThrow('bds-info')
const infoBtnHide = getIdThrow('bds-i-hide', HTMLButtonElement)
const infoBtnKill = getIdThrow('bds-kill-res', HTMLButtonElement)

infoBtnHide.addEventListener('click', () => {
    info.hidden = !info.hidden

    const arr = infoBtnHide.firstElementChild?.classList
    if (arr) {
        arr.add(info.hidden ? 'fa-angles-up' : 'fa-angles-down')
        arr.remove(info.hidden ? 'fa-angles-down' : 'fa-angles-up')
    }
})

infoBtnKill.addEventListener('click', () => {
    BedrockInspector.sendInt(bdsStatus ? 'kill' : 'restart', null)
})

//// process ////

const { bdsConsoles: initLog, limits: { bdsConsole: logLimit } } = BedrockInspector.initData
if (initLog.length > logLimit) initLog.splice(logLimit)
let bdsStatus = false

{
    const { bdsConnected, bdsExit, bdsPid } = BedrockInspector.initData
    if (bdsPid) infoPid.textContent = String(bdsPid)

    if (bdsConnected) {
        cmdInput.disabled = cmdSend.disabled = false
        bdsStatus = true
        infoStatus.textContent = 'connected'
        infoBtnKill.textContent = 'end process'
    }
    else if (bdsExit !== undefined) {
        infoCode.textContent = typeof bdsExit === 'number' ? bdsExit + ' hex 0x' + bdsExit.toString(16) : bdsExit
        infoStatus.textContent = 'stopped'
        infoBtnKill.textContent = 'restart'
    }
}

const logQueue: BedrockInterpreterType.BDSLog[] = initLog

//// event ////

{
    BedrockInspector.events.addEventListener('bds_start', ({ detail: pid }) => {
        logTbody.replaceChildren()

        cmdInput.disabled = cmdSend.disabled = false
        bdsStatus = true
        infoStatus.textContent = 'connected'
        infoPid.textContent = String(pid)
        infoCode.textContent = '...'
        infoBtnKill.textContent = 'end process'
    })

    BedrockInspector.events.addEventListener('bds_kill', ({ detail: code }) => {
        cmdInput.disabled = cmdSend.disabled = true
        bdsStatus = false
        infoStatus.textContent = 'stopped'
        infoCode.textContent = typeof code === 'number' ? code + ' hex 0x' + code.toString(16) : code
        infoBtnKill.textContent = 'restart'
    })

    BedrockInspector.events.addEventListener('log', ({ detail: log }) => {
        pushLimit(logQueue, log, logLimit)

        if (tab.hidden) {
            if (log.level === 'warn') notifWarnCount++
            if (log.level === 'error') notifErrCount++
        }
    })
}

//// updater ////

let notifErrCount = 0
let notifWarnCount = 0
{
    const navtab = querySelectorThrow('#nav > button[tab="bds"]')
    const notifErrElm = errNotif('error')
    const notifWarnElm = errNotif('warn')
    navtab.append(notifErrElm, ' ', notifWarnElm, ' ')

    setInterval(updateQueue, 150)
    setInterval(updateNotif, 500)

    tabchange.addEventListener('bds', () => {
        updateQueue(true)
        logContainer.scroll(0, logContainer.scrollHeight)

        notifWarnCount = notifErrCount = 0
        updateNotif()
    })

    function updateQueue(forceFocus = false) {
        if (!logQueue.length || !forceFocus && (tab.hidden || document.hidden)) return

        // remove extra elements
        for (let delCnt = logTbody.rows.length + logQueue.length - logLimit; delCnt > 0; delCnt--) logTbody.rows.item(0)?.remove()
        // scroll
        const scroll = logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight
        // append log & clear
        logTbody.append.apply(logTbody, logQueue.map(row))
        logQueue.splice(0)
        // scroll
        if (scroll) requestAnimationFrame(() => logContainer.scroll(0, logContainer.scrollHeight))
    }

    function updateNotif() {
        notifErrElm.textContent = notifErrCount ? notifErrCount >= 100 ? '99+' : notifErrCount + '' : ''
        notifWarnElm.textContent = notifWarnCount ? notifWarnCount >= 100 ? '99+' : notifWarnCount + '' : ''
    }
}