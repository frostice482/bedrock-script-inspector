import { system } from "@minecraft/server"
import BedrockType from "@globaltypes/bedrock.js"

const { now } = Date

/**
 * Gets current stack trace
 * @param deleteCount Number of stack to delete from the topmost
 * - If set to `1`, removes the `getStackTrace` stack
 * - If set to `2`, removes the stack of caller of this function
 * @returns stack trace
 */
export function getStackTrace(deleteCount = 1) {
    return new Error().stack?.replace(RegExp(`^(.*\\r?\\n){0,${deleteCount}}`), '') ?? ''
}

/**
 * Creates an iterable key-value pair from an object
 * @param obj Object
 */
export function* iterateObject<T extends object>(obj: T): Iterable<readonly [keyof T, T[keyof T]]> {
    for (const k in obj) yield [k, obj[k]]
}

/**
 * Gets iterable key-value pair from an object / iterable
 * @param list Object
 */
export function iteratePair<T extends ReadonlyObjectOrIterable<string, unknown>>(list: T): T extends Iterable<infer R> ? Iterable<R> : Iterable<readonly [keyof T, T[keyof T]]> {
    //@ts-ignore
    return Symbol.iterator in list ? list : iterateObject(list)
}

/**
 * Gets function source
 * @param fn Function
 * @returns Function source
 */
export function getFunctionSource(fn: Function) {
    return fn.fileName ? fn.fileName + ':' + fn.lineNumber : '<native>'
}

export function* getObjectProto(obj: unknown, includeInitial = false, includeNull = false) {
    if (includeInitial) yield obj
    while (obj) {
        obj = Object.getPrototypeOf(obj)
        if (obj || includeNull) yield obj
    }
}

export function getTimeData(): BedrockType.TimeData {
    return {
        tick: system.currentTick,
        time: now()
    }
}

export function getTraceData<T>(data: T, stackDel = 2): BedrockType.TraceData<T> {
    return {
        tick: system.currentTick,
        time: now(),
        stack: getStackTrace(2),
        data
    }
}
