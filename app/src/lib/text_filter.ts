import IteatorUtil from "./iterator"
import { getIdThrow } from "./misc"

/**
 * Initializes filter sets
 * @param root Root element. Child should contain `input` element with `filter` attribute
 * @param filterPrefix Filter prefix
 * @param filterApply Element which filter will be applied to
 */
export function initFilter(root: ParentNode | string, filterPrefix: string, filterApply: HTMLElement | Iterable<HTMLElement>) {
    if (typeof root === 'string') root = getIdThrow(root)

    const filterApplyItr = filterApply instanceof HTMLElement ? [filterApply] : filterApply

    for (const input of IteatorUtil.list(root.querySelectorAll<HTMLInputElement>('input[filter]'))) {
        const name = filterPrefix + input.getAttribute('filter')
        const change = () => { for (const elm of filterApplyItr) elm.classList[input.checked ? 'add' : 'remove'](name) }
    
        input.addEventListener('change', change)
        change()
    }
}

/**
 * Initializes filter text
 * @param input Input element / ID
 * @param filterPrefix FIlter prefix
 * @param filterCb Filter callback, with CSS expression as first arg
 * @param multipleOr If multiple filter expression is detected, one of expression must match
 */
export function initFilterText(input: HTMLInputElement | string, filterPrefix: string | string[], filterCb: (fi: string) => void, multipleOr = true) {
    if (typeof input === 'string') input = getIdThrow(input, HTMLInputElement)
    const e = input
    
    input.addEventListener('change', () => filterCb(cssFilter(e.value, filterPrefix)))
}

export const cssFilterRegex = /(!?)([*^$]?)(\w+)/g

/**
 * Creates CSS expression for filter
 * @param filter Filter expression.
 * Prefix can be:
 * - `!` to exclude
 * - `^` for match begining
 * - `*` for includes
 * - `$` for match end
 * @param prefix Filter prefix
 * @param multipleOr If multiple expression is detected, one of expression must match
 * @returns 
 */
export function cssFilter(filter: string, prefix: string | string[], multipleOr = true) {
    const list = prefix instanceof Array ? prefix : [prefix]

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

/**
 * Parses filter expression
 * @param fi Filter expression
 */
export function parseFilterText(fi: string): Filter[] {
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

/**
 * Creates filter text matcher function
 * @param fi Filter expression
 * @returns Filter matching function
 */
export function filterTextFn(fi: string): (v: string) => boolean {
    const fix = parseFilterText(fi)
    return (str) => fix.every(fi => {
        const b = fi.type === '==' ? str === fi.value : str[fi.type](fi.value)
        return fi.not ? !b : b
    })
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