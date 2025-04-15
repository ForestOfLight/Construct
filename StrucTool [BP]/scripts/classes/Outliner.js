import { system, world } from "@minecraft/server";
import { Vector } from "../lib/Vector";


export class Outliner {
    dimension;
    min = new Vector();
    max = new Vector();
    drawParticle = "structool:outline";
    drawFrequency = 20;
    
    #drawParticles = [];
    #runner = null;

    constructor(dimension, min, max) {
        this.dimension = dimension;
        this.min = new Vector(min.x, min.y, min.z);
        this.max = new Vector(max.x, max.y, max.z);
        this.vertices = this.getVertices(min, max);
        this.startDraw();
    }

    startDraw() {
        this.#runner = system.runInterval(() => this.draw(), this.drawFrequency);
    }

    stopDraw() {
        system.clearRun(this.#runner);
    }

    draw() {
        this.#drawParticles.length = 0;
        this.#drawParticles.push(...this.getVerticeParticleLocations());
        this.#drawParticles.push(...this.getCubiodParticleLocations());

        for (const [particleType, location] of this.#drawParticles) {
            try {
                this.dimension.spawnParticle(particleType, location);
            } catch {
                /* pass */
            }
        }
    }

    getVertices(min, max) {
        return [
            new Vector(min.x, min.y, min.z),
            new Vector(max.x, min.y, min.z),
            new Vector(min.x, max.y, min.z),
            new Vector(max.x, max.y, min.z),
            new Vector(min.x, min.y, max.z),
            new Vector(max.x, min.y, max.z),
            new Vector(min.x, max.y, max.z),
            new Vector(max.x, max.y, max.z)
        ];
    }

    setVertices(dimension, min, max) {
        this.dimension = dimension;
        this.min = new Vector(min.x, min.y, min.z);
        this.max = new Vector(max.x, max.y, max.z);
        this.vertices = this.getVertices(min, max);
    }

    getVerticeParticleLocations() {
        return this.vertices.map((v) => [this.drawParticle, v]);
    }

    getCubiodParticleLocations() {
        const edges = [
            [0, 1],
            [0, 2],
            [0, 4],
            [1, 3],
            [1, 5],
            [2, 3],
            [2, 6],
            [3, 7],
            [4, 5],
            [4, 6],
            [5, 7],
            [6, 7]
        ];
        const edgePoints = [];
        for (const edge of edges) {
            const [startVertex, endVertex] = [this.vertices[edge[0]], this.vertices[edge[1]]];
            const resolution = Math.min(Math.floor(endVertex.subtract(startVertex).length), 16);
            for (let i = 1; i < resolution; i++) {
                const t = i / resolution;
                edgePoints.push(startVertex.lerp(endVertex, t));
            }
        }
        return edgePoints.map((v) => [this.drawParticle, v]);
    }

    addStandaloneParticles(locations) {
        for (const location of locations)
            this.vertices.push(new Vector(location.x, location.y, location.z));
    }
}