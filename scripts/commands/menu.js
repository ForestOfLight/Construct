import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';

const ACTION_ITEM = 'minecraft:paper';

const structCmd = new Command({
    name: 'menu',
    description: { text: 'Manages current StrucTool structures.' },
    usage: 'menu',
    callback: structCommand
});
extension.addCommand(structCmd);

world.beforeEvents.itemUse.subscribe((event) => {
    if (!event.source || event.itemStack?.typeId !== ACTION_ITEM) return;
    event.cancel = true;
    system.run(() => structCommand(event.source));
});

function structCommand(sender) {
    new MenuForm(sender);
}