import { VerificationGrid } from "./VerificationGrid";

// Two grids that take turns: the completed one the renderer reads, and the one
// the running sweep is filling. They swap only when a sweep finishes, so the
// renderer never reads a half-filled grid.
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

    // A grid is a pair of typed arrays the size of the structure, so the buffer
    // is reused whenever the bounds have not moved.
    #recycled(grid, bounds) {
        if (!grid?.matchesBounds(bounds))
            return new VerificationGrid(bounds);
        grid.clear();
        return grid;
    }
}
