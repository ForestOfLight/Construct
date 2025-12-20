import { GameMode, system, world } from '@minecraft/server';
import { Raycaster } from './Raycaster';
import { fetchMatchingItemSlot } from '../utils';
import { Block_state, chinese_text, State_values } from './zh_CN';
class BlockInfo {
    static shownToLastTick = new Set();

    static onTick() {
        for (const player of world.getAllPlayers()) {
            if (!player)
                continue;
            this.showStructureBlockInfo(player);
        }
    }
    /**
     * @param {import('@minecraft/server').Player} player
     * */
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
        player.onScreenDisplay.setActionBar(this.getFormattedBlockInfo(player, block));
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(player, block) {
        return { rawtext: [
            { translate: 'construct.blockinfo.header' },
            this.getSupplyMessage(player, block.permutation),
            { text: '\n' },
            this.getBlockMessage(block)
        ] };
    }

    static getBlockMessage(block) {
        if (!block)
            return { translate: 'construct.blockinfo.unknown' };
        const message = { rawtext: [{ text: '§a' }]};
        if (chinese_text[block.permutation.type.id] !== undefined) {
            message.rawtext.push({ text: chinese_text[block.permutation.type.id] });
        } else {
            message.rawtext.push({ translate: block.permutation.getItemStack().localizationKey });
        }

        const states = block.permutation.getAllStates();
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
        return Object.entries(states)
            .map(([stateName, stateValue]) => {
                if (State_values[stateName] || Block_state[stateName]) {
                    return (`\n§7${Block_state[stateName]}`)
                        .replaceAll('%1', `§a${State_values[stateName][String(stateValue)]}§7`);
                }
            })
            .join('');
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