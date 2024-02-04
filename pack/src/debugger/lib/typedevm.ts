export default class TypedEventEmitter<T extends Record<string, any>> {
    _listeners: {
        [K in keyof T]?: {
            list: Map<Listener<T[K]>, boolean>
            prepend: Map<Listener<T[K]>, boolean>
        }
    } = Object.create(null)

    addEventListener<K extends keyof T>(event: K, fn: Listener<T[K]>, prepend = false, once = false) {
        const listener = this._listeners[event] ??= {
            list: new Map<never, never>(),
            prepend: new Map<never, never>()
        }

        listener[prepend ? 'prepend' : 'list'].set(fn, once)

        return this
    }

    removeEventListener<K extends keyof T>(event: K, fn: Listener<T[K]>) {
        const listener = this._listeners[event]
        if (listener) {
            listener.list.delete(fn)
            listener.prepend.delete(fn)
        }

        return this
    }

    emit<K extends keyof T>(event: K, data: T[K]) {
        const list = this._listeners[event]
        if (!list) return

        for (const [listener, once] of list.prepend) {
            listener(data)
            if (once) list.prepend.delete(data)
        }

        for (const [listener, once] of list.list) {
            listener(data)
            if (once) list.list.delete(data)
        }
    }

    *getListeners<K extends keyof T>(event: K) {
        const listener = this._listeners[event]
        if (!listener) return

        yield* listener.prepend.keys()
        yield* listener.list.keys()
    }
}

type Listener<T> = (data: T) => void
