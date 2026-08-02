import { OutlineRenderer } from "./OutlineRenderer";
import { DebugOutlineRenderer } from "./DebugOutlineRenderer";
import { ParticleOutlineRenderer } from "./ParticleOutlineRenderer";

export class HybridOutlineRenderer extends OutlineRenderer {
    #edgeRenderer;
    #cornerRenderer;

    constructor(dimension, min, max) {
        super(dimension, min, max);
        this.#edgeRenderer = new DebugOutlineRenderer(dimension, min, max);
        this.#edgeRenderer.drawCorners = false;
        this.#cornerRenderer = new ParticleOutlineRenderer(dimension, min, max);
        this.#cornerRenderer.drawEdges = false;
    }

    start() {
        this.#edgeRenderer.start();
        this.#cornerRenderer.start();
    }

    stop() {
        this.#edgeRenderer.stop();
        this.#cornerRenderer.stop();
    }

    setBounds(dimension, min, max) {
        super.setBounds(dimension, min, max);
        this.#edgeRenderer.setBounds(dimension, min, max);
        this.#cornerRenderer.setBounds(dimension, min, max);
    }

    addStandaloneCorners(locations) {
        super.addStandaloneCorners(locations);
        this.#edgeRenderer.addStandaloneCorners(locations);
        this.#cornerRenderer.addStandaloneCorners(locations);
    }
}
