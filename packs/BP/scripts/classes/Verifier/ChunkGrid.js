export class ChunkGrid {
    #chunkSize = 16;
    #chunkMask = this.#chunkSize - 1;
    #chunkShift = 4;
    #chunkKeyStride = 4194304;

    #origin;

    constructor(origin) {
        this.#origin = origin;
    }

    keyAt(x, z) {
        const chunkX = (x + this.#origin.x) >> this.#chunkShift;
        const chunkZ = (z + this.#origin.z) >> this.#chunkShift;
        return chunkX * this.#chunkKeyStride + chunkZ;
    }

    endOfSpanX(x) {
        return x + this.#chunkSize - ((x + this.#origin.x) & this.#chunkMask);
    }
}
