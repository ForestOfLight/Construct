import { Outliner } from '../classes/Outliner';

export class StructureOutliner {
    constructor(instance) {
        this.instance = instance;
        this.pullInstanceData();
        this.outliner = new Outliner(this.dimension, this.bounds.min, this.bounds.max);
    }

    pullInstanceData() {
        try {
            this.dimension = this.instance.getDimension();
            this.bounds = this.instance.getBounds();
            this.bounds.min = this.instance.toGlobalCoords(this.bounds.min);
            this.bounds.max = this.instance.toGlobalCoords(this.bounds.max);
        } catch (e) {
            if (e.name === 'InvalidStructureError')
                this.outliner.stopDraw();
            else
                throw e;
        }
    }

    refresh() {
        this.pullInstanceData();
        this.refreshDraw();
    }

    refreshDraw() {
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