import BedrockType from "../../../../globaltypes/bedrock.js"
import getFid from "../lib/fid.js"
import jsonInspect from "../lib/jsoninspect.js"
import timing from "../lib/timing.js"
import TypedEventEmitter from "../lib/typedevm.js"
import { system, world } from '@minecraft/server'

const { now } = Date

/**
 * Overrides events
 */
export class EventsOverride<E extends Record<_K, EventSignalAny>, _K extends PropertyKey = keyof E> extends TypedEventEmitter<EventsOverrideEvents<E>> {
    constructor(events: E) {
        super()
        for (const k in events) {
            this.eventNames.push(k)
            const osignal = this.events[k] = new EventsOverrideSignal(events[k])

            osignal.addEventListener('subscribe', (d) => this.emit('subscribe', { name: k, ...d }))
            osignal.addEventListener('unsubscribe', (d) => this.emit('unsubscribe', { name: k, ...d }))
            osignal.addEventListener('enable', (d) => this.emit('enable', { name: k, ...d }))
            osignal.addEventListener('disable', (d) => this.emit('disable', { name: k, ...d }))
            osignal.addEventListener('data', (d) => this.emit('data', { name: k, ...d }))
        }
    }

    readonly events: { [K in keyof E]: EventsOverrideSignal<E[K]> } = Object.create(null);
    readonly eventNames: (keyof E)[] = [];

    *[Symbol.iterator]() {
        for (const k of this.eventNames) yield [k, this.events[k]] as const
    }
}

export type EventsOverrideEvents<E extends Record<string, EventSignalAny>> = { [K in keyof E]: EventsOverrideSignalEventsNamed<EventSignalData<E[K]>, K> }[keyof E]

/**
 * Overrides event signals
 */
export class EventsOverrideSignal<S extends EventSignalAny, _D extends EventSignalData<S> = EventSignalData<S>> extends TypedEventEmitter<EventsOverrideSignalEvents<_D>> {
    constructor(signal: S) {
        super()
        this.signal = signal

        const protoSignal = Object.getPrototypeOf(signal) as S
        this.rawSubscribe = protoSignal.subscribe
        this.rawUnsubscribe = protoSignal.subscribe

        signal.subscribe(data => this.dispatch(data))

        protoSignal.subscribe = (listener, opts) => {
            this.subscribe(listener, opts)
            return listener
        }

        protoSignal.unsubscribe = (listener) => {
            this.unsubscribe(listener)
        }
    }

    /** Signal */
    readonly signal: S
    /** Raw Signal.subscribe, unbound */
    readonly rawSubscribe: S['subscribe']
    /** Raw Signal.unsubscribe, unbound */
    readonly rawUnsubscribe: S['unsubscribe']

    protected _signalListeners = new Map<_D['listener'], EventsOverrideSignalListenerData<_D>>()
    protected _fidlist = new Map<number, _D['listener']>()

    /** Signal listener list, readonly */
    readonly listener: ReadonlyMap<_D['listener'], Readonly<EventsOverrideSignalListenerData<_D>>> = this._signalListeners

    /**
     * Adds event listener to the signal
     * @param listener Signal listener
     * @param options Signal listener options
     */
    subscribe<L extends _D['listener']>(listener: L, options?: _D['options']) {
        const fid = getFid(listener)

        this.emit('subscribe', {
            listener,
            options,
            fid
        })

        this._signalListeners.set(listener, {
            options,
            disabled: false,
            fid
        })
        this._fidlist.set(fid, listener)

        return listener
    }

    /**
     * Removes event listener from the signal
     * @param listener Signal listener / Function ID
     */
    unsubscribe(listener: _D['listener'] | number) {
        if (typeof listener === 'number') {
            const x = this._fidlist.get(listener)
            if (!x) return false
            listener = x
        }

        const fid = getFid(listener)

        this.emit('unsubscribe', {
            listener,
            fid
        })

        this._signalListeners.delete(listener)
        this._fidlist.delete(getFid(listener))

        return true
    }

    /**
     * Disables event listener
     * @param listener Signal listener / Function ID
     */
    disableListener(listener: _D['listener'] | number) {
        if (typeof listener === 'number') {
            const x = this._fidlist.get(listener)
            if (!x) return false
            listener = x
        }

        const data = this._signalListeners.get(listener)
        if (!data || data.disabled) return false
        data.disabled = true

        this.emit('disable', {
            listener,
            fid: getFid(listener)
        })
    }

    /**
     * Enabled event listener
     * @param listener Signal listener / Function ID
     */
    enableListener(listener: _D['listener'] | number) {
        if (typeof listener === 'number') {
            const x = this._fidlist.get(listener)
            if (!x) return false
            listener = x
        }

        const data = this._signalListeners.get(listener)
        if (!data || !data.disabled) return false
        data.disabled = false

        this.emit('enable', {
            listener,
            fid: getFid(listener)
        })
    }

    /**
     * Cleares event listeners of the signal
     */
    clear() {
        for (const listener of this._signalListeners.keys())
            this.unsubscribe(listener)
    }

    /**
     * Dispatches event to signal listeners
     * @param data Event data
     * @param optsFilter Options filter
     */
    dispatch(data: _D['data'], optsFilter?: (opts: _D['options'] | undefined, listener: _D['listener']) => boolean) {
        const list: BedrockType.Events.DataFunctionExec[] = []

        const t0 = now()
        for (const [listener, { options, disabled }] of this.listener) {
            if (disabled) continue
            if (optsFilter ? !optsFilter(options, listener) : false) continue

            const exec = timing(() => listener(data))
            list.push({
                fid: getFid(listener),
                fn: jsonInspect.fn(listener),
                delta: exec.delta,
                error: exec.errored ? jsonInspect.inspect(exec.value) : undefined
            })
        }
        const td = now() - t0

        this.emit('data', {
            data,
            list,
            delta: td
        })

        return list
    }
}

export interface EventsOverrideSignalListenerData<Sd extends EventSignalData> {
    options?: Sd['options']
    disabled: boolean
    fid: number
}

export interface EventsOverrideSignalEvents<Sd extends EventSignalData> {
    subscribe: EventsOverrideSignalEventFunctionIdentifier<Sd> & {
        readonly options?: Sd['options']
    }

    unsubscribe: EventsOverrideSignalEventFunctionIdentifier<Sd>
    disable: EventsOverrideSignalEventFunctionIdentifier<Sd>
    enable: EventsOverrideSignalEventFunctionIdentifier<Sd>

    data: {
        readonly list: BedrockType.Events.DataFunctionExec[]
        readonly data: Sd['data']
        readonly delta: number
    }
}

export type EventsOverrideSignalEventsNamed<Sd extends EventSignalData, N extends PropertyKey, _S = EventsOverrideSignalEvents<Sd>> = {
    [K in keyof _S]: _S[K] & { readonly name: N }
}

export interface EventsOverrideSignalEventFunctionIdentifier<Sd extends EventSignalData> {
    readonly listener: Sd['listener']
    readonly fid: number
}

/**
 * Event signal data with `any` type
 */
export interface EventSignalAny {
    subscribe(listener: (data: any) => void, opts?: any): (data: any) => void
    unsubscribe(listener: (data: any) => void): void
}

/**
 * Extract `listener`, `options`, and `data` from event signal
 */
export interface EventSignalData<T extends EventSignalAny = EventSignalAny> {
    readonly listener: Parameters<T['subscribe']>[0]
    readonly options: NonNullable<Parameters<T['subscribe']>[1]>
    readonly data: Parameters<Parameters<T['subscribe']>[0]>[0]
}

namespace DebugEventsOverride {
    export const worldBefore = new EventsOverride(world.beforeEvents)
    export const worldAfter = new EventsOverride(world.afterEvents)
    export const systemBefore = new EventsOverride({})
    export const systemAfter = new EventsOverride(system.afterEvents)
}

export default DebugEventsOverride
