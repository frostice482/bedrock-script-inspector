import { System } from "@minecraft/server"
import BedrockType from "../../../../globaltypes/bedrock.js"
import timing, { TimingResult } from "../lib/timing.js"
import TypedEventEmitter from "../lib/typedevm.js"

namespace DebugRunOverride {
    const proto = System.prototype
    const { run, runTimeout, runInterval, clearRun, runJob, clearJob } = proto
    export const rawRun = run, rawRunTimeout = runTimeout, rawRunInterval = runInterval, rawClearRun = clearRun, rawRunJob = runJob, rawClearJob = clearJob

    proto.run = (cb) => new Run(cb).id
    proto.runTimeout = (cb, i) => new RunTimeout(cb, undefined, i).id
    proto.runInterval = (cb, i) => new RunInterval(cb, undefined, i).id
    proto.clearRun = (id) => { runList.get(id)?.clear() }
    proto.runJob = (gen) => new RunJob(gen).id
    proto.clearJob = (id) => { jobList.get(id)?.clear() }

    export class Run {
        constructor(fn: Fn, id = idNew++) {
            this.fn = fn
            this.id = id
            this.lastTime = Date.now()
            
            runList.set(id, this)
            events.emit('add', this)
        }

        readonly id: number
        readonly type: BedrockType.Run.Type = 'run'
        fn: Fn

        protected _suspended = false
        get suspended() { return this._suspended }
        set suspended(v) {
            if (v === this._suspended) return
            this._suspended = v

            events.emit(v ? 'suspend' : 'resume', this.id)
        }

        get isCleared() { return runList.has(this.id) }

        lastTime: number
        nextTick = 0

        protected _execUpdate() {
            this.clear()
        }

        clear() {
            if (!runList.delete(this.id)) return false

            events.emit('clear', this.id)
            return true
        }

        exec(update = false): ExecRunData {
            const sleep = Date.now() - this.lastTime
            const res = timing(this.fn)

            if (update) this._execUpdate()

            return { res, sleep }
        }
    }

    export class RunTimeout extends Run {
        constructor(fn: Fn, id?: number, timeout = 1) {
            super(fn, id)
            this.timeout = timeout
            this.nextTick = timeout + localTick
        }

        readonly type: BedrockType.Run.Type = 'timeout'

        timeout: number
    }

    export class RunInterval extends Run {
        constructor(fn: Fn, id?: number, interval = 1) {
            super(fn, id)
            this.interval = interval ||= 1
            this.nextTick = interval + localTick
        }

        readonly type: BedrockType.Run.Type = 'interval'

        interval: number

        protected _execUpdate() {
            this.lastTime = Date.now()
            this.nextTick = this.interval + localTick
        }
    }

    export class RunJob {
        constructor(gen: Generator, id = idNew++) {
            this.id = id
            this.gen = gen
            this.genNextBound = gen.next.bind(gen)
            this.lastTime = Date.now()

            jobList.set(id, this)
            events.emit('add', this)
        }

        readonly id: number
        readonly type: BedrockType.Run.Type = 'job'
        readonly gen: Generator
        readonly genNextBound: () => IteratorResult<any>

        protected _suspended = false
        get suspended() { return this._suspended }
        set suspended(v) {
            if (v === this._suspended) return
            this._suspended = v

            events.emit(v ? 'suspend' : 'resume', this.id)
        }

        get isCleared() { return jobList.has(this.id) }

        lastTime: number

        clear() {
            if (!jobList.delete(this.id)) return false

            events.emit('clear', this.id)
            return true
        }

        exec() {
            this.lastTime = Date.now()
            const res = timing(this.genNextBound)
            if (res.errored || res.value.done) {
                this.clear()
                return false
            }
            return res.delta
        }
    }

    export let idNew = 0
    export let localTick = 0

    export const runList = new Map<number, Run>()
    export const jobList = new Map<number, RunJob>()
    export const events = new TypedEventEmitter<Events>()

    export function execAll() {
        const ct = localTick++

        const runs = new Map<Run, ExecRunData>()
        for (const run of runList.values()) {
            if (run.suspended || run.nextTick > ct) continue
            runs.set(run, run.exec())
        }

        const jobs = new Map<RunJob, ExecJobData>()
        const activeJobs = new Map<RunJob, ExecJobData>()
        const t = Date.now()
        for (const run of jobList.values()) {
            if (run.suspended) continue
            const d: ExecJobData = {
                sleep: run.lastTime - t,
                delta: 0,
                count: 0,
                freeze: false
            }
            jobs.set(run, d)
            activeJobs.set(run, d)
        }

        const maxTime = Date.now() + 10
        while (activeJobs.size && Date.now() <= maxTime) {
            for (const [job, data] of activeJobs) {
                const res = job.exec()
                if (res === false) {
                    activeJobs.delete(job)
                    continue
                }
                data.delta += res
                data.count++
            }
        }

        return { runs, jobs }
    }

    export type Fn = () => void

    export interface Events {
        add: Run | RunJob
        clear: number
        suspend: number
        resume: number
    }

    export interface ExecJobData {
        sleep: number
        delta: number
        count: number
        freeze: boolean
    }

    export interface ExecRunData {
        res: TimingResult<void>
        sleep: number
    }
}

export default DebugRunOverride
