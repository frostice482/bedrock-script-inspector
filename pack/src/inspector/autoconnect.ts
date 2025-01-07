import InspectorClient from "@client"
import { variables } from "@minecraft/server-admin"
import { ConsoleOverride } from "@override"

var rc = ConsoleOverride

const autoconnect = variables.get('debug_autoconnect')
if (autoconnect) {
	rc.rawLog('[inspector] Autoconnect')

	const address = autoconnect.address
	const username = autoconnect.username
	const password = autoconnect.password

	InspectorClient.connect(address, username, password)
}