import BedrockInspector from "../debug.js";
import inputHistory from "../lib/inputhistory.js";
import IteatorUtil from "../lib/iterator.js";
import JSONUninspector from "../lib/jsonuninspector.js";
import { getIdThrow } from "../lib/misc.js";
import handleResizer from "../lib/handle_resizer.js";
import { RelativePopup, RelativePopupHandle } from "../lib/popup.js";

// editor

const editorCnt = getIdThrow('eval-editor')
const editor = ace.edit(editorCnt)
editor.setTheme("ace/theme/cloud9_night");
editor.session.setMode("ace/mode/javascript")

editor.setValue(sessionStorage.getItem('evalcode') || [
    '/* ',
    ' * Enter a JS code to evaluate to the BDS server',
    ' * Ctrl+UP / Ctrl+DOWN for history, Ctrl+ENTER to evaluate',
    ' * Async eval mode -- requires "return" keyword to get the value',
    ' * ',
    ' * $_ - previous value',
    ' */',
    '',
    'console.log("Hello from inspector eval")'
].join('\n'))

const history = new inputHistory()

editor.keyBinding.addKeyboardHandler({ handleKeyboard: () => history.resetPointer() }, 0)

editor.commands.addCommand({
    name: 'Evaluate',
    exec: () => {
        const val = editor.getValue()
        history.handleEnter(val)
        if (!sendBtn.disabled) send(val)
    },
    bindKey: {
        win: 'ctrl-enter',
        mac: 'cmd-enter'
    }
})
editor.commands.addCommand({
    name: 'History: Previous',
    exec: () => handleHistory(true),
    bindKey: {
        win: 'ctrl-up',
        mac: 'cmd-up'
    }
})
editor.commands.addCommand({
    name: 'History: Next',
    exec: () => handleHistory(false),
    bindKey: {
        win: 'ctrl-down',
        mac: 'cmd-down'
    }
})

function handleHistory(isUp: boolean) {
    const doc = editor.session.doc
    const val = editor.getValue()

    const {start, end} = editor.selection.getRange()
    const si = doc.positionToIndex(start), ei = doc.positionToIndex(end)
    
    const [v, ns, ne] = history.handleNav(isUp, val, si, ei)

    const nrs = doc.indexToPosition(ns, 0)
    const nre = doc.indexToPosition(ne, 0)

    editor.setValue(v)
    editor.selection.setRange(ace.Range.fromPoints(nrs, nre), false)
}

// sidebar resize & hide

const sidebar = getIdThrow('eval-side')

const optsSideHide = getIdThrow('eval-hide')
optsSideHide.addEventListener('click', () => {
    sidebar.hidden = !sidebar.hidden

    const arr = optsSideHide.firstElementChild?.classList
    if (arr) {
        arr.add(sidebar.hidden ? 'fa-angles-right' : 'fa-angles-left')
        arr.remove(!sidebar.hidden ? 'fa-angles-right' : 'fa-angles-left')
    }
})

const resizeHandle = getIdThrow('eval-resize')
handleResizer(editorCnt, resizeHandle, 1, 0)

// opts

const optsInspectObj = getIdThrow('eval-opts-insobj')
const optsInspectFn = getIdThrow('eval-opts-insfn')
const optsAsync = getIdThrow('eval-opts-eval')

const refInspDesc = document.createElement('div')
refInspDesc.classList.add('popup')
refInspDesc.style.whiteSpace = 'pre'
refInspDesc.textContent = [
    'Inspects values in references. Significantly affects inspect time.',
    'Can be used to skip inspecting the same value to reduce time.',
    'Inspecting circular value is possible, but circular detection',
    'may be inaccurate.'
].join('\n')

new RelativePopupHandle(new RelativePopup(getIdThrow('eval-opts-eval-refinsp-title'), refInspDesc, undefined, 'topcenter'), 'hover')

// send

const stat = getIdThrow('eval-stat')
const statPopup = document.createElement('div')
statPopup.classList.add('popup')

new RelativePopupHandle(new RelativePopup(stat, statPopup, undefined, 'topcenter'), 'hover')

const sendBtn = getIdThrow('eval-send', HTMLButtonElement)
if (BedrockInspector.initData.connected) sendBtn.disabled = false

BedrockInspector.events.addEventListener('script_disconnect', () => sendBtn.disabled = true)
BedrockInspector.events.addEventListener('script_connect', () => sendBtn.disabled = false)

sendBtn.addEventListener('click', () => send())

async function send(value = editor.getValue()) {
    // eval
    const t0 = Date.now()
    const res = await BedrockInspector.request('eval', {
        code: value,
        opts: {
            object: opt(optsInspectObj),
            function: opt(optsInspectFn)
        },
        ...opt(optsAsync)
    })
    const td = Date.now() - t0

    // inspect
    const e = JSONUninspector(res.data)
    if (res.error) e.prepend(JSONUninspector.errUncaught())
    
    // replace
    evalRes.replaceChildren(e)
    stat.textContent = td + 'ms'
    statPopup.textContent = `exec: ${res.execTime}ms, inspect: ${res.inspTime}ms, other: ${td - res.execTime - res.inspTime}ms`

    sessionStorage.setItem('evalcode', value)
}

function opt(e: Element) {
    return Object.fromEntries(
        IteatorUtil.map(
            IteatorUtil.list( e.querySelectorAll<HTMLInputElement>('input[opt]') ),
            v => [v .getAttribute('opt'), v.checked ]
        )
    )
}

// result

const evalRes = getIdThrow('eval-res')
