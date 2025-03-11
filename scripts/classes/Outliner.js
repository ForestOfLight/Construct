import { system, world } from "@minecraft/server";
import { Vector } from "../lib/Vector";

const drawFrequency = 8;
const drawParticle = "minecraft:villager_happy";

export class Outliner {
    dimension;
    min = new Vector();
    max = new Vector();
    #shouldDraw = true;

    #drawParticles = [];
    #runner = null;

    constructor(dimension, min, max) {
        this.dimension = world.getDimension(dimension);
        this.min = new Vector(min.x, min.y, min.z);
        this.max = new Vector(max.x, max.y, max.z);
        this.startDraw();
    }

    startDraw() {
        this.#shouldDraw = true;
        this.#runner = system.runInterval(() => this.draw(), drawFrequency);
    }

    stopDraw() {
        system.clearRun(this.#runner);
        this.shouldDraw = false;
    }

    draw() {
        if (!this.#shouldDraw) return;
        this.#drawParticles.length = 0;
        this.#drawParticles.push(...this.getCubiodParticleLocations());

        for (const [particleType, location] of this.#drawParticles) {
            try {
                this.dimension.spawnParticle(particleType, location);
            } catch {
                /* pass */
            }
        }
    }

    getCubiodParticleLocations() {
        const vertices = [
            new Vector(this.min.x, this.min.y, this.min.z),
            new Vector(this.max.x, this.min.y, this.min.z),
            new Vector(this.min.x, this.max.y, this.min.z),
            new Vector(this.max.x, this.max.y, this.min.z),
            new Vector(this.min.x, this.min.y, this.max.z),
            new Vector(this.max.x, this.min.y, this.max.z),
            new Vector(this.min.x, this.max.y, this.max.z),
            new Vector(this.max.x, this.max.y, this.max.z)
        ];
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
            const [startVertex, endVertex] = [vertices[edge[0]], vertices[edge[1]]];
            const resolution = Math.min(Math.floor(endVertex.subtract(startVertex).length), 16);
            for (let i = 1; i < resolution; i++) {
                const t = i / resolution;
                edgePoints.push(startVertex.lerp(endVertex, t));
            }
        }
        return vertices.concat(edgePoints).map((v) => [drawParticle, v]);
    }
}