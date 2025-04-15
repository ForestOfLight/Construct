import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';

const ACTION_ITEM = 'minecraft:paper';

const structoolCmd = new Command({
    name: 'structool',
    description: { text: 'Opens the StrucTool Menu. Using a paper will also open the menu.' },
    usage: 'structool',
    callback: (sender) => new MenuForm(sender)
});
extension.addCommand(structoolCmd);

world.beforeEvents.itemUse.subscribe((event) => {
    if (!event.source || event.itemStack?.typeId !== ACTION_ITEM) return;
    event.cancel = true;
    system.run(() => structoolCmd.getCallback()(event.source));
});