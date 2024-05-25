import DebugClient from "@client"
import BedrockType from "@globaltypes/bedrock.js"
import jsonInspect from "@jsoninspect.js"
import { getStackTrace } from "@util.js"
import DebugConsoleOverride from "$console.js"

function emitter(level: BedrockType.Console.LogLevel) {
    return (data: unknown[]) => {
        DebugClient.send('console', {
            data: data.map(v => typeof v === 'string' ? v : jsonInspect.inspect(v)),
            stack: getStackTrace(4),
            level: level
        })
    }
}

DebugConsoleOverride.events.addEventListener('log', emitter('log'))
DebugConsoleOverride.events.addEventListener('info', emitter('info'))
DebugConsoleOverride.events.addEventListener('warn', emitter('warn'))
DebugConsoleOverride.events.addEventListener('error', emitter('error'))