import type * as tse from 'ts-essentials'

export type DeepPartialReadonly<T extends object> = tse.DeepReadonly<tse.DeepPartial<T>>
export type EventPair<T extends Record<any, any>> = { [K in keyof T]: { name: K, data: T[K] } }[keyof T]

export type Typeof = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"
