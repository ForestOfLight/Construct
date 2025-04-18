import { Vector } from "../lib/Vector";
import { StructureOutliner } from "./StructureOutliner";
import { StructureVerifier } from "./StructureVerifier";
import { InstanceOptions } from "./InstanceOptions";
import { Structure } from "./Structure";

export class StructureInstance {
    options;
    structure = void 0;
    verifier = void 0;
    outliner = void 0;

    constructor(instanceName, structureId) {
        this.structure = new Structure(structureId);
        this.options = new InstanceOptions(instanceName, structureId);
        this.refreshBox();
    }

    delete() {
        this.disable();
        this.options.clear();
        delete this.options;
        delete this.structure;
        delete this.outliner;
        delete this.verifier;
    }

    refreshBox() {
        if (!this.hasLocation())
            return;
        if (!this.outliner)
            this.outliner = new StructureOutliner(this);
        if (!this.verifier)
            this.verifier = new StructureVerifier(this, { isEnabled: this.options.verifier.isEnabled, trackPlayerDistance: this.options.verifier.trackPlayerDistance });
        this.outliner.refresh();
        this.verifier.refresh();
    }

    getStructureId() {
        return this.options.structureId;
    }

    getLocation() {
        return { dimensionId: this.options.dimensionId, location: this.options.worldLocation };
    }

    getDimension() {
        return this.options.getDimension();
    }

    getMaxLayer() {
        return this.structure.getHeight();
    }

    getLayer() {
        return this.options.currentLayer;
    }

    getBounds() {
        return {
            min: this.structure.getMin(),
            max: this.structure.getMax()
        }
    }

    getActiveBounds() {
        if (!this.options.isEnabled)
            throw new Error(`[StrucTool] Instance '${this.options.instanceName}' is not placed.`);
        if (this.hasLayerSelected())
            return this.getLayeredBounds();
        return this.getBounds();
    }

    getLayeredBounds() {
        if (!this.options.isEnabled)
            throw new Error(`[StrucTool] Instance '${this.options.instanceName}' is not placed.`);
        const min = this.structure.getMin();
        const max = this.structure.getMax();
        return {
            min: new Vector(min.x, this.options.currentLayer - 1, min.z),
            max: new Vector(max.x, this.options.currentLayer, max.z)
        };
    }

    getBlock(structureLocation) {
        return this.structure.getBlock(structureLocation);
    }

    getBlocks(structureLocations) {
        return this.structure.getBlocks(structureLocations);
    }

    getLayerBlocks(layer) {
        return this.structure.getLayerBlocks(layer);
    }

    getAllBlocks() {
        return this.structure.getAllBlocks();
    }

    isLocationActive(dimensionId, structureLocation, { useActiveLayer = true } = {}) {
        if (!this.options.isEnabled || this.options.dimensionId !== dimensionId)
            return false;
        let bounds;
        if (useActiveLayer)
            bounds = this.getActiveBounds();
        else
            bounds = this.getBounds();
        return structureLocation.x >= bounds.min.x && structureLocation.x < bounds.max.x
            && structureLocation.y >= bounds.min.y && structureLocation.y < bounds.max.y
            && structureLocation.z >= bounds.min.z && structureLocation.z < bounds.max.z;
    }

    isEnabled() {
        return this.options.isEnabled;
    }

    hasLocation() {
        return this.options.dimensionId && this.options.worldLocation.x !== 0 && this.options.worldLocation.y !== 0 && this.options.worldLocation.z !== 0;
    }

    hasLayers() {
        return this.getMaxLayer() > 1;
    }

    hasLayerSelected() {
        return this.hasLayers() && this.options.currentLayer !== 0;
    }

    hasWholeStructureSelected() {
        return this.hasLocation() && this.options.currentLayer === 0;
    }

    isAtMaxLayer() {
        return !this.hasLayers || this.options.currentLayer >= this.getMaxLayer();
    }

    isAtMinLayer() {
        return !this.hasLayers || this.options.currentLayer <= 0;
    }

    enable() {
        this.options.enable();
        this.refreshBox();
    }

    disable() {
        this.options.disable();
        this.refreshBox();
    }

    rename(newName) {
        this.options.rename(newName);
    }

    place(dimensionId, worldLocation) {
        this.move(dimensionId, worldLocation);
        this.enable();
    }

    move(dimensionId, worldLocation) {
        this.options.move(dimensionId, worldLocation);
        this.refreshBox();
    }

    setLayer(layer) {
        if (layer < 0 || layer > this.getMaxLayer())
            throw new Error(`[StrucTool] Layer ${layer} is out of bounds.`);
        this.options.setLayer(layer);
        this.refreshBox();
    }

    setVerifierEnabled(enable) {
        this.options.setVerifierEnabled(enable);
        this.verifier.refresh();
    }

    setVerifierDistance(distance) {
        this.options.setVerifierDistance(distance);
        this.verifier.refresh();
    }

    increaseLayer() {
        if (this.isAtMaxLayer())
            this.setLayer(0);
        else
            this.setLayer(this.options.currentLayer + 1);
    }

    decreaseLayer() {
        if (this.isAtMinLayer())
            this.setLayer(this.getMaxLayer());
        else
            this.setLayer(this.options.currentLayer - 1);
    }

    toGlobalCoords(structureLocation) {
        return Vector.from(structureLocation).add(this.options.worldLocation);
    }

    toStructureCoords(worldLocation) {
        return Vector.from(worldLocation).subtract(this.options.worldLocation);
    }
}