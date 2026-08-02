import { world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { StructureNotFoundError } from "../Errors/StructureNotFoundError";

// A cell nothing has been read out of yet. Zero, so a freshly allocated
// #paletteSlots is entirely unread without having to fill it.
const NOT_LOADED = 0;
// A cell the structure reports no block for. A palette slot of its own, so
// "read it and there was nothing" stays distinct from "not read yet" without a
// second array to say which.
const NO_BLOCK = 1;

// The widths #paletteSlots steps through as the palette outgrows them, and the
// largest slot each can hold.
const SLOT_WIDTHS = [
    { maxSlot: 0xFF, ArrayType: Uint8Array },
    { maxSlot: 0xFFFF, ArrayType: Uint16Array },
    { maxSlot: 0xFFFFFFFF, ArrayType: Uint32Array },
];

export class Structure {
    structureId;
    #structure;
    #size;

    // The palette slot standing in each cell, indexed by #toIndex. One typed
    // array covering the structure's whole volume rather than a Map keyed by
    // index: a Map costs a hash and a probe on every lookup and tens of bytes
    // per entry, where this is a single indexed read and - for the majority of
    // builds, whose palette fits in a byte - one byte per cell.
    #paletteSlots;
    #widthIndex = 0;

    // Slot 0 is never stored and slot 1 is NO_BLOCK, so both read back as
    // undefined and the first real block lands at slot 2.
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

    // The structure's block at a location as a palette entry - see #intern for
    // its shape - or undefined where the structure has no block. Entries are
    // interned, so every cell holding the same block state shares one object,
    // which is what lets a block's resolved model be cached against it (see
    // BlockModelLookup).
    getBlock(structureLocation) {
        const index = this.#toIndex(structureLocation);
        if (index === void 0)
            return this.#palette[this.#loadSlot(structureLocation)];
        const slot = this.#paletteSlots[index];
        if (slot !== NOT_LOADED)
            return this.#palette[slot];
        // Interning a new block can widen #paletteSlots, so this reads the
        // field back rather than holding onto the array across the call.
        const loadedSlot = this.#loadSlot(structureLocation);
        this.#paletteSlots[index] = loadedSlot;
        return this.#palette[loadedSlot];
    }

    // Floored rather than assumed whole: the raycaster walks in fractional
    // steps and asks for each cell it passes through (see Raycaster).
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

    // Blocks are handed out as plain entries -
    //   { permutation, typeId, states, hasStates, isWaterlogged }
    // - rather than as the engine's BlockPermutation with those properties
    // written onto it. The id, the states and the waterlogging are all wanted
    // per block per render pass and reading them off the handle every time
    // crosses the native boundary, but caching them ON the handle would break
    // the day the API grows a real property of the same name.
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

    // A structure with more distinct block states than a cell can hold moves up
    // a width, one whole-array copy each time. Both steps are rare - a byte
    // covers 254 block states, which is most builds outright - and the array is
    // never wider than the palette in it needs.
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
