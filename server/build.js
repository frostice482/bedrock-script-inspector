import esbuild from 'esbuild'
import tscalias from 'tsc-alias'
import fsp from 'fs/promises'

const base = import.meta.dirname

await fsp.rm(base + '/app', { recursive: true, force: true })

await esbuild.build({
	entryPoints: [base + '/src/**/*'],
	outdir: base + '/app',

	format: 'esm',
	platform: 'node',

	tsconfig: base + '/tsconfig.json'
})

await tscalias.replaceTscAliasPaths({
	configFile: base + '/tsconfig.json',
	resolveFullExtension: '.js',
	resolveFullPaths: true
})
