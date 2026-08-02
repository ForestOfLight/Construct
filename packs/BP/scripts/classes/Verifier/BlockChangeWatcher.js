import { world } from "@minecraft/server";
import { instanceCollection } from "../Instance/InstanceCollection";
import { blockPlacementSignal } from "../BlockPlacementSignal";

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
        // Interaction restates a block without placing or breaking anything -
        // doors, trapdoors, fence gates, levers, buttons, repeaters and
        // comparators all rewrite their own permutation on use, and none of
        // them fire a place or break event when they do.
        //
        // isFirstEvent because the event can arrive more than once for a
        // single use, and the second one has nothing new to say.
        world.afterEvents.playerInteractWithBlock.subscribe((event) => {
            if (event.isFirstEvent)
                this.onBlockChanged(event.block.dimension.id, event.block.location);
        });
        // easyPlace and fastEasyPlace place blocks with setPermutation, which
        // fires no world event, so they reach us only through this.
        blockPlacementSignal.subscribe(
            (dimensionId, location) => this.onBlockChanged(dimensionId, location));
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
    //
    // Each of the seven is tested for containment on its own rather than
    // rejecting on the changed block once. The block that changed is often
    // NOT the one inside the structure - stacking a wall on top of a wall
    // while a lower layer is selected restates the wall below, and the
    // placement itself lands outside the active bounds entirely. Testing only
    // the changed location would drop exactly the cases this exists for.
    onBlockChanged(dimensionId, worldLocation) {
        for (const offset of PATCH_OFFSETS) {
            this.patchCell(dimensionId, {
                x: worldLocation.x + offset[0],
                y: worldLocation.y + offset[1],
                z: worldLocation.z + offset[2],
            });
        }
    }

    // getInstancesAt filters on enabled, dimension, and active layer bounds,
    // so a cell outside every structure costs one bounds test per instance and
    // stops here.
    patchCell(dimensionId, worldLocation) {
        const instances = instanceCollection.getInstancesAt(dimensionId, worldLocation);
        for (const instance of instances) {
            if (!instance.verifier || !instance.previewRenderer)
                continue;
            const location = instance.toStructureCoords(worldLocation);
            instance.verifier.patchBlock(location);
            instance.previewRenderer.renderBlockAt(location);
        }
    }
}

export const blockChangeWatcher = new BlockChangeWatcher();
blockChangeWatcher.start();
