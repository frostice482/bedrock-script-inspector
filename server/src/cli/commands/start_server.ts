import chalk = require('chalk')
import { DeepPartialReadonly } from '../../../../globaltypes/types.js'

export default async function cliStartServer(port: number, opts?: DeepPartialReadonly<CLIStartServerOptions>) {
    const { authUser, authPass } = opts ?? {}

    // command data
    const cdata: any = {
        address: '127.0.0.1:' + port
    }
    if (authUser && authPass) {
        cdata.username = authUser
        cdata.password = authPass
    }

    console.log('Staring server on listen mode')
    console.log('To connect from BDS, enter command', chalk.greenBright('/scriptevent debug:connect ' + JSON.stringify(cdata)))

    // start server
    const { listenServer } = await import('../../server.js')
    await listenServer(port, authUser, authPass, true)
}

export interface CLIStartServerOptions {
    authUser?: string
    authPass?: string
}
