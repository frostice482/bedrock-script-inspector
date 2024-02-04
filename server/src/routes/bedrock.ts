import express = require("express");
import { server } from "../server.js";
import { interpreter } from "../interpreter.js";
import { cliForwards, cliReqs } from "./client.js";

server.use('/bedrock', (req, res, next) => {
    res.contentType('text/plain')
    next()
})

server.head('/bedrock/connect', (req, res) => res.end())

server.post('/bedrock/connect',
    express.json({ type: () => true, limit: 256 * 1048576 }),
    (req, res) => {
        interpreter.emit('script_connect', null)
        interpreter.emit('bedrock_events', req.body)

        res.end()
    }
)

server.post('/bedrock/disconnect', (req, res) => {
    if (!interpreter.connected) return res.status(400).end('Inspector not connected')

    interpreter.emit('script_disconnect', null)
    res.end()
})

server.post('/bedrock/transfer',
    express.json({ type: () => true, limit: 256 * 1048576 }),
    (req, res) => {
        interpreter.emit('bedrock_events', req.body)
        res.json(cliForwards.splice(0))
    }
)

server.post('/bedrock/resolve/:id',
    express.text({ type: () => true, limit: 256 * 1048576 }),
    (req, res) => {
        const id = req.params.id, data = req.body
        
        cliReqs.get(id)?.resolve(data)
        cliReqs.delete(id)
    }
)
