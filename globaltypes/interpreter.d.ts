import BedrockType from "./bedrock"
import { EventPair } from "./types.js"

declare namespace BedrockInterpreterType {
	// interpreter sided events
	interface CrossEvents {
		bedrock_events: BedrockType.CrossEventData[]
		log: BDSLog
		script_connect: null
		script_disconnect: null
		bds_start: number
		bds_kill: string | number
	}

	type CrossEventData = EventPair<CrossEvents>

	// json transfer
	namespace JSONData {
		interface JSONLimits {
			bdsConsole: number
			console: number
			eventListeners: number
			eventListenerLog: number
			eventLog: number
			runs: number
		}

		interface Data {
			consoles: BedrockType.Console[]
			bdsConsoles: BDSLog[]
			eventListeners: EventListener[]
			eventLogs: BedrockType.Events.Data[]
			runs: RunData[]
			runJobs: RunDataBasic[]

			connected: boolean
			bdsConnected: boolean
			bdsPid: number | undefined
			bdsExit: number | string | undefined

			limits: JSONLimits
		}
	}
	type JSONData = JSONData.Data

	// bds
	namespace BDSLog {
		interface Data {
			level: LogLevelUnknown
			date?: string
			time?: string
			category?: string
			message: string
		}

		type LogLevelUnknown = BedrockType.Console.LogLevel | 'unknown'
	}
	type BDSLog = BDSLog.Data

	// event
	namespace EventListener {
		interface Data extends BedrockType.Events.Listener {
			disabled: boolean
			unsubscribed: boolean

			log: DataAction[]
		}

		interface DataAction {
			tick: number
			stack: string
			action: BedrockType.Events.ListenerActionTrack
		}
	}
	type EventListener = EventListener.Data

	// run
	interface RunDataBasic {
		id: number
		type: BedrockType.Run.Type

		suspended: boolean
		cleared: boolean

		addTick: number
		addStack: string

		clearTick?: number
		clearStack?: string
	}

	interface RunData extends BedrockType.Run.InfoWithFn, RunDataBasic {}
}

export default BedrockInterpreterType
