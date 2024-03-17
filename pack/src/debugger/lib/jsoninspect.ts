import JSONInspectData, { JsonInspectOptions } from "../../../../globaltypes/jsoninspect.js"
import DebugProxyOverride from "../override/proxy.js"
import { toBase64 } from "./base64.js"
import { getFunctionSource, getObjectProto } from "./util.js"

const { getOwnPropertyDescriptors, assign, getPrototypeOf } = Object

const AsyncFC = (async function() {}).constructor as Function
const GeneratorFC = (function*() {}).constructor as GeneratorFunctionConstructor
const AsyncGeneratorFC = (async function*() {}).constructor as AsyncGeneratorFunctionConstructor
const TypedArrayFC = getPrototypeOf(Uint8Array) as Uint8ArrayConstructor

export class JsonInspectInstance {
    static objectOptionsDefault: JsonInspectOptions.IObject = {
        proto: true,
        getValue: true
    }

    static functionOptionsDefault: JsonInspectOptions.IFunction = {
        content: false,
        properties: true,
        extend: true,
        proto: false
    }

    static ignoreProtoDefault = new Set<unknown>([
        Object,
        Error,
        Array, // handled
        Date,
        Map, // handled
        Set, // handled
        WeakMap,
        WeakSet,
        ArrayBuffer, // handled
        SharedArrayBuffer, // handled
        Uint8ClampedArray, // handled
        Int8Array, // handled
        Uint8Array, // handled
        Int16Array, // handled
        Uint16Array, // handled
        Int32Array, // handled
        Uint32Array, // handled
        Float32Array, // handled
        Float64Array, // handled
        DataView,
        Promise
    ].map(v => v.prototype))

    static functionProtoDefault = new Set<unknown>([
        Function,
        AsyncFC,
        GeneratorFC,
        AsyncGeneratorFC
    ].map(v => v.prototype))

    objectOptions: JsonInspectOptions.IObject = {...JsonInspectInstance.objectOptionsDefault}
    functionOptions: JsonInspectOptions.IFunction = {...JsonInspectInstance.functionOptionsDefault}
    ignoreProto = new Set(JsonInspectInstance.ignoreProtoDefault)
    functionProto = new Set(JsonInspectInstance.functionProtoDefault)

    inspect(obj: any, stack: unknown[] = [], refList?: RootRefInspector, ignoreRef = false): JSONInspectData {
        try {
            // circular
            if (stack.includes(obj)) return {
                type: 'circular',
                ref: refList?.objectRefs.get(obj)?.ref
            }

            // reference
            if (refList && !ignoreRef) {
                const { isNew, objRef } = refList.ref(obj)
                if (isNew) refList.insRefs[objRef.ref] = this.inspect(obj, stack, refList, true)
                return objRef
            }

            // primitive types
            switch (typeof obj) {
                case 'string': return { type: 'string', value: obj }
                case 'number': return { type: 'number', value: obj + '' }
                case 'boolean': return { type: 'boolean', value: obj }
                case 'symbol': return { type: 'symbol', value: obj.description ?? '' }
                case 'undefined': return { type: 'undefined' }
                case 'function': return this.fn(obj, stack, refList)
            }

            // null
            if (obj === null) return { type: 'null' }

            // proxy
            if (DebugProxyOverride.proxyList.has(obj)) return this.proxy(obj, DebugProxyOverride.proxyList.get(obj)!, stack, refList)

            // known object types
            for (const proto of getObjectProto(obj)) {
                switch (proto) {
                    case RegExp.prototype: return { type: 'regex', value: String(obj) }
                    case Error.prototype: return this.error(obj, false, stack, refList)
                    case Array.prototype: return this.array(obj, stack, refList)
                    case TypedArrayFC.prototype: return this.typedArray(obj)
                    case SharedArrayBuffer.prototype: return this.arrayBuffer(obj, true)
                    case ArrayBuffer.prototype: return this.arrayBuffer(obj, false)
                    case Set.prototype: return this.set(obj, stack, refList)
                    case Map.prototype: return this.map(obj, stack, refList)
                }
            }

            // object
            const o = this.objectBasic(obj, undefined, undefined, stack, refList) as JSONInspectData.I_Object
            o.type = 'object'
            return o
        } catch(e) {
            const err = e instanceof Error ? e : assign( Error(typeof e === 'string' ? e : JSON.stringify(e)), { stack: '' } )
            return this.error(err, true, stack, refList)
        }
    }

    inspectRoot(obj: unknown): JSONInspectData.I_RootRef {
        const refs = new RootRefInspector
        const entry = this.inspect(obj, undefined, refs)

        return {
            type: 'rootref',
            refs: refs.insRefs,
            entry
        }
    }

    objectEntries(obj: unknown, descriptors: PropertyDescriptorMap = getOwnPropertyDescriptors(obj), stack: unknown[] = [], refList?: RootRefInspector) {
        const entries: JSONInspectData.T_ObjectEntry[] = []
        const opts = this.objectOptions

        for (const k of Reflect.ownKeys(descriptors)) {
            const v = descriptors[k]
            if (!v) continue
            let {get, set, value} = v

            const keyData: JSONInspectData.I_ObjectKey = {
                key: typeof k === 'symbol' ? k.description ?? '' : k.toString(),
                isSymbol: typeof k === 'symbol',

                //configurable: v.configurable,
                //enumerable: v.enumerable,
                //writable: v.writable,

                getter: get && this.fn(get, stack, refList),
                setter: set && this.fn(set, stack, refList)
            }

            let valueData
            try {
                valueData = get
                    ? opts.getValue
                        ? this.inspect(get.call(obj), stack, refList)
                        : null
                    : this.inspect(value, stack, refList)
            } catch(e) {
                const err = e instanceof Error ? e : assign( Error(typeof e === 'string' ? e : JSON.stringify(e)), { stack: '' } )
                valueData = this.error(err, true, stack, refList)
            }

            entries.push({ key: keyData, value: valueData })
        }
        return entries
    }

    shouldProto(proto: unknown) {
        return this.objectOptions.proto && !this.ignoreProto.has(proto) ? proto ? true : null : undefined
    }

    objectBasic(obj: unknown, proto = obj, ignores?: Iterable<PropertyKey> | true, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_ObjectBasic {
        const newStack = stack.concat([proto])

        // descriptors & entries
        let descriptors: PropertyDescriptorMap
        if (ignores === true) descriptors = {}
        else {
            descriptors = getOwnPropertyDescriptors(proto)
            if (ignores) for (const k in ignores) delete descriptors[k]
        }

        const entries = this.objectEntries(obj, descriptors, newStack, refList)

        // proto
        const nextProto = getPrototypeOf(proto)
        let nextProtoInspect
        if (this.shouldProto(nextProto)) {
            if (refList) {
                const { isNew, objRef } = refList.ref(nextProto)
                if (isNew) {
                    const o = this.objectBasic(obj, nextProto, undefined, newStack, refList) as JSONInspectData.I_Object
                    o.type = 'object'
                    refList.insRefs[objRef.ref] = o
                }
                nextProtoInspect = objRef
            }
            else {
                const o = this.objectBasic(obj, nextProto, undefined, newStack, refList) as JSONInspectData.I_Object
                o.type = 'object'
                nextProtoInspect = o
            }
        }

        // name
        const tag = descriptors[Symbol.toStringTag]?.value
        const name = nextProto
            ? tag
                ? `[${nextProto.constructor.name} (${tag})]`
                : nextProto.constructor === Object
                    ? undefined
                    : nextProto.constructor.name
            : `[${tag ?? 'Object'}: null prototype]`
        
        return { properties: entries, name, proto: nextProtoInspect }
    }

    fn(obj: Function, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Function {
        const opts = this.functionOptions, newStack = stack.concat([obj])
        const descriptors = getOwnPropertyDescriptors(obj) as PropertyDescriptorMap

        // function info
        const name = descriptors.name?.value
        const source = getFunctionSource(obj)

        // function type
        const isAsync = obj instanceof AsyncFC || obj instanceof AsyncGeneratorFC
        const isGenerator = obj instanceof GeneratorFC || obj instanceof AsyncGeneratorFC
        const isClass = !(descriptors.prototype?.writable ?? true)

        // entries
        delete descriptors.name
        delete descriptors.length
        delete descriptors.arguments
        delete descriptors.caller
        if (!opts.proto) delete descriptors.prototype

        const entries = opts.properties ? this.objectEntries(obj, descriptors, newStack, refList) : []

        // extends
        const newProto = getPrototypeOf(obj)
        let fExtends
        if (opts.extend && typeof newProto === 'function' && !this.functionProto.has(newProto)) {
            if (refList) {
                const { isNew, objRef } = refList.ref(newProto)
                if (isNew) refList.insRefs[objRef.ref] = this.fn(newProto, newStack, refList)
                fExtends = objRef
            }
            else {
                fExtends = this.fn(newProto, newStack, refList)
            }
        }

        return {
            type: 'function',

            name,
            source,
            content: opts.content ? obj.toString() : undefined,

            isAsync,
            isGenerator,
            isClass,

            properties: entries,
            extends: fExtends
        }
    }
    
    proxy(obj: unknown, data: DebugProxyOverride.Data<{}>, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Proxy {
        const newStack = stack.concat([obj])
        return {
            type: 'proxy',
            object: this.inspect(data.object, newStack, refList),
            handle: this.inspect(data.handler, newStack, refList),
            revocable: data.revoke !== undefined
        }
    }

    error(obj: Error, isThrown = false, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Error {
        const newStack = stack.concat([obj])

        const descriptors = getOwnPropertyDescriptors(obj) as PropertyDescriptorMap
        delete descriptors.name
        delete descriptors.message
        delete descriptors.stack

        const entries = this.objectEntries(obj, descriptors, newStack, refList)

        return {
            type: 'error',

            name: obj.name,
            message: obj.message,
            stack: obj.stack ?? '',

            properties: entries,
            isThrow: isThrown
        }
    }

    array(obj: Array<unknown>, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Array {
        const newStack = stack.concat([obj])

        // descriptors
        const descriptors = getOwnPropertyDescriptors(obj) as unknown as PropertyDescriptorMap
        delete descriptors.length

        // values, removing element from descriptors
        const len = obj.length, values = Array<JSONInspectData>(len)
        for (let i = 0; i < len; i++) {
            delete descriptors[i]
            values[i] = this.inspect(obj[i], newStack, refList)
        }

        const { proto } = this.objectBasic(obj, undefined, true, newStack, refList)

        return {
            type: 'array',
            name: obj.constructor.name + '<' + obj.length + '>',
            
            length: len,
            values,

            properties: this.objectEntries(obj, descriptors, newStack, refList),
            proto
        }
    }

    typedArray(obj: Uint8Array): JSONInspectData.I_TypedArray {
        return assign(this.arrayBuffer(obj.buffer), {
            type: 'typedarray',
            length: obj.length,
            bytesPerElement: obj.BYTES_PER_ELEMENT
        } as const)
    }

    arrayBuffer(obj: ArrayBuffer, isShared?: boolean): JSONInspectData.I_ArrayBuffer {
        return {
            type: 'arraybuffer',
            byteLength: obj.byteLength,
            shared: isShared ?? obj instanceof SharedArrayBuffer,
            buffer: toBase64(new Uint8Array(obj))
        }
    }

    set(obj: Set<unknown>, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Set {
        const { name, properties, proto } = this.objectBasic(obj, undefined, undefined, stack, refList)
        const newStack = stack.concat([obj])

        return {
            type: 'set',

            name: name + '<' + obj.size + '>',
            length: obj.size,
            values: Array.from(Set.prototype.values.call(obj), v => this.inspect(v, newStack, refList)),

            properties,
            proto
        }
    }

    map(obj: Map<unknown, unknown>, stack: unknown[] = [], refList?: RootRefInspector): JSONInspectData.I_Map {
        const { name, properties, proto } = this.objectBasic(obj, undefined, undefined, stack, refList)
        const newStack = stack.concat([obj])

        return {
            type: 'map',

            name: name + '<' + obj.size + '>',
            length: obj.size,
            values: Array.from(Map.prototype.entries.call(obj), ([k, v]) => [this.inspect(k, newStack, refList), this.inspect(v, newStack, refList)]),

            properties,
            proto
        }
    }
}

export class RootRefInspector {
    insRefs: JSONInspectData[] = []
    objectRefs = new Map<unknown, JSONInspectData.I_Ref>()

    ref(obj: unknown) {
        const { insRefs, objectRefs } = this

        let objRef = objectRefs.get(obj)
        const isNew = !objRef
        if (!objRef) {
            const insRefIndex = insRefs.length++
            objectRefs.set(obj, objRef = {
                type: 'ref',
                ref: insRefIndex
            })
        }

        return { objRef, isNew }
    }
}

const jsonInspect = new JsonInspectInstance
export default jsonInspect
