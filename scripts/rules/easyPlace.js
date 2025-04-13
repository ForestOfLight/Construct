import { Rule } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { BlockPermutation, EntityComponentTypes, GameMode, ItemStack, system, world } from '@minecraft/server';
import { structureCollection } from '../classes/StructureCollection';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, specialItemPlacementConversions, 
    blockIdToItemStackMap } from '../data';

const ACTION_SLOT = 35;

const easyPlace = new Rule({
    identifier: 'easyPlace',
    description: { text: "Simplifies placing blocks in a structure (paper named 'easyPlace' in bottom right inventory slot)." },
    onEnableCallback: () => { world.beforeEvents.playerPlaceBlock.subscribe(onPlayerPlaceBlock); },
    onDisableCallback: () => { world.beforeEvents.playerPlaceBlock.unsubscribe(onPlayerPlaceBlock); }
})
extension.addRule(easyPlace);

function onPlayerPlaceBlock(event) {
    const { player, block } = event;
    if (!player || !block || !hasActionItemInCorrectSlot(player)) return;
    const structureBlock = fetchStructureBlock(block.location);
    if (!structureBlock)
        return;
    tryPlaceBlock(event, player, block, structureBlock);
}

function hasActionItemInCorrectSlot(player) {
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return false;
    const actionSlot = inventory.getSlot(ACTION_SLOT);
    return actionSlot.hasItem() && actionSlot.typeId === 'minecraft:paper' && actionSlot.nameTag === 'easyPlace';
}

function fetchStructureBlock(location) {
    const locatedStructures = structureCollection.getStructuresAtLocation(location);
    if (locatedStructures.length === 0)
        return void 0;
    const structure = locatedStructures[0];
    return structure.getBlock(structure.toStructureCoords(location));
}

function tryPlaceBlock(event, player, block, structureBlock) {
    if (isBannedBlock(player, structureBlock)) return;
    structureBlock = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.creative) {
        placeBlock(block, structureBlock);
    } else if (player.getGameMode() === GameMode.survival) {
        structureBlock = tryConvertToDefaultState(structureBlock);
        tryPlaceBlockSurvival(event, player, block, structureBlock);
    }
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

function tryPlaceBlockSurvival(event, player, block, structureBlock) {
    const placeableItemStack = getPlaceableItemStack(structureBlock);
    // console.warn(`Looking for item to place ${structureBlock?.type.id} (${placeableItemStack?.typeId})...`);
    const itemSlotToUse = fetchMatchingItemSlot(player, placeableItemStack?.typeId);
    if (itemSlotToUse) {
        event.cancel = true;
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
