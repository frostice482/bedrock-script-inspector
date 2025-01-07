import chalk from "chalk";
import fsp from "fs/promises";
import path from "path";
import { DeepPartialReadonly } from "@globaltypes/types.js";
import { getManifest, getLevelname, versionStr } from "#lib/util";

export async function cliAddBds(packDir: string, dir = '.', opts?: DeepPartialReadonly<CliAddBDSOptions>) {
	let { copy, level } = opts ?? {}

	// autodetermine from server.properties
	level ??= await getLevelname(dir)
	// add to world
	console.log('Adding to behavior packs list')
	const worldBehaviorPacksPath = path.join(dir, 'worlds', level, 'world_behavior_packs.json')

	const { header: { name, uuid, version }, modules } = await getManifest(packDir)
	const scriptModule = modules.find(v => v.type === 'script')
	if (!scriptModule) throw 'Cannot get script module'

	console.log(name, chalk.gray(uuid), chalk.greenBright(versionStr(version)))

	// read world_behavior_packs and filter
	const packs = await fsp.readFile(worldBehaviorPacksPath)
		.then<WorldBehaviorPack[], WorldBehaviorPack[]>(v => JSON.parse(String(v)), () => [] )
		.then(v => v.filter( ({pack_id}) => pack_id !== uuid) )
	// add pack
	packs.push({ pack_id: uuid, version: version })

	// write back
	await fsp.writeFile(worldBehaviorPacksPath, JSON.stringify(packs))

	// add to dev packs
	console.log(copy ? 'Copying' : 'Linking')
	const packTarget = path.join(dir, 'development_behavior_packs', uuid)
	await fsp.rm(packTarget, { recursive: true, force: true })
	if (copy) await fsp.cp(packDir, packTarget, { recursive: true })
	else await fsp.symlink(packDir, packTarget, 'dir')

	// add pack config
	// write permissions
	console.log('Creating config')
	const debugConfig = path.join(dir, 'config', scriptModule.uuid)

	await fsp.mkdir(debugConfig, { recursive: true })
	await fsp.writeFile(debugConfig + '/permissions.json', JSON.stringify({
		allowed_modules: [
			"@minecraft/server-gametest",
			"@minecraft/server",
			"@minecraft/server-ui",
			"@minecraft/server-admin",
			"@minecraft/server-editor",
			"@minecraft/server-net",
			"@minecraft/debug-utilities"
		]
	}))

	console.log('Add finished')
}

export interface CliAddBDSOptions {
	copy?: boolean
	level?: string
}
