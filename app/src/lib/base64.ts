const charSets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const backCharSets = Object.fromEntries(Array.from(charSets, (v, i) => [v, i]))

export function decodeBase64(str: string) {
    // reduce trailing equal sign
    let max = str.length
    while (str[--max] === '=');

    const bufLen = Math.ceil(max / 4 * 3)
    const buf = new Uint8Array(bufLen)

    let arrOffset = -1, strOff = 0
    while (strOff < max) {
        // base64 to buffer bytes
        const {
            [strOff++]: a = 'A',
            [strOff++]: b = 'A',
            [strOff++]: c = 'A',
            [strOff++]: d = 'A'
        } = str

        const bit24 = backCharSets[a]! << 18
            | backCharSets[b]! << 12
            | backCharSets[c]! << 6
            | backCharSets[d]!
        
        // append
        buf[++arrOffset] = bit24 >> 16
        if (++arrOffset < bufLen) buf[arrOffset] = bit24 >> 8 & 0xff
        if (++arrOffset < bufLen) buf[arrOffset] = bit24 & 0xff
    }

    return buf
}
