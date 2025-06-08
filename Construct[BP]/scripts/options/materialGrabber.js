import { BuilderOption } from '../classes/Builder/BuilderOption';
import { EntityComponentTypes, ItemStack, Player, world, system } from '@minecraft/server';
import { MaterialGrabberForm } from '../classes/Materials/MaterialGrabberForm';
import { Builders } from '../classes/Builder/Builders';
import { structureCollection } from '../classes/Structure/StructureCollection';

const builderOption = new BuilderOption({
    identifier: 'materialGrabber',
    displayName: 'Material Grabber',
    description: 'Pulls structure items from inventories.',
    howToUse: "Interact with inventories using an item named 'Material Grabber' to pull structure items from them."
});

world.beforeEvents.itemUse.subscribe(onItemUse);
world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);

function onItemUse(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.source?.id))
        return;
    event.cancel = true;
    system.run(() => new MaterialGrabberForm(event.source));
}

function onPlayerInteract(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.player?.id))
        return;
    const player = event.player;
    const target = event.block || event.target;
    if (target instanceof Player)
        return;
    const materials = getActiveMaterials(player);
    if (!materials)
        return;
    const targetContainer = target.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!targetContainer || materials.isEmpty())
        return;
    event.cancel = true;
    system.run(() => transferMaterialsToPlayer(player, targetContainer, materials));
}

function isActionItem(itemStack) {
    return itemStack.typeId === 'construct:material_grabber';
}

function getActiveMaterials(player) {
    const focusedInstanceName = Builders.get(player.id).materialInstanceName;
    if (!focusedInstanceName)
        return void 0;
    const structure = structureCollection.get(focusedInstanceName);
    if (!structure)
        return void 0;
    return structure.getActiveMaterials();
}

function transferMaterialsToPlayer(player, targetContainer, materials) {
    const playerContainer = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!playerContainer)
        return;
    ignoreAlreadyGathered(materials, playerContainer);
    let transferCount = 0;
    for (let slotIndex = 0; slotIndex < targetContainer.size; slotIndex++) {
        const slot = targetContainer.getSlot(slotIndex);
        transferCount += tryTransferToPlayer(slot, playerContainer, materials);
    }
    sendTransferMessage(player, transferCount);
    materials.refresh();
}

function ignoreAlreadyGathered(materials, playerContainer) {
    for (let slotIndex = 0; slotIndex < playerContainer.size; slotIndex++) {
        const slot = playerContainer.getSlot(slotIndex);
        if (slot.hasItem()) {
            materials.remove(slot.typeId, slot.amount);
        }
    }
}

function sendTransferMessage(player, transferCount) {
    if (transferCount === 0) {
        player.onScreenDisplay.setActionBar('§7Grabbed 0 items.');
    } else if (transferCount === 1) {
        player.onScreenDisplay.setActionBar('§aGrabbed 1 item.');
    } else {
        player.onScreenDisplay.setActionBar(`§aGrabbed ${transferCount} item(s).`);
    }
}

function tryTransferToPlayer(slot, playerContainer, materials) {
    if (slot.hasItem() && materials.has(slot.typeId)) {
        const grabAmount = Math.min(slot.amount, materials.get(slot.typeId).count);
        if (grabAmount > 0)
            return tryTransferAmountToPlayer(slot, playerContainer, materials, grabAmount);
    }
    return 0;
}

function tryTransferAmountToPlayer(slot, playerContainer, materials, grabAmount) {
    const itemStack = slot.getItem();
    if (canAddItem(playerContainer, itemStack)) {
        const itemStackToAdd = new ItemStack(itemStack.typeId, grabAmount);
        addItem(playerContainer, itemStackToAdd);
        materials.remove(itemStack.typeId, grabAmount);
        removeAmount(slot, grabAmount);
        return grabAmount;
    }
    return 0;
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

function isSlotAvailableForStacking(slot, itemStack) {
    return slot.hasItem() && slot.isStackableWith(itemStack) && slot.amount !== slot.maxAmount;
}