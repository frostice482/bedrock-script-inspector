import fsp from "fs/promises";

export async function cliAddPack() {
	// remove
	console.log('Removing pack')
	await fsp.rm(import.meta.dirname + '/../../../../../pack/subpacks/subpack', { force: true, recursive: true })

	// remove entry
	console.log('Removing entry file')
	await fsp.writeFile(import.meta.dirname + '/../../../../../pack/scripts/debugger/dropper.js', '//')

	console.log('Finished')
}

export {}
