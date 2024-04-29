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
