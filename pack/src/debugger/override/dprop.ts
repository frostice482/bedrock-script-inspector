import { World, Entity } from "@minecraft/server";
import TypedEventEmitter from "../lib/typedevm.js";
import BedrockType from "../../../../globaltypes/bedrock.js";

function override<T extends DynamicPropertyHost>(host: { prototype: T }) {
    const proto = host.prototype

    const { setDynamicProperty: rawSet, clearDynamicProperties: rawClear } = proto

    const ev = new DebugDynamicPropertyOverrideInstance<T>(rawSet, rawClear)
    
    proto.setDynamicProperty = function(id, value) {
        rawSet.call(this, id, value)
        ev.emit('set', {
            inst: this,
            id,
            value
        })
    }
    
    proto.clearDynamicProperties = function() {
        rawClear.call(this)
        ev.emit('clear', this)
    }

    return ev
}

export class DebugDynamicPropertyOverrideInstance<T extends DynamicPropertyHost> extends TypedEventEmitter<DebugDynamicPropertyOverrideInstanceEvents<T>> {
    constructor(rawSet: World['setDynamicProperty'], rawClear: World['clearDynamicProperties']) {
        super()
        this.rawClear = rawClear
        this.rawSet = rawSet
    }

    rawSet
    rawClear
}

namespace DebugDynamicPropertyOverride {
    export const world = override(World)
    export const entity = override(Entity)
}

export default DebugDynamicPropertyOverride

export interface DebugDynamicPropertyOverrideInstanceEvents<T extends DynamicPropertyHost> {
    set: {
        readonly inst: T
        readonly id: string
        readonly value: BedrockType.DynamicProperty.Values | undefined
    }
    clear: T
}

export type DynamicPropertyHost = Pick<World, 'setDynamicProperty' | 'getDynamicProperty' | 'getDynamicPropertyIds' | 'getDynamicPropertyTotalByteCount' | 'clearDynamicProperties'>
