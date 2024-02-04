/**
 * Executes function and outputs the execution time and the function result / error
 * @param fn Function to be executed
 * @returns Timing result
 */
export default function timing<T>(fn: () => T): TimingResult {
    const t0 = Date.now()
    
    try {
        const res = fn()
        return {
            time: Date.now() - t0,
            errored: false,
            out: res
        }
    } catch(e) {
        return {
            time: Date.now() - t0,
            errored: true,
            error: e
        }
    }
}

export type TimingResult = Readonly<{
    time: number
} & (TimingResultError | TimingResultSuccess)>

export type TimingResultError = {
    errored: true
    error: unknown
}

export type TimingResultSuccess<T = unknown> = {
    errored: false
    out: T
}
