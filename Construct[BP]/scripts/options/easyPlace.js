import { BuilderOption } from '../classes/Builder/BuilderOption';
import { BlockPermutation, EntityComponentTypes, GameMode, ItemStack, system, world } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, specialItemPlacementConversions, 
    blockIdToItemStackMap } from '../data';
import { fetchMatchingItemSlot } from '../utils';

const ACTION_SLOT = 27;

const builderOption = new BuilderOption({
    identifier: 'easyPlace',
    displayName: 'Easy Place',
    description: 'Always place the correct structure block.',
    howToUse: "Place blocks in a structure with a paper named 'Easy Place' in the inventory slot above your first hotbar slot to always place the correct block."
});

world.beforeEvents.playerPlaceBlock.subscribe(onPlayerPlaceBlock);

function onPlayerPlaceBlock(event) {
    const { player, block } = event;
    if (!player || !block || !builderOption.isEnabled(player.id) || !hasActionItemInCorrectSlot(player)) return;
    const structureBlock = structureCollection.fetchStructureBlock(block.dimension.id, block.location);
    if (!structureBlock)
        return;
    tryPlaceBlock(event, player, block, structureBlock);
}

function hasActionItemInCorrectSlot(player) {
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return false;
    const actionSlot = inventory.getSlot(ACTION_SLOT);
    return actionSlot.hasItem() && actionSlot.typeId === 'minecraft:paper' && actionSlot.nameTag === 'Easy Place';
}

function tryPlaceBlock(event, player, block, structureBlock) {
    if (shouldPreventAction(player, structureBlock))
        return preventAction(event, player);
    structureBlock = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.creative) {
        placeBlock(block, structureBlock);
    } else if (player.getGameMode() === GameMode.survival) {
        structureBlock = tryConvertToDefaultState(structureBlock);
        tryPlaceBlockSurvival(event, player, block, structureBlock);
    }
}

function shouldPreventAction(player, structureBlock) {
    return isBannedBlock(player, structureBlock);
}

function preventAction(event, player) {
    event.cancel = true;
    system.run(() => {
        player.onScreenDisplay.setActionBar('§cAction prevented by easyPlace.');
    });
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
    } else {
        preventAction(event, player);
    }
}

function getPlaceableItemStack(structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    const newItemId = blockIdToItemStackMap[blockId];
    return newItemId ? new ItemStack(newItemId) : structureBlock.getItemStack();
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
