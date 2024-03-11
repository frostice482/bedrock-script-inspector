import TypedEventEmitter from "./lib/typedevm"

declare global {
    interface WorldBehaviorPack {
        pack_id: string
        version: string | number[]
    }
    
    declare namespace Express {
        interface Application {
            authHash?: string
            events: TypedEventEmitter<{ close: [] }>
        }
    }    
}
