import { Vector } from "../../../lib/Vector.js";
import { Cuboid } from "./Cuboid.js";

export class OutlineRenderer {
    dimension;
    corners;
    cuboid;
    drawCorners = true;
    drawEdges = true;
    #standaloneCorners = [];

    cornerColor = Object.freeze({ red: 1, green: 1, blue: 1, alpha: 1 });
    edgeColors = Object.freeze([
        Object.freeze({ red: 0.93333333, green: 0.77647059, blue: 0.13333333, alpha: 1 }),
        Object.freeze({ red: 0.09019608, green: 0.09019608, blue: 0.09019608, alpha: 1 })
    ]);

    constructor(dimension, min, max) {
        this.#assignBounds(dimension, min, max);
    }

    setBounds(dimension, min, max) {
        if (dimension === this.dimension && this.cuboid.matches(min, max))
            return false;
        this.#assignBounds(dimension, min, max);
        return true;
    }

    addStandaloneCorners(locations) {
        for (const location of locations)
            this.#standaloneCorners.push(Vector.from(location));
        this.#collectCorners();
    }

    start() {
        throw new Error(`${this.constructor.name} must implement start().`);
    }

    stop() {
        throw new Error(`${this.constructor.name} must implement stop().`);
    }

    #assignBounds(dimension, min, max) {
        this.dimension = dimension;
        this.cuboid = new Cuboid(min, max);
        this.#collectCorners();
    }

    #collectCorners() {
        this.corners = this.#standaloneCorners.length === 0
            ? this.cuboid.corners
            : [...this.cuboid.corners, ...this.#standaloneCorners];
    }
}
