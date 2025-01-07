import jsonInspect from "@/jsoninspect"
import { getTraceData, now } from "@/util"
import InspectorClient from "@client"
import { EventsOverride } from "@override"
import BedrockType from "@type/bedrock"
import { EventsOverrideWrapper } from "debugger/override/events"

function eventEmitter(event: EventsOverrideWrapper<any>, category: BedrockType.Events.Category, type: BedrockType.Events.Type) {
	event.addEventListener('subscribe', ({ name, fid, listener }) =>
		InspectorClient.send('event_listener_subscribe', getTraceData({ type, category, name, fid, fn: jsonInspect.fn(listener as Function) }, 8))
	)
	event.addEventListener('unsubscribe', ({ name, fid }) =>
		InspectorClient.send('event_listener_unsubscribe', getTraceData({ type, category, name, fid }, 8))
	)
	event.addEventListener('disable', ({ name, fid }) =>
		InspectorClient.send('event_listener_disable', { type, category, name, fid })
	)
	event.addEventListener('enable', ({ name, fid }) =>
		InspectorClient.send('event_listener_enable', { type, category, name, fid })
	)

	const ctypeId = category + '/' + type

	event.addEventListener('data', ({ name, data, list, delta }) => {
		if (EventsOverride.ignoreInspect[ctypeId]?.has(name)) return
		if (EventsOverride.inspectNullifyData[ctypeId]?.has(name)) data = null as never

		const inst0 = now()
		const insData = jsonInspect.inspect(EventsOverride.inspectEventData && data)
		const instd = now() - inst0

		InspectorClient.send('event', {
			type, category, name,
			data: insData,
			delta: instd + delta,
			functions: list
		})
	})
}

eventEmitter(EventsOverride.worldBefore, 'world', 'before')
eventEmitter(EventsOverride.worldAfter, 'world', 'after')
eventEmitter(EventsOverride.systemBefore, 'system', 'before')
eventEmitter(EventsOverride.systemAfter, 'system', 'after')
eventEmitter(EventsOverride.netBefore, 'net', 'before')
eventEmitter(EventsOverride.netAfter, 'net', 'after')

InspectorClient.message.addEventListener('event_action', ({ action, id: { category, fid, name, type } }) => {
	const eo: EventsOverrideWrapper<any> =
		category === 'world'
			? type === 'before'
				? EventsOverride.worldBefore
				: EventsOverride.worldAfter
		: category === 'system'
			? type === 'before'
				? EventsOverride.systemBefore
				: EventsOverride.systemAfter
		:   type === 'before'
				? EventsOverride.netBefore
				: EventsOverride.netAfter

	const ev = eo.events[name]
	if (!ev) return

	switch (action) {
		case 'enable':
			ev.enableListener(fid)
			break

		case 'disable':
			ev.disableListener(fid)
			break

		case 'unsubscribe':
			ev.unsubscribe(fid)
			break
	}
})
