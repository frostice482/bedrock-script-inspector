import BedrockType from "../../globaltypes/bedrock.js"
import BedrockInterpreterType from "../../globaltypes/interpreter.js"
import TypedEventEmitter from "./lib/typedevm.js"
import ClientType from "../../globaltypes/client.js"

function pushLimit<T>(arr: T[], elm: T, limit: number) {
    arr.push(elm)
    if (arr.length > limit) arr.shift()
}

export class InterpreterConstructor extends TypedEventEmitter<{ [K in keyof InterpreterEvents]: [InterpreterEvents[K]] }> {    
    constructor() {
        super()        

        this.prependListener('bds_start', pid => {
            // reset & set state
            this.reset()
            this.bdsConnected = true
            this.bdsPid = pid
        })
        this.prependListener('bds_kill', exit => {
            // set state
            this.bdsConnected = false
            this.bdsExit = exit

            // if inspector is connected emit disconnect
            if (this.connected) this.emit('script_disconnect', null)
        })
        this.prependListener('script_connect', () => {
            // if inspector is connected emit disconnect
            if (this.connected) this.emit('script_disconnect', null)

            // reset & set state
            this.reset()
            this.connected = true
        })
        this.prependListener('script_disconnect', () => {
            this.connected = false
        })
        this.prependListener('log', log => {
            pushLimit(this.bdsConsoles, log, this.bdsConsoleLimit)
        })

        this.prependListener('clientInterpreterEvent', ([name, data]) => this.clientEvents.emit(name, data))
        
        this.prependListener('bedrock_events', events => {
            for (const pair of events) {
                const [name, data] = pair
                switch (name) {
                    case 'console':
                        pushLimit(this.consoles, data, this.consoleLimit)
                        break

                    case 'event':
                        pushLimit(this.eventLogs, data, this.eventLogLimit)
                        break

                    case 'run_add': {
                        const { stack, tick, data: { id, type, interval, fid, fn } } = data
                        this.runs.set(id, {
                            id, interval, type, fid, fn,

                            addStack: stack,
                            addTick: tick,

                            cleared: false,
                            suspended: false
                        })

                        if (this.runJobs.size + this.runs.size > this.runsLimit) {
                            for (const id of this.runClearCache) this.runs.delete(id) || this.runJobs.delete(id)
                            this.runClearCache.clear()
                        }

                        break
                    }

                    case 'job_add': {
                        const { stack, tick, data: id } = data
                        this.runJobs.set(id, {
                            id,
                            type: 'job',
                            
                            addStack: stack,
                            addTick: tick,

                            cleared: false,
                            suspended: false
                        })

                        if (this.runJobs.size + this.runs.size > this.runsLimit) {
                            for (const id of this.runClearCache) this.runs.delete(id) || this.runJobs.delete(id)
                            this.runClearCache.clear()
                        }

                        break
                    }

                    case 'run_clear': {
                        const id = data.data
                        const run = this.runs.get(id)
                        if (!run) break

                        run.cleared = true
                        run.clearTick = data.tick
                        run.clearStack = data.stack

                        this.runClearCache.add(id)

                        break
                    }

                    case 'job_clear': {
                        const run = this.runJobs.get(data.data.id)
                        if (!run) break

                        run.cleared = true
                        run.clearTick = data.tick
                        run.clearStack = data.stack

                        this.runClearCache.add(data.data.id)

                        break
                    }

                    case 'run_suspend': {
                        const run = this.runs.get(data) ?? this.runJobs.get(data)
                        if (run) run.suspended = true
                        break
                    }

                    case 'run_resume': {
                        const run = this.runs.get(data) ?? this.runJobs.get(data)
                        if (run) run.suspended = false
                        break
                    }

                    case 'event_listener_subscribe': {
                        const { stack, tick, data: lisid } = data

                        const key = this.#eventLisKeyOfId(lisid)
                        let lis = this.eventListeners.get(key)

                        if (!lis) {
                            const { category, fid, fn, name, type } = lisid
                            this.eventListeners.set(key, lis = {
                                category, type, name, fid, fn,
                                disabled: false,
                                unsubscribed: false,
                                log: []
                            })

                            if (this.eventListeners.size > this.eventListenersLimit) {
                                for (const key of this.eventListenerClearCache) this.eventListeners.delete(key)
                                this.eventListenerClearCache.clear()
                            }
                        }
                        else {
                            this.eventListenerClearCache.delete(key)
                            lis.disabled = lis.unsubscribed = false
                        }

                        pushLimit(lis.log, { action: 'subscribe', tick, stack }, this.eventListenerLogLimit)
                        break
                    }

                    case 'event_listener_unsubscribe': {
                        const { stack, tick, data: lisid } = data

                        const key = this.#eventLisKeyOfId(lisid)
                        const lis = this.eventListeners.get(key)
                        if (!lis) return

                        pushLimit(lis.log, { action: 'unsubscribe', tick, stack }, this.eventListenerLogLimit)
                        lis.unsubscribed = true
                        this.eventListenerClearCache.add(key)
                        break
                    }

                    case 'event_listener_disable': {
                        const key = this.#eventLisKeyOfId(data)
                        const lis = this.eventListeners.get(key)
                        if (lis) lis.disabled = true
                        break
                    }

                    case 'event_listener_enable': {
                        const key = this.#eventLisKeyOfId(data)
                        const lis = this.eventListeners.get(key)
                        if (lis) lis.disabled = false
                        break
                    }
                }
            }
        })
    }

    consoles: BedrockType.Console[] = []
    bdsConsoles: BedrockInterpreterType.BDSLog[] = []
    eventListeners = new Map<string, BedrockInterpreterType.EventListener>()
    eventLogs: BedrockType.Events.Data[] = []
    runs = new Map<number, BedrockInterpreterType.RunData>()
    runJobs = new Map<number, BedrockInterpreterType.RunDataBasic>()

    runClearCache = new Set<number>()
    eventListenerClearCache = new Set<string>()

    bdsConsoleLimit = 300
    consoleLimit = 200
    eventListenersLimit = 80
    eventListenerLogLimit = 80
    eventLogLimit = 60
    runsLimit = 80

    connected = false
    bdsConnected = false
    bdsPid: number | undefined
    bdsExit: number | string | undefined

    readonly clientEvents = new TypedEventEmitter<{ [K in keyof ClientType.InterpreterEvents]: [ClientType.InterpreterEvents[K]] }>()

    reset() {
        if (!this.bdsConnected) this.resetBDS()

        this.consoles.splice(0)
        this.eventListeners.clear()
        this.eventLogs.splice(0)
        this.runs.clear()
        this.runJobs.clear()
        
        this.runClearCache.clear()
        this.eventListenerClearCache.clear()

        this.connected = false
    }

    resetBDS() {        
        this.bdsConsoles.splice(0)

        this.bdsConnected = false
        this.bdsPid = this.bdsExit = undefined
    }

    #eventLisKeyOfId(identifier: BedrockType.Events.ListenerWithId): string {
        return identifier.category + '/' + identifier.type + '/' + identifier.name + '/' + identifier.fid
    }

    toJSON(): BedrockInterpreterType.JSONData {
        const {
            consoleLimit, bdsConsoleLimit, eventListenersLimit, eventListenerLogLimit, eventLogLimit, runsLimit,
            connected, bdsConnected, bdsPid, bdsExit,
            consoles, bdsConsoles, eventListeners, eventLogs, runs, runJobs
        } = this

        return {
            connected, bdsConnected, bdsPid, bdsExit,
            consoles,
            bdsConsoles,
            eventListeners: Array.from(eventListeners.values()),
            eventLogs,
            runs: Array.from(runs.values()),
            runJobs: Array.from(runJobs.values()),
            limits: {
                bdsConsole: bdsConsoleLimit,
                console: consoleLimit,
                eventListenerLog: eventListenerLogLimit,
                eventListeners: eventListenersLimit,
                eventLog: eventLogLimit,
                runs: runsLimit
            }
        }
    }
}

export interface InterpreterEvents extends BedrockInterpreterType.CrossEvents {
    clientInterpreterEvent: ClientType.InterpreterEventData
    serverClose: null
}

export const interpreter = new InterpreterConstructor

