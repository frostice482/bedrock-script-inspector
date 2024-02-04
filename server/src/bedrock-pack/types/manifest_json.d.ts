export declare namespace BedrockManifestJson {
    interface HeaderBase {
        name: string
        uuid: string
        version: VersionStringOrArray
    }

    interface Header extends HeaderBase {
        description?: string
        min_engine_version: VersionArray
    }
    
    interface ModuleBase {
        uuid: string
        version: VersionStringOrArray
    }
    
    interface ModuleTypeMap {
        data: {}
        resources: {}
        skin_pack: {}
        script: {
            entry: string
            language?: string
        }
    }
    
    type ModuleTypes = keyof ModuleTypeMap
    type ModuleType<T extends ModuleTypes> = { type: T } & ModuleTypeMap[T] & ModuleBase
    type Module = { [T in ModuleTypes]: ModuleType<T> }[ModuleTypes]
    
    interface DependencyBase {
        version: VersionStringOrArray
    }
    
    interface ModuleDependency {
        module_name: string
    }
    
    interface UUIDDependency {
        uuid: string
    }
    
    type Dependency = DependencyBase & (ModuleDependency | UUIDDependency)
    
    interface Subpack {
        name: string
        folder_name: string
        memory_tier: number
    }
    
    type VersionArray = [number, number, number]
    type VersionStringOrArray = string | VersionArray
    
    interface T {
        format_version: number
        header: Header
        modules: Module[]
        dependencies?: Dependency[]
        subpacks?: Subpack[]
        capabilities?: string[]
    }    
}

export type BedrockManifestJson = BedrockManifestJson.T

export default BedrockManifestJson
