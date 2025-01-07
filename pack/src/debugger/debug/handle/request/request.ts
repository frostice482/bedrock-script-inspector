import TypedEventEmitter from "@/typedevm"
import InspectorClient from "@client"
import ClientType from "@type/client"

const clientRequests = new TypedEventEmitter<{ [K in ClientType.Request.Values]: ClientType.Request<K> }>()
InspectorClient.message.addEventListener('req', (req) => clientRequests.emit(req.name, req))

export default clientRequests
