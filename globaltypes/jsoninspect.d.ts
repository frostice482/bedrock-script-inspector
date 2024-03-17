declare namespace JSONInspectData {
    type TypeValue<T, V> = { type: T, value: V }
    type Type<T> = { type: T }

    type All =
        | I_String
        | I_Number
        | I_Boolean
        | I_Symbol
        | I_Regex
        | I_Null
        | I_Undefined
        | I_Object
        | I_Error
        | I_Array
        | I_TypedArray
        | I_ArrayBuffer
        | I_Set
        | I_Map
        | I_Function
        | I_Proxy
        | I_Circular
        | I_RootRef
        | I_Ref

    type I_String = TypeValue<'string', string>
    type I_Number = TypeValue<'number', string>
    type I_Boolean = TypeValue<'boolean', boolean>
    type I_Symbol = TypeValue<'symbol', string>
    type I_Regex = TypeValue<'regex', string>
    type I_Null = Type<'null'>
    type I_Undefined = Type<'undefined'>

    interface I_ObjectKey {
        key: string
        isSymbol: boolean

        getter?: I_Function
        setter?: I_Function

        enumerable?: boolean
        configurable?: boolean
        writable?: boolean
    }

    type T_ObjectEntry = { key: I_ObjectKey, value: All | null }

    interface I_ObjectBasic {
        properties?: T_ObjectEntry[]
        name?: string
        proto?: I_Object | I_Ref | null
    }

    type I_Object = I_ObjectBasic & Type<'object'>

    interface I_Error extends I_ObjectBasic, Type<'error'> {
        name: string
        message: string
        stack: string
        isThrow?: boolean
    }

    interface I_ArrayBasic extends I_ObjectBasic {
        values: All[]
        length: number
    }
    
    type I_Array = I_ArrayBasic & Type<'array'>
    type I_Set = I_ArrayBasic & Type<'set'>

    interface I_Buffer {
        /** encoded base64 1 byte per element */
        buffer: string
        byteLength: number
        // using es2020 - no maxByteLength and growable
        //growable: boolean
        //maxByteLength: number
        shared: boolean
    }

    interface I_TypedArray extends I_Buffer {
        type: 'typedarray'
        length: number
        bytesPerElement: number
    }

    interface I_ArrayBuffer extends I_Buffer {
        type: 'arraybuffer'
    }

    interface I_Map extends I_ObjectBasic {
        type: 'map'
        values: [key: All, value: All][]
        length: number
    }

    interface I_Function extends I_ObjectBasic {
        type: 'function'
        name: string
        source: string
        isClass: boolean
        isAsync: boolean
        isGenerator: boolean
        content?: string
        extends?: I_Function | I_Ref
    }

    interface I_Proxy {
        type: 'proxy'
        object: All
        handle: All
        revocable: boolean
    }

    interface I_Circular {
        type: 'circular'
        name?: string
        ref?: number
    }

    interface I_RootRef {
        type: 'rootref'
        refs: JSONInspectData.All[]
        entry: All
    }

    interface I_Ref {
        type: 'ref'
        ref: number
    }
}

type JSONInspectData = JSONInspectData.All

export declare namespace JsonInspectOptions {
    interface All {
        object: IObject
        function: IFunction
    }

    interface IObject {
        proto: boolean
        getValue: boolean
    }

    interface IFunction {
        content: boolean
        properties: boolean
        extend: boolean
        proto: boolean
    }
}
export default JSONInspectData
