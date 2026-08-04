import { EntityComponentTypes, EquipmentSlot, GameMode } from "@minecraft/server";
import { fetchMatchingItemSlotIndex } from "../../utils";
import { Raycaster } from "../Raycaster";
import { StructureBlockConverter } from "./StructureBlockConverter";

export class StructurePickBlock {
    static #HOTBAR_ITEM_SLOTS = 9;

    static perform(player) {
        const placeableItemStack = StructurePickBlock.#getItemStackFromTargetedStructure(player);
        if (!placeableItemStack)
            return;
        const itemSlotIndexToUse = fetchMatchingItemSlotIndex(player, placeableItemStack?.typeId);
        const equippableComponent = player.getComponent(EntityComponentTypes.Equippable);
        const mainHandSlot = equippableComponent?.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (itemSlotIndexToUse)
            StructurePickBlock.#swapItemIntoHotbar(player, itemSlotIndexToUse, mainHandSlot);
        else if (player.getGameMode() === GameMode.Creative)
            StructurePickBlock.#pickBlockCreative(player, mainHandSlot, placeableItemStack);
    }

    static #getItemStackFromTargetedStructure(player) {
        const hit = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true, useActiveLayer: true });
        if (!hit?.block)
            return void 0;
        return StructureBlockConverter.sanitizeToPlaceableItemStack(hit?.block);
    }

    static #swapItemIntoHotbar(player, sourceSlotIndex, hotbarReplacementSlot) {
        const inventoryContainer = player.getComponent(EntityComponentTypes.Inventory)?.container;
        if (sourceSlotIndex < StructurePickBlock.#HOTBAR_ITEM_SLOTS) {
            player.selectedSlotIndex = sourceSlotIndex;
            return;
        }
        const emptyHotbarSlotIndex = StructurePickBlock.#getFirstEmptyHotbarSlotIndex(inventoryContainer);
        const sourceSlot = inventoryContainer.getSlot(sourceSlotIndex);
        if (emptyHotbarSlotIndex !== void 0) {
            const itemToMove = sourceSlot.getItem();
            sourceSlot.setItem(void 0);
            const emptyHotbarSlot = inventoryContainer.getSlot(emptyHotbarSlotIndex);
            emptyHotbarSlot.setItem(itemToMove);
            player.selectedSlotIndex = emptyHotbarSlotIndex;
        } else {
            StructurePickBlock.#swapSlots(sourceSlot, hotbarReplacementSlot)
        }
    }

    static #pickBlockCreative(player, mainHandSlot, placeableItemStack) {
        const inventoryContainer = player.getComponent(EntityComponentTypes.Inventory)?.container;
        const firstEmptySlotNum = inventoryContainer.firstEmptySlot();
        if (firstEmptySlotNum === void 0) {
            player.onScreenDisplay.setActionBar({ translate: 'construct.pickblock.inventoryfull' });
            return;
        }
        const emptySlot = inventoryContainer?.getSlot(firstEmptySlotNum);
        emptySlot.setItem(placeableItemStack);
        StructurePickBlock.#swapItemIntoHotbar(player, firstEmptySlotNum, mainHandSlot);
    }

    static #getFirstEmptyHotbarSlotIndex(inventoryContainer) {
        for (let index = 0; index < StructurePickBlock.#HOTBAR_ITEM_SLOTS; index++) {
            if (!inventoryContainer.getItem(index))
                return index;
        }
        return void 0;
    }

    static #swapSlots(slotOne, slotTwo) {
        const slotOneItem = slotOne.getItem();
        const slotTwoItem = slotTwo.getItem();
        slotOne.setItem(slotTwoItem);
        slotTwo.setItem(slotOneItem);
    }
}