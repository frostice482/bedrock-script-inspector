import { encodeText } from "debugger/lib/text_encoder.js"
import type BedrockType from "../../../../globaltypes/bedrock.js"
import type ClientType from "../../../../globaltypes/client.js"
import { encodeBase64 } from "../lib/base64.js"
import HttpUtil from "../lib/http.js"
import TypedEventEmitter from "../lib/typedevm.js"
import DebugConsoleOverride from "../override/console.js"

var rc = DebugConsoleOverride

export namespace DebugClient {
    export let connectURI = ''
    export let authHash: string | undefined

    export let queue: string[] = []
    export let queueAutoUpdateSize = 10

    export let enableDebug = false
    export let enableLog = false

    export let _isUploading = false

    export async function connect(address: string, username?: string, password?: string) {
        if (connectURI) {
            rc.rawWarn(`[inspector] Attempting to connect to ${address} while already connected to ${connectURI}`)
            return false
        }

        const addr = 'http://' + address
        const hash = username && password ? 'Basic ' + encodeBase64(encodeText(username + ':' + password)) : undefined

        try {
            // head request
            rc.rawInfo('[inspector] Connecting to ' + addr)
            if (hash) rc.rawInfo('[inspector] Using authorization')
            await HttpUtil.head(addr + '/bedrock/connect', { Authorization: hash }).then(HttpUtil.throwIfError)

            // data
            const qlen = queue.length,
                data = '[' + queue.join(',') + ']'

            // upload
            rc.rawInfo(`[inspector] Uploading initial data: ${data.length} len / ${qlen} datas`)
            await HttpUtil.post(addr + '/bedrock/connect', data, { Authorization: hash }).then(HttpUtil.throwIfError)

            // success
            connectURI = addr
            username = username
            password = password
            authHash = hash
            queue.splice(0, qlen)
            rc.rawInfo('[inspector] Success')

            return true
        } catch(e) {
            rc.rawError('[inspector] Connecting failed:', e)
            throw e
        }
    }

    export async function send<K extends keyof BedrockType.CrossEvents>(name: K, data: BedrockType.CrossEvents[K], forceUpload = false) {
        const q = queue, d = JSON.stringify({name, data})
        q.push(d)

        const len = q.length

        if (enableDebug) rc.rawLog(`[inspector] add: ${name} / ${d.length} len / ${len} datas`)

        // connected
        if (connectURI) {
            // not connecting, forced to upload or queue size is greater
            if (!_isUploading && (forceUpload || len >= queueAutoUpdateSize)) {
                _isUploading = true
                try {
                    // data
                    const qlen = queue.length,
                        data = '[' + queue.join(',') + ']'
                    
                    // transfer
                    const t = Date.now()

                    const transferres = await HttpUtil.post(connectURI + '/bedrock/transfer', data, { Authorization: authHash }).then(HttpUtil.throwIfError)
                    queue.splice(0, qlen)

                    const td = Date.now() - t
                    if (td > 2500) {
                        rc.rawWarn(`[inspector] Transfer time took so long! (${(td / 1000).toFixed(1)}s)`)
                        rc.rawWarn(`[inspector] Set script-watchdog-enable to false if persists`)
                    }

                    // receive
                    const recv = JSON.parse(transferres.body) as ClientType.CrossEventData[]
                    for (const {name, data} of recv) message.emit(name, data)

                    // log
                    if (enableLog) rc.rawLog(
                        '[inspector] Transfer: '
                        + 'TX ' + data.length.toString().padStart(7) + ' / ' + qlen.toString().padStart(2)
                        + ' - ' + 'RX ' + transferres.body.length.toString().padStart(7) + ' / ' + recv.length.toString().padStart(2)
                    )
                }
                catch(e) {
                    rc.rawError('[inspector] Transfer failed:', e)
                    throw e
                }
                finally {
                    _isUploading = false
                }
            }
        }
        // not connected
        else {
            // detect if queue size is increasing
            if (len % 1200 === 0) {
                const estLength = q.reduce((a, b) => a + b.length, len + 2)

                rc.rawWarn(`[inspector] Debug data queue has reached count of ${len} with estimated total length ${estLength}`)
                rc.rawWarn('[inspector] This will increase scripting memory usage, please connect immediately to reduce memory usage & connect delay')
            }
        }
    }

    export async function resolve<K extends BedrockType.ClientResponse.Values = BedrockType.ClientResponse.Values>(id: string, data: BedrockType.ClientResponse.List[K]) {
        return HttpUtil.post(connectURI + '/bedrock/resolve/' + id, JSON.stringify(data), { Authorization: authHash }).then(HttpUtil.throwIfError)
    }

    export async function disconnect() {
        try {
            rc.rawInfo(`[inspector] Disconnecting`)
            await HttpUtil.post(connectURI + '/bedrock/disconnect', '', { Authorization: authHash }).then(HttpUtil.throwIfError)

            connectURI = ''
            authHash = undefined
            rc.rawInfo(`[inspector] Disconnected`)
        }
        catch(e) {
            rc.rawError('[inspector] Disconnect failed:', e)
            throw e
        }
    }

    export const message = new TypedEventEmitter<ClientType.CrossEvents>()
}

export default DebugClient
