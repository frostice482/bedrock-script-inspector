export class ResizeListener<T extends Element = Element> {
    static get list() { return list }

    constructor(elm: T, listener: ResizeCallback) {
        this.element = elm
        this.callback = listener

        let sh = list.get(elm)
        if (!sh) list.set(elm, sh = new Set)
        this.#shlist = sh

        sh.add(this)
        obs.observe(elm)
    }
    
    #shlist: Set<ResizeListener>

    readonly element: T
    callback: ResizeCallback

    get detached() { return list.has(this.element) }

    detach() {
        this.#shlist.delete(this)
        if (this.#shlist.size === 0) list.delete(this.element)

        obs.unobserve(this.element)
    }
}

const list = new WeakMap<Element, Set<ResizeListener>>()

const obs = new ResizeObserver(entries => {
    for (const entry of entries) {
        for (const handle of list.get(entry.target) ?? []) {
            try { handle.callback(entry) }
            catch(e) { console.error(e) }
        }
    }
})

type ResizeCallback = (resize: ResizeObserverEntry) => void
