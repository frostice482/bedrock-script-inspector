/**
 * Averages an iterable
 * @param itr Iterable
 * @returns Average value
 */
export function average(itr: Iterable<number>) {
    let s = 0, i = 0
    for (const v of itr) {
        s += v
        i++
    }
    return s / i
}

/**
 * Averages an array.
 * Value multiplier will be lowest at first index and highest at last index
 * @param itr Array
 * @returns Average value
 */
export function latestAverage(itr: readonly number[]) {
    const len = itr.length
    return itr.reduce((a, b, i) => a + b * (i + 1), 0) * 2 / len / (1 + len)
}

/**
 * Sums values in iterable
 * @param itr Iterable
 * @returns Sum value
 */
export function sum(itr: Iterable<number>) {
    let s = 0
    for (const v of itr) s += v
    return s
}

/**
 * Combines 2 array
 * @param map Map function
 * @returns Combined array
 */
export function combineArray<T, R>(a: readonly T[], b: readonly T[], map: (a: T, b: T) => R) {
    const max = a.length > b.length ? a.length : b.length
    const arr: R[] = []
    for (let i = 0; i < max; i++) arr[i] = map(a[i]!, b[i]!)
    return arr
}

/**
 * Pushes an element in array. If reaches limit, shifts array
 * @param arr Array
 * @param elm Element to be added
 * @param limit Length limit
 * @returns Length
 */
export function pushLimit<T>(arr: T[], elm: T, limit: number) {
    arr.push(elm)
    if (arr.length > limit) arr.splice(0, arr.length - limit)

    return arr.length
}

/**
 * Creates a CSS cell bar background formatter
 * @param col1 Color 1
 * @param col2 Color 2
 * @returns CSS horizontal cell bar background formatter. Takes 1 argument: rate (0-1)
 */
export function cellBar(col1: readonly number[], col2: readonly number[]) {
    return (rate: number) => `linear-gradient(to right, rgba(${combineArray(col1, col2, (a, b) => a + (b - a) * rate)}) 0 ${rate * 100}%, transparent 0)`
}

/**
 * Creates error notification element
 * @param level Error level
 * @param content Text content
 */
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

/**
 * Creates a stack element
 * @param stack Stack
 * @param hideInspector Hides inspector stack (default: true)
 * @returns Stack element
 */
export function formatStack(stack: string, hideInspector = true) {
    const c = document.createElement('div')
    c.classList.add('ji-stack', 'ji-stack-close')

    let opened = false

    // open / close
    const eo = stackElipsis.cloneNode(true)
    eo.addEventListener('click', () => {
        // open
        if (opened = !opened) {
            c.classList.remove('ji-stack-close')
            c.lastElementChild?.append(eo)
        }
        // close
        else {
            c.classList.add('ji-stack-close')
            c.firstElementChild?.append(eo)
        }
    })

    // creates stack
    for (const [stk, source] of stack.matchAll(/(?<=^ *at ).*?\((.*?)\)(?=\r?\n)/gm)) {
        if (hideInspector && source?.startsWith('debugger')) continue

        const x = c.appendChild(document.createElement('div'))
        x.textContent = stk
        if (source === 'native') x.classList.add('ji-stack-native')
    }

    // append elipsis
    c.firstElementChild?.append(eo)

    return c
}

/**
 * Formats string stack
 * @param stack Stack
 * @param replacer Prefix replacer
 * @returns Formatted stack
 */
export function formatStackText(stack: string, replacer = '') {
    return stack.replace(/^ *at /gm, replacer)
}

/**
 * Gets element by ID. Throws if not found
 * @param id Element ID
 * @param validate Expected element type
 * @param root Root (default: document)
 * @param removeAfterFound Removes the element after found (default: false)
 * @returns 
 */
export function getIdThrow<T extends typeof HTMLElement = typeof HTMLElement>(id: string, validate?: T | null, root: NonElementParentNode = document, removeAfterFound = false): InstanceType<T> {
    const elm = root.getElementById(id) as InstanceType<T>
    if (!elm) throw new ReferenceError(`Element ID ${id} not found`)
    if (validate && !(elm instanceof validate)) throw new TypeError(`Element ID ${id} is not an instance of ${validate.name} (got ${(elm as HTMLElement).tagName})`)

    if (removeAfterFound) elm.removeAttribute('id')
    return elm
}

/**
 * Creates query selector. THrows if not found
 * @param selector Query selector
 * @param validate Expected element type
 * @param root Root element (default: document)
 * @returns ELement
 */
export function querySelectorThrow<T extends typeof HTMLElement = typeof HTMLElement>(selector: string, validate?: T | null, root: ParentNode = document): InstanceType<T> {
    const elm = root.querySelector(selector) as InstanceType<T>
    if (!elm) throw new ReferenceError(`Element ID ${selector} not found`)
    if (validate && !(elm instanceof validate)) throw new TypeError(`Element ID ${selector} is not an instance of ${validate.name} (got ${(elm as HTMLElement).tagName})`)

    return elm
}
/**
 * Creates a POST request
 * @param url URL
 * @param data Post body
 * @param init Fetch init 
 * @returns Response
 */
export function post(url: string, data: BodyInit | null | undefined, init?: RequestInit) {
    return fetch(url, {
        ...init,
        method: 'POST',
        body: data,
    })
}

/**
 * Throws response if error
 * @param res Response
 */
export async function resThrowIfError(res: Response) {
    if (!(res.ok || res.redirected)) throw new Error(res.url + ' ' + res.status + ' ' + res.statusText)
    return res
}

/**
 * Decodes base64 to buffer
 * @param str Base64 string
 * @returns Uinr8Array
 */
export function decodeBase64(str: string) {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (var i = 0, n = binaryString.length; i < n; i++) bytes[i] = binaryString.charCodeAt(i)
    return bytes
}

export function textApplier<T>(replacer: T extends string ? { (value: T): string } | void : { (value: T): string }, elm: Node) {
    return (value: T) => void ( elm.textContent = replacer ? replacer(value) : typeof value === 'string' ? value : String(value) )
}
