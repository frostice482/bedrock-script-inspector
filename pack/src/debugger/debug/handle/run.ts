import { getTraceData } from "../../lib/util.js";
import DebugRunOverride from "../../override/run.js";
import DebugClient from "../client.js";
import jsonInspect from "../../lib/jsoninspect.js";
import getFid from "../../lib/fid.js";

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
DebugRunOverride.events.addEventListener('clearJob', (id) => 
    DebugClient.send('job_clear', getTraceData(id, 7))
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