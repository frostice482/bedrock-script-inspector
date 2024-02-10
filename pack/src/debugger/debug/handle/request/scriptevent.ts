import { ScriptEventSource } from "@minecraft/server";
import DebugEventsOverride from "../../../override/events.js";
import DebugClient from "../../client.js";

const sig = DebugEventsOverride.systemAfter.events.scriptEventReceive
sig.rawSubscribe.call(sig.signal, ({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server) return
    const data = JSON.parse(message)
    
    switch (id) {
        case 'debug:connect':
            DebugClient.connect(data.address, data.username, data.password).catch(() => {})
            break
        case 'debug:disconnect':
            DebugClient.disconnect().catch(() => {})
            break
    }
}, { namespaces: ['debug'] })