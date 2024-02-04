const fidlist = new WeakMap<Function, number>()
let newid = 1

export default function getFid(fn: Function) {
    let fid = fidlist.get(fn)
    if (fid === undefined) fidlist.set(fn, fid = newid++)
    return fid
}