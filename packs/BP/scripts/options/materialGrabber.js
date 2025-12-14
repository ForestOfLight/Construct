import { BuilderOption } from '../classes/Builder/BuilderOption';
import { EntityComponentTypes, ItemStack, Player, world, system, EquipmentSlot } from '@minecraft/server';
import { MaterialGrabberForm } from '../classes/Materials/MaterialGrabberForm';
import { Builders } from '../classes/Builder/Builders';
import { structureCollection } from '../classes/Structure/StructureCollection';

const builderOption = new BuilderOption({
    identifier: 'materialGrabber',
    displayName: { translate: 'construct.option.materialgrabber.name' },
    description: { translate: 'construct.option.materialgrabber.description' },
    howToUse: { translate: 'construct.option.materialgrabber.howto' },
    onEnableCallback: (playerId) => giveActionItem(playerId),
    onDisableCallback: (playerId) => removeActionItem(playerId)
});

function giveActionItem(playerId) {
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    const itemStack = new ItemStack('construct:material_grabber');
    if (!container.contains(itemStack)) {
        const remainingItemStack = container.addItem(itemStack);
        if (remainingItemStack)
            player.dimension.spawnItem(remainingItemStack, player.location);
    }
}

function removeActionItem(playerId) {
    const player = world.getEntity(playerId);
    const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
    for (let i = 0; i < container.size; i++) {
        const itemStack = container.getItem(i);
        if (itemStack?.typeId === 'construct:material_grabber')
            container.setItem(i, void 0);
    }
    const equipment = player.getComponent(EntityComponentTypes.Equippable);
    const offhandItemStack = equipment?.getEquipment(EquipmentSlot.Offhand);
    if (offhandItemStack?.typeId === 'construct:material_grabber') {
        equipment.setEquipment(EquipmentSlot.Offhand, void 0);
    }
}

world.beforeEvents.itemUse.subscribe(onItemUse);
world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);

const BANNED_ITEMTYPES = [/shulker_box/g];

function onItemUse(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.source?.id))
        return;
    openInstanceSelectionForm(event.source, event);
}

function onPlayerInteract(event) {
    if (!isActionItem(event.itemStack) || !builderOption.isEnabled(event.player?.id))
        return;
    const player = event.player;
    const target = event.block || event.target;
    const focusedInstanceName = Builders.get(player.id).materialInstanceName;
    if (!focusedInstanceName || !structureCollection.has(focusedInstanceName))
        openInstanceSelectionForm(player, event);
    else
        tryGrabMaterials(player, target, focusedInstanceName, event);
}

function isActionItem(itemStack) {
    return itemStack?.typeId === 'construct:material_grabber';
}

function openInstanceSelectionForm(player, event) {
    event.cancel = true;
    system.run(() => new MaterialGrabberForm(player));
}

function tryGrabMaterials(player, target, focusedInstanceName, event) {
    if (target instanceof Player)
        return;
    const materials = getActiveMaterials(focusedInstanceName);
    if (!materials)
        return;
    const targetContainer = target.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!targetContainer || materials.isEmpty())
        return;
    event.cancel = true;
    system.run(() => transferMaterialsToPlayer(player, targetContainer, materials));
}

function getActiveMaterials(focusedInstanceName) {
    const instance = structureCollection.get(focusedInstanceName);
    return instance?.getActiveMaterials();
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
    playSoundEffect(player, transferCount);
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
    if (transferCount === 0)
        player.onScreenDisplay.setActionBar({ translate: 'construct.option.materialgrabber.grabbed.zero' });
    else if (transferCount === 1)
        player.onScreenDisplay.setActionBar({ translate: 'construct.option.materialgrabber.grabbed.one' });
    else
        player.onScreenDisplay.setActionBar({ translate: 'construct.option.materialgrabber.grabbed.many', with: [String(transferCount)] });
}

function tryTransferToPlayer(slot, playerContainer, materials) {
    if (slot.hasItem() && materials.has(slot.typeId) && !isBannedItemType(slot.typeId)) {
        const grabAmount = Math.min(slot.amount, materials.get(slot.typeId).count);
        if (grabAmount > 0)
            return tryTransferAmountToPlayer(slot, playerContainer, materials, grabAmount);
    }
    return 0;
}

function playSoundEffect(player, transferCount) {
    if (transferCount !== 0)
        player.dimension.playSound('block.itemframe.remove_item', player.location, { pitch: 1.2 });
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

function isBannedItemType(itemTypeId) {
    for (const regex of BANNED_ITEMTYPES) {
        if (itemTypeId.match(regex))
            return true;
    }
    return false;
}