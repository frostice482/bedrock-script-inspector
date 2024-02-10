import { system } from "@minecraft/server";
import DebugRunOverride from "../../override/run.js";
import DebugClient from "../client.js";
import BedrockType from "../../../../../globaltypes/bedrock.js";
import jsonInspect from "../../lib/jsoninspect.js";

let lt = Date.now()
let runPrev: BedrockType.Tick.TickRun = {
    list: [],
    jobs: [],
    delta: 0
}

DebugRunOverride.rawRunInterval.call(system, () => {
    const ct = Date.now(), dt = ct - lt
    lt = ct

    DebugClient.send('tick', {
        tick: system.currentTick,
        time: Date.now(),
        delta: dt,
        run: runPrev
    }, true)

    const runt0 = Date.now()
    const { jobs, runs } = DebugRunOverride.execAll()
    const runtd = Date.now() - runt0

    runPrev = {
        delta: runtd,
        list: Array.from(runs, ([run, { sleep, res: { delta, errored, value } }]) => ({
            delta,
            sleep,
            id: run.id,
            error: errored ? jsonInspect.inspect(value) : undefined
        })),
        jobs: Array.from(jobs, ([job, data]) => ({
            id: job.id,
            count: data.count,
            delta: data.delta,
            sleep: data.sleep
        }))
    }
})