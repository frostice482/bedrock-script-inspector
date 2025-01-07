import { Player } from "@minecraft/server";
import { PacketId } from "@minecraft/server-net";
import { EventsOverride } from "@override";

export const netstat = new WeakMap<Player, NetStat>()
export const anonNetStat: RecvStat = {
	recvBlacklist: new Set,
	recvs: new Map
}

EventsOverride.netBefore.events.packetReceive.addEventListener('data', ({ data }) => {
	const { sender, packetId, packetSize } = data
	let senderNetstat
	if (sender) {
		let playerNetStat = netstat.get(sender)
		if (!playerNetStat) netstat.set(sender, playerNetStat = createNetStat())
		senderNetstat = playerNetStat
	}
	else senderNetstat = anonNetStat

	if (senderNetstat.recvBlacklist.has(packetId)) data.cancel = true

	let recv = senderNetstat.recvs.get(packetId)
	if (!recv) senderNetstat.recvs.set(packetId, recv = {
		count: 0,
		size: 0,
		blocked: 0,
		blockedSize: 0
	})

	recv.count++
	recv.size += packetSize
	if (data.cancel) {
		recv.blocked++
		recv.blockedSize += packetSize
	}
})

EventsOverride.netBefore.events.packetSend.addEventListener('data', ({ data }) => {
	const { recipients, packetId } = data
	if (recipients.every(recp => netstat.get(recp)?.sendBlacklist.has(packetId))) data.cancel = true

	for (const recipient of recipients) {
		let playerNetStat = netstat.get(recipient)
		if (!playerNetStat) netstat.set(recipient, playerNetStat = createNetStat())

		let recv = playerNetStat.sends.get(packetId)
		if (!recv) playerNetStat.sends.set(packetId, recv = {
			count: 0,
			blocked: 0
		})

		recv.count++
		if (data.cancel) recv.blocked++
	}
})

function createNetStat(): NetStat {
	return {
		recvBlacklist: new Set,
		recvs: new Map,
		sendBlacklist: new Set,
		sends: new Map
	}
}

export interface RecvStat {
	recvBlacklist: Set<PacketId>
	recvs: Map<PacketId, RecvPacketStat>
}

export interface RecvPacketStat {
	count: number
	size: number
	blocked: number
	blockedSize: number
}

export interface SendStat {
	sendBlacklist: Set<PacketId>
	sends: Map<PacketId, SendPacketStat>
}

export interface SendPacketStat {
	count: number
	blocked: number
}

export interface NetStat extends RecvStat, SendStat {}
