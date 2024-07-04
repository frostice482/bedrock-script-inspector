import express = require('express')
import http = require("http")
import EventEmitter = require('events')

const server = express()
server.events = new EventEmitter
const httpServer = http.createServer(server)
export { server, httpServer }

export async function listenServer(port: number, authUsername?: string, authPassword?: string, route = true) {
    const chalk = await import('chalk')

    httpServer.listen(port, () => console.log('Server started on port', port))
    server.events.once('close', () => httpServer.close())

    // authorization
    if (authUsername && authPassword) {
        const authValid = 'Basic ' + Buffer.from(authUsername + ':' + authPassword).toString('base64')
        server.authHash = authValid

        server.use((req, res, next) => {
            const auth = req.header('Authorization')
            if (authValid !== auth) return res.header('WWW-Authenticate', 'Basic realm="Access to script debugging server"').status(401).end()
            next()
        })
    }

    // route
    if (route) await import('./routes/index.js')
    
    // error handling
    server.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(chalk.yellowBright('Server error!'), err)

        if (res.headersSent) return res.destroy()

        res.status(500)
        res.send(
            typeof err === 'string' ? err
            : err instanceof Error ? err.stack || String(err)
            : JSON.stringify(err)
        )
        res.end()
    })
        
    process.on('uncaughtException', e => console.error('Uncaught exception!', e))
    process.on('unhandledRejection', e => console.error('Unhandled rejection!', e))
}