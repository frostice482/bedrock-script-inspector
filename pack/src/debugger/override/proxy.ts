const RawProxy = Proxy
const proxyList = new WeakMap<object, ProxyData>()

class ProxyWrapper<T extends object> {
    static revocable<T extends object>(object: T, handler: ProxyHandler<T>) {
        const { proxy, revoke: rawRevoke } = RawProxy.revocable(object, handler)

        const revoke = () => {
            rawRevoke()
            proxyList.delete(proxy)
        }

        proxyList.set(proxy, {
            object,
            handler,
            revoke
        })

        return { proxy, revoke }
    }

    constructor(object: T, handler: ProxyHandler<T>) {
        const proxy = new RawProxy(object, handler)
        proxyList.set(proxy, {
            object,
            handler,
        })

        return proxy
    }
}

//@ts-ignore
Proxy = ProxyWrapper

const debugProxyOverride = {
    RawProxy,
    proxyList
}
export default debugProxyOverride

export interface ProxyData<T extends object = object> {
    object: T
    handler: ProxyHandler<T>
    revoke?: () => void
}
