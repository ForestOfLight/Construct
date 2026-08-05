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
