declare var __date_clock: () => number
declare var print: (...data: unknown[]) => void
declare var console: Console
declare class InternalError extends Error {}

interface Console {
    log(...data: unknown[]): void
    info(...data: unknown[]): void
    warn(...data: unknown[]): void
    error(...data: unknown[]): void
}

interface Function {
    get fileName(): string
    get lineNumber(): number
}

type ReadonlyObjectOrIterable<K extends PropertyKey, V> = Readonly<Record<K, V>> | Iterable<readonly [K, V]>
