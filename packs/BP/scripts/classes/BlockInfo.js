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
        const hit = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true, useActiveLayer: true });
        if (!hit && this.shownToLastTick.has(player.id)) {
            player.onScreenDisplay.setActionBar({ rawtext: [
                this.getFormattedHeader(),
                { translate: 'construct.blockinfo.none' }
            ]});
            this.shownToLastTick.delete(player.id);
        }
        if (!hit)
            return;
        player.onScreenDisplay.setActionBar(this.getFormattedBlockInfo(player, hit));
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(player, hit) {
        const easyPlaceMessage = this.getEasyPlaceMessage(player, hit);
        const supplyMessage = this.getSupplyMessage(player, hit);
        return { rawtext: [
            this.getFormattedHeader(hit.instance),
            this.getBlockMessage(hit.block),
            { text: '\n' },
            easyPlaceMessage,
            (easyPlaceMessage.translate && supplyMessage.translate) ? { text: ' ' } : { text: '' },
            supplyMessage
        ] };
    }

    static getFormattedHeader(instance = void 0) {
        return { rawtext: [
            { translate: 'construct.blockinfo.header' },
            (instance != void 0) ? { text: ` §7${instance.getName()}\n` } : { text: '\n' }
        ]};
    }

    static getBlockMessage(block) {
        if (!block)
            return { translate: 'construct.blockinfo.unknown' };
        const message = { rawtext: [{ text: '§a' }, { translate: block.permutation.localizationKey }] };
        const states = block.states;
        if (block.hasStates)
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

    static getSupplyMessage(player, hit) {
        if (player.getGameMode() !== GameMode.Survival || fetchMatchingItemSlot(player, hit.block?.permutation.getItemStack()?.typeId))
            return { text: '' };
        return { translate: 'construct.blockinfo.nosupply' };
    }

    static getEasyPlaceMessage(player, hit) {
        const builder = Builders.get(player.id);
        if (!builder.isOptionEnabled('easyPlace') && !builder.isOptionEnabled('fastEasyPlace'))
            return { text: '' };
        if (isBannedBlock(player, hit.block))
            return { translate: 'construct.blockinfo.noeasyplace' };
        return { text: '' };
    }
}

system.runInterval(() => BlockInfo.onTick());