import { world, system } from '@minecraft/server';
import { MENU_ITEM } from '../consts';
import { MenuForm } from './MenuForm';
import { structureCollection } from './Structure/StructureCollection';
import { Builders } from './Builder/Builders';

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
    const options = { jumpToInstance: true };
    if (event) {
        const instanceNames = structureCollection.getInstanceNames();
        const instanceName = event.itemStack?.nameTag;
        if (instanceNames.includes(instanceName))
            options.instanceName = instanceName;
    }
    new MenuForm(player, options);
}
