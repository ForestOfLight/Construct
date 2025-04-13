import { world } from "@minecraft/server";
import { Outliner } from "./Outliner";

export class StructureInstance {
    #structure;
    #options = {
        isPlaced: false,
        dimensionId: 'minecraft:overworld',
        worldLocation: { x: 0, y: 0, z: 0 },
        rotation: 0,
        mirror: false,
        currentLayer: 0
    };

    constructor(instanceName, structureId) {
        this.name = instanceName;
        this.structureId = structureId;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure) {
            throw new Error(`[StrucTool] Structure '${this.structureId}' not found.`);
        }
        this.#options = this.loadOptions();
        this.#options.isPlaced = false;
    }

    loadOptions() {
        try {
            return JSON.parse(world.getDynamicProperty(`structOptions:${this.name}`));
        } catch (e) {
            world.setDynamicProperty(`structOptions:${this.name}`, JSON.stringify(this.#options));
        }
        return this.#options;
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
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Instance '${this.name}' is not placed.`);
        return {
            min: { x: 0, y: this.#options.currentLayer - 1, z: 0 },
            max: { x: this.#structure.size.x, y: this.#options.currentLayer, z: this.#structure.size.z }
        };
    }

    place(dimensionId, worldLocation) {
        this.#options.isPlaced = true;
        this.move(dimensionId, worldLocation);
    }

    removePlacement() {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Instance '${this.name}' is not placed.`);
        this.#options.isPlaced = false;
        this.updateOptions();
        this.outliner.stopDraw();
    }

    move(dimensionId, location) {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Instance '${this.name}' is not placed.`);
        this.#options.dimensionId = dimensionId;
        this.#options.worldLocation = { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) };
        this.updateOptions();
        this.refreshOutliner();
    }

    setLayer(layer) {
        if (layer < 0 || layer > this.#structure.size.y)
            throw new Error(`[StrucTool] Instance '${this.name}' of '${this.structureId}' does not have layer ${layer}.`);
        this.#options.currentLayer = layer;
        this.updateOptions();
        this.refreshOutliner();
    }

    refreshOutliner() {
        if (this.outliner)
            this.outliner.stopDraw();
        if (this.#options.currentLayer > 0) {
            const { min, max } = this.getLayeredBounds();
            this.outliner = new Outliner(this.#options.dimensionId, this.toGlobalCoords(min), this.toGlobalCoords(max));
        } else {
            this.outliner = new Outliner(this.#options.dimensionId, this.toGlobalCoords(this.getBounds().min), this.toGlobalCoords(this.getBounds().max));
        }
    }

    isLocationInStructure(structureLocation) {
        const { min, max } = this.getBounds();
        return structureLocation.x >= min.x && structureLocation.x < max.x
            && structureLocation.y >= min.y && structureLocation.y < max.y
            && structureLocation.z >= min.z && structureLocation.z < max.z;
    }

    isLocationInLayer(structureLocation) {
        const { min, max } = this.getLayeredBounds(true);
        return structureLocation.x >= min.x && structureLocation.x < max.x
            && structureLocation.y >= min.y && structureLocation.y < max.y
            && structureLocation.z >= min.z && structureLocation.z < max.z;
    }

    isLocationActive(structureLocation) {
        if (!this.#options.isPlaced)
            return false
        if (this.#options.currentLayer > 0)
            return this.isLocationInLayer(structureLocation);
        return this.isLocationInStructure(structureLocation);
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

    isPlaced() {
        return this.#options.isPlaced;
    }
}