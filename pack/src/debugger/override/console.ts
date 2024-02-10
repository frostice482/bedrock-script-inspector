import TypedEventEmitter from "../lib/typedevm.js"

namespace DebugConsoleOverride {
    const { log, info, warn, error } = console, _print = print

    console.log = print = (...data) => events.emit('log', data)
    console.info = (...data) => events.emit('info', data)
    console.warn = (...data) => events.emit('warn', data)
    console.error = (...data) => events.emit('error', data)

    export const events = new TypedEventEmitter<DebugConsoleOverride.Events>

    export const rawLog = log
    export const rawInfo = info
    export const rawWarn = warn
    export const rawError = error
    export const rawPrint = _print

    export interface Events {
        log: any[]
        info: any[]
        warn: any[]
        error: any[]
    }
}

export default DebugConsoleOverride
