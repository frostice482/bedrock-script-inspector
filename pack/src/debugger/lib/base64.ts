import { encodeText } from "./text_encoder.js"

const charSets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(buf: Uint8Array | readonly number[] | string) {
    if (typeof buf === 'string') buf = encodeText(buf)

    const stringArr: string[] = []
    stringArr.length = Math.ceil(buf.length / 3)

    let ptr = 0, aptr = 0
    const len = buf.length

    while (ptr < len) {
        // base64 operation
        const [a = 0, b = 0, c = 0] = buf.slice(ptr, ptr + 3)
        const bit24 = a << 16 | b << 8 | c
        const res = charSets[bit24 >> 18 & 0x3f] as string
            + charSets[bit24 >> 12 & 0x3f]
            + charSets[bit24 >> 6 & 0x3f]
            + charSets[bit24 & 0x3f]

        // increment pointer
        ptr += 3

        // detect padding
        const pad = ptr > len ? ptr - len : 0 // 2 or 1
        if (pad) {
            const padded = res.slice(0, -pad) + '='.repeat(pad)
            stringArr[aptr] = padded
            break
        }

        // push
        stringArr[aptr++] = res
    }
    
    return stringArr.join('')
}

/*
const backCharSets = Object.fromEntries(Array.from(charSets, (v, i) => [v, i]))

export function fromBase64(str: string) {
    return new Uint8Array(fromBase64Itr(str))
}

export function* fromBase64Itr(str: string) {
    let max = str.length
    while (str[--max] === '=');

    const arrLen = Math.ceil(max / 4 * 3)
    let arrPtr = 0
    for (let ptr = 0; ptr <= max; ptr += 4) {
        const [a = 'A', b = 'A', c = 'A', d = 'A'] = str.slice(ptr, ptr + 4)
        const bit24 = backCharSets[a] as number << 18
            | backCharSets[b] as number << 12
            | backCharSets[c] as number << 6
            | backCharSets[d] as number

        arrPtr++; yield bit24 >> 16
        if (arrPtr++ < arrLen) yield bit24 >> 8 & 0xff
        if (arrPtr++ < arrLen) yield bit24 & 0xff
    }
}
*/
