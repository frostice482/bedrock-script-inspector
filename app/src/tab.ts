import IteatorUtil from "./lib/iterator.js";

// navigator tab list
const navs = new Map(
    IteatorUtil.map(
        IteatorUtil.list(document.querySelectorAll<HTMLElement>('#nav > button[tab]')),
        elm => [elm.getAttribute('tab') ?? '', elm]
    )
)

// active navigator tab
let activeNav = document.querySelector<HTMLElement>('#nav > button[tab].active') ?? undefined

// tabs
const tabs = new Map(
    IteatorUtil.map(
        IteatorUtil.list(document.querySelectorAll<HTMLElement>('#tabs > div[id^="tab-"]')),
        elm => [elm.id.slice(4), elm]
    )
)

// add click listener
for (const [id, nav] of navs) nav.addEventListener('click', () => location.hash = id)

// tab change

export const tabchange = new EventTarget
export function updatehash(id: string) {
    for (const [tabid, tab] of tabs) tab.hidden = tabid !== id
    const nav = navs.get(id)
        
    activeNav?.classList.remove('active')
    activeNav = nav
    nav?.classList.add('active')

    tabchange.dispatchEvent(new Event(id))
}

// update tab on hash change
window.addEventListener('hashchange', () => updatehash(location.hash.slice(1)))
if (location.hash) updatehash(location.hash.slice(1))
