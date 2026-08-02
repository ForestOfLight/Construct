import { BuilderOption } from '../classes/Builder/BuilderOption';
import { BlockPermutation, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, world } from '@minecraft/server';
import { instanceCollection } from '../classes/Instance/InstanceCollection';
import { bannedBlocks, bannedToValidBlockMap, whitelistedBlockStates, resetToBlockStates, bannedDimensionBlocks, blockIdToItemStackMap } from './easyPlaceConversions';
import { fetchMatchingItemSlot, placeBlock } from '../utils';
import { Builders } from '../classes/Builder/Builders';

const builderOption = new BuilderOption({
    identifier: 'easyPlace',
    displayName: { translate: 'construct.option.easyplace.name' },
    description: { translate: 'construct.option.easyplace.description' },
    howToUse: { translate: 'construct.option.easyplace.howto' },
    onEnableCallback: (playerId) => giveActionItem(playerId),
    onDisableCallback: (playerId) => removeActionItem(playerId)
});

function giveActionItem(playerId) {
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const itemStack = new ItemStack('construct:easy_place');
    const offhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Offhand);
    if (!container.contains(itemStack) && offhandItemStack?.typeId !== 'construct:easy_place') {
        const remainingItemStack = container.addItem(itemStack);
        if (remainingItemStack)
            player.dimension.spawnItem(remainingItemStack, player.location);
    }
}

function removeActionItem(playerId) {
    const builder = Builders.get(playerId);
    if (builder.isOptionEnabled('fastEasyPlace'))
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

world.beforeEvents.playerPlaceBlock.subscribe(onPlayerPlaceBlock);

function onPlayerPlaceBlock(event) {
    const { player, block } = event;
    if (!player || !block || !builderOption.isEnabled(player.id) || !isHoldingActionItem(player)) return;
    const structureBlock = instanceCollection.fetchStructureBlock(block.dimension.id, block.location);
    if (!structureBlock)
        return;
    tryPlaceBlock(event, player, block, structureBlock);
}

function isHoldingActionItem(player) {
    const offhandItemStack = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Offhand);
    if (!offhandItemStack)
        return false;
    return offhandItemStack.typeId === 'construct:easy_place';
}

function tryPlaceBlock(event, player, block, structureBlock) {
    if (shouldPreventAction(player, structureBlock))
        return preventAction(event, player);
    let permutation = tryConvertBannedToValidBlock(structureBlock);
    if (player.getGameMode() === GameMode.Creative) {
        event.cancel = true;
        placeBlock(player, block, permutation);
    } else if (player.getGameMode() === GameMode.Survival) {
        permutation = tryConvertToDefaultState(permutation);
        tryPlaceBlockSurvival(event, player, block, permutation);
    }
}

function shouldPreventAction(player, structureBlock) {
    return isBannedBlock(player, structureBlock);
}

function preventAction(event, player) {
    event.cancel = true;
    system.run(() => {
        player.onScreenDisplay.setActionBar({ translate: 'construct.option.easyplace.actionprevented' });
    });
}

function isBannedBlock(player, structureBlock) {
    const blockId = structureBlock.typeId.replace('minecraft:', '');
    if (bannedBlocks.includes(blockId))
        return true;
    if (bannedDimensionBlocks[player.dimension.id.replace('minecraft:', '')]?.includes(blockId))
        return true;
    const allowedStates = whitelistedBlockStates[blockId];
    if (allowedStates) {
        for (const [stateKey, stateValue] of Object.entries(allowedStates)) {
            if (structureBlock.states[stateKey] !== stateValue)
                return true;
        }
    }
    return false;
}

// Takes the structure's block (see Structure.#intern) and gives back a real
// BlockPermutation, which is what everything downstream of here places. The
// waterlogging that decides the bubble column's replacement lives on the
// structure's block rather than in the permutation, so this is the last step
// that can read it.
function tryConvertBannedToValidBlock(structureBlock) {
    const blockId = structureBlock.typeId.replace('minecraft:', '');
    if (Object.keys(bannedToValidBlockMap).includes(blockId))
        return BlockPermutation.resolve(bannedToValidBlockMap[blockId], structureBlock.states);
    if (blockId === "bubble_column" && structureBlock.isWaterlogged)
        return BlockPermutation.resolve('minecraft:water');
    return structureBlock.permutation;
}

function tryConvertToDefaultState(permutation) {
    const newStates = {};
    for (const [stateKey, stateValue] of Object.entries(permutation.getAllStates())) {
        if (resetToBlockStates[stateKey] !== void 0 && stateValue !== resetToBlockStates[stateKey])
            newStates[stateKey] = resetToBlockStates[stateKey];
        else
            newStates[stateKey] = stateValue;
    }
    return BlockPermutation.resolve(permutation.type.id, newStates);
}

function tryPlaceBlockSurvival(event, player, block, permutation) {
    const placeableItemStack = getPlaceableItemStack(permutation);
    const itemSlotToUse = fetchMatchingItemSlot(player, placeableItemStack?.typeId);
    if (itemSlotToUse) {
        event.cancel = true;
        placeBlock(player, block, permutation, itemSlotToUse);
    } else {
        preventAction(event, player);
    }
}

function getPlaceableItemStack(permutation) {
    const blockId = permutation.type.id.replace('minecraft:', '');
    const newItemId = blockIdToItemStackMap[blockId];
    return newItemId ? new ItemStack(newItemId) : permutation.getItemStack();
}