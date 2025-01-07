import chalk from "chalk";
import fsp from "fs/promises";
import path from "path";
import { DeepPartialReadonly } from "@globaltypes/types.js";
import BedrockManifestJson from "#lib/manifest";
import { getManifest, versionStr } from "#lib/util";

export async function cliAddPack(dir = '.', opts?: DeepPartialReadonly<CLIAddPackOptions> | null) {
	const { copy } = opts ?? {}
	const inspectorPackDir = import.meta.dirname + '/../../../../../pack'

	const manifestStr = await fsp.readFile(dir + '/manifest.json', 'utf8').catch(() => undefined)
	if (!manifestStr) throw `manifest.json not found in ${path.resolve(dir)}`

	const backupManifestStat = await fsp.stat(dir + '/manifest_original.json').catch(() => undefined)
	if (backupManifestStat) throw `manifest_original.json already exists in ${path.resolve(dir)}`

	const manifest = JSON.parse(manifestStr) as BedrockManifestJson
	const { header: { name, uuid, version }, modules } = manifest
	const scriptModule = modules.find(v => v.type === 'script')
	if (!scriptModule) throw 'Pack is not a script module'

	console.log(name, chalk.gray(uuid), chalk.greenBright(versionStr(version)))
	console.log('Entry:', scriptModule.entry)

	console.log('Adding script entry')
	await fsp.writeFile(dir + '/scripts/_inspector_index.js', `import "_inspector_bundle.js"; import ${JSON.stringify(scriptModule.entry.substring(8))}`)

	console.log('Backing up manifest.json')
	await fsp.rename(dir + '/manifest.json', dir + '/manifest_original.json')

	console.log('Copying manifest.json')
	const inspectorManifest = await getManifest()
	Object.assign(inspectorManifest.header, {
		name: '(Inspector) ' + name,
		description: manifest.header.description,
	})
	await fsp.writeFile(dir + '/manifest.json', JSON.stringify(inspectorManifest, null, '\t'))

	console.log(copy ? 'Copying' : 'Linking')
	const subpackDir = dir + '/subpacks/inspector'

	await fsp.mkdir(dir + '/subpacks', { recursive: true })
	await fsp.rm(inspectorPackDir, { recursive: true, force: true })
	if (copy) await fsp.cp(inspectorPackDir, subpackDir, { recursive: true, force: true })
	else await fsp.symlink(inspectorPackDir, subpackDir, 'dir')

	console.log('Finished')
}

export interface CLIAddPackOptions {
	copy?: boolean
}
