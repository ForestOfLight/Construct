import { GameMode, system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';
import { fetchMatchingItemSlot } from '../utils';
import { Builders } from './Builder/Builders';
import { isBannedBlock } from '../options/fastEasyPlace';

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
                this.getFormattedHeader(block.instance),
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
        const easyPlaceMessage = this.getEasyPlaceMessage(player, block);
        const supplyMessage = this.getSupplyMessage(player, block); 
        return { rawtext: [
            this.getFormattedHeader(block.instance),
            this.getBlockMessage(block),
            { text: '\n' },
            easyPlaceMessage,
            (easyPlaceMessage.translate && supplyMessage.translate) ? { text: ' ' } : { text: '' },
            supplyMessage
        ] };
    }

    static getFormattedHeader(instance) {
        return { rawtext: [
            { translate: 'construct.blockinfo.header' },
            { text: ` §7${instance.getName()}` },
            { text: '\n' }
        ]};
    }

    static getBlockMessage(block) {
        if (!block)
            return { translate: 'construct.blockinfo.unknown' };
        const message = { rawtext: [{ text: '§a' }, { translate: block.localizationKey }] };
        const states = block.getAllStates();
        if (Object.keys(states).length > 0)
            message.rawtext.push({ text: `\n§7${this.getFormattedStates(states)}` });
        if (block.isWaterlogged) {
            message.rawtext.push({ rawtext: [
                { text: '\n§7' },
                { translate: 'construct.blockinfo.waterlogged' }
            ] });
        }
        return message;
    }
    
    static getFormattedStates(states) {
        return Object.entries(states).map(([key, value]) => `§7${key}: §3${value}`).join('\n');
    }

    static getSupplyMessage(player, block) {
        if (player.getGameMode() !== GameMode.Survival || fetchMatchingItemSlot(player, block.getItemStack()?.typeId))
            return { text: '' };
        return { translate: 'construct.blockinfo.nosupply' };
    }

    static getEasyPlaceMessage(player, block) {
        const builder = Builders.get(player.id);
        if (builder.isOptionEnabled('easyPlace') || builder.isOptionEnabled('fastEasyPlace'))
            return { text: '' };
        if (isBannedBlock(player, block))
            return { translate: 'construct.blockinfo.noeasyplace' };
    }
}

system.runInterval(() => BlockInfo.onTick());