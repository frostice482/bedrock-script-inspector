import { DeepPartialReadonly } from "../../../globaltypes/types.js"
import { Anchor } from "./anchor.js"
import TypedEventTarget from "./typedevt.js"

export class RelativePopup extends TypedEventTarget<{ open: Event, close: Event }> {
    /**
     * Creates relative popup
     * @param elm Parent Element
     * @param popupElm Popup element
     * @param host Element where popup will be displayed at
     * @param elmAnchor Element anchor
     * @param popupElmAnchor Parent anchor
     * @param useAbsoluteOffset Uses absolute offset. If disabled, us0es relative offset from parent element
     */
    constructor(elm: HTMLElement, popupElm: HTMLElement, host = elm, elmAnchor: Anchor, popupElmAnchor = Anchor.reverse[elmAnchor], useAbsoluteOffset = true) {
        super()

        this.host = host
        this.element = elm
        this.popupElement = popupElm

        this.elmAnchor = elmAnchor
        this.popupElmAnchor = popupElmAnchor
        this.useAbsoluteOffset = useAbsoluteOffset
    }

    readonly host: HTMLElement
    readonly element: HTMLElement
    readonly popupElement: HTMLElement

    #opened = false
    get opened() { return this.#opened }

    elmAnchor: Anchor
    popupElmAnchor: Anchor
    useAbsoluteOffset: boolean

    open() {
        if (this.#opened) return false
        this.#opened = true

        this.host.append(this.popupElement)
        requestAnimationFrame(() => {
            const { width: ewidth, height: eheight, x, y } = this.element.getBoundingClientRect()
            const { offsetWidth: width, offsetHeight: height } = this.popupElement
            const { clientWidth, clientHeight } = document.body

            let {x: xl, y: yl} = Anchor({ width: width, height: height }, { width: ewidth, height: eheight }, this.popupElmAnchor, this.elmAnchor)

            const xa = x + xl, xm = clientWidth - width
            if (xa > xm) xl = xm - x
            else if (xa < 0) xl = -x

            const ya = y + yl, ym = clientHeight - height
            if (ya > ym) yl = ym - y
            else if (ya < 0) yl = -y

            if (this.useAbsoluteOffset) {
                xl += x
                yl += y
            }

            this.popupElement.style.left = xl + 'px'
            this.popupElement.style.top = yl + 'px'
        })

        this.dispatchEvent(new Event('open'))
        return true
    }

    close() {
        if (!this.#opened) return false
        this.#opened = false

        this.popupElement.remove()

        this.dispatchEvent(new Event('open'))
        return true
    }
}

export class RelativePopupHandle {
    constructor(relPopup: RelativePopup, opts: RelativePopupHandleMethod | DeepPartialReadonly<RelativePopupHandleOptions>) {
        this.relPopup = relPopup

        if (typeof opts === 'string') {
            switch (opts) {
                case 'click':
                    this.clickOpen = this.clickClose = true
                    break
                
                case 'hover':
                case 'hoverclickpersist':
                    this.hoverOpen = this.hoverClose = true
                    if (opts === 'hoverclickpersist') this.popupPersistOnClick = this.clickClose = true
                    break
                
                case 'focus':
                    this.focusOpen = this.focusClose = true
                    break
            }
        }
        else {
            this.hoverOpen = opts.hoverOpen ?? true
            this.hoverClose = opts.hoverClose ?? this.hoverOpen
            this.clickOpen = opts.clickOpen ?? !this.hoverOpen
            this.clickClose = opts.clickClose ?? this.clickOpen
            this.popupPersistOnClick = opts.popupPersistOnClick ?? false
        }

        const signal = this.#destroy.signal
        const { element, popupElement } = relPopup

        element.addEventListener('pointerenter', () => this.hoverOpen && this.open(), { signal })
        element.addEventListener('pointerleave', () => this.hoverClose && !this.#persist && this.close(), { signal })
        popupElement.addEventListener('pointerenter', () => this.hoverOpen && this.open(), { signal })
        popupElement.addEventListener('pointerleave', () => this.hoverClose && !this.#persist && this.close(), { signal })
        element.addEventListener('focus', () => this.focusOpen && this.open(), { signal })
        element.addEventListener('blur', () => this.focusClose && !this.#persist && this.close(), { signal })
        
        element.addEventListener('click', () => {
            if (this.popupPersistOnClick) this.#persist = true
            if (this.clickOpen) this.open()
        }, { signal })

        popupElement.addEventListener('click', () => this.popupPersistOnClick && this.relPopup.opened && (this.#persist = true), { signal })
    }

    readonly relPopup: RelativePopup

    #destroy = new AbortController()
    #closeAb = new AbortController()
    #persist = false

    get destroyed() { return this.#destroy.signal.aborted }

    clickOpen = false
    clickClose = false
    focusOpen = false
    focusClose = false
    hoverOpen = false
    hoverClose = false
    popupPersistOnClick = false

    open() {
        if (!this.relPopup.open()) return false

        if (this.clickClose) {
            const signal = this.#closeAb.signal
            let focus = false

            this.relPopup.element.addEventListener('click', () => focus = true, { signal })
            this.relPopup.popupElement.addEventListener('click', () => focus = true, { signal })

            requestAnimationFrame(() => {
                document.addEventListener('click', () => {
                    if (focus) return focus = false
                    this.close()
                }, { signal })
            })
        }

        return true
    }

    close() {
        if (!this.relPopup.close()) return false

        this.#closeAb.abort()
        this.#closeAb = new AbortController
        this.#persist = false

        return true
    }

    destroy() {
        this.#closeAb.abort()
        this.#destroy.abort()
    }
}

export type RelativePopupHandleMethod = 'hover' | 'click' | 'focus' | 'hoverclickpersist'

export interface RelativePopupHandleOptions {
    clickOpen: boolean
    clickClose: boolean
    hoverOpen: boolean
    hoverClose: boolean
    focusOpen: boolean
    focusClose: boolean
    popupPersistOnClick: boolean
}
