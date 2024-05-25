import DebugClient from "@client"
import ClientType from "@globaltypes/client.js"
import TypedEventEmitter from "@typedevm.js"

const clientRequests = new TypedEventEmitter<{ [K in ClientType.Request.Values]: ClientType.Request<K> }>()
DebugClient.message.addEventListener('req', (req) => clientRequests.emit(req.name, req))

export default clientRequests
