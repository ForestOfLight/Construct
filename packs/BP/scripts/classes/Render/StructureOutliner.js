import { StructureNotFoundError } from '../Errors/StructureNotFoundError';
import { OutlineParticleRender } from './ParticleRender/OutlineParticleRender';
import { OutlineHybridRender } from './OutlineHybridRender';
import { usesHybridOutline } from '../Enums/RenderMode';

export class StructureOutliner {
    instance;
    #dimension;
    #bounds;
    #useHybridOutline;
    #outliner;

    constructor(instance) {
        this.instance = instance;
        this.#pullInstanceData();
        this.#outliner = this.#createOutliner(this.#useHybridOutline);
    }

    refresh() {
        this.#pullInstanceData();
        this.#refreshDraw();
    }

    #pullInstanceData() {
        try {
            this.#dimension = this.instance.getDimension();
            this.#bounds = this.instance.getBounds();
            this.#bounds.min = this.instance.toGlobalCoords(this.#bounds.min);
            this.#bounds.max = this.instance.toGlobalCoords(this.#bounds.max);
            this.#useHybridOutline = usesHybridOutline(this.instance.options.renderMode);
        } catch (error) {
            if (error instanceof StructureNotFoundError)
                this.#outliner.stopDraw();
            else
                throw error;
        }
    }

    #refreshDraw() {
        this.#outliner.stopDraw();
        if (!this.instance.isEnabled())
            return;
        this.#outliner = this.#createOutliner(this.#useHybridOutline);
        if (this.instance.hasLayerSelected())
            this.#layeredDraw();
        else
            this.#boxDraw();
        this.#outliner.startDraw();
    }

    #boxDraw() {
        this.#outliner.setVertices(this.#dimension, this.#bounds.min, this.#bounds.max);
    }

    #layeredDraw() {
        const { min, max } = this.instance.getLayerBounds(this.instance.getLayer());
        this.#outliner.setVertices(this.#dimension, this.instance.toGlobalCoords(min), this.instance.toGlobalCoords(max));
        this.#outliner.addStandaloneLocations(this.#getCornerVertices());
    }

    #getCornerVertices() {
        return this.#outliner.getVertices(this.#bounds.min, this.#bounds.max);
    }

    #createOutliner(useHybridOutline) {
        const dimension = this.instance.getDimension();
        const bounds = this.instance.getBounds();
        if (useHybridOutline)
            return new OutlineHybridRender(dimension, bounds.min, bounds.max);
        else
            return new OutlineParticleRender(dimension, bounds.min, bounds.max);
    }
}