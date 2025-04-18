import { world } from "@minecraft/server";
import { Vector } from "../lib/Vector";
import { StructureOutliner } from "./StructureOutliner";
import { StructureVerifier } from "./StructureVerifier";

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
        currentLayer: 0,
        verifier: {
            shouldRender: true,
            trackPlayerDistance: 5,
            intervalOrLifetime: 10
        }
    };
    outliner = void 0;
    verifier = void 0;

    constructor(instanceName, structureId) {
        this.name = instanceName;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure)
            throw new Error(`[StrucTool] Structure '${structureId}' not found.`);
        this.#structure.saveToWorld();
        this.#options = this.loadOptions();
        this.#options.structureId = structureId;
        this.updateOptions();
        this.refreshBox();
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

    getStructureId() {
        return this.#options.structureId;
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

    getDimension() {
        let dimension;
        try {
            dimension = world.getDimension(this.#options.dimensionId);
        } catch (e) {
            console.warn(`[StrucTool] Dimension '${this.#options.dimensionId}' not found. Defaulting to 'minecraft:overworld'.`);
            dimension = world.getDimension("minecraft:overworld");
        }
        return dimension;
    }

    getBlock(structureLocation) {
        const blockPermutation = this.#structure.getBlockPermutation({ x: structureLocation.x, y: structureLocation.y, z: structureLocation.z });
        if (!blockPermutation)
            return void 0;
        blockPermutation.location = structureLocation;
        return blockPermutation;
    }

    *getBlocks(locations = void 0) {
        if (locations === void 0) {
            for (let y = 0; y < this.#structure.size.y; y++) {
                yield * this.getLayerBlocks(y);
            }
        } else {
            for (const location of locations) {
                yield this.getBlock(location);
            }
        }
    }

    *getLayerBlocks(y) {
        for (let x = 0; x < this.#structure.size.x; x++) {
            for (let z = 0; z < this.#structure.size.z; z++) {
                yield this.getBlock({ x, y, z });
            }
        }
    }

    getBounds() {
        return {
            min: new Vector(0, 0, 0),
            max: new Vector(this.#structure.size.x, this.#structure.size.y, this.#structure.size.z)
        };
    }

    getLayeredBounds() {
        if (!this.#options.isEnabled)
            throw new Error(`[StrucTool] Instance '${this.name}' is not placed.`);
        return {
            min: new Vector(0, this.#options.currentLayer - 1, 0),
            max: new Vector(this.#structure.size.x, this.#options.currentLayer, this.#structure.size.z)
        };
    }

    getTotalVolume() {
        return this.#structure.size.x * this.#structure.size.y * this.#structure.size.z;
    }

    getActiveVolume() {
        if (!this.#options.isEnabled)
            return 0;
        if (this.#options.currentLayer === 0)
            return this.getTotalVolume();
        return this.#structure.size.x * this.#structure.size.z;
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
        this.refreshBox();
    }

    disable() {
        this.#options.isEnabled = false;
        this.updateOptions();
        this.refreshBox();
    }

    move(dimensionId, location) {
        this.#options.dimensionId = dimensionId;
        this.#options.worldLocation = { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) };
        this.updateOptions();
        this.refreshBox();
    }

    setLayer(layer) {
        if (layer < 0 || layer > this.#structure.size.y)
            throw new Error(`[StrucTool] Layer ${layer} is out of bounds.`);
        this.#options.currentLayer = layer;
        this.updateOptions();
        this.refreshBox();
    }

    refreshBox() {
        if (!this.hasLocation())
            return;
        if (!this.outliner)
            this.outliner = new StructureOutliner(this);
        if (!this.verifier)
            this.verifier = new StructureVerifier(this, { shouldRender: this.#options.verifier.shouldRender, trackPlayerDistance: this.#options.verifier.trackPlayerDistance });
        this.outliner.refresh();
        this.verifier.refresh();
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
        return new Vector(
            this.#options.worldLocation.x + structureLocation.x,
            this.#options.worldLocation.y + structureLocation.y,
            this.#options.worldLocation.z + structureLocation.z
        );
    }

    toStructureCoords(worldLocation) {
        return new Vector(
            worldLocation.x - this.#options.worldLocation.x,
            worldLocation.y - this.#options.worldLocation.y,
            worldLocation.z - this.#options.worldLocation.z
        );
    }

    isEnabled() {
        return this.#options.isEnabled;
    }

    hasLocation() {
        return this.#options.dimensionId && this.#options.worldLocation.x !== 0 && this.#options.worldLocation.y !== 0 && this.#options.worldLocation.z !== 0;
    }

    isUsingLayers() {
        return this.hasLayers() && this.#options.currentLayer !== 0;
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

    getDimension() {
        return world.getDimension(this.#options.dimensionId);
    }

    setVerifierOptions({ shouldRender, trackPlayerDistance, intervalOrLifetime }) {
        this.#options.verifier.shouldRender = shouldRender;
        this.#options.verifier.trackPlayerDistance = trackPlayerDistance;
        this.#options.verifier.intervalOrLifetime = intervalOrLifetime;
        this.updateOptions();
        this.verifier.setOptions(this.#options.verifier);
        this.verifier.refresh();
    }
}