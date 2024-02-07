//@ts-check

const crypto = require('crypto')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const tinyglob = require('tiny-glob')
const { build } = require('esbuild')
const { ZipFile } = require('yazl')

/**
 * @param {string} dir 
 * @param {string} out 
 * @param {boolean | undefined} removeDir 
 * @param {import('esbuild').BuildOptions | undefined} opts 
 */
async function buildBundleScript(dir, out, removeDir = false, opts = undefined) {
    const temp = crypto.randomBytes(8).toString('hex') + '.js'

    await build({
        inject: await tinyglob((dir || '.') + '/**/*.{ts,js}', { filesOnly: true }),
        stdin: { contents: '' },

        outfile: temp,
        format: 'esm',
        bundle: true,
        minify: true,

        ...opts
    })
    
    const outDir = path.dirname(out)

    if (removeDir) await fsp.rm(outDir, { force: true, recursive: true })
    await fsp.mkdir(outDir, { recursive: true })
    await fsp.rename(temp, out)
}

/**
 * 
 * @param {string} target
 * @param {string | undefined} context
 * @return {Promise<string[]>}
 */
async function files(target, context = undefined) {
    const targetContext = context ? context + '/' + target : target

    const stat = await fsp.stat(targetContext)
    if (stat.isFile()) return [targetContext]

    return fsp.readdir(targetContext)
        .then(dirfiles => Promise.all(dirfiles.map(v => files(v, targetContext))))
        .then(dirs => dirs.flat())
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

;(async() => {
    console.log('building app scripts')
    await buildBundleScript('app/src', 'app/scripts/index.js', true, {
        platform: 'browser',
        tsconfig: 'app/tsconfig.json'
    })

    console.log('building pack scripts')
    await buildBundleScript('pack/src', 'pack/scripts/debugger/bundle.js', true, {
        external: [
            '@minecraft/server',
            '@minecraft/server-gametest',
            '@minecraft/server-ui',
            '@minecraft/server-net',
            '@minecraft/server-admin',
            './dropper.js'
        ],
        tsconfig: 'pack/tsconfig.json'
    })
    await fsp.writeFile('pack/scripts/debugger/dropper.js', '//')
    await fsp.writeFile('pack/scripts/debugger/index.js', [
        "import './bundle.js'",
        "import './dropper.js'"
    ].join('\n'))

    console.log('building server scripts')
    await fsp.rm('server/app', { force: true, recursive: true })
    await build({
        entryPoints: await tinyglob('server/src/**/*.{ts,js}', { filesOnly: true }),
        stdin: { contents: '' },

        outdir: 'server/app',
        format: 'cjs',
        platform: 'node',
        minify: true,

        tsconfig: 'server/tsconfig.json',
        
    })

    const zip = new ZipFile()

    // includes
    console.log('bundling')
    for (const incl of include)
        for (const entry of await files(incl))
            zip.addFile(entry, entry)
    
    zip.addEmptyDirectory('pack/subpacks')
    
    // stream out
    const zipstr = fs.createWriteStream('build.zip')
    zip.outputStream.pipe(zipstr)
    zip.outputStream.once('end', () => console.log('done'))
})()
