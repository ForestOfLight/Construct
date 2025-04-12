import { world } from "@minecraft/server";
import { Outliner } from "./Outliner";

export class Structure {
    #structure;
    #options = {
        isPlaced: false,
        dimensionId: 'minecraft:overworld',
        worldLocation: { x: 0, y: 0, z: 0 },
        rotation: 0,
        mirror: false,
        currentLayer: 0
    };

    constructor(structureName) {
        this.name = structureName;
        this.#structure = world.structureManager.get(structureName);
        if (!this.#structure) {
            throw new Error(`[StrucTool] Structure '${structureName}' not found.`);
        }
        this.#options = this.loadOptions();
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
        return this.#options.worldLocation;
    }

    getHeight() {
        return this.#structure.size.y;
    }

    getLayer() {
        return this.#options.currentLayer;
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
            throw new Error(`[StrucTool] Structure '${this.name}' is not placed.`);
        return {
            min: { x: 0, y: this.#options.currentLayer - 1, z: 0 },
            max: { x: this.#structure.size.x, y: this.#options.currentLayer, z: this.#structure.size.z }
        };
    }

    place(dimensionId, worldLocation) {
        this.#options = {
            isPlaced: true,
            dimensionId,
            worldLocation: { x: Math.floor(worldLocation.x), y: Math.floor(worldLocation.y), z: Math.floor(worldLocation.z) },
        };
        this.updateOptions();
        this.outliner = new Outliner(dimensionId, this.toGlobalCoords(this.getBounds().min), this.toGlobalCoords(this.getBounds().max));
    }

    remove() {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Structure '${this.name}' is not placed.`);
        this.#options.isPlaced = false;
        this.updateOptions();
        this.outliner.stopDraw();
    }

    setLayer(layer) {
        if (layer < 1 || layer > this.#structure.size.y)
            throw new Error(`[StrucTool] Structure '${this.name}' does not have layer ${layer}.`);
        this.#options.currentLayer = layer;
        this.updateOptions();
        this.outliner.stopDraw();
        const { min, max } = this.getLayeredBounds();
        this.outliner = new Outliner(this.#options.dimensionId, this.toGlobalCoords(min), this.toGlobalCoords(max));
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
}