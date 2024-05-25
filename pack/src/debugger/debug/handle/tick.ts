import DebugClient from "@client"
import BedrockType from "@globaltypes/bedrock.js"
import { system } from "@minecraft/server"
import DebugRunOverride from "$run.js"

const { now } = Date

let lt = now()
let runPrev: BedrockType.Tick.TickRun = { delta: 0, runs: [], jobs: [] }

DebugRunOverride.rawRunInterval.call(system, () => {
    const ct = now(), dt = ct - lt
    lt = ct

    DebugClient.send('tick', {
        tick: system.currentTick,
        time: now(),
        delta: dt,
        run: runPrev
    }, true)

    const t0 = now()
    const { jobs, runs } = DebugRunOverride.execAll()
    const delta = now() - t0

    runPrev = { delta, jobs, runs }
})