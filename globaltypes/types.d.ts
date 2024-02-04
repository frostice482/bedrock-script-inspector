import type * as tse from 'ts-essentials'

export type DeepPartialReadonly<T extends object> = tse.DeepReadonly<tse.DeepPartial<T>>
export type Pair<T extends Record<any, any>> = { [K in keyof T]: readonly [key: K, value: T[K]] }[keyof T]

export type Typeof = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"
