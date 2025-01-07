import getFid from "@/fid"
import jsonInspect from "@/jsoninspect"
import { getTraceData } from "@/util"
import InspectorClient from "@client"
import { RunOverride } from "@override"

RunOverride.events.addEventListener('add', ({ id, type, fn, interval }) =>
	InspectorClient.send('run_add', getTraceData({
		id,
		type,
		interval,
		fid: getFid(fn),
		fn: jsonInspect.fn(fn)
	}, 6))
)
RunOverride.events.addEventListener('addJob', ({ id }) =>
	InspectorClient.send('job_add', getTraceData(id, 6))
)
RunOverride.events.addEventListener('clear', (id) =>
	InspectorClient.send('run_clear', getTraceData(id, 7))
)
RunOverride.events.addEventListener('clearJob', ({ id, error }) =>
	InspectorClient.send('job_clear', getTraceData({
		id,
		error: error ? jsonInspect.inspect(error) : undefined
	}, 7))
)
RunOverride.events.addEventListener('suspend', (id) =>
	InspectorClient.send('run_suspend', id)
)
RunOverride.events.addEventListener('resume', (id) =>
	InspectorClient.send('run_resume', id)
)

InspectorClient.message.addEventListener('run_action', ({ id, action }) => {
	const ri = RunOverride.runList.get(id) ?? RunOverride.jobList.get(id)
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