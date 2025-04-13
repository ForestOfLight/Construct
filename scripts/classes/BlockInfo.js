import { system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';

class BlockInfo {
    static shownToLastTick = new Set();

    static onTick() {
        for (const player of world.getAllPlayers()) {
            if (!player)
                continue;
            this.showStructureBlockInfo(player);
        }
    }

    static showStructureBlockInfo(player) {
        const block = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true });
        if (!block && this.shownToLastTick.has(player.id)) {
            player.onScreenDisplay.setActionBar({ text: 'Structure:\n§7None' });
            this.shownToLastTick.delete(player.id);
        }
        if (!block)
            return;
        player.onScreenDisplay.setActionBar({ text: this.getFormattedBlockInfo(block.permutation) });
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(block) {
        const header = 'Structure:\n'
        if (!block)
            return header + '§7Unknown';
        const states = block.getAllStates();
        if (Object.keys(states).length === 0)
            return header + `§a${block.type.id}`;
        return header + `§a${block.type.id}\n§7${this.getFormattedStates(states)}`;
    }

    static getFormattedStates(states) {
        return Object.entries(states).map(([key, value]) => `§7${key}: §3${value}`).join('\n');
    }
}

system.runInterval(() => BlockInfo.onTick());