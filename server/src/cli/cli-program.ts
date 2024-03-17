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
    .version('v1.0.0')

program.command('add-pack')
    .aliases(['ap'])
    .description('Adds a pack to be debugged')
    .argument('<dir>', 'Directory to the origin path to be added')
    .option('-c, --copy', 'Copies the pack instead of creating symlink')
    .action(async (path, opts) => {
        exec(await import('./commands/pack/add.js').then(f => f.cliAddPack), [path, opts])
    })

program.command('remove-pack')
    .aliases(['rp'])
    .description('Removes debugged pack')
    .action(async () => {
        exec(await import('./commands/pack/rm.js').then(f => f.cliAddPack), [])
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
    .argument('<dir>', 'BDS Directory')
    .argument('[level]', 'World level-name to use')
    .option('-c, --copy', 'Copies the pack instead of creating symlink')
    .action(async (dir, level, opts) => {
        exec(await import('./commands/bds/add.js').then(f => f.cliAddBds), [dir, level, opts])
    })

program.command('remove-bds')
    .aliases(['rb'])
    .description('Removes pack to BDS')
    .argument('<dir>', 'BDS Directory')
    .argument('[level]', 'World level-name to use')
    .action(async (dir, level) => {
        exec(await import('./commands/bds/rm.js').then(f => f.cliRmBds), [dir, level])
    })

program.command('start-bds')
    .aliases(['sb'])
    .description('Starts BDS inspector server')
    .argument('<dir>', 'BDS Directory')
    .argument('<port>', 'Server port')
    .option('-a, --add', 'Adds pack to BDS before starting')
    .option('-aC, --add-copy', 'Copies the pack instead of creating symlink')
    .option('-r, --remove', 'Removes pack from BDS atter close')
    .option('-!hS, --no-stats', 'Do not handle script exportstats')
    .option('-!hP, --no-profiler', 'Do not handle script profiler')
    .addOption(optAuthUser)
    .addOption(optAuthPass)
    .action(async (dir, port, opts) => {
        exec(await import('./commands/bds/start.js').then(f => f.startBdsServer), [dir, port, opts])
    })

program.parse()
