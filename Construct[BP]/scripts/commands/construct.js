import { Command } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world, system, EntityComponentTypes, ItemStack } from '@minecraft/server';
import { MenuForm } from '../classes/MenuForm';
import { structureCollection } from '../classes/Structure/StructureCollection'

const ACTION_ITEM = 'construct:menu';

const menuCmd = new Command({
    name: 'construct',
    description: { text: 'Gives you the Construct item. Use it to open the Construct menu.' },
    usage: 'construct',
    callback: (sender) => sender.getComponent(EntityComponentTypes.Inventory)?.container?.addItem(new ItemStack(ACTION_ITEM))
});
extension.addCommand(menuCmd);

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