import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system, EntityComponentTypes, ItemStack, CommandPermissionLevel, CustomCommandStatus, Player } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';
import { structureCollection } from '../classes/Structure/StructureCollection'
import { Builders } from '../classes/Builder/Builders';

export const MENU_ITEM = 'construct:menu';

const menuCmd = new Command({
    name: 'construct',
    description: { translate: 'construct.commands.construct' },
    usage: 'construct',
    callback: (sender) => openMenu(sender)
});
extension.addCommand(menuCmd);

system.beforeEvents.startup.subscribe((event) => {
    const command = {
        name: 'construct:item',
        description: 'construct.commands.item',
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    };
    event.customCommandRegistry.registerCommand(command, givePlayerConstructItem);
});

function givePlayerConstructItem(origin) {
    const player = origin.sourceEntity;
    if (player instanceof Player === false)
        return { status: CustomCommandStatus.Failure, message: 'construct.commands.item.denyorigin' };
    system.run(() => {
        const givenItemStack = player.getComponent(EntityComponentTypes.Inventory)?.container?.addItem(new ItemStack(MENU_ITEM));
        if (givenItemStack)
            player.sendMessage({ translate: 'construct.commands.item.fail' });
        else
            player.sendMessage({ translate: 'construct.commands.item.success' });
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