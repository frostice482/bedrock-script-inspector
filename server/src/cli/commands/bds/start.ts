import chalk = require("chalk");
import events = require("events");
import fsp = require("fs/promises");
import path = require("path");
import timersp = require("timers/promises");
import { interpreter } from "../../../interpreter";
import { DeepPartialReadonly } from "../../../../../globaltypes/types.js";
import ScriptBDSInspector from "../../../bds_inspector.js";
import { debugManifestScriptModule } from "../../../debug_manifest.js";
import { listenServer } from "../../../server.js";
import BedrockInterpreterType from "../../../../../globaltypes/interpreter.js";
import Client from "../../../routes/client";

const elipsis = chalk.gray('...')
const bdsTag = chalk.magentaBright('[BDS]')
const bdsLevelTag: Record<BedrockInterpreterType.BDSLog.LogLevelUnknown, string> = {
    log: chalk.gray('LOG'),
    info: chalk.blueBright('INFO'),
    warn: chalk.bgYellowBright.black('WARN'),
    error: chalk.bgRedBright.black('ERR!'),
    unknown: '    '
}

function handleInspector(bdsinspector: ScriptBDSInspector) {
    bdsinspector.on('log', log => {
        const { level, message: msgRaw, category = '' } = log
        const maxLen = process.stdout.isTTY ? process.stdout.getWindowSize()[0] - 12 - category.length : Infinity
        const msg = msgRaw.length > maxLen ? msgRaw.slice(0, maxLen - elipsis.length) + elipsis : msgRaw

        console.log(bdsTag, bdsLevelTag[level], category ? chalk.cyanBright(category) : '\b', msg)
    })

    // process event
    bdsinspector.once('spawn', cp => interpreter.emit('bds_start', cp.pid ?? 0))
    bdsinspector.once('close', code => {
        interpreter.emit('bds_kill', code ?? -1)
        console.log(`BDS exited ${code ? `with ${typeof code === 'string' ? `status ${code}` : `code ${code} (0x${code.toString(16)})`}` : ''}`)
    })
    bdsinspector.on('log', data => interpreter.emit('log', data))
    
    // stat
    const statMatch = /^Script stats saved to '(.*)'/
    bdsinspector.on('beforelog', async (data, cancel) => {
        const statPath = data.message.match(statMatch)?.[1]
        if (!statPath) return
        cancel()
    
        await fsp.readFile(statPath)
            .then(buf => interpreter.emit('stats', JSON.parse(String(buf))))
            .catch(e => console.error(e))
    
        fsp.rm(statPath, { recursive: true, force: true })
    })
    
    // auto stat
    ;(async() => {
        await events.once(interpreter, 'script_connect')
        while (bdsinspector.running) {
            bdsinspector.send('script watchdog exportstats')
            
            await Promise.all([
                events.once(interpreter, 'stats'),
                timersp.setTimeout(200),
            ])
        }
    })()

    // client events
    Client.debugEvents.on('command', cmd => bdsinspector.send(cmd))
    Client.debugEvents.on('kill', () => bdsinspector.bdsProcess.kill())
}

async function startBds(bdsDir: string, addBefore = false, removeAfter = false) {
    if (addBefore) await import("./add.js").then(v => v.cliAddBds(bdsDir))

    const isWin = process.platform === 'win32' || process.platform.includes('win')
    const bdsFile = isWin ? 'bedrock_server.exe' : 'bedrock_server'
    const bdsinspector = new ScriptBDSInspector(bdsDir + '/' + bdsFile)
    handleInspector(bdsinspector)

    if (removeAfter) bdsinspector.once('close', () => import("./rm.js").then(v => v.cliRmBds(bdsDir)))

    return bdsinspector
}

export async function startBdsServer(dir: string, serverPort: number, opts: DeepPartialReadonly<CLIStartBDSOptions>) {
    const { add, remove, authUser, authPass } = opts ?? {}

    // add pack config
    // add autoconnect variables
    const debugConfig = path.join(dir, 'config', debugManifestScriptModule.uuid)
    await fsp.mkdir(debugConfig, { recursive: true })
    await fsp.writeFile(debugConfig + '/variables.json', JSON.stringify({
        debug_autoconnect: {
            address: '127.0.0.1:' + serverPort,
            username: authUser,
            password: authPass
        }
    }))

    let bds = await startBds(dir + '/', add, remove)

    Client.debugEvents.addListener('restart', async () => {
        if (!bds?.running) bds = await startBds(dir + '/', add, remove)
    })

    // start server
    await listenServer(serverPort, authUser, authPass)
}

export interface CLIStartBDSOptions {
    add?: boolean
    remove?: boolean
    authUser?: string
    authPass?: string
}
