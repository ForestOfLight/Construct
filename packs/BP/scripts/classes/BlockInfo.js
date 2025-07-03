import { GameMode, system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';
import { fetchMatchingItemSlot } from '../utils';

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
        const block = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true, useActiveLayer: true });
        if (!block && this.shownToLastTick.has(player.id)) {
            player.onScreenDisplay.setActionBar({ text: 'Structure:\n§7None' });
            this.shownToLastTick.delete(player.id);
        }
        if (!block)
            return;
        player.onScreenDisplay.setActionBar({ text: this.getFormattedBlockInfo(player, block.permutation) });
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(player, block) {
        return 'Structure:' + this.getSupplyMessage(player, block) + '\n' + this.getBlockMessage(block);
    }

    static getBlockMessage(block) {
        if (!block)
            return '§7Unknown';
        const states = block.getAllStates();
        if (Object.keys(states).length === 0)
            return `§a${block.type.id}`;
        else
            return `§a${block.type.id}\n§7${this.getFormattedStates(states)}`;
    }

    static getFormattedStates(states) {
        return Object.entries(states).map(([key, value]) => `§7${key}: §3${value}`).join('\n');
    }

    static getSupplyMessage(player, block) {
        const itemStack = fetchMatchingItemSlot(player, block.getItemStack()?.typeId);
        const isInSurvival = player.getGameMode() === GameMode.Survival;
        if (!itemStack && isInSurvival)
            return ' §c[No Supply]';
        return '';
    }
}

system.runInterval(() => BlockInfo.onTick());