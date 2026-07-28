import { MolangVariableMap, system, TicksPerSecond } from "@minecraft/server";
import { Vector } from "../../lib/Vector";

export class IOutlineRender {
    dimension;
    min;
    max;

    constructor(dimension, min, max) {
        if (this.constructor === IOutlineRender)
            throw new Error("Cannot call methods on Interfaces.");
    }

    startDraw() {
        throw new Error("Cannot call methods on Interfaces.");
    }

    stopDraw() {
        throw new Error("Cannot call methods on Interfaces.");
    }

    getVertices(min, max) {
        throw new Error("Cannot call methods on Interfaces.");
    }

    setVertices(dimension, min, max) {
        throw new Error("Cannot call methods on Interfaces.");
    }

    addStandaloneLocations(locations) {
        throw new Error("Cannot call methods on Interfaces.");
    }
}