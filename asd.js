const fsp = require('fs/promises')

async function mod(path) {
	const content = await fsp.readFile(path, 'utf8').catch(() => undefined)
	if (!content) return

	const tabsReplaced = content.replace(/^ +/gm, v => '\t'.repeat(Math.floor(v.length/4)) + ' '.repeat(v.length % 4))
	await fsp.writeFile(path, tabsReplaced)
}

async function rec(path = '.') {
	const dirs = await fsp.readdir(path)
	await Promise.all(
		dirs.map(async dir => {
			if (dir === 'node_modules' || dir[0] === '.') return

			const sub = path + '/' + dir
			const stat = await fsp.stat(sub).catch(() => undefined)
			if (!stat) return

			if (stat.isFile()) await mod(sub)
			else await rec(sub)
		})
	)
}

rec()