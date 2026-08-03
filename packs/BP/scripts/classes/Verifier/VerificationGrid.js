import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel.js";
import { Side } from "../Enums/Side.js";
import { CellFlags } from "./CellFlags.js";

const LEVEL_COUNT = Object.keys(BlockVerificationLevel).length;

export class VerificationGrid {
    #min;
    #sizeX;
    #sizeY;
    #sizeZ;
    #levels;
    #flags;

    constructor(bounds) {
        this.#min = { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z };
        this.#sizeX = Math.max(bounds.max.x - bounds.min.x, 0);
        this.#sizeY = Math.max(bounds.max.y - bounds.min.y, 0);
        this.#sizeZ = Math.max(bounds.max.z - bounds.min.z, 0);
        this.#levels = new Uint8Array(this.#sizeX * this.#sizeY * this.#sizeZ);
        this.#flags = new Uint16Array(this.#levels.length);
    }

    matchesBounds(bounds) {
        return this.#min.x === bounds.min.x && this.#min.y === bounds.min.y && this.#min.z === bounds.min.z
            && this.#sizeX === bounds.max.x - bounds.min.x
            && this.#sizeY === bounds.max.y - bounds.min.y
            && this.#sizeZ === bounds.max.z - bounds.min.z;
    }

    clear() {
        this.#levels.fill(BlockVerificationLevel.Unknown);
        this.#flags.fill(CellFlags.NONE);
    }

    setCell(location, verificationLevel, flags) {
        const index = this.indexOf(location);
        if (index === -1)
            return;
        this.#levels[index] = verificationLevel;
        this.#flags[index] = flags;
    }

    setLevel(location, verificationLevel) {
        const index = this.indexOf(location);
        if (index === -1)
            return;
        this.#levels[index] = verificationLevel;
    }

    get(location) {
        const index = this.indexOf(location);
        if (index === -1)
            return BlockVerificationLevel.Unknown;
        return this.#levels[index];
    }

    occlusionMaskAt(location) {
        let markerMask = CellFlags.NONE;
        let opaqueMask = CellFlags.NONE;
        for (let side = 0; side < Side.COUNT; side++) {
            const neighborFlags = this.#neighborFlags(location, side);
            const facingSide = Side.opposite(side);
            if (CellFlags.hasMarker(neighborFlags, facingSide))
                markerMask |= 1 << side;
            if (CellFlags.hasOpaque(neighborFlags, facingSide))
                opaqueMask |= 1 << side;
        }
        return CellFlags.pack(markerMask, opaqueMask);
    }

    #neighborFlags(location, side) {
        const offset = Side.OFFSETS[side];
        const index = this.#indexOfCoords(
            location.x + offset.x, location.y + offset.y, location.z + offset.z
        );
        if (index === -1)
            return CellFlags.NONE;
        return this.#flags[index];
    }

    countByLevel() {
        const counts = new Uint32Array(LEVEL_COUNT);
        for (let index = 0; index < this.#levels.length; index++)
            counts[this.#levels[index]]++;
        return counts;
    }

    indexOf(location) {
        return this.#indexOfCoords(location.x, location.y, location.z);
    }

    #indexOfCoords(x, y, z) {
        const localX = x - this.#min.x;
        const localY = y - this.#min.y;
        const localZ = z - this.#min.z;
        if (localX < 0 || localY < 0 || localZ < 0
            || localX >= this.#sizeX || localY >= this.#sizeY || localZ >= this.#sizeZ)
            return -1;
        return (localY * this.#sizeZ + localZ) * this.#sizeX + localX;
    }
}
