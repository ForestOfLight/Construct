// Announces a script-driven block placement.
//
// easyPlace cancels the real playerPlaceBlock event and writes the block with
// setPermutation instead, and setPermutation fires no event - so without this
// the addon's own placements are the one kind of change it cannot see, and
// they are the placements a Construct user makes most.
//
// Kept as its own module rather than living under classes/Verifier so that
// utils.js can emit without importing from the verifier.
class BlockPlacementSignal {
    #callbacks = [];

    subscribe(callback) {
        this.#callbacks.push(callback);
    }

    emit(dimensionId, location) {
        for (const callback of this.#callbacks)
            callback(dimensionId, location);
    }
}

export const blockPlacementSignal = new BlockPlacementSignal();
