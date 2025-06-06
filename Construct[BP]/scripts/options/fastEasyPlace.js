import { BuilderOption } from '../classes/Builder/BuilderOption';
import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, specialItemPlacementConversions, 
    blockIdToItemStackMap } from '../data';
import { Raycaster } from '../classes/Raycaster';

const PROCESS_INTERVAL = 2;

let runner = void 0;
const builderOption = new BuilderOption({
    identifier: 'fastEasyPlace',
    displayName: 'Fast Easy Place',
    description: 'Place correct structure blocks just by looking at them.',
    howToUse: "Look at structure blocks with a paper named 'Easy Place' in your hand to place them.",
});

system.runInterval(onTick, PROCESS_INTERVAL);

function onTick() {
    for (const player of world.getAllPlayers()) {
        if (!player || !builderOption.isEnabled(player.id))
            continue;
        processEasyPlace(player);
    }
}

function processEasyPlace(player) {
    if (!player || !isHoldingActionItem(player)) return;
    const structureBlock = Raycaster.getTargetedStructureBlock(player, { isFirst: true });
    if (!structureBlock)
        return;
    const worldBlock = player.dimension.getBlock(structureBlock.location);
    tryPlaceBlock(player, worldBlock, structureBlock.permutation);
}

function isHoldingActionItem(player) {
    const mainhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand);
    if (!mainhandItemStack)
        return false;
    return mainhandItemStack.typeId === 'minecraft:paper' && mainhandItemStack.nameTag === 'Easy Place';
}

function tryPlaceBlock(player, worldBlock, structureBlock) {
    if (isBannedBlock(player, structureBlock) || !locationIsPlaceable(player, worldBlock)) return;
    structureBlock = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.creative) {
        placeBlock(worldBlock, structureBlock);
    } else if (player.getGameMode() === GameMode.survival) {
        structureBlock = tryConvertToDefaultState(structureBlock);
        tryPlaceBlockSurvival(player, worldBlock, structureBlock);
    }
}

function locationIsPlaceable(player, worldBlock) {
    return worldBlock.isAir;
}

function isBannedBlock(player, structureBlock) {
    if (!structureBlock)
        return true;
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