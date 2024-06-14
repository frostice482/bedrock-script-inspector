import * as mc from '@minecraft/server'
import * as gt from '@minecraft/server-gametest'
import * as ui from '@minecraft/server-ui'
import * as net from '@minecraft/server-net'
import * as admin from '@minecraft/server-admin'

import DebugClient from '@client'
import HttpUtil from '@http.js'
import jsonInspect, { JsonInspectInstance, RootRefInspector } from '@jsoninspect.js'
import { getStackTrace, now } from '@util.js'
import DebugConsoleOverride from '$console.js'
import DebugDynamicPropertyOverride from '$dprop.js'
import DebugEventsOverride from '$events.js'
import DebugProxyOverride from '$proxy.js'
import DebugRunOverride from '$run.js'
import clientRequests from './request.js'

const asyncFC = (async function() {}).constructor as FunctionConstructor

clientRequests.addEventListener('eval', async ({ id, data: { 'async': isAsync, code, opts, store, root } }) => {
    await null

    // inspect
    const insp = opts?.function || opts?.object ? new JsonInspectInstance() : jsonInspect
    if (opts?.function) Object.assign(insp.functionOptions, opts.function)
    if (opts?.object) Object.assign(insp.objectOptions, opts.object)

    const t1 = now()

    try {
        // execute
        let out = isAsync
            ? await asyncFC(`with (this) {${code}}`).call(evalProxy)
            : Function(`with (this) return eval(${JSON.stringify(code)})`).call(evalProxy)
        const te = now()
        
        if (store) evalProps.$_ = out

        // inspect & timing
        const inspData = root ? insp.inspectRoot(out) : insp.inspect(out)
        const ti = now()

        // send
        DebugClient.resolve<'eval'>(id, {
            error: false,
            data: inspData,
            execTime: te - t1,
            inspTime: ti - te
        })
    }
    catch(e) {
        const te = now()

        // inspect & timing
        const inspData = insp.inspect(e)
        const ti = now()

        DebugClient.resolve<'eval'>(id, {
            error: true,
            data: inspData,
            execTime: te - t1,
            inspTime: ti - te
        })
    }
})

const evalSetVars = Object.create(null)

const evalContext = new Map<PropertyKey, any>([
    ['vars'     , evalSetVars],

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

const overworld = mc.world.getDimension('overworld')
const nether = mc.world.getDimension('nether')
const end = mc.world.getDimension('the_end')

const dims = [overworld, nether, end]

const evalOverridesObj: any = {
    console: DebugConsoleOverride,
    events: DebugEventsOverride,
    proxy: DebugProxyOverride,
    run: DebugRunOverride,
    prop: DebugDynamicPropertyOverride,
}
Object.setPrototypeOf(evalOverridesObj, null)

export const evalProps: any = {
    debugOverrides: evalOverridesObj,
    DebugClient: DebugClient,

    setInterval: mc.system.runInterval.bind(mc.system),
    setTimeout: mc.system.runTimeout.bind(mc.system),
    setImmediate: mc.system.run.bind(mc.system),
    job: (gen: Generator<void, void, void> | {(): Generator<void, void, void>}) => mc.system.runJob(typeof gen === 'function' ? gen() : gen),
    clearRun: mc.system.clearRun.bind(mc.system),

    http: HttpUtil,
    jsonInspect,
    JsonInspectInstance,
    RootRefInspector,
    trace: getStackTrace,

    overworld,
    nether,
    end,

    $: (data: string) => {
        for (const dim of dims) {
            const [player] = dim.getPlayers({ closest: 1, name: data })
            if (player) return player
        }
        return overworld.getEntities({ closest: 1, type: data })[0]
    },

    measure(fn: () => void, time = 1000) {
        let c = 0
        const maxTime = now() + time
        while (now() < maxTime) {
            fn()
            c++
        }
        return time / c
    }
}
Object.setPrototypeOf(evalProps, null)

export const evalProxy = new Proxy(evalProps, {
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
        evalSetVars[p] = v
        return true
    },
    deleteProperty(t, p) {
        //@ts-ignore
        delete globalThis[p]
        return true
    },
    has: () => true
})
