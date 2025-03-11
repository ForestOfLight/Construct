import { MinecraftDimensionTypes, world } from "@minecraft/server";
import { Outliner } from "./Outliner";

export class Structure {
    #structure;
    #options = {
        isPlaced: false,
        dimensionId: MinecraftDimensionTypes.overworld,
        location: { x: 0, y: 0, z: 0 },
        rotation: 0,
        mirror: false
    };

    constructor(structureName) {
        this.name = structureName;
        this.#structure = world.structureManager.get(structureName);
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

    getName() {
        return this.name;
    }

    getStructure() {
        return this.#structure;
    }

    getOutlineLimits() {
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

    place(dimensionId, location) {
        this.#options = {
            isPlaced: true,
            dimensionId,
            location: { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) },
        };
        this.updateOptions();
        this.outliner = new Outliner(dimensionId, this.getOutlineLimits().min, this.getOutlineLimits().max);
        this.outliner.startDraw();
    }

    remove() {
        if (!this.#options.isPlaced)
            throw new Error(`[StrucTool] Structure '${this.name}' is not placed.`);
        this.#options.isPlaced = false;
        this.updateOptions();
        this.outliner.stopDraw();
        delete this.outliner;
    }
}