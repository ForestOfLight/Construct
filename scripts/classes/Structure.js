import { MinecraftDimensionTypes, world } from "@minecraft/server";
import { Outliner } from "./Outliner";

export class Structure {
    #structure;
    #options = {
        isPlaced: false,
        dimensionId: MinecraftDimensionTypes.overworld,
        location: { x: 0, y: 0, z: 0 },
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
        return this.#options.location;
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

    getBlock(location) {
        return this.#structure.getBlockPermutation(location);
    }

    getBounds() {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Structure '${this.name}' is not placed.`);
        return {
            min: { 
                x: this.#options.location.x, 
                y: this.#options.location.y, 
                z: this.#options.location.z 
            },
            max: { 
                x: this.#options.location.x + this.#structure.size.x,
                y: this.#options.location.y + this.#structure.size.y,
                z: this.#options.location.z + this.#structure.size.z
            }
        }
    }

    getLayeredBounds(useUnder = false) {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Structure '${this.name}' is not placed.`);
        if (useUnder) {
            return {
                min: { x: this.#options.location.x, y: this.#options.location.y, z: this.#options.location.z },
                max: { x: this.#options.location.x + this.#structure.size.x, y: this.#options.location.y + this.#options.currentLayer, z: this.#options.location.z + this.#structure.size.z }
            }
        } else {
            return {
                min: { x: this.#options.location.x, y: this.#options.location.y + this.#options.currentLayer - 1,z: this.#options.location.z },
                max: { x: this.#options.location.x + this.#structure.size.x, y: this.#options.location.y + this.#options.currentLayer, z: this.#options.location.z + this.#structure.size.z }
            }
        }
    }

    place(dimensionId, location) {
        this.#options = {
            isPlaced: true,
            dimensionId,
            location: { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) },
        };
        this.updateOptions();
        this.outliner = new Outliner(dimensionId, this.getBounds().min, this.getBounds().max);
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
        this.outliner = new Outliner(this.#options.dimensionId, this.getLayeredBounds().min, this.getLayeredBounds().max);
    }
}