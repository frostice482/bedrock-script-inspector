import TypedEventEmitter from "@typedevm.js"

namespace DebugConsoleOverride {
    const { log, info, warn, error } = console, _print = print
    export const rawLog = log, rawInfo = info, rawWarn = warn, rawError = error, rawPrint = _print

    console.log = print = (...data) => events.emit('log', data)
    console.info = (...data) => events.emit('info', data)
    console.warn = (...data) => events.emit('warn', data)
    console.error = (...data) => events.emit('error', data)

    export const events = new TypedEventEmitter<DebugConsoleOverride.Events>

    export interface Events {
        log: any[]
        info: any[]
        warn: any[]
        error: any[]
    }
}

export default DebugConsoleOverride
