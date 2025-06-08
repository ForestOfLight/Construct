import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system, EntityComponentTypes, ItemStack, CommandPermissionLevel, CustomCommandStatus, Player } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';
import { structureCollection } from '../classes/Structure/StructureCollection'

const ACTION_ITEM = 'construct:menu';

const menuCmd = new Command({
    name: 'construct',
    description: { text: 'Gives you the Construct item. Use it to open the Construct menu.' },
    usage: 'construct',
    callback: (sender) => openMenu(sender)
});
extension.addCommand(menuCmd);

system.beforeEvents.startup.subscribe((event) => {
    const command = {
        name: 'construct:item',
        description: 'Gives you the Construct item. Use it to open the Construct menu.',
        permissionLevel: CommandPermissionLevel.Any
    };
    event.customCommandRegistry.registerCommand(command, givePlayerConstructItem)
});

function givePlayerConstructItem(origin) {
    const player = origin.sourceEntity;
    if (player instanceof Player === false)
        return { status: CustomCommandStatus.Failure, message: 'This command can only be used by players.' };
    system.run(() => {
        const givenItemStack = player.getComponent(EntityComponentTypes.Inventory)?.container?.addItem(new ItemStack(ACTION_ITEM));
        if (givenItemStack)
            player.sendMessage('§cFailed to give you the Construct item.');
        else
            player.sendMessage('§aYou recieved the Construct item! Use it to open the Construct menu.');
    });
    return { status: CustomCommandStatus.Success };
}

world.beforeEvents.itemUse.subscribe((event) => {
    if (!event.source || event.itemStack?.typeId !== ACTION_ITEM) return;
    event.cancel = true;
    system.run(() => openMenu(event.source, event));
});

function openMenu(sender, event = void 0) {
    const options = { jumpToInstance: true }
    if (event) {
        const instanceNames = structureCollection.getInstanceNames();
        const instanceName = event.itemStack?.nameTag;
        if (instanceNames.includes(instanceName))
            options.instanceName = instanceName;
    }
    new MenuForm(sender, options);
}