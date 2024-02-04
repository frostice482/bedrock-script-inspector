export default class inputHistory {
    constructor(maxHistory = 30) {
        this.maxHistory = maxHistory
    }

    handleNav(isUp: boolean, value: string, start: number, end: number): [value: string, start: number, end: number] {
        let ptr = this.historyPointer
        const histories = this.histories, len = histories.length

        if (start !== end) {
            if (start > end) [start, end] = [end, start]

            this._navSelValue ??= value
            this._navSelIx ??= [start, end]

            const selection = value.slice(start, end)
            for (const i of navItrIndex(ptr, len, isUp)) {
                const val = histories[i], fi = val?.indexOf(selection)
                if (fi === -1 || fi === undefined || val === undefined) continue

                this.historyPointer = i
                return [val, fi, end - start + fi]
            }
            this.historyPointer = isUp ? -1 : len
            const navSelection = this._navSelValue, [lstart, lend] = this._navSelIx
            return [navSelection, lstart, lend]
        }
        else if (end === 0) {
            ptr = this.historyPointer = navAdd(ptr, len, isUp)

            return [histories[ptr] ?? '', 0, 0]
        }
        else {
            const selection = value.slice(0, end)
            for (const i of navItrIndex(ptr, len, isUp)) {
                const val = histories[i]
                if (!val?.startsWith(selection)) continue

                this.historyPointer = i
                return [val, end, end]
            }
            this.historyPointer = isUp ? -1 : len
            return [selection, end, end]
        }
    }

    handleEnter(value: string) {
        if (!value || this.histories.at(-1) === value) return

        const { histories, maxHistory } = this
        
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
                case 'ArrowDown':
                case 'ArrowUp': {
                    const [nv, ns, ne] = this.handleNav(key === 'ArrowUp', elm.value, elm.selectionStart ?? 0, elm.selectionEnd ?? 0)
                    elm.value = nv
                    elm.setSelectionRange(ns, ne)
                } break

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
