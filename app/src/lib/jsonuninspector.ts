import JSONInspectData from "../../../globaltypes/jsoninspect.js";
import { formatStack } from "./misc.js";
import { RelativePopup, RelativePopupHandle } from "./popup.js";
import { PromiseController } from "./prmctrl.js";

function JSONUninspector(data: JSONInspectData, refList?: JSONInspectData[]): HTMLElement {
    switch (data.type) {
        case 'string': return JSONUninspector.t_string(data.value)
        case 'number': return JSONUninspector.t_number(data.value)
        case 'boolean': return JSONUninspector.t_boolean(data.value)
        case 'symbol': return JSONUninspector.t_symbol(data.value)
        case 'regex': return JSONUninspector.t_regex(data.value)
        case 'null': return JSONUninspector.t_null()
        case 'undefined': return JSONUninspector.t_undefined()
        case 'object': return JSONUninspector.objectBase(data, refList).container
        case 'array': return JSONUninspector.t_array_set(data, refList)
        case 'map': return JSONUninspector.t_map(data, refList)
        case 'set': return JSONUninspector.t_array_set(data, refList)
        case 'proxy': return JSONUninspector.t_proxy(data, refList)
        case 'function': return JSONUninspector.t_function(data, undefined, refList)
        case 'error': return JSONUninspector.t_err(data)
        case 'circular': {
            if (refList && data.ref !== undefined) return JSONUninspector.t_circular(refList[data.ref], refList)
            else return JSONUninspector.t_circular()
        }
        case 'rootref': return JSONUninspector(data.entry, data.refs)
        case 'ref': {
            if (!refList) throw new ReferenceError(`References not defined (referencing ${data.ref})`)

            const v = refList[data.ref]
            if (!v) throw new ReferenceError(`Reference ${data.ref} is undefined (len: ${refList.length})`)

            return JSONUninspector(v, refList)
        }

        default: {
            const sp = document.createElement('span')
            sp.textContent = '[' + data.type + ']'
            return sp
        }
    }
}

namespace JSONUninspector {
    const e_str_elm = document.createElement('div')
    e_str_elm.classList.add('ji-string')

    const e_str_esc = document.createElement('span')
    e_str_esc.classList.add('ji-string-escape')

    const e_str_optsCnt = document.createElement('div')
    e_str_optsCnt.classList.add('flex-row', 'gap8')
    e_str_optsCnt.style.alignItems = 'center'

    function strFormat(str: string, elipsisBefore = false, elipsisAfter = false) {
        const elms: (string | Node)[] = []

        if (elipsisBefore) elms.push('...')
        elms.push('"')

        let lastIndex = 0
        for (const { '0': escapes, index = 0 } of str.matchAll(/[\x00-\x1f\"\\]+/g)) {
            // text
            elms.push(str.slice(lastIndex, index))

            // escape
            const e = e_str_esc.cloneNode()
            e.textContent = Array.from(escapes, esc => {
                const code = esc.charCodeAt(0)
                if (code === 0) return '\\0'
                if (code < 32) return '\\x' + code.toString(16).padStart(2, '0')
                return '\\' + esc
            }).join('')
            elms.push(e)

            // set index
            lastIndex = index + escapes.length
        }

        // leftover text
        if (lastIndex !== str.length) elms.push(str.slice(lastIndex))

        elms.push('"')
        if (elipsisAfter) elms.push('...')

        return elms
    }

    export function t_string(val: string, limit = 250) {
        const elm = e_str_elm.cloneNode()

        // length is less than 250
        if (val.length <= limit) {
            elm.append.apply(elm, strFormat(val))
            return elm
        }

        // text
        let min = 0, max = limit
        elm.classList.add('resize')

        elm.append.apply(elm, strFormat(val.slice(min, max), false, true))

        // options container
        const optsCnt = e_str_optsCnt.cloneNode()

        // length info
        const txt = document.createElement('span')
        txt.textContent = `${min}-${max}/${val.length}`

        // copy button
        const copyBtn = document.createElement('button')
        copyBtn.textContent = 'copy'
        copyBtn.addEventListener('click', () => navigator.clipboard.writeText(val.slice(min, max)))

        // copy button
        const copyAllBtn = document.createElement('button')
        copyAllBtn.classList.add('popup')
        copyAllBtn.textContent = 'copy all'
        copyAllBtn.addEventListener('click', () => navigator.clipboard.writeText(val))

        new RelativePopupHandle(new RelativePopup(copyBtn, copyAllBtn, undefined, 'topcenter'), 'hover')

        // show more button
        const moreBtn = document.createElement('button')
        moreBtn.textContent = 'more'
        moreBtn.addEventListener('click', () => {
            // abort
            const ab = new AbortController()
            ab.signal.addEventListener('abort', () => {
                minInput.replaceWith(moreBtn)
                maxInput.remove()
                setBtn.remove()

                min = minInput.valueAsNumber
                max = maxInput.valueAsNumber

                elm.replaceChildren.apply(elm, strFormat(val.slice(min, max), min !== 0, max !== val.length))
                txt.textContent = `${min}-${max}/${val.length}`
            }, { once: true })

            // value
            const minInput = document.createElement('input')
            minInput.style.width = '70px'
            minInput.type = 'number'
            minInput.value = String(min)
            minInput.addEventListener('keydown', (ev) => ev.key === 'Enter' && maxInput.focus(), { signal: ab.signal })

            const maxInput = document.createElement('input')
            maxInput.style.width = '70px'
            maxInput.type = 'number'
            maxInput.value = String(max)
            maxInput.addEventListener('keydown', (ev) => ev.key === 'Enter' && ab.abort(), { signal: ab.signal })

            // set button
            const setBtn = document.createElement('button')
            setBtn.textContent = 'set'
            setBtn.addEventListener('click', (ev) => { ab.abort() }, { once: true, signal: ab.signal })

            moreBtn.replaceWith(minInput, maxInput, setBtn)
        })

        optsCnt.append(txt, copyBtn, moreBtn)

        const cnt = document.createElement('div')
        cnt.append(elm, optsCnt)
        
        return cnt
    }

    const e_num_elm = document.createElement('span')
    e_num_elm.classList.add('ji-number')

    export function t_number(val: number | string) {
        const elm = e_num_elm.cloneNode()
        elm.textContent = val + ''

        return elm
    }

    const e_bool_elm = document.createElement('span')
    e_bool_elm.classList.add('ji-boolean')

    export function t_boolean(val: boolean) {
        const elm = e_bool_elm.cloneNode()
        elm.textContent = val + ''

        return elm
    }

    const e_null_elm = document.createElement('span')
    e_null_elm.classList.add('ji-null')
    e_null_elm.textContent = 'null'

    export function t_null() {
        return e_null_elm.cloneNode(true)
    }

    const e_und_elm = document.createElement('span')
    e_und_elm.classList.add('ji-undefined')
    e_und_elm.textContent = 'undefined'

    export function t_undefined() {
        return e_und_elm.cloneNode(true)
    }

    const e_sym_elm = document.createElement('span')
    e_sym_elm.classList.add('ji-symbol')

    export function t_symbol(val: string) {
        const elm = e_sym_elm.cloneNode()
        elm.textContent = `Symbol(${val})`

        return elm
    }
    
    const e_regex_elm = document.createElement('span')
    e_regex_elm.classList.add('ji-regex')

    export function t_regex(val: string) {
        const elm = e_regex_elm.cloneNode()
        elm.textContent = val

        return elm
    }

    const e_circular_elm = document.createElement('span')
    e_circular_elm.classList.add('ji-circular')
    e_circular_elm.textContent = '[circular]'

    export function t_circular(ref?: JSONInspectData, refList?: JSONInspectData[]) {
        const elm = e_circular_elm.cloneNode(true)
        if (ref) {
            const cnt = document.createElement('span')
            cnt.style.color = 'white'

            cnt.append(JSONUninspector(ref, refList))
            elm.append(' ', cnt)
        }
        return elm
    }

    const e_obj_base = document.createElement('table')
    e_obj_base.hidden = true
    e_obj_base.classList.add('tseprow', 'tsepcol', 'ji-object')

    const e_obj_baseProtoName = document.createElement('span')
    e_obj_baseProtoName.classList.add('ji-null')
    e_obj_baseProtoName.textContent = '[proto]'

    const e_obj_baseExpandBtn = document.createElement('button')
    e_obj_baseExpandBtn.classList.add('ji-object-btn', 'nopadding')
    e_obj_baseExpandBtn.textContent = 'expand'

    const e_obj_baseTag = document.createElement('span')
    e_obj_baseTag.classList.add('ji-object-tag')

    export function objectKeyGetSet(fn: JSONInspectData.I_Function, name: string, refList?: JSONInspectData[]) {
        const elm = e_fn_tag.cloneNode()
        elm.textContent = '[' + name + ']'

        const popup = e_fn_srcPopup.cloneNode(true)
        popup.append(t_function(fn, false, refList))

        new RelativePopupHandle(new RelativePopup(elm, popup, undefined, 'topcenter'), 'hoverclickpersist')

        return elm
    }

    export function objectBase(val?: JSONInspectData.I_ObjectBasic, refList?: JSONInspectData[]) {
        // table
        const table = e_obj_base.cloneNode()
        const body = table.createTBody()

        // expand once promise
        const expandOnce = new PromiseController<MouseEvent>()

        // expand: load data properties
        if (val?.properties) {
            const props = val.properties
            expandOnce.promise.then(() => {
                for (const { key, value } of props) {
                    const row = body.insertRow()
    
                    // key
                    const keyData = row.insertCell()
                    keyData.append(key.isSymbol ? t_symbol(key.key) : key.key)
                    if (key.getter) keyData.append(' ', objectKeyGetSet(key.getter, 'Get', refList))
                    if (key.setter) keyData.append(' ', objectKeyGetSet(key.setter, 'Set', refList))
    
                    // value
                    row.insertCell().append(value ? JSONUninspector(value, refList) : '...')
                }
            })
        }
        // expand: load data proto
        if (val?.proto) {
            let proto: JSONInspectData
            if ('ref' in val.proto) {
                const ref = val.proto.ref
                if (!refList) throw new ReferenceError(`References not defined (referencing proto ${ref})`)

                const v = refList[ref]
                if (!v) throw new ReferenceError(`References not defined (referencing proto ${ref})`)

                proto = v
            }
            else proto = val.proto

            expandOnce.promise.then(() => {
                const row = body.insertRow()
                row.insertCell().append(e_obj_baseProtoName.cloneNode(true))
                row.insertCell().append(JSONUninspector(proto, refList))
            })
        }
        // expand button
        const expandBtn = e_obj_baseExpandBtn.cloneNode(true)
        expandBtn.addEventListener('click', ev => {
            expandOnce.resolve(ev)

            requestAnimationFrame(expandHandle)
            expandBtn.addEventListener('click', expandHandle)
        }, { once: true })

        function expandHandle() {
            expandBtn.textContent = (table.hidden = !table.hidden) ? 'expand' : 'shrink'
        }

        // object tag
        let tag: HTMLElement | undefined
        if (val?.name) {
            tag = e_obj_baseTag.cloneNode()
            tag.textContent = ' ' + val.name
        }

        const cnt = document.createElement('span')
        cnt.append('{', tag ?? '', ' ', expandBtn, ' ', table, '}')

        return {
            container: cnt,
            table,
            tbody: body,
            expandOnce,
            tag
        }
    }

    export function functionTag(fn: JSONInspectData.I_Function) {
        const tag = fn.isClass ? 'Class' : `${fn.isAsync ? 'Async' : ''}${fn.isGenerator ? 'Generator' : ''}Function`
        return tag
    }

    const e_fn_codeName = document.createElement('span')
    e_fn_codeName.classList.add('ji-null')
    e_fn_codeName.textContent = '[code]'

    const e_fn_codeBtn = document.createElement('button')
    e_fn_codeBtn.textContent = 'show'

    const e_fn_codeCnt = document.createElement('div')
    e_fn_codeCnt.hidden = true
    e_fn_codeCnt.classList.add('ji-function-code')

    const e_fn_extName = document.createElement('span')
    e_fn_extName.classList.add('ji-null')
    e_fn_extName.textContent = '[extend]'

    export function t_function(val: JSONInspectData.I_Function, properties = true, refList?: JSONInspectData[]) {
        // title
        const tagElm = document.createElement('span')
        tagElm.classList.add(val.isClass ? 'ji-class' : 'ji-function')
        tagElm.textContent = `[${functionTag(val)} ${val.name || '<anonymous>'} (${val.source})]`

        // properties
        if (properties && (val.properties?.length || val.content || val.extends)) {
            const { container, tbody, expandOnce } = objectBase({ properties: val.properties }, refList)
            container.style.color ||= 'white'
            tagElm.append(' ', container)

            // extends
            if (val.extends) {
                let e: JSONInspectData.I_Function
                if ('ref' in val.extends) {
                    const ref = val.extends.ref
                    if (!refList) throw new ReferenceError(`References not defined (referencing extend ${ref})`)
    
                    const v = refList[ref]
                    if (!v) throw new ReferenceError(`References not defined (referencing extend ${ref})`)
                    if (v.type !== 'function') throw new ReferenceError(`Expecting type "function" for ref extend ${ref}, got "${v.type}"`)
    
                    e = v
                }
                else e = val.extends

                expandOnce.promise.then(() => {
                    const row = tbody.insertRow()
                    row.insertCell().append(e_fn_extName.cloneNode(true))
                    row.insertCell().append(t_function(e, undefined, refList))
                })
            }

            // code
            if (val.content) {
                expandOnce.promise.then(() => {
                    const editorCnt = e_fn_codeCnt.cloneNode(true)

                    let show = false
                    const btn = e_fn_codeBtn.cloneNode(true)

                    btn.addEventListener('click', () => {
                        const editor = CodeMirror(editorCnt, {
                            mode: 'text/javascript',
                            theme: 'tomorrow-night-eighties',
                            value: val.content!,
                            readOnly: true
                        })
                        requestAnimationFrame(() => editor.refresh())
                    }, { once: true })

                    btn.addEventListener('click', () => {
                        show = !show
                        btn.textContent = show ? 'hide' : 'show'
                        editorCnt.hidden = !show
                    })

                    const row = tbody.insertRow()
                    row.insertCell().append(e_fn_codeName.cloneNode(true))
                    row.insertCell().append(btn, editorCnt)
                })
            }
        }

        return tagElm
    }

    const e_fn_tag = document.createElement('span')
    e_fn_tag.classList.add('ji-function')

    const e_fn_srcPopup = document.createElement('span')
    e_fn_srcPopup.style.color = 'white'
    e_fn_srcPopup.classList.add('popup')
    
    export function t_function_tiny(val: JSONInspectData.I_Function, usePopup = true) {
        const elm = e_fn_tag.cloneNode()
        elm.textContent = `[ƒ ${val.name || '<anonymous>'}]`

        if (usePopup) {
            const popup = e_fn_srcPopup.cloneNode(true)
            popup.textContent = val.source
    
            new RelativePopupHandle(new RelativePopup(elm, popup, undefined, 'topcenter'), 'hoverclickpersist')
        }

        return elm
    }

    const e_err_uncaughtTag = document.createElement('span')
    e_err_uncaughtTag.classList.add('ji-error')
    e_err_uncaughtTag.textContent = '(Uncaught) '

    export function errUncaught() {
        return e_err_uncaughtTag.cloneNode(true)
    }

    const e_err_uelm = document.createElement('span')
    e_err_uelm.classList.add('ji-error-nothrow')

    export function t_err(val: JSONInspectData.I_Error) {
        const e = e_err_uelm.cloneNode(true)
        e.append(val.name + ': ' + val.message + '\n', formatStack(val.stack))

        return e
    }

    export function t_proxy(val: JSONInspectData.I_Proxy, refList?: JSONInspectData[]) {
        const { container, expandOnce, tbody } = objectBase({ name: 'Proxy', properties: [] }, refList)
        expandOnce.promise.then(() => {
            const obj = tbody.insertRow()
            obj.insertCell().append('[object]')
            obj.insertCell().append(JSONUninspector(val.object, refList))

            const handler = tbody.insertRow()
            handler.insertCell().append('[handle]')
            handler.insertCell().append(JSONUninspector(val.handle, refList))

            const revocable = tbody.insertRow()
            revocable.insertCell().append('[revocable]')
            revocable.insertCell().append(t_boolean(val.revocable))
        })

        return container
    }

    export function t_map(val: JSONInspectData.I_Map, refList?: JSONInspectData[]) {
        const { container, expandOnce, tbody } = objectBase(val, refList)
        const values = val.values, len = values.length

        expandOnce.promise.then(() => {
            if (len <= 100) {
                for (const [k, v] of values) {
                    const r = tbody.insertRow()
                    r.insertCell().append(JSONUninspector(k, refList))
                    r.insertCell().append(JSONUninspector(v, refList))
                }
            } else {
                for (let i = 0; i < values.length; i += 100) {
                    const { container: localContainer, expandOnce: localExpandOnce, tbody: localTbody } = objectBase(undefined, refList)

                    localExpandOnce.promise.then(() => {
                        for (const [k, v] of values.slice(i, i + 100)) {
                            const r = localTbody.insertRow()
                            r.insertCell().append(JSONUninspector(k, refList))
                            r.insertCell().append(JSONUninspector(v, refList))
                        }
                    })

                    const r = tbody.insertRow()
                    r.insertCell().append(`[${i}..${i+99}]`)
                    r.insertCell().append(localContainer)
                }
            }
        })

        return container
    }

    export function t_array_set(val: JSONInspectData.I_Set | JSONInspectData.I_Array, refList?: JSONInspectData[]) {
        const { container, expandOnce, tbody } = objectBase(val, refList)
        const values = val.values, len = values.length

        expandOnce.promise.then(() => {
            if (len <= 100) {
                let i = 0
                for (const v of values) {
                    const r = tbody.insertRow()
                    r.insertCell().append(i++ + '')
                    r.insertCell().append(JSONUninspector(v, refList))
                }
            } else {
                for (let i = 0; i < values.length; i += 100) {
                    const { container: localContainer, expandOnce: localExpandOnce, tbody: localTbody } = objectBase(undefined, refList)

                    localExpandOnce.promise.then(() => {
                        let i = 0
                        for (const v of values.slice(i, i + 100)) {
                            const r = localTbody.insertRow()
                            r.insertCell().append(i++ + '')
                            r.insertCell().append(JSONUninspector(v, refList))
                        }
                    })

                    const r = tbody.insertRow()
                    r.insertCell().append(`[${i}..${i+99}]`)
                    r.insertCell().append(localContainer)
                }
            }
        })

        return container
    }
}

export default JSONUninspector
