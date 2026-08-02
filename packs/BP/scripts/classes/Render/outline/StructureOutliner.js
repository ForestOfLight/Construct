import { StructureNotFoundError } from "../../Errors/StructureNotFoundError";
import { renderProfileOf } from "../../Enums/RenderMode";
import { Cuboid } from "./Cuboid";
import { HybridOutlineRenderer } from "./HybridOutlineRenderer.js";
import { ParticleOutlineRenderer } from "./ParticleOutlineRenderer.js";

export class StructureOutliner {
    instance;
    #renderer;

    constructor(instance) {
        this.instance = instance;
    }

    refresh() {
        this.#renderer?.stop();
        this.#renderer = void 0;
        if (!this.instance.isEnabled())
            return;
        const view = this.#readView();
        if (!view)
            return;
        this.#renderer = this.#createRenderer(view);
        if (view.wholeStructureCorners)
            this.#renderer.addStandaloneCorners(view.wholeStructureCorners);
        this.#renderer.start();
    }

    #readView() {
        try {
            const dimension = this.instance.getDimension();
            const bounds = this.instance.getBounds();
            const min = this.instance.toGlobalCoords(bounds.min);
            const max = this.instance.toGlobalCoords(bounds.max);
            if (!this.instance.hasLayerSelected())
                return { dimension, min, max };
            const layer = this.instance.getLayerBounds(this.instance.getLayer());
            return {
                dimension,
                min: this.instance.toGlobalCoords(layer.min),
                max: this.instance.toGlobalCoords(layer.max),
                wholeStructureCorners: Cuboid.cornersOf(min, max)
            };
        } catch (error) {
            if (error instanceof StructureNotFoundError)
                return void 0;
            throw error;
        }
    }

    #createRenderer(view) {
        const profile = renderProfileOf(this.instance.options.renderMode);
        const Renderer = profile.hybridOutline ? HybridOutlineRenderer : ParticleOutlineRenderer;
        return new Renderer(view.dimension, view.min, view.max);
    }
}
