import { system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';

class BlockInfo {
    static onTick() {
        for (const player of world.getAllPlayers()) {
            if (!player)
                continue;
            this.showStructureBlockInfo(player);
        }
    }

    static showStructureBlockInfo(player) {
        const block = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true });
        if (!block)
            return;
        player.onScreenDisplay.setActionBar({ text: this.getFormattedBlockInfo(block.permutation) });
    }

    static getFormattedBlockInfo(block) {
        const states = block.getAllStates();
        if (Object.keys(states).length === 0)
            return `Structure:\n§a${block.type.id}`;
        return `Structure:\n§a${block.type.id}\n§7${JSON.stringify(block.getAllStates())}`;
    }
}

system.runInterval(() => BlockInfo.onTick());