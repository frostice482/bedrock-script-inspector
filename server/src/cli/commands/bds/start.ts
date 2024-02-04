import chalk = require("chalk");
import events = require("events");
import fsp = require("fs/promises");
import path = require("path");
import rl = require("readline");
import timersp = require("timers/promises");
import { interpreter } from "../../../interpreter";
import { DeepPartialReadonly } from "../../../../../globaltypes/types.js";
import ScriptBDSInspector from "../../../bds_inspector.js";
import { debugManifestScriptModule } from "../../../debug_manifest.js";
import { listenServer } from "../../../server.js";
import BedrockInterpreterType from "../../../../../globaltypes/interpreter.js";

async function bdsInspector(bdsDir: string, port: number, authUser?: string, authPass?: string) {
    // add pack config
    // add autoconnect variables
    const debugConfig = path.join(bdsDir, 'config', debugManifestScriptModule.uuid)
    await fsp.mkdir(debugConfig, { recursive: true })
    await fsp.writeFile(debugConfig + '/variables.json', JSON.stringify({
        debug_autoconnect: {
            address: '127.0.0.1:' + port,
            username: authUser,
            password: authPass
        }
    }))

    const isWin = process.platform === 'win32' || process.platform.includes('win')
    const bdsFile = isWin ? 'bedrock_server.exe' : 'bedrock_server'
    const bdsinspector = new ScriptBDSInspector(bdsDir + '/' + bdsFile)

    // line
    const elipsis = chalk.gray('...')
    const bdsTag = chalk.magentaBright('[BDS]')
    const bdsLevelTag: Record<BedrockInterpreterType.BDSLog.LogLevelUnknown, string> = {
        log: chalk.gray('LOG'),
        info: chalk.blueBright('INFO'),
        warn: chalk.bgYellowBright.black('WARN'),
        error: chalk.bgRedBright.black('ERR!'),
        unknown: '    '
    }
    bdsinspector.on('log', log => {
        const { level, message: msgRaw, category } = log
        const maxLen = process.stdout.isTTY ? process.stdout.getWindowSize()[0] - 23 : Infinity
        const msg = msgRaw.length > maxLen ? msgRaw.slice(0, maxLen) + elipsis : msgRaw

        console.log(bdsTag, bdsLevelTag[level], category ? chalk.cyanBright(category) : '\b', msg)
    })

    // process event
    bdsinspector.once('spawn', cp => interpreter.emit('bds_start', cp.pid ?? 0))
    bdsinspector.once('close', code => interpreter.emit('bds_kill', code ?? -1))
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

    // bds input
    if (process.stdin.isTTY) process.stdin.setRawMode(true)

    const rlint = rl.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '/'
    })
    rlint.on('line', line => bdsinspector.send(line))
    rlint.on('SIGINT', async () => {
        console.log('SIGINT')

        // stop bds
        if (bdsinspector.running) {
            console.log('Stopping BDS, press Ctrl+C again to close server')
            bdsinspector.send('stop')
            return
        }

        // stop server & readline
        console.log('Stopping server')
        interpreter.emit('serverClose', null)
        rlint.close()
    })

    return bdsinspector
}

export async function startBds(dir: string, serverPort: number, opts: DeepPartialReadonly<CLIStartBDSOptions>) {
    const { add, remove, authUser, authPass } = opts ?? {}

    // add pack to bds
    if (add) await import("./add.js").then(v => v.cliAddBds(dir))

    // start bds
    const bds = await bdsInspector(dir + '/', serverPort, authUser, authPass)

    // remove pack to bds
    if (remove) bds.once('close', () => import("./rm.js").then(v => v.cliRmBds(dir)))

    // client interpreter events
    interpreter.clientEvents.on('command', cmd => bds.send(cmd))
    interpreter.clientEvents.on('kill', () => bds.bdsProcess.kill())
    
    // start server
    await listenServer(serverPort, authUser, authPass)
}

export interface CLIStartBDSOptions {
    add?: boolean
    remove?: boolean
    authUser?: string
    authPass?: string
}
