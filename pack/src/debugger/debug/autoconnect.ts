import { variables } from "@minecraft/server-admin";
import DebugConsoleOverride from "../override/console.js";
import DebugClient from "./client.js";

var rc = DebugConsoleOverride

const autoconnect = variables.get('debug_autoconnect')
if (autoconnect) {
    rc.rawLog('[inspector] Autoconnect')

    const address = autoconnect.address
    const username = autoconnect.username
    const password = autoconnect.password

    DebugClient.connect(address, username, password)
}