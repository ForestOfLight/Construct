import { world, system, EntityComponentTypes, EntitySwingSource, EquipmentSlot, HeldItemOption, GameMode } from '@minecraft/server';
import { MENU_ITEM } from '../consts';
import { MenuForm } from './MenuForm';
import { instanceCollection } from './Instance/InstanceCollection';
import { Builders } from './Builder/Builders';
import { StructurePickBlock } from "./Structure/StructurePickBlock";

class MenuItemInteractions {
    static onItemUse(event) {
        if (!event.source || !MenuItemInteractions.#isMenuItem(event.itemStack))
            return;
        event.cancel = true;
        const builder = Builders.get(event.source.id);
        system.run(() => {
            if (builder.isFlexibleInstanceMoving())
                return;
            MenuItemInteractions.#openMenu(event.source, event);
        });
    }

    static onPlayerBreakBlock(event) {
        if (!event.player || !MenuItemInteractions.#isMenuItem(event.itemStack))
            return;
        event.cancel = true;
    }

    static onPlayerStartBreakingBlock(event) {
        const player = event.player;
        if (!player || !MenuItemInteractions.#isMenuItem(event.heldItemStack))
            return;
        StructurePickBlock.perform(player);
    }

    static onPlayerAttack(event) {
        if (!event.player || !MenuItemInteractions.#isMenuItem(event.heldItemStack))
            return;
        StructurePickBlock.perform(event.player);
    }

    static #isMenuItem(itemStack) {
        return itemStack?.typeId === MENU_ITEM;
    }

    static #openMenu(player, event = void 0) {
        const options = { jumpToInstance: true };
        if (event) {
            const instanceNames = instanceCollection.getInstanceNames();
            const instanceName = event.itemStack?.nameTag;
            if (instanceNames.includes(instanceName))
                options.instanceName = instanceName;
        }
        new MenuForm(player, options);
    }

    static #getMainhandItemStack(player) {
        const equippableComponent = player.getComponent(EntityComponentTypes.Equippable);
        if (!equippableComponent)
            return;
        const mainhandSlot = equippableComponent.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhandSlot)
            return;
        return mainhandSlot.getItem();
    }
}

world.beforeEvents.itemUse.subscribe(MenuItemInteractions.onItemUse);
world.afterEvents.playerSwingStart.subscribe(MenuItemInteractions.onPlayerAttack, { heldItemOption: HeldItemOption.AnyItem, swingSource: EntitySwingSource.Attack });
world.afterEvents.playerStartBreakingBlock.subscribe(MenuItemInteractions.onPlayerStartBreakingBlock);
world.beforeEvents.playerBreakBlock.subscribe(MenuItemInteractions.onPlayerBreakBlock);
