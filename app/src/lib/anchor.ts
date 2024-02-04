export function Anchor(elementBox: Anchor.ReadonlySize | HTMLElement, parentBox: Anchor.ReadonlySizeWithOptionalOffset | HTMLElement, elementAnchor: AnchorOrMul, parentAnchor: AnchorOrMul): [x: number, y: number] {
    const [ xp, yp ] = typeof parentAnchor === 'string' ? Anchor.multipliers[parentAnchor] : parentAnchor
    const [ xe, ye ] = typeof elementAnchor === 'string' ? Anchor.multipliers[elementAnchor] : elementAnchor

    const { width: wp, height: hp, x = 0, y = 0 } = parentBox instanceof HTMLElement ? parentBox.getBoundingClientRect() : parentBox
    const { width: we, height: he } = elementBox instanceof HTMLElement ? elementBox.getBoundingClientRect() : elementBox

    return [
        wp * xp - we * xe + x,
        hp * yp - he * ye + y,
    ]
}

export namespace Anchor {
    export const multipliers: Record<Anchor, AxisMultiplier> = {
        topleft     : [0.0, 0.0],
        topcenter   : [0.5, 0.0],
        topright    : [1.0, 0.0],
        middleleft  : [0.0, 0.5],
        middlecenter: [0.5, 0.5],
        middleright : [1.0, 0.5],
        bottomleft  : [0.0, 1.0],
        bottomcenter: [0.5, 1.0],
        bottomright : [1.0, 1.0],
    }
    Object.setPrototypeOf(multipliers, null)

    export const reverse: Record<Anchor, Anchor> = {
        topleft     : 'bottomright',
        topcenter   : 'bottomcenter',
        topright    : 'bottomleft',
        middleleft  : 'middleright',
        middlecenter: 'middlecenter',
        middleright : 'middleleft',
        bottomleft  : 'topright',
        bottomcenter: 'topcenter',
        bottomright : 'topleft',
    }
    Object.setPrototypeOf(reverse, null)

    export const reverseHorizontal: Record<Anchor, Anchor> = {
        topleft     : 'topright',
        topcenter   : 'topcenter',
        topright    : 'topleft',
        middleleft  : 'middleright',
        middlecenter: 'middlecenter',
        middleright : 'middleleft',
        bottomleft  : 'bottomright',
        bottomcenter: 'bottomcenter',
        bottomright : 'bottomleft',
    }
    Object.setPrototypeOf(reverseHorizontal, null)

    export const reverseVertical: Record<Anchor, Anchor> = {
        topleft     : 'bottomleft',
        topcenter   : 'bottomcenter',
        topright    : 'bottomright',
        middleleft  : 'middleleft',
        middlecenter: 'middlecenter',
        middleright : 'middleright',
        bottomleft  : 'topleft',
        bottomcenter: 'topcenter',
        bottomright : 'topright',
    }
    Object.setPrototypeOf(reverseVertical, null)

    export type Vertical = 'top' | 'middle' | 'bottom'
    export type Horizontal = 'left' | 'center' | 'right'
    export type AxisMultiplier = [horizontal: number, vertical: number]

    export interface ReadonlySize {
        readonly height: number;
        readonly width: number;
    }

    export interface ReadonlySizeWithOptionalOffset extends ReadonlySize {
        readonly y?: number;
        readonly x?: number;
    }
}

export type Anchor = `${Anchor.Vertical}${Anchor.Horizontal}`
export type AnchorOrMul = Anchor | Anchor.AxisMultiplier
