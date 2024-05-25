
import BedrockInspector from "#debug.js"
import { getIdThrow } from "@misc.js"

// status

const statusElm = getIdThrow('status')

function changeStatus(script: boolean, bds: boolean) {
    let [color, text] = script ? ['lime', 'connected'] : ['gold', 'listening']
    if (bds) text += ' (bds)'

    statusElm.style.color = color
    statusElm.textContent = text
}

let { connected, bdsConnected } = BedrockInspector.initData
changeStatus(connected, bdsConnected)

BedrockInspector.events.addEventListener('bds_start', () => changeStatus(connected, bdsConnected = true))
BedrockInspector.events.addEventListener('bds_kill', () => changeStatus(connected, bdsConnected = false))
BedrockInspector.events.addEventListener('script_connect', () => changeStatus(connected = true, bdsConnected))
BedrockInspector.events.addEventListener('script_disconnect', () => changeStatus(connected = false, bdsConnected))

BedrockInspector.ws.addEventListener('close', () => {
    statusElm.style.color = 'red'
    statusElm.textContent = 'disconnected'
}, { once: true })
