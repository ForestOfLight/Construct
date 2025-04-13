import { world } from "@minecraft/server";
import { Outliner } from "./Outliner";

export class StructureInstance {
    name;
    #structure;
    #options = {
        structureId: void 0,
        isEnabled: false,
        dimensionId: void 0,
        worldLocation: { x: 0, y: 0, z: 0 },
        rotation: 0,
        mirror: false,
        currentLayer: 0
    };

    constructor(instanceName, structureId) {
        this.name = instanceName;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure)
            throw new Error(`[StrucTool] Structure '${structureId}' not found.`);
        this.#structure.saveToWorld();
        this.#options = this.loadOptions();
        this.#options.structureId = structureId;
        if (this.#options.isEnabled)
            this.refreshOutliner();
        this.updateOptions();
    }

    loadOptions() {
        try {
            return JSON.parse(world.getDynamicProperty(`structOptions:${this.name}`));
        } catch (e) {
            world.setDynamicProperty(`structOptions:${this.name}`, JSON.stringify(this.#options));
        }
        return this.#options;
    }

    delete() {
        this.disable();
        world.setDynamicProperty(`structOptions:${this.name}`, void 0);
        this.#structure = void 0;
        this.#options = void 0;
        delete this.outliner;
    }

    static parseOptions(instanceName) {
        const options = JSON.parse(world.getDynamicProperty(`structOptions:${instanceName}`));
        if (!options)
            throw new Error(`[StrucTool] Instance '${instanceName}' not found.`);
        return options;
    }

    updateOptions() {
        world.setDynamicProperty(`structOptions:${this.name}`, JSON.stringify(this.#options));
    }
    
    getStructure() {
        return this.#structure;
    }

    getLocation() {
        return { dimensionId: this.#options.dimensionId, location: this.#options.worldLocation };
    }

    getHeight() {
        return this.#structure.size.y;
    }

    getLayer() {
        return this.#options.currentLayer || 0;
    }

    *getBlocks() {
        const max = this.#structure.size;
        for (let x = 0; x < max.x; x++) {
            for (let y = 0; y < max.y; y++) {
                for (let z = 0; z < max.z; z++) {
                    yield this.#structure.getBlockPermutation({ x, y, z });
                }
            }
        }
    }

    *getLayerBlocks(y) {
        const max = this.#structure.size;
        for (let x = 0; x < max.x; x++) {
            for (let z = 0; z < max.z; z++) {
                yield this.#structure.getBlockPermutation({ x, y, z });
            }
        }
    }

    getBlock(structureLocation) {
        return this.#structure.getBlockPermutation(structureLocation);
    }

    getBounds() {
        return {
            min: { x: 0, y: 0, z: 0 },
            max: this.#structure.size
        };
    }

    getLayeredBounds() {
        if (!this.#options.isEnabled)
            throw new Error(`[StrucTool] Instance '${this.name}' is not placed.`);
        return {
            min: { x: 0, y: this.#options.currentLayer - 1, z: 0 },
            max: { x: this.#structure.size.x, y: this.#options.currentLayer, z: this.#structure.size.z }
        };
    }

    rename(newName) {
        world.setDynamicProperty(`structOptions:${this.name}`, void 0);
        this.name = newName;
        world.setDynamicProperty(`structOptions:${this.name}`, JSON.stringify(this.#options));
    }

    place(dimensionId, worldLocation) {
        this.move(dimensionId, worldLocation);
        this.enable();
    }

    enable() {
        this.#options.isEnabled = true;
        this.updateOptions();
        this.refreshOutliner();
    }

    disable() {
        this.#options.isEnabled = false;
        this.updateOptions();
        this.outliner.stopDraw();
    }

    move(dimensionId, location) {
        this.#options.dimensionId = dimensionId;
        this.#options.worldLocation = { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) };
        this.updateOptions();
        this.refreshOutliner();
    }

    setLayer(layer) {
        if (layer < 0 || layer > this.#structure.size.y)
            throw new Error(`[StrucTool] Layer ${layer} is out of bounds.`);
        this.#options.currentLayer = layer;
        this.updateOptions();
        this.refreshOutliner();
    }

    refreshOutliner() {
        if (!this.#options.isEnabled)
            return;
        if (this.outliner)
            this.outliner.stopDraw();
        if (this.#options.currentLayer > 0) {
            const { min, max } = this.getLayeredBounds();
            this.outliner = new Outliner(this.#options.dimensionId, this.toGlobalCoords(min), this.toGlobalCoords(max));
        } else {
            this.outliner = new Outliner(this.#options.dimensionId, this.toGlobalCoords(this.getBounds().min), this.toGlobalCoords(this.getBounds().max));
        }
    }

    isLocationInStructure(dimensionId, structureLocation) {
        if (this.#options.dimensionId !== dimensionId)
            return false
        const { min, max } = this.getBounds();
        return structureLocation.x >= min.x && structureLocation.x < max.x
            && structureLocation.y >= min.y && structureLocation.y < max.y
            && structureLocation.z >= min.z && structureLocation.z < max.z;
    }

    isLocationInLayer(dimensionId, structureLocation) {
        if (!this.#options.isEnabled || this.#options.dimensionId !== dimensionId)
            return false
        const { min, max } = this.getLayeredBounds(true);
        return structureLocation.x >= min.x && structureLocation.x < max.x
            && structureLocation.y >= min.y && structureLocation.y < max.y
            && structureLocation.z >= min.z && structureLocation.z < max.z;
    }

    isLocationActive(dimensionId, structureLocation, { useLayers = true } = {}) {
        if (!this.#options.isEnabled || this.#options.dimensionId !== dimensionId)
            return false
        if (useLayers && this.#options.currentLayer !== 0)
            return this.isLocationInLayer(dimensionId, structureLocation);
        return this.isLocationInStructure(dimensionId, structureLocation);
    }

    toGlobalCoords(structureLocation) {
        return {
            x: this.#options.worldLocation.x + structureLocation.x,
            y: this.#options.worldLocation.y + structureLocation.y,
            z: this.#options.worldLocation.z + structureLocation.z
        };
    }

    toStructureCoords(worldLocation) {
        return {
            x: worldLocation.x - this.#options.worldLocation.x,
            y: worldLocation.y - this.#options.worldLocation.y,
            z: worldLocation.z - this.#options.worldLocation.z
        };
    }

    isEnabled() {
        return this.#options.isEnabled;
    }

    hasLocation() {
        return this.#options.dimensionId && this.#options.worldLocation.x !== 0 && this.#options.worldLocation.y !== 0 && this.#options.worldLocation.z !== 0;
    }

    hasLayers() {
        return this.#structure.size.y > 1;
    }

    isAtMaxLayer() {
        return !this.hasLayers || this.#options.currentLayer >= this.#structure.size.y;
    }

    isAtMinLayer() {
        return !this.hasLayers || this.#options.currentLayer <= 0;
    }

    increaseLayer() {
        if (this.isAtMaxLayer())
            this.setLayer(0);
        else
            this.setLayer(this.#options.currentLayer + 1);
    }

    decreaseLayer() {
        if (this.isAtMinLayer())
            this.setLayer(this.#structure.size.y);
        else
            this.setLayer(this.#options.currentLayer - 1);
    }
}