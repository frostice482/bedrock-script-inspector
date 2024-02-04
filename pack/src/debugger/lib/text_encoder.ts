// from https://gist.github.com/Yaffle/5458286 - Modified

// TextEncoder/TextDecoder polyfills for utf-8 - an implementation of TextEncoder/TextDecoder APIs
// Written in 2013 by Viktor Mukhachev <vic99999@yandex.ru>
// http://creativecommons.org/publicdomain/zero/1.0/

export function encodeText(string: string) {
    return new Uint8Array(encodeTextItr(string))
}

export function* encodeTextItr(string: string) {
    for (const char of string) {
        const codePoint = char.codePointAt(0) as number
        
        var c = 0
        var bits = 0
        if (codePoint <= 0x7F) {
            c = 0
            bits = 0x00
        } else if (codePoint <= 0x7FF) {
            c = 6
            bits = 0xC0
        } else if (codePoint <= 0xFFFF) {
            c = 12
            bits = 0xE0
        } else {
            c = 18
            bits = 0xF0
        }
        yield bits | (codePoint >> c)

        for (c -= 6; c >= 0; c -= 6) yield 0x80 | ((codePoint >> c) & 0x3F)
    }
}

/*
export function decodeText(buf: Uint8Array) {
    let stringArr: string[] = []
    let offset = 0

    while (offset < buf.length) {
        const octet = buf[offset] as number

        let bytesNeeded = 0
        let codePoint = 0
        if (octet <= 0x7F) {
            bytesNeeded = 0
            codePoint = octet & 0xFF
        } else if (octet <= 0xDF) {
            bytesNeeded = 1
            codePoint = octet & 0x1F
        } else if (octet <= 0xEF) {
            bytesNeeded = 2
            codePoint = octet & 0x0F
        } else if (octet <= 0xF4) {
            bytesNeeded = 3
            codePoint = octet & 0x07
        }

        if (buf.length - offset - bytesNeeded > 0) {
            for (let k = 0; k < bytesNeeded; k++) {
                const octet = buf[offset + k + 1] as number
                codePoint = (codePoint << 6) | (octet & 0x3F)
            }
        }
        else {
            codePoint = 0xFFFD
            bytesNeeded = buf.length - offset
        }

        stringArr.push(String.fromCodePoint(codePoint))
        offset += bytesNeeded + 1
    }

    return stringArr.join('')
}
*/
