import { system, EntityComponentTypes, LiquidType, ItemStack } from '@minecraft/server';
import { FormCancelationReason } from '@minecraft/server-ui';
import { specialItemPlacementConversions } from './data';
import { blocks, block_sounds } from './blocks';

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
    let blockSound = blockData['sound'] || 'stone';
    let blockSoundId = block_sounds[blockSound].events.place?.sound
        || block_sounds[block_sounds[blockSound].base].events.place?.sound;
    player.dimension.playSound(blockSoundId, block.location);
}