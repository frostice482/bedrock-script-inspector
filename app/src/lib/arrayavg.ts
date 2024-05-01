import { DeepPartialReadonly } from "@globaltypes/types.js"
import { latestAverage, pushLimit, sum } from "./misc.js"

export class ArraySumCache extends Array<number> {
    constructor(...items: number[]) {
        super(...items)
        this.sumCache += sum(items)
    }

    sumCache = 0

    push(...items: number[]) {
        this.sumCache += sum(items)
        return super.push.apply(this, items)
    }

    unshift(...items: number[]) {
        this.sumCache += sum(items)
        return super.unshift.apply(this, items)
    }

    pop() {
        const elm = super.pop()
        if (elm !== undefined) this.sumCache -= elm
        return elm
    }

    shift() {
        const elm = super.shift()
        if (elm !== undefined) this.sumCache -= elm
        return elm
    }

    splice(start: number, deleteCount?: number, ...items: number[]) {
        const d = deleteCount === undefined ? super.splice(start) : super.splice(start, deleteCount, ...items)

        for (const elm of d) this.sumCache -= elm
        for (const elm of items) this.sumCache += elm

        return d
    }

    copyWithin(target: number, start: number, end = this.length): this {
        const len = this.length

        if (target >= len) return this
        if (target < 0) target = target < -len ? 0 : target + len

        if (start >= len) return this
        if (start < 0) start = start < -len ? 0 : start + len

        if (end < 0) end = end < -len ? 0 : end + len
        if (end <= start) return this

        const copyLen = end - start

        for (let offset = 0; offset < copyLen; offset++) {
            const e = this[offset + start]!
            const t = this[offset + target]!
            this[target + offset] = e

            this.sumCache += e - t
        }

        return this
    }

    resetSum() {
        this.sumCache = sum(this)
        return this
    }

    average() {
        return this.sumCache / this.length
    }
}

export default class ArrayAverage extends ArraySumCache {
    constructor(opts: DeepPartialReadonly<ArrayAverageOptions> = {}, values: Iterable<number> = []) {
        super(...values)

        this.minLen = opts.minLen ?? 3
        this.minUnstableLen = opts.minUnstableLen ?? 10
        this.minStableLen = opts.minStableLen ?? 20
        this.maxLen = opts.maxLen ?? 100
        this.maxLatestAvgLen = opts.maxLatestAvgLen ?? 10

        this.minDelta = opts.minDelta ?? 1
        this.deltaPow = opts.deltaPow ?? 4
    }

    /**
     * Minimum array length. (default: 1)
     * 
     * Stable to unstable state can drop this array's length to its minimum
     */
    minLen: number

    /**
     * Maximum array length (default: 100)
     */
    maxLen: number

    /**
     * Minimum array length. (default: 10)
     * 
     * When in unstable state, array's length cannot drop below this value
     * except during transition
     */
    minUnstableLen: number

    /**
     * Minimum array length. (default: 20)
     * 
     * for the state to be considered stable
     */
    minStableLen: number

    /**
     * Maximum latest length (default: 10)
     */
    maxLatestAvgLen: number

    /**
     * Minimum delts value (default: 1).
     * 
     * Array will be unshifted by an amount of this value,
     * scaled by the array's length
     */
    minDelta: number

    /**
     * Delta power value (default: 4).
     * 
     * Array will be unshifted by an amount of this value,
     * scaled by the array's length
     */
    deltaPow: number

    isStable = false
    latestSum: number[] = []

    _prevLAvg = 0
    _prevAvg = 0

    /**
     * Calculates current average value
     * while also updating length
     */
    average() {
        const { minLen, minUnstableLen, minStableLen, maxLen, minDelta, deltaPow, isStable, length } = this

        // ger average
        const avg = super.average()
        const latestAvg = latestAverage(this.latestSum)

        // get delta length mul
        const mul = Math.max( Math.abs(avg - latestAvg) - minDelta, 0 ) ** deltaPow
        const splice = mul * length

        // splice
        this.splice(0, Math.max(
            0, // prevent negative splice
            length - maxLen, // max length
            Math.min(
                length - (isStable ? minLen : minUnstableLen), // min length
                Math.floor(Math.max(splice)) // remove count
            )
        ))

        // set state & prev value
        this._prevLAvg = latestAvg
        this._prevAvg = avg
        this.isStable = isStable ? length >= minUnstableLen : length >= minStableLen

        return avg
    }

    /**
     * Pushes value and immediately averages it
     * @param v Value
     * @returns Average value
     */
    pushAndAverage(v: number) {
        this.push(v)
        pushLimit(this.latestSum, v, this.maxLatestAvgLen)

        return this.average()
    }
}

export type ArrayAverageOptions = Pick<ArrayAverage, 'minLen' | "maxLen" | 'minUnstableLen' | 'minStableLen' | 'maxLatestAvgLen' | 'minDelta' | 'deltaPow'>
