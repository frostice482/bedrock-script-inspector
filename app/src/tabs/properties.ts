import BedrockType from "../../../globaltypes/bedrock.js";
import ClientType from "../../../globaltypes/client.js";
import { Typeof } from "../../../globaltypes/types.js";
import BedrockInspector from "../debug.js";
import JSONUninspector from "../lib/jsonuninspector.js";
import { filterFn, filterTooltip, formatStack, getIdThrow, textApplier } from "../lib/misc.js";
import { RelativePopup, RelativePopupHandle } from "../lib/popup.js";

const select = getIdThrow('props-select', HTMLSelectElement)
const list = new Map<string, Properties>()

const tooltip = getIdThrow('props-list-tooltip')
const container = getIdThrow('props-list-cnt')

const propLogTemp = getIdThrow('t', HTMLTableElement, getIdThrow('props-log-temp', HTMLTemplateElement).content, true)
const propTableTemp = getIdThrow('t', HTMLTableElement, getIdThrow('props-list-temp', HTMLTemplateElement).content, true)
const propAddTemp = getIdThrow('props-add-prop-temp', HTMLTemplateElement).content

//// add proeprty ////

const propAdd = getIdThrow('props-add-prop', HTMLButtonElement)
propAdd.addEventListener('click', () => {
    const props = list.get(select.value)
    if (!props) return

    props.tbody.append(rowEdit(undefined, props.id))
})

//// filter ////

const fi = {
    String: getIdThrow('props-fi-type-string', HTMLInputElement),
    Number: getIdThrow('props-fi-type-number', HTMLInputElement),
    Boolean: getIdThrow('props-fi-type-boolean', HTMLInputElement),
    Vector: getIdThrow('props-fi-type-vector', HTMLInputElement),
    Name: getIdThrow('props-fi-name', HTMLInputElement),
    Limit: getIdThrow('props-fi-limit', HTMLInputElement)
}

new RelativePopupHandle(new RelativePopup(fi.Name, filterTooltip.cloneNode(true), fi.Name.parentElement!, 'bottomcenter'), 'focus')

const btnFetch = getIdThrow('props-fetch', HTMLButtonElement)
btnFetch.addEventListener('click', async () => {
    const value = select.value
    const props = list.get(value)
    if (!props) return

    btnFetch.style.borderColor = ''

    const string = props.filter.string = fi.String.checked
    const number = props.filter.number = fi.Number.checked
    const boolean = props.filter.boolean = fi.Boolean.checked
    const vector = props.filter.vector = fi.Vector.checked
    const name = props.nameFilter = fi.Name.value
    const limit = props.limit = fi.Limit.valueAsNumber

    const li = await BedrockInspector.request('dpOf', {
        filter: { boolean, number, string, vector },
        nameFilter: name,
        entityId: value,
        limit
    }) ?? []

    props.clear()
    for (const { name, value } of li) props.set(name, value)
})

for (const f of Object.values(fi)) f.addEventListener('change', () => btnFetch.style.borderColor = 'orange')

//// function ////

const delBtnTemp = document.createElement('button')
delBtnTemp.classList.add('fa-solid', 'fa-trash')

const editBtnTemp = document.createElement('button')
editBtnTemp.classList.add('fa-solid', 'fa-pen-to-square')

const logBtnTemp = document.createElement('button')
logBtnTemp.classList.add('fa-solid', 'fa-magnifying-glass')

const restoreBtnTemp = document.createElement('button')
restoreBtnTemp.classList.add('fa-solid', 'fa-rotate-left')

const detailRowTemp = document.createElement('div')
detailRowTemp.classList.add('flow-y')
detailRowTemp.style.maxHeight = '500px'

class Properties {
    constructor(id?: string, info?: PropertyData) {
        // table
        const table = this.table = propTableTemp.cloneNode(true)
        this.tbody = table.tBodies.item(0) ?? table.createTBody()

        // option
        const option = this.option = document.createElement('option')
        if (info && 'id' in info) {
            this.id = option.value = info.id
            option.textContent = `${info.id} (${info.type} - "${info.nametag}")`
        }
        else this.id = option.value = option.textContent = id ?? ''
    }

    readonly table: HTMLTableElement
    readonly tbody: HTMLTableSectionElement
    readonly option: HTMLOptionElement

    readonly id: string

    properties = new Map<string, PropertyRow>()

    #nameFilter = ''
    #nameFilterFn = (_: string) => true

    filter: Record<ClientType.Request.DynamicPropertiesFilters, boolean> = {
        string: true,
        number: true,
        boolean: true,
        vector: true
    }
    limit = 100
    get nameFilter() { return this.#nameFilter }
    set nameFilter(v) {
        this.#nameFilter = v
        this.#nameFilterFn = filterFn(v)
    }

    canSet(id: string, value: DValues, ignoreLimit = false) {
        return ( this.properties.has(id) || this.#nameFilterFn(id) && (ignoreLimit || this.properties.size <= this.limit) )
            && ( this.filter[typeFilter[typeof value] ?? 'string'] ?? true )
    }

    set(id: string, value?: DValues, stack?: string, ignoreLimit?: boolean) {
        let oref = this.properties.get(id)

        // delete
        if (value === undefined) {
            this.delete(id)
            return
        }

        // cannot set
        if (!this.canSet(id, value, ignoreLimit)) {
            this.delete(id)
            return
        }

        // create new
        if (!oref) {
            this.properties.set(id, oref = new PropertyRow(id, this.id))
            this.tbody.append(oref.row, oref.detailRow)
        }

        oref.setValue(value, stack)
        return oref
    }

    delete(name: string) {
        const oref = this.properties.get(name)
        if (!oref) return false

        oref.row.remove()
        oref.detailRow.remove()
        this.properties.delete(name)

        return true
    }

    clear() {
        this.properties.clear()
        this.tbody.replaceChildren()
    }
}

class PropertyRow {
    constructor(id: string, eid?: string, value?: DValues) {
        this.id = id
        this.entityId = eid

        // row
        const tr = this.row = document.createElement('tr')
        tr.insertCell().append(id)
        const typeCell = tr.insertCell()
        const valueCell = tr.insertCell()
        const actCell = tr.insertCell()

        // delete btn
        const delBtn = delBtnTemp.cloneNode(true)
        delBtn.addEventListener('click', () => {
            BedrockInspector.send('dp_set', {
                entityId: this.entityId,
                id: this.id,
                value: undefined
            })
        })

        // edit btn
        const editBtn = editBtnTemp.cloneNode(true)
        editBtn.addEventListener('click', () => this.row.replaceWith(rowEdit(this.row, this.entityId, this.id, this.val)))

        // log btn
        const logBtn = logBtnTemp.cloneNode(true)

        // detail row
        const detailRow = this.detailRow = document.createElement('tr')
        detailRow.hidden = true
        logBtn.addEventListener('click', () => detailRow.hidden = !detailRow.hidden)

        const detailCell = detailRow.insertCell()
        detailCell.colSpan = 10
    
        // container & template
        const detailCnt = detailCell.appendChild(document.createElement('div'))
        const detailCntLower = detailCnt.appendChild(detailRowTemp.cloneNode())
        
        const detailTable = propLogTemp.cloneNode(true)
        this.detailTbody = detailTable.tBodies.item(0) ?? detailTable.createTBody()

        actCell.append(logBtn, ' ', editBtn, ' ', delBtn)
        detailCntLower.append(detailTable)

        this.elm = {
            typeCell,
            valueCell,
            delBtn,
            editBtn,
            logBtn
        }

        if (value) this.setValue(value)
    }

    readonly id: string
    readonly entityId?: string

    readonly row: HTMLTableRowElement
    readonly detailRow: HTMLTableRowElement
    readonly detailTbody: HTMLTableSectionElement
    readonly elm: Readonly<{
        typeCell: HTMLTableCellElement
        valueCell: HTMLTableCellElement

        delBtn: HTMLButtonElement
        editBtn: HTMLButtonElement
        logBtn: HTMLButtonElement
    }>

    logLimit = 30
    val?: DValues

    setValue(value: DValues, stack?: string) {
        this.val = value
        const { elm: { typeCell, valueCell } } = this

        const logRow = this.detailTbody.insertRow(0)
        const nlen = this.detailTbody.rows.length
        if (nlen > this.logLimit) this.detailTbody.rows.item(nlen - 1)?.remove()

        let t: string, e: HTMLElement

        switch (typeof value) {
            case 'string': {
                e = JSONUninspector.t_string(value, 32768)
                e.classList.add('resize-v')
                e.style.height = '78px'

                t = 'string'
            } break

            case 'number': {
                t = 'number'
                e = JSONUninspector.t_number(value)
            } break

            case 'boolean': {
                t = 'number'
                e = JSONUninspector.t_boolean(value)
            } break

            case 'object': {
                const n = JSONUninspector.t_number
                const { x, y, z } = value

                const cnt = document.createElement('span')
                cnt.append('{ ', n(x), ', ', n(y), ', ', n(z), ' }')

                t = 'vector'
                e = cnt
            } break
        }

        const resBtn = restoreBtnTemp.cloneNode(true)
        resBtn.addEventListener('click', () => {
            BedrockInspector.send('dp_set', {
                entityId: this.entityId,
                id: this.id,
                value
            })
        })

        typeCell.textContent = t
        valueCell.replaceChildren(e)

        logRow.insertCell().append(t)
        logRow.insertCell().append(e.cloneNode(true))

        logRow.insertCell().append(formatStack(stack ?? ''))
        logRow.insertCell().append(resBtn)
    }
}

function updateSelection() {
    const props = list.get(select.value)
    if (props) {
        fi.String.checked = props.filter.string
        fi.Number.checked = props.filter.number
        fi.Boolean.checked = props.filter.boolean
        fi.Vector.checked = props.filter.vector
        fi.Name.value = props.nameFilter
        fi.Limit.value = props.limit + ''

        container.replaceChildren(props.table)
    }
    else container.replaceChildren(tooltip)

    btnFetch.style.borderColor = ''
}

const typeFilter: Partial<Record<Typeof, ClientType.Request.DynamicPropertiesFilters>> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    object: 'vector'
}

function rowEdit(orgElm?: HTMLElement, entityId?: string, id?: string, value?: DValues) {
    const temp = propAddTemp.cloneNode(true)
    const row = getIdThrow('t', HTMLTableRowElement, temp, true)
    let curEdit: Edit | undefined

    // id
    const inputId = getIdThrow('name', HTMLInputElement, temp, true)
    if (id) {
        inputId.value = id
        inputId.readOnly = true
    }

    // select
    const selectType = getIdThrow('type', HTMLSelectElement, temp, true)
    selectType.addEventListener('change', () => {
        const oldEdit = curEdit

        curEdit = editValueElm[selectType.value]?.(oldEdit?.conf() ?? value)
        if (curEdit) container.replaceChildren(curEdit.elm)
    })

    // container
    const container = getIdThrow('cnt', undefined, temp, true)
    if (value !== undefined) {
        const t = typeFilter[typeof value] ?? 'string'
        selectType.value = t

        curEdit = editValueElm[t]?.(value)
        if (curEdit) container.replaceChildren(curEdit.elm)
    }
    else {
        curEdit = editValueElm.string?.()
        if (curEdit) container.replaceChildren(curEdit.elm)
    }

    // set button
    const btnSet = getIdThrow('btn-set', HTMLButtonElement, temp, true)
    btnSet.addEventListener('click', () => {
        if (!curEdit || !inputId.value) return

        // check value
        const v = curEdit.conf()
        if (v === undefined) return
        
        // replace / remove element
        if (orgElm) row.replaceWith(orgElm)
        else row.remove()

        BedrockInspector.send('dp_set', {
            entityId,
            id: inputId.value,
            value: v
        })
    })

    // cancel button
    const btnCancel = getIdThrow('btn-cancel', HTMLButtonElement, temp, true)
    btnCancel.addEventListener('click', () => {
        if (orgElm) row.replaceWith(orgElm)
        else row.remove()
    })

    return row
}

const editValueElm: Record<string, (value?: DValues) => Edit> = {
    string: v => {
        const elm = document.createElement('textarea')
        elm.classList.add('fill-x', 'resize-v')
        elm.maxLength = 32767
        switch (typeof v) {
            case 'string':
            case 'number':
            case 'boolean':
                elm.value = v + ''
                break

            case 'object':
                elm.value = JSON.stringify(v)
                break
        }
        return { elm, conf: () => elm.value }
    },
    number: v => {
        const elm = document.createElement('input')
        elm.type = 'number'
        elm.step = 'any'
        elm.required = true

        switch (typeof v) {
            case 'string':
            case 'number':
                elm.value = v + ''
                break

            case 'boolean':
                elm.value = v ? '1' : '0'
                break
            
            default:
                elm.value = '0'
                break
        }
        return { elm, conf: () => elm.validity.valid ? elm.valueAsNumber : undefined }
    },
    boolean: v => {
        const elm = document.createElement('input')
        elm.type = 'checkbox'

        switch (typeof v) {
            case 'number':
                elm.checked = v === 1
                break

            case 'boolean':
                elm.checked = v
                break
        }

        return { elm, conf: () => elm.checked }
    },
    vector: v => {
        const x = document.createElement('input')
        const y = document.createElement('input')
        const z = document.createElement('input')
        x.type = y.type = z.type = 'number'
        x.step = y.step = z.step = 'any'
        x.required = y.required = z.required = true

        if (typeof v === 'object') {
            x.value = v.x + ''
            y.value = v.y + ''
            z.value = v.z + ''
        }

        const elm = document.createElement('div')
        elm.append('x: ', x, ' y: ', y, ' z: ', z)

        return {
            elm,
            conf: () => x.validity.valid && y.validity.valid && z.validity.valid ? ({
                x: x.valueAsNumber,
                y: y.valueAsNumber,
                z: z.valueAsNumber
            }) : undefined
        }
    },
    json: v => {
        const elm = document.createElement('textarea')
        elm.classList.add('fill-x', 'resize-v')
        elm.value = JSON.stringify(v) ?? ''

        let cached = v

        elm.addEventListener('change', () => {
            try {
                cached = JSON.parse(elm.value)
                elm.setCustomValidity('')
            } catch(e) {
                elm.setCustomValidity(String(e))
            }
        })

        return { elm, conf: () => elm.validity.valid ? cached : undefined }
    },
}

//// init ////

const worldInit = new Properties('world')
list.set('world', worldInit)
select.options.add(worldInit.option)
requestAnimationFrame(updateSelection)

btnFetch.disabled = propAdd.disabled = !BedrockInspector.initData.connected

//// add / remove ////

{
    const addbtn = getIdThrow('props-add')
    const delbtn = getIdThrow('props-delete')

    let pRefsList: Record<string, PropertyDataElement> | undefined

    // popup element
    const p = getIdThrow('props-add-popup-temp', HTMLTemplateElement).content
    const pCnt = getIdThrow('props-add-popup-cnt', undefined, p)

    const pInput = getIdThrow('input', HTMLInputElement, p, true)
    const pAddBtn = getIdThrow('addbtn', HTMLButtonElement, p, true)
    const pTable = getIdThrow('props-add-list', HTMLTableElement, p)
    const pTbody = pTable.tBodies.item(0) ?? pTable.createTBody()
    const pReloadBtn = getIdThrow('reload', HTMLButtonElement, p, true)
    const pStat = getIdThrow('stat', undefined, p, true)

    // popup actions

    const pHandle = new RelativePopupHandle(new RelativePopup(addbtn, pCnt, addbtn.parentElement!, 'bottomright'), 'click')

    let c = 0
    pInput.addEventListener('input', () => {
        c++
        setTimeout(() => !--c && pElmFilterApply(pInput.value), 500)
    })

    pAddBtn.addEventListener('click', () => {})
    pReloadBtn.addEventListener('click', getPRefs)

    pHandle.relPopup.addEventListener('open', async () => {
        if (pRefsList) return
        pRefsList = await getPRefs()
    })

    pAddBtn.addEventListener('click', () => {
        const id = pInput.value
        if (!id) return

        const ref = pRefsList?.[id]
        const props = new Properties(id, ref)

        // add & update
        list.set(id, props)
        select.options.add(props.option)
        select.value = id
        updateSelection()

        // hide option
        if (ref) ref.row.hidden = true

        // reset
        pInput.value = ''
        pHandle.close()
    })

    delbtn.addEventListener('click', () => {
        const value = select.value
        const props = list.get(value)
        if (!props) return

        // unhide
        const d = pRefsList?.[value]?.row
        if (d) d.hidden = false

        // remove & update
        list.delete(value)
        props.option.remove()
        props.table.remove()
        requestAnimationFrame(updateSelection)
    })

    // functions

    const pElmFilterApply = textApplier<string>(v => v ? (v = JSON.stringify(v)) && `#props-add-list > tbody > tr:not(:is([_fi-type*=${v}],[_fi-id*=${v}],[_fi-nt*=${v}])) { display: none; }` : '', document.head.appendChild(document.createElement('style')))
    
    async function getPRefs() {
        try {
            pStat.textContent = 'please wait'
            pReloadBtn.disabled = true

            const { entity, world } = await BedrockInspector.request('dpList', null)

            const wrow = generateRow(world)
            const refs: Record<string, PropertyDataElement> = { world: Object.assign(world, { row: wrow }) }
            const rows = [wrow]

            for (const ent of entity) {
                const row = generateRow(ent)

                refs[ent.id] = Object.assign(ent, {row})
                rows.push(row)
            }

            pTbody.replaceChildren.apply(pTbody, rows)

            return refs
        } finally {
            pStat.textContent = ''
            pReloadBtn.disabled = false
        }
    }

    function generateRow(data: PropertyData) {
        const row = document.createElement('tr')
        let id: string
        
        if ('id' in data) {
            row.insertCell().append(id = data.id)
            row.insertCell().append(data.type)
            row.insertCell().append(data.nametag)

            row.setAttribute('_fi-type', data.type)
            row.setAttribute('_fi-nt', data.nametag.replace(/\xa7./g, '').slice(20))
        } else {
            row.insertCell().append(id = 'world')
            row.insertCell()
            row.insertCell()
        }
        
        row.insertCell().append(data.properties + '')
        row.insertCell().append(data.bytes + '')

        row.setAttribute('_fi-id', id)
        if (list.has(id)) row.hidden = true

        row.addEventListener('click', () => {
            pInput.value = id
            pInput.focus()
        })

        return row
    }
}

//// event ////

{
    BedrockInspector.bedrockEvents.addEventListener('dp_change', ({ detail: { id, stack, value, entityId } }) => {
        list.get(entityId ?? 'world')?.set(id, value, stack)
    })

    BedrockInspector.bedrockEvents.addEventListener('dp_clear', ({ detail: { entityId } }) => {
        list.get(entityId ?? 'world')?.clear()
    })

    BedrockInspector.events.addEventListener('script_disconnect', () => {
        btnFetch.disabled = propAdd.disabled = true
        for (const props of list.values())
            for (const prop of props.properties.values())
                prop.elm.delBtn.disabled = prop.elm.editBtn.disabled = true
    })

    BedrockInspector.events.addEventListener('script_connect', () => {
        btnFetch.disabled = propAdd.disabled = false

        list.clear()
        select.replaceChildren()
        requestAnimationFrame(updateSelection)
    })


    select.addEventListener('change', updateSelection)
}

type PropertyData = BedrockType.ClientResponse.EntityDynamicPropertyData | BedrockType.ClientResponse.DynamicPropertyData
type PropertyDataElement = PropertyData & { row: HTMLTableRowElement }
type DValues = BedrockType.DynamicProperty.Values
type Edit = { elm: HTMLElement, conf: () => DValues | undefined }
