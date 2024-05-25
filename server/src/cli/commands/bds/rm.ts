import fsp = require("fs/promises");
import path = require("path");
import { debugManifest, debugManifestScriptModule, debugPack } from "#debug_manifest.js";

const levelnameRegex = /^level-name=(.*)$/m

export async function cliRmBds(dir: string, level?: string) {
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

    console.log('Removing from behavior packs list')

    const worldBehaviorPacksPath = path.join(dir, 'worlds', level, 'world_behavior_packs.json')

    // read world_behavior_packs and filter
    const packs = await fsp.readFile(worldBehaviorPacksPath)
        .then<WorldBehaviorPack[], WorldBehaviorPack[]>(v => JSON.parse(String(v)), () => [] )
        .then(v => v.filter( ({pack_id}) => pack_id !== debugManifest.uuid) )

    // write back
    await fsp.writeFile(worldBehaviorPacksPath, JSON.stringify(packs))

    // remove from dev packs
    console.log('Removing')
    await fsp.rm(path.join(dir, 'development_behavior_packs', debugPack.manifest.uuid), { force: true, recursive: true })
    
    // remove pack config
    console.log('Deleting config')
    await fsp.rm(path.join(dir, 'config', debugManifestScriptModule.uuid), { force: true, recursive: true })

    console.log('Remove finished')
}

export {}
