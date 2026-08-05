import { world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { StructureNotFoundError } from "../Errors/StructureNotFoundError";

const NOT_LOADED = 0;
const NO_BLOCK = 1;

const SLOT_WIDTHS = [
    { maxSlot: 0xFF, ArrayType: Uint8Array },
    { maxSlot: 0xFFFF, ArrayType: Uint16Array },
    { maxSlot: 0xFFFFFFFF, ArrayType: Uint32Array },
];

export class Structure {
    structureId;
    #structure;
    #size;

    #paletteSlots;
    #widthIndex = 0;

    #palette = [void 0, void 0];
    #slotsByKey = new Map();

    constructor(structureId) {
        this.structureId = structureId;
        this.#structure = world.structureManager.get(structureId);
        if (!this.#structure)
            throw new StructureNotFoundError(structureId);
        this.#structure.saveToWorld();
        this.#size = { ...this.#structure.size };
        this.#paletteSlots = new SLOT_WIDTHS[0].ArrayType(this.#size.x * this.#size.y * this.#size.z);
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

    getBlock(structureLocation) {
        const index = this.#toIndex(structureLocation);
        if (index === void 0)
            return this.#palette[this.#loadSlot(structureLocation)];
        const slot = this.#paletteSlots[index];
        if (slot !== NOT_LOADED)
            return this.#palette[slot];
        const loadedSlot = this.#loadSlot(structureLocation);
        this.#paletteSlots[index] = loadedSlot;
        return this.#palette[loadedSlot];
    }

    #toIndex(structureLocation) {
        const x = Math.floor(structureLocation.x);
        const y = Math.floor(structureLocation.y);
        const z = Math.floor(structureLocation.z);
        if (x < 0 || y < 0 || z < 0 || x >= this.#size.x || y >= this.#size.y || z >= this.#size.z)
            return void 0;
        return (y * this.#size.z + z) * this.#size.x + x;
    }

    #loadSlot(structureLocation) {
        const blockPermutation = this.#structure.getBlockPermutation(structureLocation);
        if (!blockPermutation)
            return NO_BLOCK;
        return this.#intern(blockPermutation, this.#structure.getIsWaterlogged(structureLocation));
    }

    #intern(blockPermutation, isWaterlogged) {
        const typeId = blockPermutation.type.id;
        const states = blockPermutation.getAllStates();
        const key = `${typeId}|${isWaterlogged ? 1 : 0}|${JSON.stringify(states)}`;
        const interned = this.#slotsByKey.get(key);
        if (interned !== void 0)
            return interned;
        const slot = this.#palette.length;
        this.#palette.push({
            permutation: blockPermutation,
            typeId,
            states,
            hasStates: Object.keys(states).length > 0,
            isWaterlogged
        });
        this.#slotsByKey.set(key, slot);
        if (slot > SLOT_WIDTHS[this.#widthIndex].maxSlot)
            this.#widenPaletteSlots();
        return slot;
    }

    #widenPaletteSlots() {
        this.#widthIndex++;
        this.#paletteSlots = new SLOT_WIDTHS[this.#widthIndex].ArrayType(this.#paletteSlots);
    }

    *getBlocks(locations) {
        for (const location of locations) {
            yield this.getBlock(location);
        }
    }

    *getLayerBlocks(layer) {
        for (let x = 0; x < this.#size.x; x++) {
            for (let z = 0; z < this.#size.z; z++) {
                yield this.getBlock({ x, y: layer, z });
            }
        }
    }

    *getAllBlocks() {
        for (let y = 0; y < this.#size.y; y++) {
            yield * this.getLayerBlocks(y);
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
