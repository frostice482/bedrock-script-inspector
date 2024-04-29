const charSets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function encodeBase64(buf: Uint8Array | readonly number[]) {
    const buflen = buf.length
    const stringArr = Array<string>(Math.ceil(buf.length / 3))

    let bufOff = 0, strOff = 0
    while (bufOff < buflen) {
        // buffer bytes to base64
        const {
            [bufOff++]: a = 0,
            [bufOff++]: b = 0,
            [bufOff++]: c = 0
        } = buf
        
        const bit24 = a << 16 | b << 8 | c
        const res = charSets[bit24 >> 18 & 0o77] as string
            + charSets[bit24 >> 12 & 0o77]
            + charSets[bit24 >> 6 & 0o77]
            + charSets[bit24 & 0o77]

        // detect padding
        const pad = bufOff > buflen ? bufOff - buflen : 0 // 2 or 1
        if (pad) {
            const padded = res.slice(0, -pad) + '='.repeat(pad)
            stringArr[strOff] = padded
            break
        }

        // push
        stringArr[strOff++] = res
    }
    
    return stringArr.join('')
}
