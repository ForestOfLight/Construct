// A token bucket for how much verification work may happen this tick.
//
// Credit accumulates rather than being replaced, so a rate below one block per
// tick is expressible - a slow refresh setting on a small structure needs a
// fraction of a block per tick, and a whole-block floor made every slider stop
// past ~18s behave identically.
//
// Work overshoots: a chunk span spends up to 16 blocks in one go. That is
// allowed to drive the balance negative, and the caller then waits however many
// ticks it takes to earn the debt back, so the average converges on the
// requested rate.
export class BlockBudget {
    #remaining = 0;

    credit(blocks) {
        this.#remaining += blocks;
    }

    spend(blocks) {
        this.#remaining -= blocks;
    }

    isExhausted() {
        return this.#remaining <= 0;
    }

    clear() {
        this.#remaining = 0;
    }
}
