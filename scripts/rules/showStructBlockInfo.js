import { Rule } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';

let runner = void 0;
const showStructBlockInfo = new Rule({
    identifier: 'showStructBlockInfo',
    description: { text: 'Shows block and state info for structure blocks you are looking at.' },
    onEnableCallback: () => { runner = system.runInterval(onTick); },
    onDisableCallback: () => { system.clearRun(runner); }
})
extension.addRule(showStructBlockInfo);

function onTick() {
    for (const player of world.getAllPlayers()) {
        if (!player)
            continue;
        showStructureBlockInfo(player);
    }
}

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