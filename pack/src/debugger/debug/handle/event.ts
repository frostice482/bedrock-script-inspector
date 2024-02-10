import BedrockType from "../../../../../globaltypes/bedrock.js";
import getFid from "../../lib/fid.js";
import jsonInspect from "../../lib/jsoninspect.js";
import { TimingResult } from "../../lib/timing.js";
import { getTraceData } from "../../lib/util.js";
import debugEventsOverride, { EventsOverride } from "../../override/events.js";
import DebugClient from "../client.js";

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
        const inst0 = Date.now()
        const insData = jsonInspect.inspect(data)
        const instd = Date.now() - inst0

        DebugClient.send('event', {
            type, category, name,
            data: insData,
            delta: instd + delta,
            functions: Array.from(
                list as Map<Function, TimingResult>,
                ([k, v]) => ({
                    delta: v.time,
                    error: v.errored ? jsonInspect.inspect(v.error) : undefined,
                    fid: getFid(k),
                    fn: jsonInspect.fn(k)
                })
            )
        })
    })
}

eventEmitter(debugEventsOverride.worldBefore, 'world', 'before')
eventEmitter(debugEventsOverride.worldAfter, 'world', 'after')
eventEmitter(debugEventsOverride.systemBefore, 'system', 'before')
eventEmitter(debugEventsOverride.systemAfter, 'system', 'after')

DebugClient.message.addEventListener('event_action', ({ action, id: { category, fid, name, type } }) => {
    const eo: EventsOverride<any> = category === 'world'
        ? type === 'before'
            ? debugEventsOverride.worldBefore
            : debugEventsOverride.worldAfter
        : type === 'before'
            ? debugEventsOverride.systemBefore
            : debugEventsOverride.systemAfter
 
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
