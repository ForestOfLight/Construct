import { world } from "@minecraft/server";
import { blockPlacementSignal } from "../BlockPlacementSignal";
import { ChangedCellPatcher } from "./ChangedCellPatcher";

// The only place in the addon that subscribes to block changes. One
// subscription set serves every instance, because the patcher resolves the
// world location back through the instance collection rather than having each
// verifier filter the same global event.
//
// blockExplode is deliberately absent. An explosion is a burst of dozens of
// events and nobody is watching any individual block of it; the sweep covers
// that case at reconciliation latency.
export class BlockChangeWatcher {
    #patcher = new ChangedCellPatcher();

    start() {
        world.afterEvents.playerPlaceBlock.subscribe((event) => this.#onBlockChanged(event.block));
        world.afterEvents.playerBreakBlock.subscribe((event) => this.#onBlockChanged(event.block));
        // Interaction restates a block without placing or breaking anything -
        // doors, trapdoors, fence gates, levers, buttons, repeaters and
        // comparators all rewrite their own permutation on use, and none of them
        // fire a place or break event when they do.
        //
        // isFirstEvent because the event can arrive more than once for a single
        // use, and the second one has nothing new to say.
        world.afterEvents.playerInteractWithBlock.subscribe((event) => {
            if (event.isFirstEvent)
                this.#onBlockChanged(event.block);
        });
        // easyPlace and fastEasyPlace place blocks with setPermutation, which
        // fires no world event, so they reach us only through this.
        blockPlacementSignal.subscribe(
            (dimensionId, location) => this.#patcher.patchAround(dimensionId, location));
    }

    #onBlockChanged(block) {
        this.#patcher.patchAround(block.dimension.id, block.location);
    }
}

export const blockChangeWatcher = new BlockChangeWatcher();
blockChangeWatcher.start();
