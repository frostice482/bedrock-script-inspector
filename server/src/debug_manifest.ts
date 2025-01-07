import fs from "fs";
import path from "path";
import BedrockManifest from "./bedrock-pack/manifest.js";
import BedrockPack from "./bedrock-pack/pack.js";

const debugManifestDir = path.join(import.meta.dirname, '..', '..', 'pack')

export const debugManifest = new BedrockManifest(JSON.parse(fs.readFileSync(debugManifestDir + '/manifest.json').toString()))
export const debugManifestScriptModule = debugManifest.modules.get('script')!
export const debugPack = new BedrockPack(debugManifestDir, debugManifest)