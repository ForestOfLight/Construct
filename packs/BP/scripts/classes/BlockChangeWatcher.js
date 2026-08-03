import { world } from "@minecraft/server";
import { blockPlacementSignal } from "./BlockPlacementSignal";
import { ChangedCellPatcher } from "./Verifier/ChangedCellPatcher";

export class BlockChangeWatcher {
    #patcher = new ChangedCellPatcher();

    start() {
        world.afterEvents.playerPlaceBlock.subscribe((event) => this.#onBlockChanged(event.block));
        world.afterEvents.playerBreakBlock.subscribe((event) => this.#onBlockChanged(event.block));
        world.afterEvents.playerInteractWithBlock.subscribe((event) => {
            if (event.isFirstEvent)
                this.#onBlockChanged(event.block);
        });
        blockPlacementSignal.subscribe((dimensionId, location) => this.#patcher.patchAround(dimensionId, location));
    }

    #onBlockChanged(block) {
        this.#patcher.patchAround(block.dimension.id, block.location);
    }
}

export const blockChangeWatcher = new BlockChangeWatcher();
blockChangeWatcher.start();
