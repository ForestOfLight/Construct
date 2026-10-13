import { KnownStateGrid } from "./KnownStateGrid.js";
import { VerificationGrid } from "./VerificationGrid.js";

export class GridBuffers {
    #completed;
    #filling;
    #known;

    completed() {
        return this.#completed;
    }

    filling() {
        return this.#filling;
    }

    known() {
        return this.#known;
    }

    syncKnown(anchor, bounds) {
        this.#known ??= new KnownStateGrid();
        this.#known.syncAnchor(anchor, bounds);
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
