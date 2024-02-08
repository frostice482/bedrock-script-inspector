//@ts-check

const crypto = require('crypto')
const fsp = require('fs/promises')
const path = require('path')
const { build } = require('esbuild')

/**
 * 
 * @param {string} entry 
 * @param {string} out 
 * @param {import('esbuild').Format} format 
 * @param {import('esbuild').Platform} platform 
 * @param {string | undefined} tsconfig 
 * @param {import('esbuild').BuildOptions | undefined} more 
 */
async function bundleBuild(entry, out, format, platform, tsconfig = undefined, more = {}) {
    console.time(entry)

    const temp = crypto.randomBytes(8).toString('hex')
    const isDir = out[0] === '^' && (out = out.slice(1), true)
    const parRef = path.dirname(out)

    // options
    /** @type {import('esbuild').BuildOptions} */
    const opts = {
        entryPoints: [entry],
        [isDir ? 'outdir' : 'outfile']: temp,
        format,
        platform,
        tsconfig,

        bundle: true,
        minify: true
    }

    // build
    await build(Object.assign(opts, more))

    await fsp.rm(isDir ? out : parRef, { force: true, recursive: true })
    await fsp.mkdir(parRef, { recursive: true })
    await fsp.rename(temp, out)

    console.timeEnd(entry)
}

bundleBuild('app/src/index.ts', 'app/scripts/index.js', 'esm', 'browser', 'app/tsconfig.json')

bundleBuild('pack/src/debugger/index.ts', 'pack/scripts/debugger/bundle.js', 'esm', 'neutral', 'pack/tsconfig.json', {
    external: [
        '@minecraft/server',
        '@minecraft/server-gametest',
        '@minecraft/server-ui',
        '@minecraft/server-net',
        '@minecraft/server-admin'
    ]
}).then(async () => {
    await fsp.writeFile('pack/scripts/debugger/index.js', "import './bundle.js'\nimport './dropper.js'")
    await fsp.writeFile('pack/scripts/debugger/dropper.js', "//")
})

bundleBuild('server/src/**/*', '^server/app', 'cjs', 'node', 'server/tsconfig.json', {
    external: ['*']
})
