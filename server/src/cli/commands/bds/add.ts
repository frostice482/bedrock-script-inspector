import fsp = require("fs/promises");
import path = require("path");
import { DeepPartialReadonly } from "@globaltypes/types.js";
import { debugPack, debugManifestScriptModule } from "#debug_manifest.js";

const levelnameRegex = /^level-name=(.*)$/m

export async function cliAddBds(dir: string, level?: string, opts?: DeepPartialReadonly<CliAddBDSOptions>) {
    const { copy } = opts ?? {}

    // autodetermine from server.properties
    if (!level) {
        // read server.properties
        const props = await fsp.readFile(dir + '/server.properties').then(
            String,
            () => Promise.reject('server.properties not detected. Please specify <dir> or cwd where BDS is located')
        )
        // determine
        level = props.match(levelnameRegex)?.[1]
        if (!level) throw 'Cannot determine level-name from server.properties'
    }

    // add to world
    console.log('Adding to behavior packs list')
    const worldBehaviorPacksPath = path.join(dir, 'worlds', level, 'world_behavior_packs.json')

    // read world_behavior_packs and filter
    const packs = await fsp.readFile(worldBehaviorPacksPath)
        .then<WorldBehaviorPack[], WorldBehaviorPack[]>(v => JSON.parse(String(v)), () => [] )
        .then(v => v.filter( ({pack_id}) => pack_id !== debugPack.manifest.uuid) )

    // add pack
    packs.push({
        pack_id: debugPack.manifest.uuid,
        version: debugPack.manifest.version
    })

    // write back
    await fsp.writeFile(worldBehaviorPacksPath, JSON.stringify(packs))

    // add to dev packs
    console.log(copy ? 'Copying' : 'Linking')
    await debugPack.copyTo(path.join(dir, 'development_behavior_packs', debugPack.manifest.uuid), copy ? 'copy' : 'symlink').catch(() => {})
    
    // add pack config
    // write permissions
    console.log('Creating config')
    const debugConfig = path.join(dir, 'config', debugManifestScriptModule.uuid)

    await fsp.mkdir(debugConfig, { recursive: true })
    await fsp.writeFile(debugConfig + '/permissions.json', JSON.stringify({
        allowed_modules: [
            "@minecraft/server-gametest",
            "@minecraft/server",
            "@minecraft/server-ui",
            "@minecraft/server-admin",
            "@minecraft/server-editor",
            "@minecraft/server-net"
        ]
    }))

    console.log('Add finished')
}

export interface CliAddBDSOptions {
    copy?: boolean
}
