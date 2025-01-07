import express from 'express'
import fsp from 'fs/promises'
import { server } from "#server.js";

const clientPath = import.meta.dirname + '/../../../app'

server.get('/', async (req, res) => {
	const html = await fsp.readFile(clientPath + '/main.html').then(String)
	res.send(html.replace(/\r?\n\s*/g, ''))
})

server.use('/app', express.static(clientPath, { index: 'main.html' }))
