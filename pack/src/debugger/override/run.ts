import { System } from "@minecraft/server"
import BedrockType from "@globaltypes/bedrock.js"
import timing, { TimingResult } from "@timing.js"
import TypedEventEmitter from "@typedevm.js"
import jsonInspect from "@jsoninspect.js"

const { now } = Date

namespace DebugRunOverride {
    const proto = System.prototype
    const { run, runTimeout, runInterval, clearRun, runJob, clearJob } = proto
    export const rawRun = run, rawRunTimeout = runTimeout, rawRunInterval = runInterval, rawClearRun = clearRun, rawRunJob = runJob, rawClearJob = clearJob

    proto.run = (cb) => {
        const r = new Run(cb)
        events.emit('add', r)
        return r.id
    }
    proto.runTimeout = (cb, i) => {
        const r = new RunTimeout(cb, undefined, i)
        events.emit('add', r)
        return r.id
    }
    proto.runInterval = (cb, i) => {
        const r = new RunInterval(cb, undefined, i)
        events.emit('add', r)
        return r.id
    }
    proto.clearRun = (id) => { runList.get(id)?.clear() }
    proto.runJob = (gen) => {
        const r = new RunJob(gen)
        events.emit('addJob', r)
        return r.id
    }
    proto.clearJob = (id) => { jobList.get(id)?.clear() }

    export class Run {
        constructor(fn: Fn, id = idNew++) {
            this.fn = fn
            this.id = id
            this.lastTime = now()
            
            runList.set(id, this)
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
        interval = 0

        protected _execUpdate() {
            this.clear()
        }

        clear() {
            if (!runList.delete(this.id)) return false

            events.emit('clear', this.id)
            return true
        }

        exec(update = true): ExecRunData {
            const sleep = now() - this.lastTime
            const res = timing(this.fn)

            if (update) this._execUpdate()

            return { res, sleep }
        }
    }

    export class RunTimeout extends Run {
        constructor(fn: Fn, id?: number, timeout = 1) {
            super(fn, id)
            this.interval = timeout
            this.nextTick = timeout + localTick
        }

        readonly type: BedrockType.Run.Type = 'timeout'
    }

    export class RunInterval extends Run {
        constructor(fn: Fn, id?: number, interval = 1) {
            super(fn, id)
            this.interval = interval ||= 1
            this.nextTick = interval + localTick
        }

        readonly type: BedrockType.Run.Type = 'interval'

        protected _execUpdate() {
            this.lastTime = now()
            this.nextTick = this.interval + localTick
        }
    }

    export class RunJob {
        constructor(gen: Generator, id = idNew++) {
            this.id = id
            this.gen = gen
            this.genNextBound = gen.next.bind(gen)
            this.lastTime = now()

            jobList.set(id, this)
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

        clear(error?: any) {
            if (!jobList.delete(this.id)) return false

            this.gen.return(null)
            events.emit('clearJob', { id: this.id, error })
            return true
        }

        exec() {
            this.lastTime = now()
            const res = timing(this.genNextBound)
            if (res.errored) return (this.clear(res.value), false)
            if (res.value.done) return (this.clear(), false)
            return res.delta
        }
    }

    export let idNew = 1
    export let localTick = 1
    export let jobTimeframe = 10

    export const runList = new Map<number, Run>()
    export const jobList = new Map<number, RunJob>()
    export const events = new TypedEventEmitter<Events>()

    export function execAll() {
        const ct = ++localTick

        const runs: BedrockType.Tick.RunData[] = []
        for (const run of runList.values()) {
            if (run.suspended || run.nextTick > ct) continue
            const { res: { delta, errored, value }, sleep } = run.exec()
            runs.push({
                id: run.id,
                sleep,
                delta,
                error: errored ? jsonInspect.inspect(value) : undefined
            })
        }

        const jobs: BedrockType.Tick.JobRunData[] = []
        const activeJobs = new Map<RunJob, BedrockType.Tick.JobRunData>()
        const t = now()
        for (const run of jobList.values()) {
            if (run.suspended) continue
            const d: BedrockType.Tick.JobRunData = {
                sleep: t - run.lastTime,
                delta: 0,
                count: 0,
                id: run.id
            }
            jobs.push(d)
            activeJobs.set(run, d)
        }

        const maxTime = now() + jobTimeframe
        while (activeJobs.size && now() <= maxTime) {
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
        add: Run
        addJob: RunJob
        clear: number
        clearJob: {
            id: number
            error?: any
        }
        suspend: number
        resume: number
    }

    export interface ExecRunData {
        res: TimingResult<void>
        sleep: number
    }
}

export default DebugRunOverride
