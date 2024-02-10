namespace DebugProxyOverride {
    export class ProxyWrapper<T extends object> {
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

    export const RawProxy = Proxy
    export const proxyList = new WeakMap<object, Data>()

    export interface Data<T extends object = object> {
        object: T
        handler: ProxyHandler<T>
        revoke?: () => void
    }
}

export default DebugProxyOverride
