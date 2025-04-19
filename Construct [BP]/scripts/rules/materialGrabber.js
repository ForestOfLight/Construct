import { Rule } from '../lib/canopy/CanopyExtension';
import { extension } from '../config';
import { world } from '@minecraft/server';

const easyPlace = new Rule({
    identifier: 'materialGrabber',
    description: { text: "Automatically grabs structure materials out of inventories. Use a paper named 'materialGrabber' to get started." },
    onEnableCallback: () => {
        world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
        world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);
    },
    onDisableCallback: () => {
        world.beforeEvents.playerInteractWithBlock.unsubscribe(onPlayerInteract);
        world.beforeEvents.playerInteractWithEntity.unsubscribe(onPlayerInteract);
    }
})
extension.addRule(easyPlace);

function onPlayerInteract(event) {
    // get inventory
    // analyze active structure items if not analyzed -- there needs to be a way to refresh this that is efficient
    // find items in inventory that match items in structure
        // transfer to player
}