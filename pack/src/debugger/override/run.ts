import { System, system } from "@minecraft/server";
import timing, { TimingResult } from "../lib/timing.js";
import TypedEventEmitter from "../lib/typedevm.js";
import getFid from "../lib/fid.js";

export class RunDataInternal {
    /**
     * Creates a run controller
     * @param fn Function callback
     * @param type Run type (interval / timeout / run)
     * @param interval Run interval, defaults to 1
     */
    constructor(fn: () => void, type: RunTypeEnum, interval?: number | null) {
        this.id = nextId++
        this.type = type
        this.interval = interval ||= 1
        this.nextLocalTick = localTick + this.interval
        this.fn = fn

        runList.set(this.id, this)
        debugRunOverride.emit('addRun', this)
    }

    /** Run identifier */
    readonly id: number
    /** Run type */
    type: RunTypeEnum
    /** Run inteval */
    interval: number

    /** Function callback */
    fn: () => void
    /** Function identifier */
    get fid() { return getFid(this.fn) }

    /** True if if run is cleared */
    get cleared() { return !runList.has(this.id) }

    #suspended = false
    
    /** If true prevents function from executing */
    get suspended() { return this.#suspended }
    set suspended(v) {
        if (this.#suspended === v) return
        this.#suspended = v

        debugRunOverride.emit(v ? 'suspend' : 'resume', this)

        if (!v && localTick >= this.nextLocalTick) {
            const ct = localTick, nt = this.nextLocalTick, i = this.interval
            if (nt < ct) this.nextLocalTick = ct + i - (ct - nt) % i
        }
    }

    nextLocalTick: number
    lastExec = Date.now()

    /**
     * Executes wrapper function callback
     * @param update Update next tick & autoclear, defaults to false
     * @returns Timing
     */
    exec(update = false) {
        const ct = Date.now()
        const res = timing(this.fn), interval = ct - this.lastExec

        if (update) {
            if (this.type !== RunTypeEnum.Interval) this.clear()
            this.nextLocalTick += this.interval
            this.lastExec = ct
        }

        return { res, interval }
    }

    /**
     * Clear run
     * @returns boolean
     */
    clear() {
        if (runList.delete(this.id)) {
            debugRunOverride.emit('clearRun', this)
        }
    }
}

export const runList = new Map<number, RunDataInternal>()
let nextId = 1
let localTick = 1

const systemProto = Object.getPrototypeOf(system) as System
const {
    run: rawRun,
    runInterval: rawRunInterval,
    runTimeout: rawRunTimeout,
    clearRun: rawClearRun,
    runJob: rawRunJob,
    clearJob: rawClearJob
} = systemProto

systemProto.run = (cb) => new RunDataInternal(cb, RunTypeEnum.Run).id
systemProto.runInterval = (cb, i) => new RunDataInternal(cb, RunTypeEnum.Interval, i).id
systemProto.runTimeout = (cb, i) => new RunDataInternal(cb, RunTypeEnum.Timeout, i).id
systemProto.clearRun = (id) => runList.get(id)?.clear()
systemProto.runJob = (gen) => new RunDataInternal(gen.next.bind(gen), RunTypeEnum.Job).id
systemProto.clearJob = (id) => runList.get(id)?.clear()

export enum RunTypeEnum {
    Interval = 'interval',
    Timeout = 'timeout',
    Run = 'run',
    Job = 'job',
}

export class DebugRunOverrideConstructor extends TypedEventEmitter<RunOverrideEvents> {
    RunType = RunTypeEnum
    RunData = RunDataInternal
    
    runList: ReadonlyMap<number, RunDataInternal> = runList

    get nextId() { return nextId }
    set nextId(v) { nextId = v }

    get localTick() { return localTick }
    set localTick(v) { localTick = v }

    rawRun = rawRun
    rawRunJob = rawRunJob
    rawClearJob = rawClearJob
    rawRunInterval = rawRunInterval
    rawRunTimeout = rawRunTimeout
    rawClearRun = rawClearRun

    ;*execAll() {
        const nextTick = ++localTick
        
        for (const run of runList.values()) {
            if (run.suspended || run.cleared || run.nextLocalTick > nextTick) continue
            yield {
                id: run.id,
                exec: run.exec(true)
            }
        }
    }

    ;*[Symbol.iterator]() { yield* this.runList.values() }
}

const debugRunOverride = new DebugRunOverrideConstructor
export default debugRunOverride

export interface RunOverrideEvents {
    addRun: RunDataInternal
    run: {
        readonly run: RunDataInternal
        readonly interval: number
        readonly data: TimingResult
        readonly update: boolean
    }
    clearRun: RunDataInternal
    suspend: RunDataInternal
    resume: RunDataInternal
}

declare module '@minecraft/server' {
    interface System {
        runJob(gen: Generator): number
    }
}
