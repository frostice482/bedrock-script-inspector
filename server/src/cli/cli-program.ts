#!/usr/bin/env node

import { Option, program } from "commander";

async function exec<F extends (...args: any[]) => any>(fn: F, args: Parameters<F>) {
	try { await fn.apply(undefined, args) }
	catch(e) { throw e instanceof Error ? e : typeof e === 'string' ? Error(e) : e }
}

const optAuthUser = new Option('-au, --auth-user <username>', 'Authentication username').env('auth_username')
const optAuthPass = new Option('-ap, --auth-pass <password>', 'Authentication password').env('auth_password')

program
	.name('bsi')
	.description('CLI for Minecraft Bedrock Script API Inspector')
	.version('v1.3.0')

program.command('attach-pack')
	.aliases(['ap'])
	.description('Attach inspector to a pack')
	.argument('[dir]', 'Pack directory')
	.option('-c, --copy', 'Copies inspector pack instead of linking')
	.action(async (path, opts) => {
		exec(await import('./commands/pack/add.js').then(f => f.cliAddPack), [path, opts])
	})

program.command('detach-pack')
	.aliases(['dp'])
	.description('Detach inspector from a pack')
	.argument('[dir]', 'Pack directory')
	.action(async (path) => {
		exec(await import('./commands/pack/rm.js').then(f => f.cliRemovePack), [path])
	})

program.command('server')
	.aliases(['s'])
	.description('Starts inspector server (listen)')
	.argument('<port>', 'Server port')
	.addOption(optAuthUser)
	.addOption(optAuthPass)
	.action(async (port, opts) => {
		exec(await import('./commands/start_server.js').then(f => f.cliStartServer), [port, opts])
	})

program.command('add-bds')
	.aliases(['ab'])
	.description('Adds pack to BDS')
	.argument('<packDir>', 'Pack Directory')
	.argument('[dir]', 'BDS Directory')
	.option('-c, --copy', 'Copies the pack instead of creating symlink')
	.option('-l, --level <uuid>', 'Level name')
	.action(async (packDir, dir, opts) => {
		exec(await import('./commands/bds/add.js').then(f => f.cliAddBds), [packDir, dir, opts])
	})

program.command('remove-bds')
	.aliases(['rb'])
	.description('Removes pack from BDS')
	.argument('[dir]', 'BDS Directory')
	.option('-l, --level <uuid>', 'Level name')
	.option('-pu, --puuid <uuid>', 'Pack UUID')
	.option('-su, --suuid <uuid>', 'Script module UUID')
	.action(async (dir, opts) => {
		exec(await import('./commands/bds/rm.js').then(f => f.cliRmBds), [dir, opts])
	})

program.command('start-bds')
	.aliases(['sb'])
	.description('Starts BDS inspector server')
	.argument('<port>', 'Server port')
	.argument('[dir]', 'BDS Directory')
	.option('-a, --add', 'Adds pack to BDS before starting')
	.option('-aC, --add-copy', 'Copies the pack instead of creating symlink')
	.option('-r, --remove', 'Removes pack from BDS atter close')
	.addOption(optAuthUser)
	.addOption(optAuthPass)
	.action(async (port, dir, opts) => {
		exec(await import('./commands/bds/start.js').then(f => f.startBdsServer), [port, dir, opts])
	})

program.parse()
