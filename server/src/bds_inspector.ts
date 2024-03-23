import cp = require("child_process");
import path = require("path");
import rl = require("readline");
import TypedEventEmitter from "./lib/typedevm.js";
import BedrockInterpreterType from "../../globaltypes/interpreter.js";
import BedrockType from "../../globaltypes/bedrock.js";

const bdsLogMatch = /^\[(?<date>.*?) (?<time>.*?) (?<level>\w+)\]( \[(?<cat>\w+)\])? (?<msg>.*)/
const bdsLogLevelMap: Record<string, BedrockType.Console.LogLevel> = {
    LOG: 'log',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
}
Object.setPrototypeOf(bdsLogLevelMap, null)

export default class BDS extends TypedEventEmitter<{ [K in keyof ScriptBDSInspectorEvents]: ScriptBDSInspectorEvents[K] }> {
    constructor(bdsPath: string) {
        super()

        // spawn
        const bdsProc = this.bdsProcess = cp.spawn(path.resolve(bdsPath), {
            cwd: path.dirname(bdsPath),
            env: { LD_LIBRARY_PATH: '.' },
            stdio: 'pipe'
        })

        // event
        bdsProc.once('spawn', () => {
            this.#running = true
            this.emit('spawn', bdsProc)
        })
        bdsProc.once('exit', (code, sig) => this.emit('exit', code ?? sig, bdsProc))
        bdsProc.once('close', (code, sig) => {
            this.#running = false
            this.emit('close', code ?? sig, bdsProc)
        })
        bdsProc.on('error', (e) => this.emit('error', e, bdsProc))

        // line
        const rlint = rl.createInterface(bdsProc.stdout)
        rlint.on('line', line => {
            if (!line) return

            let log: BedrockInterpreterType.BDSLog
            const data = line.match(bdsLogMatch)
            if (data) {
                const { date = '', time = '', level = '', cat, msg = '' } = data.groups ?? {}
                log = {
                    date,
                    time,
                    category: cat,
                    level: bdsLogLevelMap[level] ?? 'unknown',
                    message: msg,
                }
            }
            else {
                log = {
                    level: 'unknown',
                    message: line
                }
            }

            let cancel = false
            this.emit('beforelog', log, () => cancel = true)
            if (!cancel) this.emit('log', log)
        })
    }

    #running = false
    
    readonly bdsProcess: cpProc
    get running() { return this.#running }

    send(command: string | Buffer | Uint8Array) {
        try {
            const stdin = this.bdsProcess.stdin
            stdin.write(command)
            stdin.write('\n')
        } catch(e) {}
    }
}

export interface ScriptBDSInspectorEvents {
    beforelog: [log: BedrockInterpreterType.BDSLog, cancel: () => void]
    log: [log: BedrockInterpreterType.BDSLog]
    spawn: [process: cpProc]
    exit: [codeOrSignal: NodeJS.Signals | number | null, process: cpProc]
    close: [codeOrSignal: NodeJS.Signals | number | null, process: cpProc]
    error: [err: Error, process: cpProc]
}

type cpProc = cp.ChildProcessWithoutNullStreams
