import jsonInspect from "@/jsoninspect"
import { getStackTrace } from "@/util"
import InspectorClient from "@client"
import { ConsoleOverride } from "@override"
import BedrockType from "@type/bedrock"

function emitter(level: BedrockType.Console.LogLevel) {
	return (data: unknown[]) => {
		InspectorClient.send('console', {
			data: data.map(v => typeof v === 'string' ? v : jsonInspect.inspect(v)),
			stack: getStackTrace(4),
			level: level
		})
	}
}

ConsoleOverride.events.addEventListener('log', emitter('log'))
ConsoleOverride.events.addEventListener('info', emitter('info'))
ConsoleOverride.events.addEventListener('warn', emitter('warn'))
ConsoleOverride.events.addEventListener('error', emitter('error'))