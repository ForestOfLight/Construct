import { Rule } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, specialItemPlacementConversions, 
    blockIdToItemStackMap } from '../data';
import { Raycaster } from '../classes/Raycaster';

let runner = void 0;
const easyPlace = new Rule({
    identifier: 'fastEasyPlace',
    description: { text: 'Looking at structure blocks with an arrow in your hand will place them.' },
    onEnableCallback: () => { runner = system.runInterval(onTick, 2); },
    onDisableCallback: () => { system.clearRun(runner); }
})
extension.addRule(easyPlace);

function onTick() {
    for (const player of world.getAllPlayers()) {
        if (!player)
            continue;
        processEasyPlace(player);
    }
}

function processEasyPlace(player) {
    if (!player || !isHoldingArrow(player)) return;
    const structureBlock = Raycaster.getTargetedStructureBlock(player, { isFirst: true });
    if (!structureBlock)
        return;
    const worldBlock = player.dimension.getBlock(structureBlock.location);
    tryPlaceBlock(player, worldBlock, structureBlock.permutation);
}

function isHoldingArrow(player) {
    const mainhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand);
    if (!mainhandItemStack)
        return false;
    return mainhandItemStack.typeId === 'minecraft:arrow';
}

function tryPlaceBlock(player, worldBlock, structureBlock) {
    if (isBannedBlock(player, structureBlock) || !locationIsPlaceable(worldBlock)) return;
    structureBlock = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.creative) {
        placeBlock(worldBlock, structureBlock);
    } else if (player.getGameMode() === GameMode.survival) {
        structureBlock = tryConvertToDefaultState(structureBlock);
        tryPlaceBlockSurvival(player, worldBlock, structureBlock);
    }
}

function locationIsPlaceable(worldBlock) {
    return worldBlock.isAir;
}

function isBannedBlock(player, structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    if (bannedBlocks.includes(blockId))
        return true;
    if (bannedDimensionBlocks[player.dimension.id.replace('minecraft:', '')]?.includes(blockId))
        return true;
    const allowedStates = whitelistedBlockStates[blockId];
    if (allowedStates) {
        for (const [stateKey, stateValue] of Object.entries(allowedStates)) {
            if (structureBlock.getState(stateKey) !== stateValue)
                return true;
        }
    }
    return false;
}

function tryConvertBannedToValidBlock(structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    if (Object.keys(bannedToValidBlockMap).includes(blockId))
        return BlockPermutation.resolve(bannedToValidBlockMap[blockId], structureBlock.getAllStates());
    return structureBlock;
}

function tryConvertToDefaultState(structureBlock) {
    const newStates = {};
    for (const [stateKey, stateValue] of Object.entries(structureBlock.getAllStates())) {
        if (resetToBlockStates[stateKey] !== void 0 && stateValue !== resetToBlockStates[stateKey])
            newStates[stateKey] = resetToBlockStates[stateKey];
        else
            newStates[stateKey] = stateValue;
    }
    return BlockPermutation.resolve(structureBlock.type.id, newStates);
}

function tryPlaceBlockSurvival(player, block, structureBlock) {
    const placeableItemStack = getPlaceableItemStack(structureBlock);
    // console.warn(`Looking for item to place ${structureBlock?.type.id} (${placeableItemStack?.typeId})...`);
    const itemSlotToUse = fetchMatchingItemSlot(player, placeableItemStack?.typeId);
    if (itemSlotToUse) {
        placeBlock(block, structureBlock, itemSlotToUse);
    }
}

function getPlaceableItemStack(structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    const newItemId = blockIdToItemStackMap[blockId];
    return newItemId ? new ItemStack(newItemId) : structureBlock.getItemStack();
}

function fetchMatchingItemSlot(player, itemToMatchId) {
    if (!itemToMatchId)
        return void 0;
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return void 0;
    for (let index = 0; index < inventory.size; index++) {
        const itemSlot = inventory.getSlot(index);
        if (itemSlot.hasItem() && itemSlot?.typeId === itemToMatchId)
            return itemSlot;
    }
}

function placeBlock(block, structureBlock, itemSlot) {
    system.run(() => {
        if (itemSlot) {
            consumeItem(itemSlot);
        }
        block.setPermutation(structureBlock);
    });
}

function consumeItem(itemSlot) {
    if (specialItemPlacementConversions[itemSlot.typeId.replace('minecraft:', '')]) {
        consumeSpecial(itemSlot);
    } else {
        if (itemSlot.amount === 1)
            itemSlot.setItem(void 0);
        else
            itemSlot.amount--;
    }
}

function consumeSpecial(itemSlot) {
    itemSlot.setItem(new ItemStack(specialItemPlacementConversions[itemSlot.typeId.replace('minecraft:', '')]));
}