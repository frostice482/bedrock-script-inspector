import BedrockType from "../../../../../globaltypes/bedrock.js";
import jsonInspect from "../../lib/jsoninspect.js";
import { getTraceData } from "../../lib/util.js";
import DebugEventsOverride, { EventsOverride } from "../../override/events.js";
import DebugClient from "../client.js";

const { now } = Date

function eventEmitter(event: EventsOverride<any>, category: BedrockType.Events.Category, type: BedrockType.Events.Type) {
    event.addEventListener('subscribe', ({ name, fid, listener }) =>
        DebugClient.send('event_listener_subscribe', getTraceData({ type, category, name, fid, fn: jsonInspect.fn(listener as Function) }, 8))
    )
    event.addEventListener('unsubscribe', ({ name, fid }) =>
        DebugClient.send('event_listener_unsubscribe', getTraceData({ type, category, name, fid }, 8))
    )
    event.addEventListener('disable', ({ name, fid }) =>
        DebugClient.send('event_listener_disable', { type, category, name, fid })
    )
    event.addEventListener('enable', ({ name, fid }) =>
        DebugClient.send('event_listener_enable', { type, category, name, fid })
    )

    event.addEventListener('data', ({ name, data, list, delta }) => {
        if (name === 'playerGameModeChange') return

        const inst0 = now()
        const insData = jsonInspect.inspect(data)
        const instd = now() - inst0

        DebugClient.send('event', {
            type, category, name,
            data: insData,
            delta: instd + delta,
            functions: list
        })
    })
}

eventEmitter(DebugEventsOverride.worldBefore, 'world', 'before')
eventEmitter(DebugEventsOverride.worldAfter, 'world', 'after')
eventEmitter(DebugEventsOverride.systemBefore, 'system', 'before')
eventEmitter(DebugEventsOverride.systemAfter, 'system', 'after')

DebugClient.message.addEventListener('event_action', ({ action, id: { category, fid, name, type } }) => {
    const eo: EventsOverride<any> = category === 'world'
        ? type === 'before'
            ? DebugEventsOverride.worldBefore
            : DebugEventsOverride.worldAfter
        : type === 'before'
            ? DebugEventsOverride.systemBefore
            : DebugEventsOverride.systemAfter
 
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
