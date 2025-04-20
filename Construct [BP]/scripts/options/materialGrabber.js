import { BuilderOption } from '../classes/Builder/BuilderOption';
import { world } from '@minecraft/server';

const builderOption = new BuilderOption({
    identifier: 'materialGrabber',
    displayName: 'Material Grabber',
    description: 'Pulls structure items from inventories.',
    howToUse: "Interact with inventories using a paper named 'Material Grabber' to pull structure items from them.",
});

world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
world.beforeEvents.playerInteractWithEntity.subscribe(onPlayerInteract);

function onPlayerInteract(event) {
    // get inventory
    // analyze active structure items if not analyzed -- there needs to be a way to refresh this that is efficient
    // find items in inventory that match items in structure
        // transfer to player
}