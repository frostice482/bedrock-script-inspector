import { getStackTrace } from "@util.js";
import ov from "$dprop.js";
import DebugClient from "@client";

ov.world.addEventListener('set', ({ id, value }) => DebugClient.send('dp_change', { id, value, stack: getStackTrace(4) }))
ov.world.addEventListener('clear', () => DebugClient.send('dp_clear', {}))

ov.entity.addEventListener('set', ({ id, inst, value }) => DebugClient.send('dp_change', { id, value, stack: getStackTrace(4), entityId: inst.id }))
ov.entity.addEventListener('clear', (inst) => DebugClient.send('dp_clear', { entityId: inst.id }))
