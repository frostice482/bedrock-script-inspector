import fsp = require("fs/promises");

export async function cliAddPack() {
    // remove
    console.log('Removing pack')
    await fsp.rm(__dirname + '/../../../../../pack/subpacks/subpack', { force: true })

    // remove entry
    console.log('Removing entry file')
    await fsp.writeFile(__dirname + '/../../../../../pack/scripts/debugger/dropper.js', '//')

    console.log('Finished')
}

export {}
