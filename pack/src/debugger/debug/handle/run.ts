import DebugClient from "@client"
import getFid from "@fid.js"
import jsonInspect from "@jsoninspect.js"
import { getTraceData } from "@util.js"
import DebugRunOverride from "$run.js"

DebugRunOverride.events.addEventListener('add', ({ id, type, fn, interval }) => 
    DebugClient.send('run_add', getTraceData({
        id,
        type,
        interval,
        fid: getFid(fn),
        fn: jsonInspect.fn(fn)
    }, 6))
)
DebugRunOverride.events.addEventListener('addJob', ({ id }) => 
    DebugClient.send('job_add', getTraceData(id, 6))
)
DebugRunOverride.events.addEventListener('clear', (id) => 
    DebugClient.send('run_clear', getTraceData(id, 7))
)
DebugRunOverride.events.addEventListener('clearJob', ({ id, error }) => 
    DebugClient.send('job_clear', getTraceData({
        id,
        error: error ? jsonInspect.inspect(error) : undefined
    }, 7))
)
DebugRunOverride.events.addEventListener('suspend', (id) => 
    DebugClient.send('run_suspend', id)
)
DebugRunOverride.events.addEventListener('resume', (id) => 
    DebugClient.send('run_resume', id)
)

DebugClient.message.addEventListener('run_action', ({ id, action }) => {
    const ri = DebugRunOverride.runList.get(id) ?? DebugRunOverride.jobList.get(id)
    if (!ri) return

    switch (action) {
        case 'clear':
            ri.clear()
            break

        case 'resume':
            ri.suspended = false
            break
        
        case 'suspend':
            ri.suspended = true
            break
    }
})