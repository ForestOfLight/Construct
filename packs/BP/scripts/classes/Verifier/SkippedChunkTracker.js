export class SkippedChunkTracker {
    #unloadedChunks = new Set();
    #outOfBoundsChunks = new Set();

    startLayer() {
        this.#outOfBoundsChunks.clear();
    }

    isSkipped(chunkKey) {
        return this.#unloadedChunks.has(chunkKey) || this.#outOfBoundsChunks.has(chunkKey);
    }

    trackError(error, chunkKey) {
        if (error?.name === 'LocationInUnloadedChunkError') {
            this.#unloadedChunks.add(chunkKey);
            return true;
        }
        if (error?.name === 'LocationOutOfWorldBoundariesError') {
            this.#outOfBoundsChunks.add(chunkKey);
            return true;
        }
        return false;
    }
}
