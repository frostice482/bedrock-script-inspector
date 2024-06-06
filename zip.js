//@ts-check

const fs = require('fs')
const fsp = require('fs/promises')
const { ZipFile } = require('yazl')

/**
 * 
 * @param {string} target
 * @param {string | undefined} context
 * @return {AsyncGenerator<string>}
 */
async function* files(target, context = undefined) {
    const targetContext = context ? context + '/' + target : target

    const stat = await fsp.stat(targetContext)
    if (stat.isFile()) yield targetContext
    else for (const x of await fsp.readdir(targetContext)) yield* files(x, targetContext)
}

const include = [
    'app/main.html',
    'app/icon.svg',
    'app/scripts',
    'app/style',

    'pack/scripts',
    'pack/manifest.json',

    'server/app',
    'server/package.json',

    'license',
    'readme.md',
    'install.sh',
    'install.bat'
]

const zip = new ZipFile()
const zipstr = fs.createWriteStream('bundle.zip')
zip.outputStream.pipe(zipstr)
zip.outputStream.once('end', () => console.log('done'))

;(async() => {
    // include
    for (const incl of include)
        for await (const entry of files(incl))
            zip.addFile(entry, entry)
    
    // extras
    zip.addEmptyDirectory('pack/subpacks')

    zip.end()
})()
