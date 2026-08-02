import { world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { StructureNotFoundError } from "../Errors/StructureNotFoundError";

export class Structure {
    structureId;
    #structure;
    #size;

    #permutationsByIndex = new Map();
    #internedPermutations = new Map();

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
        const index = this.#toIndex(structureLocation);
        if (index === void 0)
            return this.#loadBlockPermutation(structureLocation);
        const cached = this.#permutationsByIndex.get(index);
        if (cached !== void 0)
            return cached === null ? void 0 : cached;
        const blockPermutation = this.#loadBlockPermutation(structureLocation);
        this.#permutationsByIndex.set(index, blockPermutation ?? null);
        return blockPermutation;
    }

    #toIndex(structureLocation) {
        const x = Math.floor(structureLocation.x);
        const y = Math.floor(structureLocation.y);
        const z = Math.floor(structureLocation.z);
        if (x < 0 || y < 0 || z < 0 || x >= this.#size.x || y >= this.#size.y || z >= this.#size.z)
            return void 0;
        return (y * this.#size.z + z) * this.#size.x + x;
    }

    #loadBlockPermutation(structureLocation) {
        const blockPermutation = this.#structure.getBlockPermutation(structureLocation);
        if (!blockPermutation)
            return void 0;
        return this.#intern(blockPermutation, this.#structure.getIsWaterlogged(structureLocation));
    }

    #intern(blockPermutation, isWaterlogged) {
        const typeId = blockPermutation.type.id;
        const states = blockPermutation.getAllStates();
        const key = `${typeId}|${isWaterlogged ? 1 : 0}|${JSON.stringify(states)}`;
        const interned = this.#internedPermutations.get(key);
        if (interned)
            return interned;
        blockPermutation.typeId = typeId;
        blockPermutation.states = states;
        blockPermutation.hasStates = Object.keys(states).length > 0;
        blockPermutation.isWaterlogged = isWaterlogged;
        this.#internedPermutations.set(key, blockPermutation);
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
    