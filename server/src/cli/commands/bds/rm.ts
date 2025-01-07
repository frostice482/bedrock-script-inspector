import { getLevelname } from "#lib/util";
import fsp from "fs/promises";
import path from "path";

const packUuidKnown = '55fce836-92df-4d34-8ae6-1c93576db01b'
const sUuidKnown = '9e2c6491-2920-4af2-b0e3-10ab9a87c5cb'

export async function cliRmBds(dir = '.', opts?: CLIRemoveBDSOptions) {
	let { level, puuid = packUuidKnown, suuid = sUuidKnown } = opts ?? {}

	// autodetermine from server.properties
	level ??= await getLevelname(dir)

	console.log('Removing from behavior packs list')
	const worldBehaviorPacksPath = path.join(dir, 'worlds', level, 'world_behavior_packs.json')

	// read world_behavior_packs and filter
	const packs = await fsp.readFile(worldBehaviorPacksPath)
		.then<WorldBehaviorPack[], WorldBehaviorPack[]>(v => JSON.parse(String(v)), () => [] )
		.then(v => v.filter( ({pack_id}) => pack_id !== puuid) )

	// write back
	await fsp.writeFile(worldBehaviorPacksPath, JSON.stringify(packs))

	// remove from dev packs
	console.log('Removing')
	await fsp.rm(path.join(dir, 'development_behavior_packs', puuid), { force: true, recursive: true })

	// remove pack config
	console.log('Deleting config')
	await fsp.rm(path.join(dir, 'config', suuid), { force: true, recursive: true })

	console.log('Remove finished')
}

export interface CLIRemoveBDSOptions {
	level?: string
	puuid?: string
	suuid?: string
}
