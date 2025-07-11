import { BuilderOption } from '../classes/Builder/BuilderOption';
import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, 
    blockIdToItemStackMap } from '../data';
import { placeBlock, fetchMatchingItemSlot } from '../utils';
import { Raycaster } from '../classes/Raycaster';
import { Builders } from '../classes/Builder/Builders';
import { Vector } from '../lib/Vector';

const PROCESS_INTERVAL = 2; // Fast Easy Place will attempt to place twice when at an interval of 1.
const PLAYER_COLLISION_BOX = { width: 0.6, height: 1.8 };

const builderOption = new BuilderOption({
    identifier: 'fastEasyPlace',
    displayName: 'Fast Easy Place',
    description: 'Place correct structure blocks just by looking at them.',
    howToUse: "Hold the Easy Place item in your main hand and look at blocks in a structure to place them.",
    onEnableCallback: (playerId) => giveActionItem(playerId),
    onDisableCallback: (playerId) => removeActionItem(playerId)
});

function giveActionItem(playerId) {
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const itemStack = new ItemStack('construct:easy_place');
    if (!container.contains(itemStack)) {
        const remainingItemStack = container.addItem(itemStack);
        if (remainingItemStack)
            player.dimension.spawnItem(remainingItemStack, player.location);
    }
}

function removeActionItem(playerId) {
    const builder = Builders.get(playerId);
    if (builder.isOptionEnabled('easyPlace'))
        return;
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack?.typeId === 'construct:easy_place')
            container.setItem(i, void 0);
    }
    const equipment = player.getComponent(EntityComponentTypes.Equippable);
    const offhandItemStack = equipment?.getEquipment(EquipmentSlot.Offhand);
    if (offhandItemStack?.typeId === 'construct:easy_place') {
        equipment.setEquipment(EquipmentSlot.Offhand, void 0);
    }
}

system.runInterval(onTick, PROCESS_INTERVAL);
world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteractWithBlock);

function onTick() {
    for (const player of world.getAllPlayers()) {
        if (player && builderOption.isEnabled(player.id))
            processEasyPlace(player);
    }
}

function onPlayerInteractWithBlock(event) {
    const { player, block, isFirstEvent } = event;
    if (!player || !isFirstEvent || !block || !builderOption.isEnabled(player.id) || !isHoldingActionItem(player)) return;
    preventAction(event, player);
}

function processEasyPlace(player) {
    if (!player || !isHoldingActionItem(player)) return;
    const structureBlock = Raycaster.getTargetedStructureBlock(player, { isFirst: true });
    if (!structureBlock)
        return;
    const worldBlock = player.dimension.getBlock(structureBlock.location);
    tryPlaceBlock(player, worldBlock, structureBlock.permutation);
}

function preventAction(event, player) {
    event.cancel = true;
    system.run(() => {
        player.onScreenDisplay.setActionBar('§cAction prevented by Easy Place.');
    });
}

function isHoldingActionItem(player) {
    const mainhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand);
    if (!mainhandItemStack)
        return false;
    return mainhandItemStack.typeId === 'construct:easy_place';
}

function tryPlaceBlock(player, worldBlock, structureBlock) {
    if (isBannedBlock(player, structureBlock) || !locationIsPlaceable(player, worldBlock)) return;
    structureBlock = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.Creative) {
        placeBlock(player, worldBlock, structureBlock);
    } else if (player.getGameMode() === GameMode.Survival) {
        structureBlock = tryConvertToDefaultState(structureBlock);
        tryPlaceBlockSurvival(player, worldBlock, structureBlock);
    }
}

function locationIsPlaceable(player, worldBlock) {
    return (worldBlock.isAir || worldBlock.isLiquid) && !isBlockInsidePlayer(player, worldBlock);
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
    const itemSlotToUse = fetchMatchingItemSlot(player, placeableItemStack?.typeId);
    if (itemSlotToUse)
        placeBlock(player, block, structureBlock, itemSlotToUse);
}

function getPlaceableItemStack(structureBlock) {
    const blockId = structureBlock.type.id.replace('minecraft:', '');
    const newItemId = blockIdToItemStackMap[blockId];
    return newItemId ? new ItemStack(newItemId) : structureBlock.getItemStack();
}

function isBlockInsidePlayer(player, worldBlock) {
    const playerLocation = Vector.from(player.location);
    const blockLocation = Vector.from(worldBlock.location);
    const playerMin = playerLocation.subtract({ x: PLAYER_COLLISION_BOX.width / 2, y: -0.1, z: PLAYER_COLLISION_BOX.width / 2 });
    const playerMax = playerLocation.add({ x: PLAYER_COLLISION_BOX.width / 2, y: PLAYER_COLLISION_BOX.height, z: PLAYER_COLLISION_BOX.width / 2 });
    const blockMin = blockLocation;
    const blockMax = blockLocation.add({ x: 1, y: 1, z: 1 });
    return Vector.intersect(playerMax, playerMin, blockMax, blockMin);
}