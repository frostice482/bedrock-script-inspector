import TypedEventEmitter from "../lib/typedevm.js"

const { log, info, warn, error } = console, rawPrint = print

console.log = print = (...data) => debugConsoleOverride.emit('log', data)
console.info = (...data) => debugConsoleOverride.emit('info', data)
console.warn = (...data) => debugConsoleOverride.emit('warn', data)
console.error = (...data) => debugConsoleOverride.emit('error', data)

export class DebugConsoleOverride extends TypedEventEmitter<ConsoleOverrideEvents> {
    rawLog = log
    rawInfo = info
    rawWarn = warn
    rawError = error
    rawPrint = rawPrint
}

const debugConsoleOverride = new DebugConsoleOverride
export default debugConsoleOverride

export interface ConsoleOverrideEvents {
    log: any[]
    info: any[]
    warn: any[]
    error: any[]
}
