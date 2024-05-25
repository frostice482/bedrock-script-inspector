import DebugClient from "@client";

DebugClient.message.addEventListener('disconnect', () => DebugClient.disconnect())
