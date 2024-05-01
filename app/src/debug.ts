import BedrockType from "@globaltypes/bedrock.js"
import ClientType from "@globaltypes/client.js"
import BedrockInterpreterType from "@globaltypes/interpreter.js"
import { post, resThrowIfError } from "./lib/misc.js"
import TypedEventTarget from "./lib/typedevt.js"

const _initRes = await fetch('/client/data', { cache: 'no-cache' }).then(resThrowIfError)
const _initData = await _initRes.json() as BedrockInterpreterType.JSONData

namespace BedrockInspector {
    export function send<K extends keyof ClientType.CrossEvents>(name: K, data: ClientType.CrossEvents[K]) {
        ws.send( JSON.stringify({ int: false, data: {name, data} }) )
    }

    export function sendInt<K extends keyof ClientType.DebugEvents>(name: K, data: ClientType.DebugEvents[K]) {
        ws.send( JSON.stringify({ int: true, data: {name, data} }) )
    }

    export function request<K extends ClientType.Request.Values>(name: K, data: ClientType.Request.List[K]): Promise<BedrockType.ClientResponse.List[K]> {
        return post('/client/request/' + name, JSON.stringify(data))
            .then(resThrowIfError)
            .then(v => v.json())
    }

    // events
    export const events = new TypedEventTarget<BedrockInterpreterType.CrossEvents>()
    export const bedrockEvents = new TypedEventTarget<BedrockType.CrossEvents>()

    // initial data
    export const initData = _initData

    // websocket
    export const ws = new WebSocket(`ws://${location.host}/client/ws`)
    ws.addEventListener('message', ({data: raw}) => {
        const { name, data } = JSON.parse(raw) as BedrockInterpreterType.CrossEventData

        if (name === 'bedrock_events') {
            for (const { name, data: bdata } of data)
                bedrockEvents.dispatchEvent(new CustomEvent(name, { detail: bdata }))
        }

        events.dispatchEvent(new CustomEvent(name, { detail: data }))
    })
}
export default BedrockInspector

Object.assign(globalThis, { BedrockInspector })
