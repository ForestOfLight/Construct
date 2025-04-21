import { BuilderOption } from '../classes/Builder/BuilderOption';
import { EntityComponentTypes, ItemStack, Player, world, system } from '@minecraft/server';
import { MaterialsForm } from '../classes/Materials/MaterialsForm';
import { Builders } from '../classes/Builder/Builders';
import { structureCollection } from '../classes/Structure/StructureCollection';

const builderOption = new BuilderOption({
    identifier: 'materialGrabber',
    displayName: 'Material Grabber',
    description: 'Pulls structure items from inventories.',
    howToUse: "Interact with inventories using a paper named 'Material Grabber' to pull structure items from them.",
});

world.beforeEvents.itemUse.subscribe(onItemUse);
world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);

function onItemUse(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.source.id))
        return;
    event.cancel = true;
    new MaterialsForm(event.source);
}

function onPlayerInteract(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.player.id))
        return;
    const player = event.player;
    const target = event.block || event.target;
    if (target instanceof Player)
        return;
    const materials = getActiveMaterials(player);
    const targetContainer = target.getComponent(EntityComponentTypes.Inventory)?.container;
    const playerContainer = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!targetContainer || !playerContainer)
        return;
    event.cancel = true;
    system.run(() => {
        transferMaterialsToPlayer(targetContainer, playerContainer, materials);
    });
}

function isActionItem(itemStack) {
    return itemStack?.typeId === 'minecraft:paper' && itemStack?.nameTag === 'Material Grabber';
}

function getActiveMaterials(player) {
    const focusedInstanceName = Builders.get(player.id).materialInstanceName;
    const structure = structureCollection.get(focusedInstanceName);
    if (!structure)
        return [];
    return structure.getActiveMaterials();
}

function transferMaterialsToPlayer(targetContainer, playerContainer, materials) {
    for (let slotIndex = 0; slotIndex < targetContainer.size; slotIndex++) {
        const slot = targetContainer.getSlot(slotIndex);
        tryTransferToPlayer(slot, playerContainer, materials);
    }
}

function tryTransferToPlayer(slot, playerContainer, materials) {
    if (slot.hasItem() && materials[slot.typeId]) {
        const grabAmount = Math.min(slot.amount, materials[slot.typeId].count);
        if (grabAmount > 0)
            tryTransferAmountToPlayer(slot, playerContainer, materials, grabAmount);
    }
}

function tryTransferAmountToPlayer(slot, playerContainer, materials, grabAmount) {
    const itemStack = slot.getItem();
    if (canAddItem(playerContainer, itemStack)) {
        addItem(playerContainer, itemStack);
        materials[slot.typeId].count -= grabAmount;
        removeAmount(slot, grabAmount);
    }
}

function removeAmount(slot, amount) {
    if (amount === slot.amount) {
        slot.setItem(void 0);
    } else {
        slot.amount -= amount;
        slot.setItem(slot.getItem());
    }
}

function canAddItem(inventory, itemStack) {
    if (inventory.emptySlotsCount !== 0) return true;
    for (let i = 0; i < inventory.size; i++) {
        const slot = inventory.getSlot(i);
        if (itemFitsInPartiallyFilledSlot(slot, itemStack)) return true;
    }
    return false;
}

function itemFitsInPartiallyFilledSlot(slot, itemStack) {
    return slot.hasItem() && slot.isStackableWith(itemStack) && slot.amount + itemStack.amount <= slot.maxAmount;
}

function addItem(inventory, itemStack) {
    const isItemDeposited = partiallyFilledSlotPass(inventory, itemStack);
    if (!isItemDeposited) 
        emptySlotPass(inventory, itemStack);
    
}

function partiallyFilledSlotPass(inventory, itemStack) {
    for (let slotNum = 0; slotNum < inventory.size; slotNum++) {
        const slot = inventory.getSlot(slotNum);
        if (isSlotAvailableForStacking(slot, itemStack)) {
            const remainderAmount = Math.max(0, (slot.amount + itemStack.amount) - slot.maxAmount);
            slot.amount += itemStack.amount - remainderAmount;
            if (remainderAmount > 0) {
                const remainderStack = new ItemStack(itemStack.typeId, remainderAmount);
                addItem(inventory, remainderStack);
            }
            return true;
        }
    }
    return false;
}

function emptySlotPass(inventory, itemStack) {
    for (let slotNum = 0; slotNum < inventory.size; slotNum++) {
        const slot = inventory.getSlot(slotNum);
        if (!slot.hasItem()) {
            slot.setItem(itemStack);
            return true;
        }
    }
    return false;
}