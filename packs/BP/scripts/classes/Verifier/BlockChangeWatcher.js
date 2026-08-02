import { world } from "@minecraft/server";
import { instanceCollection } from "../Instance/InstanceCollection";

// The changed cell and its six neighbors, in the same order as
// VerificationLevels' CULL_OFFSETS.
const PATCH_OFFSETS = [
    [0, 0, 0],
    [0, -1, 0],
    [0, 1, 0],
    [0, 0, -1],
    [0, 0, 1],
    [-1, 0, 0],
    [1, 0, 0],
];

// The only place in the addon that subscribes to block changes.
//
// One subscription set serves every instance, because it resolves the world
// location back through the collection rather than having each verifier
// filter the same global event.
//
// blockExplode is deliberately absent. An explosion is a burst of dozens of
// events and nobody is watching any individual block of it; the sweep covers
// that case at reconciliation latency.
export class BlockChangeWatcher {
    start() {
        world.afterEvents.playerPlaceBlock.subscribe(
            (event) => this.onBlockChanged(event.block.dimension.id, event.block.location));
        world.afterEvents.playerBreakBlock.subscribe(
            (event) => this.onBlockChanged(event.block.dimension.id, event.block.location));
    }

    onBlockChanged(dimensionId, worldLocation) {
        // getInstancesAt already filters on enabled, dimension, and active
        // layer bounds, so a change outside every structure costs one bounds
        // test and stops here.
        const instances = instanceCollection.getInstancesAt(dimensionId, worldLocation);
        for (const instance of instances)
            this.patchInstance(instance, worldLocation);
    }

    // All seven cells are re-verified, not just the one that changed.
    //
    // The structure side of a neighbor is untouched by this, but the WORLD
    // side is not: walls, fences, panes, bars, redstone and stairs rewrite
    // their own permutation when an adjacent block appears or disappears. A
    // neighboring wall going from wall_connection_type_north=none to short can
    // move between Match, TypeMatch and NoMatch with no event of its own ever
    // firing, so verifying only the placed block would leave connected blocks
    // wrong until reconciliation.
    patchInstance(instance, worldLocation) {
        if (!instance.verifier || !instance.verificationRenderer)
            return;
        for (const offset of PATCH_OFFSETS) {
            const location = instance.toStructureCoords({
                x: worldLocation.x + offset[0],
                y: worldLocation.y + offset[1],
                z: worldLocation.z + offset[2],
            });
            instance.verifier.patchBlock(location);
            instance.verificationRenderer.renderBlockAt(location);
        }
    }
}

export const blockChangeWatcher = new BlockChangeWatcher();
blockChangeWatcher.start();
