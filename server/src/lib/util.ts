import BedrockManifestJson from "./manifest";
import fsp from "fs/promises"

export function versionStr(v: string | number[]) {
	return typeof v === 'string' ? v : v.join('.')
}

export async function getManifest(dir = import.meta.dirname + '/../../../pack') {
	const manifest = await fsp.readFile(dir + '/manifest.json', 'utf8');
	return JSON.parse(manifest) as BedrockManifestJson;
}

export async function getLevelname(dir = '.') {
	// read server.properties
	const props = await fsp.readFile(dir + '/server.properties').then(
		String,
		() => Promise.reject('server.properties not detected. Please specify <dir> or cwd where BDS is located')
	)

	// determine
	const level = props.match(/^level-name=(.*)$/m)?.[1]
	if (!level) throw 'Cannot determine level-name from server.properties'
	return level
}