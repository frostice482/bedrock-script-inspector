import { BlockComponentRegistry, BlockCustomComponent, ItemComponentRegistry, ItemCustomComponent } from "@minecraft/server";

const { registerCustomComponent: itemRegister } = ItemComponentRegistry.prototype
const { registerCustomComponent: blockRegister } = BlockComponentRegistry.prototype

ItemComponentRegistry.prototype.registerCustomComponent = function(name, opts) {
	itemRegister.call(this, name, createFuncProxy(opts))
	PropertyRegistryOverride.items.set(name, opts)
}

BlockComponentRegistry.prototype.registerCustomComponent = function(name, opts) {
	blockRegister.call(this, name, createFuncProxy(opts))
	PropertyRegistryOverride.blocks.set(name, opts)
}

function createFuncProxy(target: any) {
	return new Proxy({}, {
		get(t, p) {
			return (arg: unknown) => target[p]?.(arg)
		}
	})
}

namespace PropertyRegistryOverride {
	export const items = new Map<string, ItemCustomComponent>()
	export const blocks = new Map<string, BlockCustomComponent>()
}
export default PropertyRegistryOverride
