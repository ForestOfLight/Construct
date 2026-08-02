import { system, EntityComponentTypes, LiquidType, ItemStack } from '@minecraft/server';
import { FormCancelationReason } from '@minecraft/server-ui';
import { specialItemPlacementConversions } from './options/easyPlaceConversions';
import { blocks, block_sounds } from './blocks';
import { blockPlacementSignal } from './classes/BlockPlacementSignal';

export async function forceShow(player, form, timeout = Infinity) {
    const startTick = system.currentTick;
    while ((system.currentTick - startTick) < timeout) {
        const response = await form.show(player);
        if (startTick + 1 === system.currentTick && response.cancelationReason === FormCancelationReason.UserBusy)
            player.sendMessage({ translate: 'construct.menu.open.closechat' });
        if (response.cancelationReason !== FormCancelationReason.UserBusy)
            return response;
    }
    throw new Error("Menu timed out.");
};

export function fetchMatchingItemSlot(entity, itemToMatchId) {
    if (!itemToMatchId)
        return void 0;
    const inventory = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return void 0;
    let smallestItemSlot;
    for (let index = 0; index < inventory.size; index++) {
        const itemSlot = inventory.getSlot(index);
        if (itemSlot.hasItem() && itemSlot?.typeId === itemToMatchId) {
            if (!smallestItemSlot || itemSlot.amount < smallestItemSlot.amount)
                smallestItemSlot = itemSlot;
        }
    }
    return smallestItemSlot;
}

export function placeBlock(player, placedBlock, blockToPlace, itemSlotToConsume = void 0) {
    system.run(() => {
        if (itemSlotToConsume)
            consumeItem(itemSlotToConsume);
        placedBlock.setPermutation(blockToPlace);
        handleWaterlogging(placedBlock, blockToPlace);
        playBlockPlacementSound(player, placedBlock, blockToPlace);
        // The single choke point every easyPlace and fastEasyPlace call site
        // funnels through. setPermutation fires no event of its own, so this
        // is the addon's only way to notice its own placements.
        //
        // Deferred a tick rather than emitted here. setPermutation has changed
        // this block, but the neighbor updates it triggers are queued and have
        // not run yet - so a subscriber reading the surrounding blocks now
        // sees their state from BEFORE this placement. A wall stacked on a
        // wall would report the one below it as still unconnected. Waiting a
        // tick gives subscribers the settled world that a real block event
        // would have handed them.
        //
        // Read off the block now, though: the Block handle is not guaranteed
        // to still be valid a tick from now.
        const dimensionId = placedBlock.dimension.id;
        const { x, y, z } = placedBlock.location;
        system.run(() => blockPlacementSignal.emit(dimensionId, { x, y, z }));
    });
}

function consumeItem(itemSlot) {
    if (specialItemPlacementConversions[itemSlot.typeId.replace('minecraft:', '')]) {
        itemSlot.setItem(new ItemStack(specialItemPlacementConversions[itemSlot.typeId.replace('minecraft:', '')]));
    } else {
        if (itemSlot.amount === 1)
            itemSlot.setItem(void 0);
        else
            itemSlot.amount--;
    }
}

function handleWaterlogging(block, structureBlock) {
    if (block.isLiquid && structureBlock.canContainLiquid(LiquidType.Water))
        block.setWaterlogged(true);
}

function playBlockPlacementSound(player, block, structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    const blockData = blocks[blockId];
    let blockSound = blockData?.sound || 'stone';
    let blockSoundId = block_sounds[blockSound].events.place?.sound
        || block_sounds[block_sounds[blockSound].base].events.place?.sound;
    player.dimension.playSound(blockSoundId, block.location);
}