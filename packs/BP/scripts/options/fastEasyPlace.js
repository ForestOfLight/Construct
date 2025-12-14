import { BuilderOption } from '../classes/Builder/BuilderOption';
import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, 
    blockIdToItemStackMap } from '../data';
import { placeBlock, fetchMatchingItemSlot } from '../utils';
import { Raycaster } from '../classes/Raycaster';
import { Builders } from '../classes/Builder/Builders';
import { Vector } from '../lib/Vector';

const locationsPlacedLastTick = new Set();
const ACTION_ITEM = 'construct:easy_place';
const runnerByPlayer = {};

const builderOption = new BuilderOption({
    identifier: 'fastEasyPlace',
    displayName: { translate: 'construct.option.fasteasyplace.name' },
    description: { translate: 'construct.option.fasteasyplace.description' },
    howToUse: { translate: 'construct.option.fasteasyplace.howto' },
    onEnableCallback: (playerId) => giveActionItem(playerId),
    onDisableCallback: (playerId) => removeActionItem(playerId)
});

function giveActionItem(playerId) {
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const itemStack = new ItemStack(ACTION_ITEM);
    const offhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Offhand);
    if (!container.contains(itemStack) && offhandItemStack?.typeId !== ACTION_ITEM) {
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
        if (itemStack?.typeId === ACTION_ITEM)
            container.setItem(i, void 0);
    }
    const equipment = player.getComponent(EntityComponentTypes.Equippable);
    const offhandItemStack = equipment?.getEquipment(EquipmentSlot.Offhand);
    if (offhandItemStack?.typeId === ACTION_ITEM) {
        equipment.setEquipment(EquipmentSlot.Offhand, void 0);
    }
}

system.runInterval(onPlacingTick);
world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteractWithBlock);
world.afterEvents.itemStartUse.subscribe(onItemStartUse);
world.afterEvents.itemStopUse.subscribe(onItemStopUse);

function onItemStartUse(event) {
    if (event.itemStack?.typeId !== ACTION_ITEM)
        return;
    runnerByPlayer[event.source.id] = system.runInterval((() => onPlacingTick(event.source)));
}

function onItemStopUse(event) {
    if (event.itemStack?.typeId !== ACTION_ITEM)
        return;
    const playerRunnerId = runnerByPlayer[event.source.id];
    if (playerRunnerId)
        system.clearRun(playerRunnerId);
}

function onPlacingTick(player) {
    if (player && builderOption.isEnabled(player.id))
        processEasyPlace(player);
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
    if (locationsPlacedLastTick.has(JSON.stringify(worldBlock.location)))
        return;
    locationsPlacedLastTick.add(JSON.stringify(worldBlock.location));
    system.runTimeout(() => {
        locationsPlacedLastTick.delete(JSON.stringify(worldBlock.location));
    }, 2);
    tryPlaceBlock(player, worldBlock, structureBlock.permutation);
}

function preventAction(event, player) {
    event.cancel = true;
    system.run(() => {
        player.onScreenDisplay.setActionBar({ translate: 'construct.option.easyplace.actionprevented' });
    });
}

function isHoldingActionItem(player) {
    const mainhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand);
    if (!mainhandItemStack)
        return false;
    return mainhandItemStack.typeId === ACTION_ITEM;
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
    if (blockId === "bubble_column" && structureBlock.isWaterlogged)
        return BlockPermutation.resolve('minecraft:water');
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
    const playerAABB = player.getAABB();
    const playerCenter = Vector.from(playerAABB.center);
    const playerMin = playerCenter.subtract({ x: playerAABB.extent.x, y: playerAABB.extent.y - 0.001, z: playerAABB.extent.z });
    const playerMax = playerCenter.add(playerAABB.extent);
    const blockMin = Vector.from(worldBlock.location);
    const blockMax = blockMin.add({ x: 1, y: 1, z: 1 });
    return Vector.intersect(playerMax, playerMin, blockMax, blockMin);
}