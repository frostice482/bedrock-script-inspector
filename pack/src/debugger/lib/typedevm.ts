export default class TypedEventEmitter<T extends Record<string, any>> {
    protected _listeners: { [K in keyof T]?: Set<Listener<T[K]>> } = Object.create(null)

    addEventListener<K extends keyof T>(event: K, fn: Listener<T[K]>) {
        (this._listeners[event] ??= new Set).add(fn)
        return this
    }

    removeEventListener<K extends keyof T>(event: K, fn: Listener<T[K]>) {
        return this._listeners[event]?.delete(fn) ?? false
    }

    emit<K extends keyof T>(event: K, data: T[K]) {
        for (const listener of this._listeners[event] ?? []) listener(data)
    }
}

type Listener<T> = (data: T) => void
