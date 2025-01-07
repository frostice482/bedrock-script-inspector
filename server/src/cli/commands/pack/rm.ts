import fsp from "fs/promises";
import path from "path";

export async function cliRemovePack(dir = '.') {
	const orgManifestStat = await fsp.stat(dir + '/manifest_original.json').catch(() => {})
	if (!orgManifestStat) throw `manifest_original.json not found in ${path.resolve(dir)}`

	console.log('Removing script entry')
	await fsp.rm(dir + '/scripts/_inspector_index.js', { force: true })

	console.log('Removing subpacks')
	await fsp.rm(dir + '/subpacks/inspector', { force: true, recursive: true })

	console.log('Removing debug manifest.json')
	await fsp.rm(dir + '/manifest.json', { force: true })

	console.log('Restoring original manifest.json')
	await fsp.rename(dir + '/manifest_original.json', dir + '/manifest.json')

	console.log('Finished')
}
