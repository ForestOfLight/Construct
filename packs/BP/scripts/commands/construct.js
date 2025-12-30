import { world, system, EntityComponentTypes, ItemStack, CommandPermissionLevel, CustomCommandStatus, Player } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';
import { structureCollection } from '../classes/Structure/StructureCollection'
import { Builders } from '../classes/Builder/Builders';

export const MENU_ITEM = 'construct:menu';

system.beforeEvents.startup.subscribe((event) => {
    const command = {
        name: 'construct:construct',
        description: 'construct.commands.construct',
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    };
    event.customCommandRegistry.registerCommand(command, givePlayerConstructItem);
});

function givePlayerConstructItem(origin) {
    const player = origin.sourceEntity;
    if (player instanceof Player === false)
        return { status: CustomCommandStatus.Failure, message: 'construct.commands.construct.denyorigin' };
    system.run(() => {
        const givenItemStack = player.getComponent(EntityComponentTypes.Inventory)?.container?.addItem(new ItemStack(MENU_ITEM));
        if (givenItemStack)
            player.sendMessage({ translate: 'construct.commands.construct.fail' });
        else
            player.sendMessage({ translate: 'construct.commands.construct.success' });
    });
    return { status: CustomCommandStatus.Success };
}

world.beforeEvents.itemUse.subscribe((event) => {
    if (!event.source || event.itemStack?.typeId !== MENU_ITEM) return;
    event.cancel = true;
    const builder = Builders.get(event.source.id);
    system.run(() => {
        if (builder.isFlexibleInstanceMoving())
            return;
        openMenu(event.source, event);
    });
});

function openMenu(player, event = void 0) {
    const options = { jumpToInstance: true }
    if (event) {
        const instanceNames = structureCollection.getInstanceNames();
        const instanceName = event.itemStack?.nameTag;
        if (instanceNames.includes(instanceName))
            options.instanceName = instanceName;
    }
    new MenuForm(player, options);
}