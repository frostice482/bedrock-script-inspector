import { now } from "@/util"
import InspectorClient from "@client"
import { system } from "@minecraft/server"
import { RunOverride } from "@override"
import BedrockType from "@type/bedrock"

let lt = now()
let runPrev: BedrockType.Tick.TickRun = { delta: 0, runs: [], jobs: [] }

RunOverride.rawRunInterval.call(system, () => {
	const ct = now(), dt = ct - lt
	lt = ct

	InspectorClient.send('tick', {
		tick: system.currentTick,
		time: now(),
		delta: dt,
		run: runPrev
	}, true)

	const t0 = now()
	const { jobs, runs } = RunOverride.execAll()
	const delta = now() - t0

	runPrev = { delta, jobs, runs }
})