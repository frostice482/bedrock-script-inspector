import { variables } from "@minecraft/server-admin";
import debugConsoleOverride from "../override/console.js";
import debugClient from "./client.js";

var rc = debugConsoleOverride

const autoconnect = variables.get('debug_autoconnect')
if (autoconnect) {
    rc.rawLog('[inspector] Autoconnect')

    const address = autoconnect.address
    const username = autoconnect.username
    const password = autoconnect.password

    debugClient.connect(address, username, password)
}