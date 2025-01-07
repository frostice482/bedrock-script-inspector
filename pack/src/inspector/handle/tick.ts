import InspectorClient from "@client"
import { system, world } from "@minecraft/server"
import { RunOverride } from "@override"
import BedrockType from "@type/bedrock"
import { netstat } from "./packet"
import { collectRuntimeStats } from "@minecraft/debug-utilities"

let lt = Date.now()
let runPrev: BedrockType.Tick.TickRun = { delta: 0, runs: [], jobs: [] }

RunOverride.rawRunInterval.call(system, () => {
	const ct = Date.now(), dt = ct - lt
	lt = ct

	const t0 = Date.now()
	const { jobs, runs } = RunOverride.execAll()
	const delta = Date.now() - t0

	const packets: BedrockType.Tick.PlayerPacket[] = []
	for (const player of world.getPlayers()) {
		const playerNetStat = netstat.get(player)
		if (!playerNetStat) continue

		packets.push({
			id: player.id,
			name: player.name,
			recv: Array.from(playerNetStat.recvs, ([k, v]) => ({
				type: k,
				count: v.count,
				blocked: v.blocked,
				totalBlockedSize: v.blocked,
				totalSize: v.size
			})),
			sends: Array.from(playerNetStat.sends, ([k, v]) => ({
				type: k,
				count: v.count,
				blocked: v.blocked,
			}))
		})

		playerNetStat.recvs.clear()
		playerNetStat.sends.clear()
	}

	InspectorClient.send('tick', {
		tick: system.currentTick,
		time: Date.now(),
		delta: dt,

		run: runPrev,
		packets: packets,

		runtimeStats: collectRuntimeStats()
	}, true)

	runPrev = { delta, jobs, runs }
})