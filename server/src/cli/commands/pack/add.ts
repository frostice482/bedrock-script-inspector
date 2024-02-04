import chalk = require("chalk");
import fsp = require("fs/promises");
import semver = require("semver");
import { DeepPartialReadonly } from "../../../../../globaltypes/types.js";
import { debugManifest } from "../../../debug_manifest.js";
import { resolveDirManifest } from "../../../bedrock-pack/resolve_dir.js";

function versionStr(v: string | number[]) {
    return typeof v === 'string' ? v : v.join('.')
}

export async function cliAddPack(dir: string, opts?: DeepPartialReadonly<CLIAddPackOptions> | null) {
    const { copy } = opts ?? {}

    // get pack
    const pack = await resolveDirManifest(dir, { stopAfterFound: true })
    if (!pack) throw 'Manifest not found'

    console.log(pack.name, chalk.gray(pack.uuid), chalk.greenBright(versionStr(pack.version)))

    // script module
    const scriptModule = pack.manifest.modules.get('script')
    if (!scriptModule) throw 'Pack is not a script module'

    // validate
    for (const dependency of pack.manifest.dependencies.modules()) {
        const { module_name: module, version: versionRaw } = dependency

        // pack requires the module while inspector does not
        const debDependency = debugManifest.dependencies.get(module)
        if (!debDependency) throw `Version validation failed: Module ${module} v${versionRaw} is required while not used by the inspector`

        const version = versionStr(versionRaw), debVersion = versionStr(debDependency.version)

        if (version.includes('beta')) {
            // pack uses beta version while inspector does not
            if (!debVersion.includes('beta'))
                throw `Version validation failed: Pack requires module ${module} v${versionRaw} while inspector does not use beta version`

            // both uses beta version but version is different
            else if (version !== debVersion)
                throw `Version validation failed: Pack requires module ${module} v${versionRaw} while inspector uses different beta version v${debVersion}`
        }
        
        // pack uses higher version
        else if (semver.compare(version, debVersion) === 1)
            throw `Version validation failed: Pack requires module ${module} v${versionRaw} while inspector uses older version v${debVersion}`
    }

    // copy
    console.log(copy ? 'Copying' : 'Linking')

    const copyTarget = __dirname + '/../../../../../pack/subpacks/subpack'
    await fsp.rm(copyTarget, { force: true })
    await pack.copyTo(copyTarget, copy ? 'copy' : 'symlink')

    // dropper
    const fileEntry = scriptModule.entry.substring(8).replace(/\\/g, '/')
    console.log('Adding file entry', fileEntry)
    await fsp.writeFile(__dirname + '/../../../../../pack/scripts/debugger/dropper.js', `import "${fileEntry}"`)

    console.log('Finished')
}

export interface CLIAddPackOptions {
    copy?: boolean
}
