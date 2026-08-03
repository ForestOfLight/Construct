import { VerificationGrid } from "./VerificationGrid";

export class GridBuffers {
    #completed;
    #filling;

    completed() {
        return this.#completed;
    }

    filling() {
        return this.#filling;
    }

    beginPass(bounds) {
        this.#filling = this.#recycled(this.#filling, bounds);
        return this.#filling;
    }

    commit() {
        const finished = this.#filling;
        this.#filling = this.#completed;
        this.#completed = finished;
    }

    #recycled(grid, bounds) {
        if (!grid?.matchesBounds(bounds))
            return new VerificationGrid(bounds);
        grid.clear();
        return grid;
    }
}
