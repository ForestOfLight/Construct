import { Vector } from "../../../lib/Vector.js";
import { Cuboid } from "./Cuboid.js";

export class OutlineRenderer {
    dimension;
    corners;
    cuboid;
    drawCorners = true;
    drawEdges = true;

    cornerColor = Object.freeze({ red: 1, green: 1, blue: 1, alpha: 1 });
    edgeColors = Object.freeze([
        Object.freeze({ red: 0.93333333, green: 0.77647059, blue: 0.13333333, alpha: 1 }),
        Object.freeze({ red: 0.09019608, green: 0.09019608, blue: 0.09019608, alpha: 1 })
    ]);

    constructor(dimension, min, max) {
        this.#assignBounds(dimension, min, max);
    }

    setBounds(dimension, min, max) {
        this.#assignBounds(dimension, min, max);
    }

    addStandaloneCorners(locations) {
        for (const location of locations)
            this.corners.push(Vector.from(location));
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
        this.corners = this.cuboid.corners;
    }
}
