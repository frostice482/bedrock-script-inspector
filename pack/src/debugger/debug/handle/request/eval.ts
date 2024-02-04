import * as mc from '@minecraft/server'
import * as gt from '@minecraft/server-gametest'
import * as ui from '@minecraft/server-ui'
import * as net from '@minecraft/server-net'
import * as admin from '@minecraft/server-admin'

import HttpUtil from '../../../lib/http.js'
import { getStackTrace } from '../../../lib/util.js'

import debugDynamicPropertyOverride from '../../../override/dprop.js'
import debugConsoleOverride from '../../../override/console.js'
import debugEventsOverride from '../../../override/events.js'
import debugProxyOverride from '../../../override/proxy.js'
import debugRunOverride from '../../../override/run.js'
import debugClient from '../../client.js'
import clientRequests from './request.js'
import jsonInspect, { JsonInspectInstance, RootRefInspector } from '../../../lib/jsoninspect.js'

const asyncFC = (async function() {}).constructor as FunctionConstructor

clientRequests.addEventListener('eval', async ({ id, data: { 'async': isAsync, code, opts, store, root } }) => {
    await null

    // inspect
    const insp = opts?.function || opts?.object ? new JsonInspectInstance() : jsonInspect
    if (opts?.function) Object.assign(insp.functionOptions, opts.function)
    if (opts?.object) Object.assign(insp.objectOptions, opts.object)

    const t1 = Date.now()

    try {
        // execute
        let out = isAsync
            ? await asyncFC(`with (this) {${code}}`).call(evalProxy)
            : Function(`with (this) return eval(${JSON.stringify(code)})`).call(evalProxy)
        const te = Date.now()
        
        if (store) evalProps.$_ = out

        // inspect & timing
        const inspData = root ? insp.inspectRoot(out) : insp.inspect(out)
        const ti = Date.now()

        // send
        debugClient.resolve<'eval'>(id, {
            error: false,
            data: inspData,
            execTime: te - t1,
            inspTime: ti - te
        })
    }
    catch(e) {
        const te = Date.now()

        // inspect & timing
        const inspData = insp.inspect(e)
        const ti = Date.now()

        debugClient.resolve<'eval'>(id, {
            error: true,
            data: inspData,
            execTime: te - t1,
            inspTime: ti - te
        })
    }
})

const evalContext = new Map<PropertyKey, any>([
    ['mc'        , mc],
    ['gt'        , gt],
    ['gametest'  , gt],
    ['ui'        , ui],
    ['mcui'      , ui],
    ['net'       , net],
    ['mcnet'     , net],
    ['admin'     , admin],
    ['mcadmin'   , admin],

    ['global'    , globalThis],
    ['globalThis', globalThis]
])

const evalOverridesObj: any = {
    console: debugConsoleOverride,
    events: debugEventsOverride,
    proxy: debugProxyOverride,
    run: debugRunOverride,
    prop: debugDynamicPropertyOverride,
}
Object.setPrototypeOf(evalOverridesObj, null)

const evalProps: any = {
    debugOverrides: evalOverridesObj,
    debugClient: debugClient,

    setInterval: mc.system.runInterval.bind(mc.system),
    setTimeout: mc.system.runTimeout.bind(mc.system),
    setImmediate: mc.system.run.bind(mc.system),
    clearRun: mc.system.clearRun.bind(mc.system),

    http: HttpUtil,
    jsonInspect,
    JsonInspectInstance,
    RootRefInspector,
    trace: getStackTrace,
}
Object.setPrototypeOf(evalProps, null)

const evalProxy = new Proxy(evalProps, {
    get(t, p) {
        // eval properties
        if (p in t) return t[p]
        // eval context by properties
        if (evalContext.has(p)) return evalContext.get(p)
        // eval value from contexts
        for (const ctx of evalContext.values()) if (p in ctx) return ctx[p]

        return undefined
    },
    set(t, p, v) {
        //@ts-ignore
        globalThis[p] = v
        return true
    },
    deleteProperty(t, p) {
        //@ts-ignore
        delete globalThis[p]
        return true
    },
    has: () => true
})
