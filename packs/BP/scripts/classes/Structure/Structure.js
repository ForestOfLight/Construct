import { world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { InvalidStructureError } from "../Errors/InvalidStructureError";

export class Structure {
    structureId;
    #structure;

    constructor(structureId) {
        this.structureId = structureId;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure)
            throw new InvalidStructureError(`[Construct] Structure '${structureId}' not found on world.`);
        this.#structure.saveToWorld();
    }

    getHeight() {
        return this.#structure.size.y;
    }

    getMin() {
        return new Vector(0, 0, 0);
    }

    getMax() {
        return Vector.from(this.#structure.size);
    }

    getBlock(structureLocation) {
        const blockPermutation = this.#structure.getBlockPermutation(structureLocation);
        if (!blockPermutation)
            return void 0;
        blockPermutation.location = structureLocation;
        return blockPermutation;
    }

    *getBlocks(locations) {
        for (const location of locations) {
            yield this.getBlock(location);
        }
    }

    *getLayerBlocks(layer) {
        for (let x = 0; x < this.#structure.size.x; x++) {
            for (let z = 0; z < this.#structure.size.z; z++) {
                yield this.getBlock({ x, y: layer, z });
            }
        }
    }

    *getAllBlocks() {
        for (let y = 0; y < this.#structure.size.y; y++) {
            yield * this.getLayerBlocks(y);
        }
    }

    getLayerLocations(layer) {
        const locations = new Set();
        for (let x = 0; x < this.#structure.size.x; x++) {
            for (let z = 0; z < this.#structure.size.z; z++) {
                locations.add(new Vector(x, layer, z));
            }
        }
        return locations;
    }

    getAllLocations() {
        const locations = new Set();
        for (let y = 0; y < this.#structure.size.y; y++) {
            const layerLocations = this.getLayerLocations(y);
            for (const location of layerLocations) {
                locations.add(location);
            }
        }
        return locations;
    }
}
    