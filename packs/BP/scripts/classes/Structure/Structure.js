import { world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { StructureNotFoundError } from "../Errors/StructureNotFoundError";

export class Structure {
    structureId;
    #structure;
    #size;

    constructor(structureId) {
        this.structureId = structureId;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure)
            throw new StructureNotFoundError(structureId);
        this.#structure.saveToWorld();
        this.#size = this.#structure.size;
    }

    getHeight() {
        return this.#size.y;
    }

    getMin() {
        return { x: 0, y: 0, z: 0 };
    }

    getMax() {
        return this.#size;
    }

    getBlockPermutation(structureLocation) {
        const blockPermutation = this.#structure.getBlockPermutation(structureLocation);
        if (!blockPermutation)
            return void 0;
        blockPermutation.location = structureLocation;
        blockPermutation.isWaterlogged = this.#structure.getIsWaterlogged(blockPermutation.location);
        return blockPermutation;
    }

    *getBlockPermutations(locations) {
        for (const location of locations) {
            yield this.getBlockPermutation(location);
        }
    }

    *getLayerBlockPermutations(layer) {
        for (let x = 0; x < this.#size.x; x++) {
            for (let z = 0; z < this.#size.z; z++) {
                yield this.getBlockPermutation({ x, y: layer, z });
            }
        }
    }

    *getAllBlockPermutations() {
        for (let y = 0; y < this.#size.y; y++) {
            yield * this.getLayerBlockPermutations(y);
        }
    }

    getLayerLocations(layer) {
        const locations = new Set();
        for (let x = 0; x < this.#size.x; x++) {
            for (let z = 0; z < this.#size.z; z++) {
                locations.add(new Vector(x, layer, z));
            }
        }
        return locations;
    }

    getAllLocations() {
        const locations = new Set();
        for (let y = 0; y < this.#size.y; y++) {
            const layerLocations = this.getLayerLocations(y);
            for (const location of layerLocations) {
                locations.add(location);
            }
        }
        return locations;
    }
}
    