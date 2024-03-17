import BedrockInspector from "../debug.js";
import IteatorUtil from "../lib/iterator.js";
import JSONUninspector from "../lib/jsonuninspector.js";
import { getIdThrow } from "../lib/misc.js";
import handleResizer from "../lib/handle_resizer.js";
import { RelativePopup, RelativePopupHandle } from "../lib/popup.js";
import inputHistory from "../lib/inputhistory.js";
import { tabchange } from "../tab.js";

// editor

const editorCnt = getIdThrow('eval-editor')
const editor = CodeMirror(editorCnt, {
    mode: 'text/javascript',
    theme: 'tomorrow-night-eighties',
    lineNumbers: true,
    allowDropFileTypes: ['text/javascript'],
    autoCloseBrackets: true,
    tabSize: 4,
    value: sessionStorage.getItem('evalcode') ?? [
        '/* ',
        ' * Enter a JS code to evaluate to Script API',
        ' * Ctrl+UP / Ctrl+DOWN for history, Ctrl+ENTER to evaluate',
        ' * ',
        ' * -- Debug variables --',
        ' * this    - get debug variables',
        ' * $       - get entity by name / type',
        ' * $_      - previous value',
        ' * vars    - set variables',
        ' * mesaure - measures time taken to execute a function',
        ' * ',
        ' * -- Minecraft modules --',
        ' * mc      - @minecraft/server',
        ' * gt      - @minecraft/server-gametest',
        ' * mcui    - @minecraft/server-ui',
        ' * mcnet   - @minecraft/server-net',
        ' * mcadmin - @minecraft/server-admin',
        ' */',
        '',
        'console.log("Hello from inspector eval")'
    ].join('\n')
})

tabchange.addEventListener('eval', () => editor.refresh(), { once: true })

// history

const history = new inputHistory()
const doc = editor.getDoc()

editor.on('inputRead', () => history.resetPointer())

editor.addKeyMap({
    'Ctrl-Enter': handleEnter,
    'Cmd-Enter': handleEnter,
    'Ctrl-Up': () => handleHistory(true),
    'Cmd-Up': () => handleHistory(true),
    'Ctrl-Down': () => handleHistory(false),
    'Cmd-Down': () => handleHistory(false),
})

function handleEnter() {
    const val = editor.getValue()
    history.handleEnter(val)
    if (!sendBtn.disabled) send(val)
}

function handleHistory(isUp: boolean) {
    const start = doc.indexFromPos(editor.getCursor('from'))
    const end = doc.indexFromPos(editor.getCursor('to'))

    const [v, ns, ne] = history.handleNav(isUp, doc.getValue(), start, end)

    editor.setValue(v)

    if (ns === ne) editor.setCursor(doc.posFromIndex(ns))
    else editor.setSelection(doc.posFromIndex(ne), doc.posFromIndex(ns))
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

const asyncModeDesc = document.createElement('div')
asyncModeDesc.classList.add('popup')
asyncModeDesc.style.whiteSpace = 'pre'
asyncModeDesc.textContent = 'Enabling async will require `return` keyword to output the result'

new RelativePopupHandle(new RelativePopup(getIdThrow('eval-opts-eval-async-title'), asyncModeDesc, undefined, 'topcenter'), 'hover')
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
