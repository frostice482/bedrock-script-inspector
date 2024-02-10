import DebugClient from "../../client.js";

DebugClient.message.addEventListener('disconnect', () => DebugClient.disconnect())
