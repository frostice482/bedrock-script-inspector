import EventEmitter = require("events");

class TypedEventEmitter<T extends Record<PropertyKey, any[]>> extends EventEmitter {
    declare addListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare on: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare once: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare prependListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare prependOnceListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare removeListener: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare off: <K extends keyof T>(eventName: K, listener: Listener<T[K]>) => this
    declare emit: <K extends keyof T>(eventName: K, ...args: T[K]) => boolean
    //@ts-ignore
    declare listeners: <K extends keyof T>(eventName: K) => Listener<T[K]>[]
    //@ts-ignore
    declare rawListeners: <K extends keyof T>(eventName: K) => Listener<T[K]>[]
    declare eventNames: () => Exclude<keyof T, number>[]
    //@ts-ignore
    declare removeAllListeners: (event?: keyof T) => this
    //@ts-ignore
    declare listenerCount: <K extends keyof T>(eventName: K, listener?: Listener<T[K]>) => number
}

type Listener<args extends any[]> = (...args: args) => void

export default TypedEventEmitter
