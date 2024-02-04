import { ScriptEventSource } from "@minecraft/server";
import debugEventsOverride from "../../../override/events.js";
import debugClient from "../../client.js";

const sig = debugEventsOverride.systemAfter.events.scriptEventReceive
sig.rawSubscribe.call(sig.signal, ({ id, message, sourceType }) => {
    if (sourceType !== ScriptEventSource.Server) return
    const data = JSON.parse(message)
    
    switch (id) {
        case 'debug:connect':
            debugClient.connect(data.address, data.username, data.password).catch(() => {})
            break
        case 'debug:disconnect':
            debugClient.disconnect().catch(() => {})
            break
    }
}, { namespaces: ['debug'] })