import IteatorUtil from "./iterator.js"

export function average(itr: Iterable<number>) {
    let s = 0, i = 0
    for (const v of itr) {
        s += v
        i++
    }
    return s / i
}

export function averageMagnitude(itr: number[]) {
    const len = itr.length
    return itr.reduce((a, b, i) => a + b * (i + 1), 0) * 2 / len / (1 + len)
}

export function cellBar(col1: readonly number[], col2: readonly number[]) {
    return (rate: number) => `linear-gradient(to right, rgba(${combineArray(col1, col2, (a, b) => a + (b - a) * rate)}) 0 ${rate * 100}%, transparent 0)`
}

export function combineArray<T, R>(a: readonly T[], b: readonly T[], map: (a: T, b: T) => R) {
    const max = a.length > b.length ? a.length : b.length
    const arr: R[] = []
    for (let i = 0; i < max; i++) arr[i] = map(a[i]!, b[i]!)
    return arr
}

export function errNotif(level: string, content?: string) {
    const e = document.createElement('span')
    e.classList.add('enotif', 'enotif-' + level)
    e.textContent = content ?? ''
    return e
}

const stackElipsis = document.createElement('button')
stackElipsis.classList.add('raw', 'nopadding')
stackElipsis.textContent = '...'
stackElipsis.style.color = 'white'

export function formatStack(stack: string) {
    const c = document.createElement('div')
    c.classList.add('ji-stack', 'ji-stack-close')

    let opened = false

    const eo = stackElipsis.cloneNode(true)
    eo.addEventListener('click', () => {
        if (opened = !opened) {
            c.classList.remove('ji-stack-close')
            c.lastElementChild?.append(eo)
        } else {
            c.classList.add('ji-stack-close')
            c.firstElementChild?.append(eo)
        }
    })

    for (const [stk, source] of stack.matchAll(/(?<=^ *at ).*?\((.*?)\)(?=\r?\n)/gm)) {
        if (source?.startsWith('debugger')) continue
        const x = c.appendChild(document.createElement('div'))
        x.textContent = stk
        if (source === 'native') x.classList.add('ji-stack-native')
    }

    c.firstElementChild?.append(eo)

    return c
}

export function formatStackText(stack: string, replacer = '') {
    return stack.replace(/^ *at /gm, replacer)
}

export function getIdThrow<T extends typeof HTMLElement = typeof HTMLElement>(id: string, validate?: T | null, root: NonElementParentNode = document, removeAfterFound = false): InstanceType<T> {
    const elm = root.getElementById(id) as InstanceType<T>
    if (!elm) throw new ReferenceError(`Element ID ${id} not found`)
    if (validate && !(elm instanceof validate)) throw new TypeError(`Element ID ${id} is not an instance of ${validate.name} (got ${(elm as HTMLElement).tagName})`)

    if (removeAfterFound) elm.removeAttribute('id')
    return elm
}

export function initFilter(root: ParentNode | string, filterName: string, filterApply: HTMLElement | Iterable<HTMLElement>) {
    if (typeof root === 'string') root = getIdThrow(root)

    const filterApplyItr = filterApply instanceof HTMLElement ? [filterApply] : filterApply

    for (const input of IteatorUtil.list(root.querySelectorAll<HTMLInputElement>('input[filter]'))) {
        const name = filterName + input.getAttribute('filter')
        const change = () => { for (const elm of filterApplyItr) elm.classList[input.checked ? 'add' : 'remove'](name) }
    
        input.addEventListener('change', change)
        change()
    }
}

export function initFilterText(input: HTMLInputElement | string, filterName: string | string[], filterCb: (fi: string) => void, multipleOr = true) {
    if (typeof input === 'string') input = getIdThrow(input, HTMLInputElement)
    const e = input
    
    input.addEventListener('change', () => filterCb(cssFilter(e.value, filterName)))
}

export const cssFilterRegex = /(!?)([*^$]?)(\w+)/g

export function cssFilter(filter: string, name: string | string[], multipleOr = true) {
    const list = name instanceof Array ? name : [name]

    return Array.from(
        filter.matchAll(cssFilterRegex),
        ([, excl, flag = '', val = '']) => {
            const str = JSON.stringify(val)
            const fi = list.map(name => '[' + name + flag + '=' + str + ']')
            const fi2 = multipleOr && fi.length > 1 ? ':is(' + fi.join(',') + ')' : fi.join('')

            return excl ? fi2 : `:not(${fi2})`
        }
    ).join('')
}

export function filter(fi: string): Filter[] {
    return Array.from(
        fi.matchAll(cssFilterRegex),
        ([, not, type, value = '']) => ({
            value,
            type: type === '*' ? 'includes'
                : type === '^' ? 'startsWith'
                : type === '$' ? 'endsWith'
                : '==',
            not: Boolean(not)
        })
    )
}

export function filterFn(fi: string): (v: string) => boolean {
    const fix = filter(fi)
    return (str) => fix.every(fi => {
        const b = fi.type === '==' ? str === fi.value : str[fi.type](fi.value)
        return fi.not ? !b : b
    })
}

export function post(url: string, data: BodyInit | null | undefined, init?: RequestInit) {
    return fetch(url, {
        ...init,
        method: 'POST',
        body: data,
    })
}

export function pushLimit<T>(arr: T[], elm: T, limit: number) {
    arr.push(elm)
    if (arr.length > limit) arr.splice(0, arr.length - limit)

    return arr.length
}

export function querySelectorThrow<T extends typeof HTMLElement = typeof HTMLElement>(id: string, validate?: T | null, root: ParentNode = document): InstanceType<T> {
    const elm = root.querySelector(id) as InstanceType<T>
    if (!elm) throw new ReferenceError(`Element ID ${id} not found`)
    if (validate && !(elm instanceof validate)) throw new TypeError(`Element ID ${id} is not an instance of ${validate.name} (got ${(elm as HTMLElement).tagName})`)

    return elm
}

export async function resThrowIfError(res: Response) {
    if (!(res.ok || res.redirected)) throw new Error(res.url + ' ' + res.status + ' ' + res.statusText)
    return res
}

export function sum(itr: Iterable<number>) {
    let s = 0
    for (const v of itr) s += v
    return s
}

export function textApplier<T>(replacer: T extends string ? { (value: T): string } | void : { (value: T): string }, elm: Node) {
    return (value: T) => void ( elm.textContent = replacer ? replacer(value) : typeof value === 'string' ? value : String(value) )
}

export const filterTooltip = document.createElement('div')
filterTooltip.classList.add('popup')
filterTooltip.style.whiteSpace = 'pre'
filterTooltip.textContent = [
    "separate with SPACE; prefixes:",
    "! - exclude",
    "^ - match beginning",
    "$ - match end",
    "* - match contain",
].join('\n')

export interface Filter {
    value: string
    type: 'startsWith' | 'endsWith' | 'includes' | '=='
    not: boolean
}