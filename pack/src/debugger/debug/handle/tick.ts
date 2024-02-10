import { system } from "@minecraft/server";
import debugRunOverride from "../../override/run.js";
import DebugClient from "../client.js";
import BedrockType from "../../../../../globaltypes/bedrock.js";
import jsonInspect from "../../lib/jsoninspect.js";

let lt = Date.now()
let runPrev: BedrockType.Tick.TickRun = {
    list: [],
    delta: 0
}

debugRunOverride.rawRunInterval.call(system, () => {
    const ct = Date.now(), dt = ct - lt
    lt = ct

    DebugClient.send('tick', {
        tick: system.currentTick,
        time: Date.now(),
        delta: dt,
        run: runPrev
    }, true)

    const runt0 = Date.now()
    const run: BedrockType.Run.RunData[] = Array.from(
        debugRunOverride.execAll(),
        ({ exec: { res, interval }, id }) => ({
            id,
            interval,
            delta: res.time,
            error: res.errored ? jsonInspect.inspect(res.error) : undefined
        })
    )
    const runtd = Date.now() - runt0

    runPrev = {
        delta: runtd,
        list: run
    }
})