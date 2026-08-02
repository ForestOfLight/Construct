const MIN_BLOCKS_PER_TICK = 1;

/** Tracks how many blocks are left to process before a verification must wait for the next tick. */
export class BlockBudget {
    #remaining = 0;

    reset(blocksPerTick) {
        this.#remaining = Math.max(MIN_BLOCKS_PER_TICK, blocksPerTick);
    }

    spend(blockCount) {
        this.#remaining -= blockCount;
    }

    isExhausted() {
        return this.#remaining <= 0;
    }
}
