import { MolangVariableMap, system, TicksPerSecond } from "@minecraft/server";
import { OutlineRenderer } from "./OutlineRenderer.js";

const DEFAULT_DRAW_INTERVAL_TICKS = 10;
const DEFAULT_LIFETIME_TICKS = 20;

export class ParticleOutlineRenderer extends OutlineRenderer {
    #outlineParticle = "construct:outline";

    #drawIntervalTicks;
    #lifetimeSeconds;
    #runner;

    constructor(dimension, min, max, drawIntervalTicks = DEFAULT_DRAW_INTERVAL_TICKS, lifetimeTicks = DEFAULT_LIFETIME_TICKS) {
        super(dimension, min, max);
        this.#drawIntervalTicks = drawIntervalTicks;
        this.#lifetimeSeconds = lifetimeTicks / TicksPerSecond;
    }

    start() {
        this.#runner = system.runInterval(() => this.#draw(), this.#drawIntervalTicks);
    }

    stop() {
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
    }

    #draw() {
        if (this.drawCorners) {
            for (const corner of this.corners)
                this.#spawn(corner, this.cornerColor);
        }
        if (this.drawEdges) {
            let index = 0;
            for (const point of this.cuboid.edgePoints()) {
                const color = this.edgeColors[index++ % this.edgeColors.length];
                this.#spawn(point, color);
            }
        }
    }

    #spawn(location, color) {
        const molang = new MolangVariableMap();
        molang.setColorRGBA("dot_color", color);
        molang.setFloat("lifetime", this.#lifetimeSeconds);
        try {
            this.dimension.spawnParticle(this.#outlineParticle, location, molang);
        } catch {
            /* pass */
        }
    }
}
