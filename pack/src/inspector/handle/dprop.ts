import { getStackTrace } from "@/util"
import InspectorClient from "@client"
import { DynamicPropertyOverride } from "@override"

DynamicPropertyOverride.world.addEventListener('set', ({ id, value }) => InspectorClient.send('dp_change', { id, value, stack: getStackTrace(4) }))
DynamicPropertyOverride.world.addEventListener('clear', () => InspectorClient.send('dp_clear', {}))

DynamicPropertyOverride.entity.addEventListener('set', ({ id, inst, value }) => InspectorClient.send('dp_change', { id, value, stack: getStackTrace(4), entityId: inst.id }))
DynamicPropertyOverride.entity.addEventListener('clear', (inst) => InspectorClient.send('dp_clear', { entityId: inst.id }))
