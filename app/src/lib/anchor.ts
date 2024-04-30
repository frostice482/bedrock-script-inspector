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
): [x: number, y: number] {
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
    /**
     * Multiplier mapping, from top-left (0.0, 0.0) to bottom-right (1.0, 1.0)
     */
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
