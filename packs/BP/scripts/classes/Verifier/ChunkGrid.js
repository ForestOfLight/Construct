const CHUNK_SIZE = 16;
const CHUNK_MASK = CHUNK_SIZE - 1;
const CHUNK_SHIFT = 4;
// Wide enough that no chunk X can collide with another chunk's Z.
const CHUNK_KEY_STRIDE = 4194304;

// Maps structure-local coordinates onto the world chunks they land in, so the
// sweep can walk one chunk's worth of a row at a time and skip whole chunks it
// has already found unreadable.
export class ChunkGrid {
    #origin;

    constructor(origin) {
        this.#origin = origin;
    }

    keyAt(x, z) {
        const chunkX = (x + this.#origin.x) >> CHUNK_SHIFT;
        const chunkZ = (z + this.#origin.z) >> CHUNK_SHIFT;
        return chunkX * CHUNK_KEY_STRIDE + chunkZ;
    }

    // The first x past the chunk that x falls in.
    endOfSpanX(x) {
        return x + CHUNK_SIZE - ((x + this.#origin.x) & CHUNK_MASK);
    }
}
