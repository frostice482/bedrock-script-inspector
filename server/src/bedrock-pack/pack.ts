import fsp = require('fs/promises')
import path = require('path')
import BedrockManifest from "./manifest.js"
import BedrockManifestJson from "./types/manifest_json.js"

export class BedrockPack {
    static async fromFile(filePath: string) {
        const manifest = await BedrockManifest.fromFile(filePath)
        return new this(path.dirname(filePath), manifest)
    }

    constructor(dir: string, manifest: BedrockManifest | string | BedrockManifestJson.T | BedrockManifestJson.Header) {
        this.dir = dir
        this.manifest = manifest instanceof BedrockManifest ? manifest : new BedrockManifest(manifest)
    }

    dir: string
    manifest: BedrockManifest

    get name() { return this.manifest.name }
    get uuid() { return this.manifest.uuid }
    get version() { return this.manifest.version }

    async copyTo(path: string, copyType: CopyType = 'copy') {
        switch (copyType) {
            case 'copy': 
                await fsp.cp(this.dir, path, { recursive: true })
                break

            case 'symlink': 
                await fsp.symlink(this.dir, path)
                break
        }

        return new BedrockPack(path, this.manifest)
    }
}

export default BedrockPack

type CopyType = 'copy' | 'symlink' | 'none'
