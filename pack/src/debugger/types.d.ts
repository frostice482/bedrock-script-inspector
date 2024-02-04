declare var __date_clock: () => number
declare var print: (...data: any[]) => void
declare var console: Console
declare class InternalError extends Error {}

interface Console {
    log(...data: any[]): void
    info(...data: any[]): void
    warn(...data: any[]): void
    error(...data: any[]): void
}

interface Function {
    get fileName(): string
    get lineNumber(): number
}

type ReadonlyObjectOrIterable<K extends PropertyKey, V> = Readonly<Record<K, V>> | Iterable<readonly [K, V]>
