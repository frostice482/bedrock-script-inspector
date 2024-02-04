import crypto = require('crypto')
import fsp = require('fs/promises')
import Manifest from './types/manifest_json.js'

export class BedrockManifest {
    static async fromFile(path: string) {
        const cnt = await fsp.readFile(path)
        const strip = await import('strip-json-comments')
        return new this(JSON.parse(strip.default(cnt.toString())))
    }

    constructor(data: string | Manifest | Manifest.Header = 'No name') {
        // name
        if (typeof data === 'string') {
            this.name = data
            this.uuid = crypto.randomUUID()
            this.version = [1, 0, 0]
            this.minEngineVersion = [1, 20, 0]
            return
        }

        // header
        if ('name' in data) {
            this.name = data.name
            this.description = data.description
            this.uuid = data.uuid
            this.version = data.version
            this.minEngineVersion = data.min_engine_version
            return
        }

        // whole manifest
        const { header, modules, dependencies, capabilities, subpacks } = data

        this.name = header.name
        this.description = header.description
        this.uuid = header.uuid
        this.version = header.version
        this.minEngineVersion = header.min_engine_version

        for (const m of modules) this.modules.add(m)
        if (dependencies) for (const m of dependencies) this.dependencies.add(m)
        if (capabilities) for (const m of capabilities) this.capabilities.add(m)
        if (subpacks) for (const m of subpacks) this.subpacks.add(m)
    }

    name: string
    description?: string | undefined
    uuid: string
    version: Manifest.VersionStringOrArray
    minEngineVersion: Manifest.VersionArray

    modules = new ManifestModules
    dependencies = new ManifestDependencies
    capabilities = new Set<string>()
    subpacks = new ManifestSubpacks

    toJSON(): Manifest {
        return {
            format_version: 2,
            header: {
                name: this.name,
                description: this.description,
                uuid: this.uuid,
                version: this.version,
                min_engine_version: this.minEngineVersion
            },
            modules: this.modules.toJSON(),
            dependencies: this.dependencies.size ? this.dependencies.toJSON() : undefined,
            capabilities: this.capabilities.size ? Array.from(this.capabilities.values()) : undefined,
            subpacks: this.subpacks.size ? this.subpacks.toJSON() : undefined
        }
    }
}

export default BedrockManifest

export class ManifestModules extends Map<Manifest.ModuleTypes, Manifest.Module> {
    constructor(list?: Iterable<Manifest.Module>) {
        super()
        if (list) for (const subpack of list) this.add(subpack)
    }

    declare set: <T extends Manifest.ModuleTypes>(type: T, module: Manifest.ModuleType<T>) => this
    // @ts-ignore
    declare get: <T extends Manifest.ModuleTypes>(type: T) => Manifest.ModuleType<T> | undefined

    add(module: Manifest.Module) {
        this.set(module.type, module)
        return this
    }

    toJSON() {
        return Array.from(this.values())
    }
}

export class ManifestDependencies extends Map<string, Manifest.Dependency> {
    constructor(list?: Iterable<Manifest.Dependency>) {
        super()
        if (list) for (const subpack of list) this.add(subpack)
    }

    addUUID(uuid: string, version: Manifest.VersionStringOrArray) {
        return this.set(uuid, { uuid, version })
    }

    addModule(moduleName: string, version: Manifest.VersionStringOrArray) {
        return this.set(moduleName, { module_name: moduleName, version })
    }

    addPack(pack: BedrockManifest | Manifest | Manifest.Header) {
        if ('format_version' in pack) {
            const { uuid, version } = pack.header
            return this.set(uuid, { uuid, version })
        }
        const { uuid, version } = pack
        return this.set(uuid, { uuid, version })
    }

    add(dependency: Manifest.Dependency) {
        return this.set('uuid' in dependency ? dependency.uuid : dependency.module_name, dependency)
    }

    *modules() {
        for (const dep of this.values()) if ('module_name' in dep) yield dep
    }

    *uuids() {
        for (const dep of this.values()) if ('uuid' in dep) yield dep
    }

    toJSON() {
        return Array.from(this.values())
    }
}

export class ManifestSubpacks extends Map<string, Manifest.Subpack> {
    constructor(list?: Iterable<Manifest.Subpack>) {
        super()
        if (list) for (const subpack of list) this.add(subpack)
    }

    addFolder(folder: string, name: string, memoryTier = 1) {
        return this.set(folder, {
            name,
            folder_name: folder,
            memory_tier: memoryTier
        })
    }

    add(subpack: Manifest.Subpack) {
        return this.set(subpack.folder_name, subpack)
    }

    toJSON() {
        return Array.from(this.values())
    }
}
