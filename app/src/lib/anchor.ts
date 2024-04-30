/**
 * Gets anchor position for elements
 * @param elementBox Element bounding box, must contain size
 * @param parentBox Parent bounding box, must contain size while also can optionally contain offset
 * @param elementAnchor Side of the element where will be anchored. `bottomright` means the anchor will be at the element's bottom right
 * @param parentAnchor Side of the parent where anchor will be located at. `topcenter` means the anchor will be located at the top center of the parent
 * @returns Anchor position
 */
export function Anchor (
    elementBox: Anchor.ReadonlySize | HTMLElement,
    parentBox: Anchor.ReadonlySizeWithOptionalOffset | HTMLElement,
    elementAnchor: AnchorOrMul,
    parentAnchor: AnchorOrMul
): Anchor.ReadonlyOffset {
    const {x: xp, y: yp} = typeof parentAnchor === 'string' ? Anchor.multipliers[parentAnchor] : parentAnchor
    const {x: xe, y: ye} = typeof elementAnchor === 'string' ? Anchor.multipliers[elementAnchor] : elementAnchor

    const { width: wp, height: hp, x = 0, y = 0 } = parentBox instanceof HTMLElement ? parentBox.getBoundingClientRect() : parentBox
    const { width: we, height: he } = elementBox instanceof HTMLElement ? elementBox.getBoundingClientRect() : elementBox

    return {
        x: wp * xp - we * xe + x,
        y: hp * yp - he * ye + y,
    }
}

export namespace Anchor {
    /**
     * Multiplier mapping, from top-left (0.0, 0.0) to bottom-right (1.0, 1.0)
     */
    export const multipliers: Record<Anchor, ReadonlyOffset> = {
        topleft     : {x: 0.0, y: 0.0},
        topcenter   : {x: 0.5, y: 0.0},
        topright    : {x: 1.0, y: 0.0},
        middleleft  : {x: 0.0, y: 0.5},
        middlecenter: {x: 0.5, y: 0.5},
        middleright : {x: 1.0, y: 0.5},
        bottomleft  : {x: 0.0, y: 1.0},
        bottomcenter: {x: 0.5, y: 1.0},
        bottomright : {x: 1.0, y: 1.0},
    }
    Object.setPrototypeOf(multipliers, null)

    /**
     * Anchor reversal
     */
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

    export type Vertical = 'top' | 'middle' | 'bottom'
    export type Horizontal = 'left' | 'center' | 'right'

    export interface ReadonlySize {
        readonly height: number;
        readonly width: number;
    }

    export interface ReadonlyOffset {
        readonly x: number
        readonly y: number
    }

    export interface ReadonlySizeWithOptionalOffset extends ReadonlySize, Partial<ReadonlyOffset> {}
}

export type Anchor = `${Anchor.Vertical}${Anchor.Horizontal}`
export type AnchorOrMul = Anchor | Anchor.ReadonlyOffset
