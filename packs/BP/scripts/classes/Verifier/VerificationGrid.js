import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel.js";
import { Side } from "../Enums/Side.js";
import { CellFlags } from "./CellFlags.js";

const LEVEL_COUNT = Object.keys(BlockVerificationLevel).length;

// One verification level and one set of CellFlags per cell of a structure's
// active bounds.
//
// The flags sit beside the levels rather than folded into them because a
// cell's shape is not a level - it is what it is whether or not the block
// there matches - and the verifier already knows both by the time it has
// looked the cell up once.
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
        // Uint16 rather than Uint8 because a cell carries two six-bit masks.
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

    // Which of this cell's own sides its neighbors hide, packed as CellFlags.
    //
    // An opaque side hides anything laid against it. A marker side hides only
    // another marker face, because two translucent markers meeting is the one
    // case where the wall between them is noise rather than information -
    // neither has a texture to show, and both say the same thing about the
    // cell. Anything else showing through stays drawn, which is what keeps an
    // incorrect block visible through the real glass it is embedded in.
    //
    // Each answer is read off the ONE side the neighbor turns this way, not off
    // the neighbor as a whole: a bottom slab is opaque downwards and open
    // upwards, and gets to hide the top face of the block beneath it without
    // claiming anything about the block above.
    //
    // A neighbor outside the bounds contributes nothing, so the outer shell of
    // a structure stays drawn in full even where it is buried in terrain. That
    // is the conservative direction - a missed cull costs a particle, a wrong
    // one punches a hole in the model.
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

    // Public because the debug box store keys its persistent handles by the
    // same index. The render cursor's traversal order is a different one, so it
    // cannot be reused for that.
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
