import { getStackTrace } from "../../lib/util.js";
import ov from "../../override/dprop.js";
import debugClient from "../client.js";

ov.world.addEventListener('set', ({ id, value }) => debugClient.send('dp_change', { id, value, stack: getStackTrace(4) }))
ov.world.addEventListener('clear', () => debugClient.send('dp_clear', {}))

ov.entity.addEventListener('set', ({ id, inst, value }) => debugClient.send('dp_change', { id, value, stack: getStackTrace(4), entityId: inst.id }))
ov.entity.addEventListener('clear', (inst) => debugClient.send('dp_clear', { entityId: inst.id }))
