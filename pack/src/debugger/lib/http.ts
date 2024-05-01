import { HttpRequest, HttpRequestMethod, http, HttpResponse } from '@minecraft/server-net'
import { iteratePair } from './util.js'
import { DeepPartialReadonly } from '@globaltypes/types.js'

namespace HttpUtil {
    export function get(url: string, headers?: HeaderList) {
        const req = new HttpRequest(url)
        req.setMethod(HttpRequestMethod.Get)
        if (headers) for (const [k, v] of iteratePair(headers)) if (v) req.addHeader(k, v)

        return http.request(req)
    }

    export function head(url: string, headers?: HeaderList) {
        const req = new HttpRequest(url)
        req.setMethod(HttpRequestMethod.Head)
        if (headers) for (const [k, v] of iteratePair(headers)) if (v) req.addHeader(k, v)

        return http.request(req)
    }

    export function post(url: string, body: string, headers?: HeaderList) {
        const req = new HttpRequest(url)
        req.setMethod(HttpRequestMethod.Post)
        req.setBody(body)
        if (headers) for (const [k, v] of iteratePair(headers)) if (v) req.addHeader(k, v)
        
        return http.request(req)
    }

    export function fetch(method: HttpRequestMethod, url: string, opts: DeepPartialReadonly<FetchOptions> = {}) {
        const { headers, body, timeout } = opts

        const req = new HttpRequest(url)
        req.setMethod(method)

        if (body) req.setBody(body)
        if (timeout) req.setTimeout(timeout)
        if (headers) for (const [k, v] of iteratePair(headers as HeaderList)) if (v) req.addHeader(k, v)

        return http.request(req)
    }

    export function throwIfError(res: HttpResponse, req?: HttpRequest) {
        if (res.status >= 400) throw new Error(req ? req.method + ' ' + req.uri + ' ' + res.status : 'HTTP status ' + res.status)
        return res
    }
    
    export interface FetchOptions {
        headers: HeaderList
        body: string
        timeout: number
    }

    type HeaderList = ReadonlyObjectOrIterable<string, string | undefined>
}

export default HttpUtil
