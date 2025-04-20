import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';

const ACTION_ITEM = 'minecraft:paper';

const menuCmd = new Command({
    name: 'construct',
    description: { text: 'Opens the Construct Menu. Using a paper will also open the menu.' },
    usage: 'construct',
    callback: (sender) => openMenu(sender)
});
extension.addCommand(menuCmd);

world.beforeEvents.itemUse.subscribe((event) => {
    if (!event.source || event.itemStack?.typeId !== ACTION_ITEM) return;
    event.cancel = true;
    system.run(() => openMenu(event.source, event));
});

function openMenu(sender, event = void 0) {
    const options = { jumpToInstance: true }
    if (event)
        options.instanceName = event.itemStack?.typeId;
    new MenuForm(sender, options);
}