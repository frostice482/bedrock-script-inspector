import JSONInspectData from "./jsoninspect.js"
import { EventPair } from "./types.js"

declare namespace BedrockType {
    // bedrock sided events
    interface CrossEvents {
        event_listener_subscribe: TraceData<Events.Listener>
        event_listener_unsubscribe: TraceData<Events.ListenerWithId>
        event_listener_disable: Events.ListenerWithId
        event_listener_enable: Events.ListenerWithId
        event: Events.Data
        
        run_add: TraceData<Run.InfoWithFn>
        run_clear: TraceData<number>
        run_suspend: number
        run_resume: number

        job_add: TraceData<number>
        job_clear: TraceData<{
            id: number
            error?: JSONInspectData
        }>

        dp_change: DynamicProperty.Change
        dp_clear: DynamicProperty.Clear

        tick: Tick

        console: Console
    }
    type CrossEventData = EventPair<CrossEvents>

    // client response
    namespace ClientResponse {
        interface List {
            eval: EvalData
            dpList: {
                world: DynamicPropertyData
                entity: EntityDynamicPropertyData[]
            }
            dpOf: null | BedrockPropertyPair[]
            _: null
        }
        
        type Values = keyof List

        type BedrockPropertyPair = {
            name: string,
            value: DynamicProperty.Values
        }
    
        interface EvalData {
            error?: boolean
            data: JSONInspectData
            execTime: number
            inspTime: number
        }

        interface DynamicPropertyData {
            properties: number
            bytes: number
        }

        interface EntityDynamicPropertyData extends DynamicPropertyData {
            id: string
            nametag: string
            type: string
        }
    }

    // console
    namespace Console {
        interface Data {
            level: LogLevel
            data: (JSONInspectData | string)[]
            stack: string
        }
    
        type LogLevel = 'log' | 'info' | 'warn' | 'error'
    }
    type Console = Console.Data

    // events
    namespace Events {
        interface Identifier {
            name: string
            category: Category
            type: Type
        }
    
        type Category = 'world' | 'system'
        type Type = 'before' | 'after'
    
        interface ListenerWithId extends Identifier, FunctionIdInfo {}
        interface Listener extends Identifier, FunctionInfo {}

        interface Data extends Identifier, TimingData {
            data: JSONInspectData
            functions: DataFunctionExec[]
        }
    
        interface DataFunctionExec extends FunctionInfo {
            delta: number
            error?: JSONInspectData
        }

        type ListenerActionTrack = 'subscribe' | 'unsubscribe'
        type ClientListenerAction = 'unsubscribe' | 'disable' | 'enable'
        type ListenerAction = 'subscribe' | 'unsubscribe' | 'disable' | 'enable'
    }

    // run
    namespace Run {
        interface Info {
            id: number
            type: Type
            interval: number
        }
        
        interface InfoWithFn extends Info, FunctionInfo {}
    
        type Type = 'interval' | 'timeout' | 'run' | 'job'
        
        type ActionTrack = 'add' | 'clear'
        type ClientAction = 'clear' | 'suspend' | 'resume'
        type Action = 'add' | 'clear' | 'suspend' | 'resume'
    }

    // tick
    namespace Tick {
        interface Data extends TimeData, TimingData {
            run: TickRun
        }

        interface TickRun extends TimingData {
            runs: RunData[]
            jobs: JobRunData[]
        }

        interface RunData extends TimingData {
            id: number
            sleep: number
            error?: JSONInspectData
        }

        interface JobRunData extends TimingData {
            id: number
            sleep: number
            count: number
        }
    }
    type Tick = Tick.Data

    // dynamic property
    namespace DynamicProperty {
        interface Change {
            entityId?: string
            id: string
            value: Values | undefined
            stack: string
        }

        interface Clear {
            entityId?: string
        }
    
        interface Vector3 {
            x: number
            y: number
            z: number
        }
    
        type Values = string | number | boolean | Vector3
    }

    // misc

    interface FunctionIdInfo {
        fid: number
    }

    interface FunctionInfo extends FunctionIdInfo {
        fn: JSONInspectData.I_Function
    }

    interface TimeData {
        tick: number
        time: number
    }

    interface TimingData {
        delta: number
    }

    interface TraceData<T> extends TimeData {
        data: T
        stack: string
    }
}

export default BedrockType
