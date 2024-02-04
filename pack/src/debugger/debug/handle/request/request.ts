import ClientType from "../../../../../../globaltypes/client.js";
import TypedEventEmitter from "../../../lib/typedevm.js";
import debugClient from "../../client.js";

const clientRequests = new TypedEventEmitter<{ [K in ClientType.Request.Values]: ClientType.Request<K> }>()
debugClient.message.addEventListener('req', (req) => clientRequests.emit(req.name, req))

export default clientRequests
