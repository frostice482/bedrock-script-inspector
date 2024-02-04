namespace IteatorUtil {
    /**
     * Maps values from an iterable
     * @param itr Iterable
     * @param filterfn Map function
     */
    export function* map<A, B>(itr: Iterable<A>, mapfn: (value: A) => B): Iterable<B> {
        for (const v of itr) yield mapfn(v)
    }

    /**
     * Filters values from an iterable
     * @param itr Iterable
     * @param filterfn Filter function
     */
    export function* filter<V>(itr: Iterable<V>, filterfn: (value: V) => boolean): Iterable<V> {
        for (const v of itr) if (filterfn(v)) yield v
    }

    /**
     * Finds a value from an iterable
     * @param itr Iterable
     * @param findfn Find function
     * @returns Value
     */
    export function find<V>(itr: Iterable<V>, findfn: (value: V) => boolean) {
        for (const v of itr) if (findfn(v)) return v
    }

    /**
     * Reduces iterable values into a single value from an iterable
     * @param itr Iterable, can also be an array or typedarray
     * @param reducefn Reduce function
     * @param initialValue Initial value, uses the iterable's first value if unspecified
     * @returns Reduced value
     */
    export function reduce<V, O = V>(itr: Iterable<V> & Partial<Readonly<Pick<V[], 'values'>>>, reducefn: (prev: O, value: V) => O, initialValue?: O) {
        if (itr.values) itr = itr.values()

        let prev: O

        // initial value provided
        if (arguments.length === 3) prev = initialValue as O
        // initial value not provided
        else {
            const first = itr[Symbol.iterator]().next()
            if (first.done) throw new TypeError('Reduce of empty iterable with no initial value')
            prev = first.value as unknown as O
        }

        for (const v of itr) prev = reducefn(prev, v)
        return prev
    }

    /**
     * Concatenates multiple iterables into a single iterable
     * @param itrList Iterable list
     */
    export function* concat<T>(itrList: Iterable<T>[]): Iterable<T> {
        for (const itr of itrList) yield* itr
    }

    /**
     * Iterates list
     * @param obj Object list
     */
    export function* list<T>(obj: { item(index: number): T; length: number }) {
        for (let i = 0; i < obj.length; i++) yield obj.item(i)
    }
}

export default IteatorUtil
