const UNLOADED_CHUNK_ERROR = 'LocationInUnloadedChunkError';
const OUT_OF_BOUNDS_ERROR = 'LocationOutOfWorldBoundariesError';

/**
 * Remembers which chunks cannot be read so they are only probed once per verification.
 * Chunk load state is column-wide, so unloaded chunks stay skipped for every layer.
 * World boundaries depend on the layer, so those chunks are only skipped within it.
 */
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
        if (error?.name === UNLOADED_CHUNK_ERROR) {
            this.#unloadedChunks.add(chunkKey);
            return true;
        }
        if (error?.name === OUT_OF_BOUNDS_ERROR) {
            this.#outOfBoundsChunks.add(chunkKey);
            return true;
        }
        return false;
    }
}
