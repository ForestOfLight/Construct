import { Outliner } from '../classes/Outliner';

export class StructureOutliner {
    constructor(instance) {
        this.instance = instance;
        this.dimension = instance.getDimension();
        this.bounds = instance.getBounds();
        this.bounds.min = instance.toGlobalCoords(this.bounds.min);
        this.bounds.max = instance.toGlobalCoords(this.bounds.max);
        this.outliner = new Outliner(this.dimension, this.bounds.min, this.bounds.max);
        this.refresh();
    }

    refresh() {
        this.outliner.stopDraw();
        if (!this.instance.isEnabled())
            return;
        if (this.instance.isUsingLayers())
            this.layeredDraw();
        else
            this.boxDraw();
        this.outliner.startDraw();
    }

    boxDraw() {
        this.outliner.setVertices(this.dimension, this.bounds.min, this.bounds.max);
    }

    layeredDraw() {
        const { min, max } = this.instance.getLayeredBounds();
        this.outliner.setVertices(this.dimension, this.instance.toGlobalCoords(min), this.instance.toGlobalCoords(max));
        this.outliner.addStandaloneParticles(this.getCornerVertices());
    }

    getCornerVertices() {
        return this.outliner.getVertices(this.bounds.min, this.bounds.max);
    }
}