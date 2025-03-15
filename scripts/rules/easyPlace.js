import { Rule } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { EntityComponentTypes, GameMode, system, world } from '@minecraft/server';
import { structureCollection } from '../classes/StructureCollection';
import { bannedEasyPlaceBlocks } from '../data';

const easyPlace = new Rule({
    identifier: 'easyPlace',
    description: { text: 'Places a structure with ease.' },
    onEnableCallback: () => { world.beforeEvents.playerPlaceBlock.subscribe(onPlayerPlaceBlock); },
    onDisableCallback: () => { world.beforeEvents.playerPlaceBlock.unsubscribe(onPlayerPlaceBlock); }
})
extension.addRule(easyPlace);

function onPlayerPlaceBlock(event) {
    const { player, block } = event;
    if (!player || !block) return;
    const structureBlock = fetchStructureBlock(block.location);
    if (!structureBlock || isBannedBlock(structureBlock))
        return;
    const states = structureBlock.getAllStates();
    tryPlaceBlock(event, player, block, structureBlock);
}

function fetchStructureBlock(location) {
    const locatedStructures = structureCollection.getStructuresAtLocation(location);
    if (locatedStructures.length === 0)
        return void 0;
    const structure = locatedStructures[0];
    return structure.getBlock(structure.toStructureCoords(location));
}

function isBannedBlock(structureBlock) {
    return bannedEasyPlaceBlocks.some(bannedId => structureBlock.type.id.replace('minecraft:', '') === bannedId);
}

function tryPlaceBlock(event, player, block, structureBlock) {
    if (player.getGameMode() === GameMode.creative) {
        placeBlock(block, structureBlock);
    } else if (player.getGameMode() === GameMode.survival) {
        tryPlaceBlockSurvival(event, player, block, structureBlock);
    }
}

function tryPlaceBlockSurvival(event, player, block, structureBlock) {
    const itemSlotToUse = fetchMatchingItemSlot(player, structureBlock);
    if (itemSlotToUse) {
        event.cancel = true;
        placeBlock(block, structureBlock, itemSlotToUse);
    }
}

function fetchMatchingItemSlot(player, structureBlock) {
    const itemToMatch = structureBlock.getItemStack();
    if (!itemToMatch)
        return void 0;
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return void 0;
    for (let index = 0; index < inventory.size; index++) {
        const itemSlot = inventory.getSlot(index);
        if (itemSlot.hasItem() && itemSlot?.typeId === itemToMatch.typeId)
            return itemSlot;
    }
}

function placeBlock(block, structureBlock, itemSlot) {
    system.run(() => {
        if (itemSlot) {
            if (itemSlot.amount === 1)
                itemSlot.setItem(void 0);
            else
                itemSlot.amount--;
        }
        block.setPermutation(structureBlock);
    });
}