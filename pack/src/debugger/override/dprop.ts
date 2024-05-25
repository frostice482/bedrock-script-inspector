import { World, Entity } from "@minecraft/server";
import TypedEventEmitter from "@typedevm.js";
import BedrockType from "@globaltypes/bedrock.js";

namespace DebugDynamicPropertyOverride {
    function override<T extends Host>(host: { prototype: T }) {
        const proto = host.prototype

        const { setDynamicProperty: rawSet, clearDynamicProperties: rawClear } = proto

        const ev = new Wrap<T>(rawSet, rawClear)
        
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

    export class Wrap<T extends Host> extends TypedEventEmitter<WrapEvents<T>> {
        constructor(rawSet: World['setDynamicProperty'], rawClear: World['clearDynamicProperties']) {
            super()
            this.rawClear = rawClear
            this.rawSet = rawSet
        }

        rawSet
        rawClear
    }

    export const world = override(World)
    export const entity = override(Entity)
        
    export interface WrapEvents<T extends Host> {
        set: {
            readonly inst: T
            readonly id: string
            readonly value: BedrockType.DynamicProperty.Values | undefined
        }
        clear: T
    }

    export type Host = Pick<World, 'setDynamicProperty' | 'getDynamicProperty' | 'getDynamicPropertyIds' | 'getDynamicPropertyTotalByteCount' | 'clearDynamicProperties'>
}

export default DebugDynamicPropertyOverride
