import debugClient from "../../client.js";

debugClient.message.addEventListener('disconnect', () => debugClient.disconnect())
