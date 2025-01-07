#!/usr/bin/env node
import cp from 'child_process'
import os from 'os'

const ua = process.env.npm_config_user_agent
let shellCommand = ua.startsWith('pnpm') ? 'pnpm' : ua.startsWith('yarn') ? 'yarn' : 'npm'
if (os.platform() === 'win32') shellCommand += '.cmd'

cp.spawn(shellCommand, ['i'], {
	cwd: import.meta.dirname,
	shell: true,
	stdio: ['pipe', 'inherit', 'inherit']
})
