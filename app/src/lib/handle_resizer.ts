import { getIdThrow } from "./misc.js"

/**
 * Creates a resizer
 * @param elm Element to be resized
 * @param handle Resize handler
 * @param rx Horizontal resize multiplier
 * @param ry Vertical resize multiplier
 * @returns AbortController - stops the resizer on abort
 */
export default function handleResizer(elm: HTMLElement, handle: HTMLElement | string, rx: number = 0, ry: number = 0) {
    const ab = new AbortController

    if (typeof handle === 'string') handle = getIdThrow(handle)

    handle.addEventListener('pointerdown', (ev) => {
        let { x, y } = ev
        let { width, height } = elm.getBoundingClientRect()
        
        if (rx) elm.style.width = width + 'px'
        if (ry) elm.style.height = height + 'px'

        const ab = new AbortController, { signal } = ab

        // selection cancel
        window.addEventListener('selectstart', ev => ev.preventDefault(), { signal })

        // handle move -- resize
        window.addEventListener('pointermove', ev => {
            const { x: curX, y: curY } = ev

            if (rx) elm.style.width = width + (curX - x) * rx + 'px'
            if (ry) elm.style.height = height + (curY - y) * ry + 'px'
        }, { signal })

        // pointer up -- remove listeners
        window.addEventListener('pointerup', () => ab.abort(), { once: true })
    }, { signal: ab.signal })

    return ab
}
