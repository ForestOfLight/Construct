import { system } from '@minecraft/server';
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