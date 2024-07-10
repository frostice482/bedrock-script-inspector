import { world } from '@minecraft/server'

import("@minecraft/server-gametest").then(gt => {
    gt.register('debug', 'spawndummy', test => {
        world.sendMessage('Break the bedrock to end the test')
        test.succeedWhenBlockPresent('minecraft:air', {x: 0, y: 1, z: 0}, true)
        test.succeedOnTick(0x7ffffffe)
        test.spawnSimulatedPlayer({x: 2, y: 2, z: 2}, 'Dummy')
    })
        .maxTicks(0x7fffffff)
        .structureName('debug:test')    
}, () => {})
