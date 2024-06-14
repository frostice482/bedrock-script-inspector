import { now } from "@util.js"

/**
 * Executes function and outputs the execution time and the function result / error
 * @param fn Function to be executed
 * @returns Timing result
 */
export default function timing<T>(fn: () => T): TimingResult<T> {
    const t0 = now()
    
    try {
        const v = fn()
        return {
            delta: now() - t0,
            errored: false,
            value: v
        }
    } catch(e) {
        return {
            delta: now() - t0,
            errored: true,
            value: e
        }
    }
}

export type TimingResult<T> = TimingSuccess<T> | TimingError

export interface TimingSuccess<T> {
    delta: number
    errored: false
    value: T
}

export interface TimingError {
    delta: number
    errored: true
    value: unknown
}
