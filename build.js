//@ts-check

const fsp = require('fs/promises')
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

    const opts = {
        entryPoints: [entry],
        format,
        platform,
        tsconfig,

        bundle: true,
        minify: true
    }

    if (out[0] === '^') opts.outdir = out.slice(1)
    else opts.outfile = out

    await build(Object.assign(opts, more))

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
    external: ['*'],
    minify: false
})
