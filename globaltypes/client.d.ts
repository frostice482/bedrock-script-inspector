import BedrockType from "./bedrock.js"
import { DeepPartialReadonly, EventPair } from "./types.js"
import { JsonInspectOptions } from "./jsoninspect.js"

declare namespace ClientType {
    // client sided events
    interface CrossEvents {
        event_action: {
            id: BedrockType.Events.ListenerWithId
            action: BedrockType.Events.ClientListenerAction
        }

        run_action: {
            id: number
            action: BedrockType.Run.ClientAction
        }

        dp_set: {
            entityId?: string
            id: string
            value: BedrockType.DynamicProperty.Values | undefined
        }

        req: Request

        disconnect: undefined
    }
    type CrossEventData = EventPair<CrossEvents>

    // interpreter events
    interface DebugEvents {
        command: string
        kill: null
        restart: null
        _: null
    }
    type DebugEventData = EventPair<DebugEvents>

    type EventTransferData = {
        int: false
        data: CrossEventData
    } | {
        int: true
        data: DebugEventData
    }

    // requests
    namespace Request {
        interface List {
            eval: EvalRequest
            dpList: null
            dpOf: {
                filter?: Partial<Record<DynamicPropertiesFilters, boolean>>
                nameFilter?: string
                limit?: number
                entityId?: string
            }
            _: null
        }

        type Values = keyof List

        type DynamicPropertiesFilters = 'string' | 'number' | 'boolean' | 'vector'

        interface EvalRequest {
            code: string
            async?: boolean
            store?: boolean
            root?: boolean
            opts?: DeepPartialReadonly<JsonInspectOptions.All>
        }
    }
    type Request<T extends Request.Values = Request.Values> = { [X in T]: { id: string, name: X, data: Request.List[X] } }[T]
}

export default ClientType
