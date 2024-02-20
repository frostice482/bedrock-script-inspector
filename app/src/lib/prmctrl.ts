export class PromiseController<T = unknown> {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res
            this.reject = rej
        })
    }

    readonly promise: Promise<T>
    declare resolve: (value: T | PromiseLike<T>) => void
    declare reject: (reason?: unknown) => void
}