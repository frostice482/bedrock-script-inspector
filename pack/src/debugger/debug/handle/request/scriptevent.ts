import InspectorClient from "@client"
import { ScriptEventSource } from "@minecraft/server"
import { EventsOverride } from "@override"

EventsOverride.systemAfter.events.scriptEventReceive.rawSubscribe(({ id, message, sourceType }) => {
	if (sourceType !== ScriptEventSource.Server) return
	const data = JSON.parse(message)

	switch (id) {
		case 'debug:connect':
			InspectorClient.connect(data.address, data.username, data.password).catch(() => {})
			break
		case 'debug:disconnect':
			InspectorClient.disconnect().catch(() => {})
			break
	}
}, { namespaces: ['debug'] })