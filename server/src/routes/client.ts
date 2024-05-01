import crypto = require('crypto')
import ws = require("ws");
import express = require("express");
import interpreter from "../interpreter.js";
import { httpServer, server } from "../server.js";
import PromiseController from "../lib/prmctrl.js";
import TypedEventEmitter from '../lib/typedevm.js'
import BedrockInterpreterType from "@globaltypes/interpreter.js";
import ClientType from "@globaltypes/client.js";

// ws magic
const wss = new ws.WebSocketServer({
    server: httpServer,
    path: '/client/ws',
    verifyClient: ({ req }, verify) => {
        if (server.authHash && req.headers.authorization !== server.authHash) verify(false, 401, 'Unauthorized')
        else verify(true)
    }
})

wss.on('connection', (ws, req) => {
    ws.on('message', (data, binary) => {
        const transfer = JSON.parse(String(data)) as ClientType.EventTransferData
        if (transfer.int) Client.debugEvents.emit(transfer.data.name, transfer.data.data)
        else Client.eventSendQueue.push(transfer.data)
    })
})

server.events.prependOnceListener('close', () => {
    for (const cli of wss.clients) cli.terminate()
    wss.close()
})

// ping pong
const wsNotResponding = new Set<ws.WebSocket>()
setInterval(() => {
    for (const ws of wsNotResponding) ws.terminate()
    for (const ws of wss.clients) {
        wsNotResponding.add(ws)
        ws.ping()
        ws.once('pong', () => wsNotResponding.delete(ws))
    }
}, 15_000).unref()

// emit
interpreter.on('bds_start', broadcaster('bds_start'))
interpreter.on('bds_kill', broadcaster('bds_kill'))
interpreter.on('script_connect', broadcaster('script_connect'))
interpreter.on('script_disconnect', broadcaster('script_disconnect'))
interpreter.on('bedrock_events', broadcaster('bedrock_events'))
interpreter.on('log', broadcaster('log'))
interpreter.on('stats', broadcaster('stats'))

function broadcaster<K extends keyof BedrockInterpreterType.CrossEvents>(name: K) {
    return (data: BedrockInterpreterType.CrossEvents[K]) => {
        const str = JSON.stringify({name, data})
        for (const ws of wss.clients) ws.send(str)
    }
}

// init
server.get('/client/data', (req, res) => {
    res.json(interpreter.toJSON())
})

// request
server.post('/client/request/:type',
    express.json({ type: () => true, limit: 256 * 1048576, strict: false }),
    (req, res) => {
        const id = crypto.randomBytes(15).toString('base64url')
        const prm = new PromiseController<string>()

        Client.requests.set(id, prm)

        Client.eventSendQueue.push({
            name: 'req',
            data: {
                id,
                name: req.params.type as any,
                data: req.body,
            }
        })

        prm.promise.then(
            v => res.end(v),
            e => res.status(500).json(e instanceof Error ? e.stack : e)
        )
    }
)

interpreter.prependOnceListener('script_disconnect', () => {
    for (const req of Client.requests.values()) req.reject(new ReferenceError('inspector closed'))
    Client.requests.clear()
    Client.eventSendQueue.splice(0)
})

namespace Client {
    export const requests = new Map<string, PromiseController<string>>()
    export const debugEvents = new TypedEventEmitter<{ [K in keyof ClientType.DebugEvents]: [ClientType.DebugEvents[K]] }>()
    export const eventSendQueue: ClientType.CrossEventData[] = []
}
export default Client
