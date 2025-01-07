import InspectorClient from "@client"
import { world } from "@minecraft/server"
import { DynamicPropertyOverride } from "@override"
import BedrockType from "@type/bedrock"
import ClientType from "@type/client"
import { Typeof } from "@type/types"
import clientRequests from "./request"

const ow = world.getDimension('overworld')

clientRequests.addEventListener('dpList', ({ id }) => {
	InspectorClient.resolve<'dpList'>(id, {
		world: {
			properties: world.getDynamicPropertyIds().length,
			bytes: world.getDynamicPropertyTotalByteCount()
		},
		entity: ow.getEntities().map(v => ({
			id: v.id,
			nametag: v.nameTag,
			type: v.typeId,
			properties: v.getDynamicPropertyIds().length,
			bytes: v.getDynamicPropertyTotalByteCount(),
		}))
	})
})

clientRequests.addEventListener('dpOf', ({ id, data }) => {
	const { filter = {}, nameFilter, entityId, limit = 200 } = data

	let ref: DynamicPropertyOverride.Host = world
	if (entityId && entityId !== 'world') {
		const x = world.getEntity(entityId)
		if (!x) return InspectorClient.resolve<'dpOf'>(id, null)
		ref = x
	}

	const fix = nameFilter ? fi(nameFilter) : []
	const list: BedrockType.ClientResponse.BedrockPropertyPair[] = []
	for (const id of ref.getDynamicPropertyIds()) {
		// name filter
		if (!fix.every(fi => {
			const b = fi.type === '==' ? id === fi.value : id[fi.type](fi.value)
			return fi.not ? !b : b
		})) continue

		// value filter
		const v = ref.getDynamicProperty(id)
		if (!v || !(filter[typeFilter[typeof v] ?? 'string'] ?? true)) continue

		// push & break if overlength
		if (list.push({ name: id, value: v }) >= limit) break
	}

	InspectorClient.resolve<'dpOf'>(id, list)
})

InspectorClient.message.addEventListener('dp_set', ({ entityId, id, value }) => {
	let ref: DynamicPropertyOverride.Host = world

	if (entityId && entityId !== 'world') {
		const x = world.getEntity(entityId)
		if (!x) return
		ref = x
	}

	ref.setDynamicProperty(id, value)
})

const typeFilter: Partial<Record<Typeof, ClientType.Request.DynamicPropertiesFilters>> = {
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	object: 'vector'
}

function fi(filter: string): Filter[] {
	return Array.from(
		filter.matchAll(/(!?)([*^$]?)(\w+)/g),
		([, not, type, value = '']) => ({
			value,
			type: type === '*' ? 'includes'
				: type === '^' ? 'startsWith'
				: type === '$' ? 'endsWith'
				: '==',
			not: Boolean(not)
		})
	)
}

interface Filter {
	value: string
	type: 'startsWith' | 'endsWith' | 'includes' | '=='
	not: boolean
}