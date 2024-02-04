interface WorldBehaviorPack {
    pack_id: string
    version: string | number[]
}


namespace Express {
    interface Application {
        authHash?: string
    }
}
