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
            player.onScreenDisplay.setActionBar({ rawtext: [
                { translate: 'construct.blockinfo.header' },
                { text: '\n' },
                { translate: 'construct.blockinfo.none' }
            ]});
            this.shownToLastTick.delete(player.id);
        }
        if (!block)
            return;
        player.onScreenDisplay.setActionBar(this.getFormattedBlockInfo(player, block.permutation));
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(player, block) {
        return { rawtext: [
            { translate: 'construct.blockinfo.header' },
            this.getSupplyMessage(player, block),
            { text: '\n' },
            this.getBlockMessage(block)
        ] };
    }

    static getBlockMessage(block) {
        if (!block)
            return { translate: 'construct.blockinfo.unknown' };
        const message = { rawtext: [{ text: '§a' }, { translate: block.type.id }]};
        const states = block.getAllStates();
        if (Object.keys(states).length > 0)
            message.rawtext.push({ text: `\n§7${this.getFormattedStates(states)}` });
        if (block.isWaterlogged)
            message.rawtext.push({ rawtext: [
                { text: '\n§7' },
                { translate: 'construct.blockinfo.waterlogged' }
            ]});
        return message;
    }

    static getFormattedStates(states) {
        return Object.entries(states).map(([key, value]) => `§7${key}: §3${value}`).join('\n');
    }

    static getSupplyMessage(player, block) {
        const itemStack = fetchMatchingItemSlot(player, block.getItemStack()?.typeId);
        const isInSurvival = player.getGameMode() === GameMode.Survival;
        if (!itemStack && isInSurvival)
            return { translate: 'construct.blockinfo.nosupply' };
        return { text: '' };
    }
}

system.runInterval(() => BlockInfo.onTick());