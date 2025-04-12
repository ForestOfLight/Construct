import { system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player)
            continue;
        showStructureBlockInfo(player);
    }
});

function showStructureBlockInfo(player) {
    const block = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true });
    if (!block)
        return;
    player.onScreenDisplay.setActionBar({ text: getFormattedBlockInfo(block.permutation) });
}

function getFormattedBlockInfo(block) {
    const states = block.getAllStates();
    if (Object.keys(states).length === 0)
        return `Structure:\n§a${block.type.id}`;
    return `Structure:\n§a${block.type.id}\n§7${JSON.stringify(block.getAllStates())}`;
}