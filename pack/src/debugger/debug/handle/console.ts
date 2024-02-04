import BedrockType from "../../../../../globaltypes/bedrock.js";
import jsonInspect from "../../lib/jsoninspect.js";
import { getStackTrace } from "../../lib/util.js";
import debugConsoleOverride from "../../override/console.js";
import debugClient from "../client.js";

function emitter(level: BedrockType.Console.LogLevel) {
    return (data: any[]) => {
        debugClient.send('console', {
            data: data.map(v => typeof v === 'string' ? v : jsonInspect.inspect(v)),
            stack: getStackTrace(4),
            level: level
        })
    }
}

debugConsoleOverride.addEventListener('log', emitter('log'))
debugConsoleOverride.addEventListener('info', emitter('info'))
debugConsoleOverride.addEventListener('warn', emitter('warn'))
debugConsoleOverride.addEventListener('error', emitter('error'))