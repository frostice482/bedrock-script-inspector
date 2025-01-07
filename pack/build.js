import esbuild from 'esbuild'
import fsp from 'fs/promises'

const base = import.meta.dirname

await fsp.rm(base + '/scripts', { recursive: true, force: true })

await esbuild.build({
	entryPoints: [base + '/src/index.ts'],
	outfile: base + '/scripts/_inspector_bundle.js',

	format: 'esm',
	platform: 'neutral',
	bundle: true,

	external: [
		'@minecraft/server',
		'@minecraft/server-gametest',
		'@minecraft/server-ui',
		'@minecraft/server-net',
		'@minecraft/server-admin',
		'@minecraft/debug-utilities',
	],
	tsconfig: base + '/tsconfig.json'
})
