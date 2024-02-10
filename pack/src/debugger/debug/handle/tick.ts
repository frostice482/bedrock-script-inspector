import { system } from "@minecraft/server";
import DebugRunOverride from "../../override/run.js";
import DebugClient from "../client.js";
import BedrockType from "../../../../../globaltypes/bedrock.js";

let lt = Date.now()
let runPrev: BedrockType.Tick.TickRun = { delta: 0, runs: [], jobs: [] }

DebugRunOverride.rawRunInterval.call(system, () => {
    const ct = Date.now(), dt = ct - lt
    lt = ct

    DebugClient.send('tick', {
        tick: system.currentTick,
        time: Date.now(),
        delta: dt,
        run: runPrev
    }, true)

    const t0 = Date.now()
    const { jobs, runs } = DebugRunOverride.execAll()
    const delta = Date.now() - t0

    runPrev = { delta, jobs, runs }
})