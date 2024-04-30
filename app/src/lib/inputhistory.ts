export default class inputHistory {
    /**
     * Creates input history handler
     * @param maxHistory Max history (default: 30)
     */
    constructor(maxHistory = 30) {
        this.maxHistory = maxHistory
    }

    /**
     * Handles navigation keyboard
     * @param isUp is UP key
     * @param value Current value
     * @param start Start cursor
     * @param end End cursor
     * @returns New value, start & end cursur position
     */
    handleNav(isUp: boolean, value: string, start: number, end: number): [value: string, start: number, end: number] {
        let ptr = this.historyPointer
        const histories = this.histories, len = histories.length

        // selection
        if (start !== end) {
            if (start > end) [start, end] = [end, start]

            this._navSelValue ??= value
            this._navSelIx ??= [start, end]

            // search value by selection
            const selection = value.slice(start, end)
            for (const i of navItrIndex(ptr, len, isUp)) {
                const val = histories[i], fi = val?.indexOf(selection)
                if (fi === -1 || fi === undefined || val === undefined) continue

                this.historyPointer = i
                return [val, fi, end - start + fi]
            }
            // not found
            this.historyPointer = isUp ? -1 : len
            const navSelection = this._navSelValue, [lstart, lend] = this._navSelIx
            return [navSelection, lstart, lend]
        }
        // at beginning
        else if (end === 0) {
            // increment / decrement pointer by 1
            ptr = this.historyPointer = navAdd(ptr, len, isUp)

            return [histories[ptr] ?? '', 0, 0]
        }
        // somewhere
        else {
            // search value starting until cursor
            const selection = value.slice(0, end)
            for (const i of navItrIndex(ptr, len, isUp)) {
                const val = histories[i]
                if (!val?.startsWith(selection)) continue

                this.historyPointer = i
                return [val, end, end]
            }
            // not found
            this.historyPointer = isUp ? -1 : len
            return [selection, end, end]
        }
    }

    /**
     * Handles ENTER key
     * @param value Current value
     * @returns 
     */
    handleEnter(value: string) {
        // value is not empty or not latest
        if (!value || this.histories.at(-1) === value) return

        const { histories, maxHistory } = this
        
        // push history, shift if full
        histories.push(value)
        if (histories.length > maxHistory) histories.shift()
        this.historyPointer = histories.length
    }

    resetPointer() {
        this.historyPointer = this.histories.length
        this._navSelValue = this._navSelIx = undefined
    }

    _navSelValue: string | undefined
    _navSelIx: [number, number] | undefined
    
    histories: string[] = []
    historyPointer = 0
    maxHistory: number
}

export class inputHistoryElement<T extends HTMLInputElement | HTMLTextAreaElement> extends inputHistory {
    /**
     * Creates input handler for element
     * @param elm Input element
     * @param maxHistory Max history
     * @param navUseCtrl On history navigate, requires CTRL key
     * @param pushUseCtrl On history push, requires CTRL key
     */
    constructor(elm: T, maxHistory?: number, navUseCtrl?: boolean | null, pushUseCtrl?: boolean | null) {
        super(maxHistory)
        this.elm = elm
        const isTextArea = elm instanceof HTMLTextAreaElement

        this.navUseCtrl = navUseCtrl ?? isTextArea
        this.pushUseCtrl = pushUseCtrl ?? isTextArea

        elm.addEventListener('keydown', (ev) => {
            if (!(ev instanceof KeyboardEvent)) return

            const key = ev.key
            switch (key) {
                // navigate
                case 'ArrowDown':
                case 'ArrowUp': {
                    const [nv, ns, ne] = this.handleNav(key === 'ArrowUp', elm.value, elm.selectionStart ?? 0, elm.selectionEnd ?? 0)
                    elm.value = nv
                    elm.setSelectionRange(ns, ne)
                } break

                // push
                case 'Enter': {
                    const { pushUseCtrl, pushUseShift } = this
                    if (pushUseCtrl && !ev.ctrlKey) return
                    if (pushUseShift && !ev.shiftKey) return

                    this.handleEnter(elm.value)

                    if (this.pushReset) elm.value = ''
                } break

                default: return
            }

            ev.preventDefault()

            if (!this._resetListener) {
                this._resetListener = true
                elm.addEventListener('input', () => {
                    this.resetPointer()
                    this._resetListener = false
                }, { once: true })
            }
        })
    }

    _resetListener = false

    readonly elm: T

    navUseCtrl: boolean
    pushUseCtrl: boolean
    pushUseShift = false
    pushReset = false
}

function* navItrIndex(start: number, len: number, up: boolean) {
    if (up) for (let i = start - 1; i >= 0; i--) yield i
    else for (let i = start + 1; i < len; i++) yield i
}

function navAdd(val: number, len: number, up: boolean) {
    return up ? val !== -1 ? val - 1 : val
        : val !== len ? val + 1 : val
}
