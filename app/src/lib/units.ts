export function valueUnit(value: number, names: readonly any[], base = 1000, precision = Math.ceil(Math.log(base)), baseBack = base) {
    if (!value) return (Number.isInteger(value) ? value : value.toPrecision(precision)) + names[0]

    const ix = Math.trunc(Math.log(value) / Math.log(base))
    const limit = names.length - 1

    if (ix === 0) return (Number.isInteger(value) ? value : value.toPrecision(precision)) + names[0]
    
    return ix > limit
        ? (value / Math.pow(baseBack, limit)).toFixed(0) + names[limit]
        : (value / Math.pow(baseBack, ix)).toPrecision(precision) + names[ix]
}

export const byteUnits = ['B', 'KB', 'MB', 'GB']
export function byteUnit(value: number | null) {
    return value === null ? '--' : valueUnit(value, byteUnits, 1000, 3, 1024)
}

export const timeUnits = ['ms', 's', 'm', 'h']
export function timeUnit(value: number | null) {
    return value === null ? '--' : valueUnit(value, timeUnits, 1000, 3, 1000)
}
