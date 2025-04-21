import { system, EntityComponentTypes } from '@minecraft/server';
import { FormCancelationReason } from '@minecraft/server-ui';

export async function forceShow(player, form, timeout = Infinity) {
    const startTick = system.currentTick;
    while ((system.currentTick - startTick) < timeout) {
        const response = await form.show(player);
        if (startTick + 1 === system.currentTick && response.cancelationReason === FormCancelationReason.UserBusy)
            player.sendMessage("§8Close your chat window to access the menu.");
        if (response.cancelationReason !== FormCancelationReason.UserBusy)
            return response;
    }
    throw new Error("Menu timed out.");
};

export function fetchMatchingItemSlot(entity, itemToMatchId) {
    if (!itemToMatchId)
        return void 0;
    const inventory = entity.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inventory)
        return void 0;
    for (let index = 0; index < inventory.size; index++) {
        const itemSlot = inventory.getSlot(index);
        if (itemSlot.hasItem() && itemSlot?.typeId === itemToMatchId)
            return itemSlot;
    }
}