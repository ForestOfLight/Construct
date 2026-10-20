import { system, EntityComponentTypes, LiquidType, ItemStack, ItemTypes } from '@minecraft/server';
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

export function fetchMatchingItemSlotIndex(entity, itemToMatchId) {
    if (!itemToMatchId)
        return void 0;
    const inventory = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return void 0;
    let smallestItemSlotIndex;
    for (let index = 0; index < inventory.size; index++) {
        const itemSlot = inventory.getSlot(index);
        if (itemSlot.hasItem() && itemSlot?.typeId === itemToMatchId) {
            if (smallestItemSlotIndex === void 0 || itemSlot.amount < inventory.getSlot(smallestItemSlotIndex).amount)
                smallestItemSlotIndex = index;
        }
    }
    return smallestItemSlotIndex;
}

export function hasItems(entity, itemIds) {
    if (itemIds.length === 0)
        return false;
    const inventory = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return false;
    const missingCounts = {};
    for (const itemId of itemIds)
        missingCounts[itemId] = (missingCounts[itemId] || 0) + 1;
    for (let index = 0; index < inventory.size; index++) {
        const itemStack = inventory.getItem(index);
        if (itemStack && missingCounts[itemStack.typeId] !== void 0)
            missingCounts[itemStack.typeId] -= itemStack.amount;
    }
    return Object.values(missingCounts).every((count) => count <= 0);
}

export function applyConversionPatterns(id, patterns, typeRegistry = ItemTypes) {
    const unprefixedId = id.replace('minecraft:', '');
    for (const { input, output } of patterns) {
        if (!input.test(unprefixedId))
            continue;
        const convertedIds = output.map((outputId) => unprefixedId.replace(input, outputId));
        if (convertedIds.every((convertedId) => typeRegistry.get(convertedId.includes(':') ? convertedId : `minecraft:${convertedId}`)))
            return convertedIds;
    }
    return void 0;
}

export function placeBlock(player, placedBlock, blockToPlace, itemIdsToConsume = []) {
    system.run(() => {
        for (const itemId of itemIdsToConsume) {
            const itemSlot = fetchMatchingItemSlot(player, itemId);
            if (itemSlot)
                consumeItem(player, itemSlot);
        }
        placedBlock.setPermutation(blockToPlace);
        handleWaterlogging(placedBlock, blockToPlace);
        playBlockPlacementSound(player, placedBlock, blockToPlace);
        const dimensionId = placedBlock.dimension.id;
        const { x, y, z } = placedBlock.location;
        system.run(() => blockPlacementSignal.emit(dimensionId, { x, y, z }));
    });
}

function consumeItem(player, itemSlot) {
    const returnedItemIds = applyConversionPatterns(itemSlot.typeId, specialItemPlacementConversions) || [];
    if (itemSlot.amount === 1)
        itemSlot.setItem(void 0);
    else
        itemSlot.amount--;
    for (const returnedItemId of returnedItemIds)
        giveItem(player, itemSlot, new ItemStack(returnedItemId));
}

function giveItem(player, preferredSlot, itemStack) {
    if (!preferredSlot.hasItem()) {
        preferredSlot.setItem(itemStack);
        return;
    }
    const leftover = player.getComponent(EntityComponentTypes.Inventory)?.container?.addItem(itemStack);
    if (leftover)
        player.dimension.spawnItem(leftover, player.location);
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