import { getTraceData } from "../../lib/util.js";
import debugRunOverride, { runList } from "../../override/run.js";
import DebugClient from "../client.js";
import jsonInspect from "../../lib/jsoninspect.js";

debugRunOverride.addEventListener('addRun', ({ id, type, interval, fid, fn }) => 
    DebugClient.send('run_add', getTraceData({ id, type, interval, fid, fn: jsonInspect.fn(fn) }, 6))
)
debugRunOverride.addEventListener('clearRun', (int) => 
    DebugClient.send('run_clear', getTraceData(int.id, 7))
)
debugRunOverride.addEventListener('suspend', (int) => 
    DebugClient.send('run_suspend', int.id)
)
debugRunOverride.addEventListener('resume', (int) => 
    DebugClient.send('run_resume', int.id)
)

DebugClient.message.addEventListener('run_action', ({ id, action }) => {
    const ri = runList.get(id)
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