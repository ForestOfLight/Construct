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
