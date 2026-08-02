import { IOutlineRender } from "./IOutlineRender";
import { OutlineParticleRender } from "./ParticleRender/OutlineParticleRender";
import { OutlinePerformanceRender } from "./PerformanceRender/OutlinePerformanceRender";

// The outline split across both renderers: debug lines for the twelve edges,
// particles for the corner markers.
//
// The edges are where the cost is - a long run needs a particle every block,
// respawned on an interval, where a debug line is drawn once and left alone -
// while the corners are eight points whose particle form reads better than a
// DebugSphere. Neither half is worth reimplementing, so this owns one of each
// renderer with the other's half switched off, and mirrors the interface calls
// to both. That also keeps each half's own lifecycle: the debug shapes persist
// until removed, the particles keep respawning on their interval.
export class OutlineHybridRender extends IOutlineRender {
    #edges;
    #vertices;

    constructor(dimension, min, max) {
        super();
        this.dimension = dimension;
        this.#edges = new OutlinePerformanceRender(dimension, min, max);
        this.#edges.drawVertices = false;
        this.#vertices = new OutlineParticleRender(dimension, min, max);
        this.#vertices.drawEdges = false;
        this.min = this.#edges.min;
        this.max = this.#edges.max;
    }

    startDraw() {
        this.#edges.startDraw();
        this.#vertices.startDraw();
    }

    stopDraw() {
        this.#edges.stopDraw();
        this.#vertices.stopDraw();
    }

    // Both halves agree on the corners of a cuboid, so either can answer.
    getVertices(min, max) {
        return this.#edges.getVertices(min, max);
    }

    setVertices(dimension, min, max) {
        this.dimension = dimension;
        this.#edges.setVertices(dimension, min, max);
        this.#vertices.setVertices(dimension, min, max);
        this.min = this.#edges.min;
        this.max = this.#edges.max;
    }

    // Standalone locations are corner markers, so only the particle half draws
    // them - but the edge half is told as well, because its own vertex list is
    // what a later getVertices call reads back.
    addStandaloneLocations(locations) {
        this.#edges.addStandaloneLocations(locations);
        this.#vertices.addStandaloneLocations(locations);
    }
}
