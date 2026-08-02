import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";

const LEVEL_COUNT = Object.keys(BlockVerificationLevel).length;

// The six neighbors a face can be hidden by, in the order the baked face
// table indexes them (see _CULL_DIRECTIONS in tools/bake_block_models/
// main.py). A face's `cull` is a subscript into this, so the two tables have
// to stay in the same order - reordering one alone culls against the wrong
// side of the block.
const CULL_OFFSETS = [
    [0, -1, 0],  // 0 down
    [0, 1, 0],   // 1 up
    [0, 0, -1],  // 2 north
    [0, 0, 1],   // 3 south
    [-1, 0, 0],  // 4 west
    [1, 0, 0],   // 5 east
];

// The table is laid out in opposite pairs, so the side a neighbor turns back
// towards this block is its direction with the low bit flipped. Looking up
// the block above means asking what IT covers below.
const OPPOSITE = 1;

// One six-bit mask per entry of CULL_OFFSETS. Two of them are packed into a
// single number in two places - what a cell records, and what
// occlusionMaskAt returns - so they share the width and the shift.
const COVER_MASK = 0b111111;
const OPAQUE_SHIFT = 6;

// What one cell of the grid records: the six sides its block covers
// completely, and which of those it covers opaquely. Judged per block state
// rather than per block id, so a slab, a stair or a closed door offers the
// sides it really does seal (see BlockModelLookup.getCoverMasks).
export function packCellFlags(coverMasks) {
    return coverMasks & ((COVER_MASK << OPAQUE_SHIFT) | COVER_MASK);
}

// The two halves of what occlusionMaskAt returns, packed the same way round
// as everywhere else: sides hidden by a merely solid neighbor, which hides
// only a see-through placeholder face, and sides hidden by an opaque one,
// which hides anything.
export function coverCullMask(masks) {
    return masks & COVER_MASK;
}

export function opaqueCullMask(masks) {
    return (masks >> OPAQUE_SHIFT) & COVER_MASK;
}

export class VerificationLevels {
    #min;
    #sizeX;
    #sizeY;
    #sizeZ;
    #levels;
    #cellFlags;

    constructor(bounds) {
        this.#min = { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z };
        this.#sizeX = Math.max(bounds.max.x - bounds.min.x, 0);
        this.#sizeY = Math.max(bounds.max.y - bounds.min.y, 0);
        this.#sizeZ = Math.max(bounds.max.z - bounds.min.z, 0);
        this.#levels = new Uint8Array(this.#sizeX * this.#sizeY * this.#sizeZ);
        // What each cell offers its neighbors to hide behind: the sides it
        // covers completely, and which of those it covers opaquely (see
        // packCellFlags). Kept beside the levels rather than folded into them
        // because it isn't a level - a cell's shape is what it is regardless
        // of whether the block there matches - and the verifier already knows
        // both by the time it has looked the cell up once.
        // Uint16 rather than Uint8 because a cell now carries two six-bit
        // masks: what it covers, and what it covers opaquely.
        this.#cellFlags = new Uint16Array(this.#levels.length);
    }

    matchesBounds(bounds) {
        return this.#min.x === bounds.min.x && this.#min.y === bounds.min.y && this.#min.z === bounds.min.z
            && this.#sizeX === bounds.max.x - bounds.min.x
            && this.#sizeY === bounds.max.y - bounds.min.y
            && this.#sizeZ === bounds.max.z - bounds.min.z;
    }

    clear() {
        this.#levels.fill(BlockVerificationLevel.Unknown);
        this.#cellFlags.fill(0);
    }

    set(location, verificationLevel) {
        const index = this.#indexOf(location);
        if (index === -1)
            return;
        this.#levels[index] = verificationLevel;
    }

    get(location) {
        const index = this.#indexOf(location);
        if (index === -1)
            return BlockVerificationLevel.Unknown;
        return this.#levels[index];
    }

    setCellFlags(location, flags) {
        const index = this.#indexOf(location);
        if (index === -1)
            return;
        this.#cellFlags[index] = flags;
    }

    // Both cull masks for the block at `location`, packed into one number -
    // read them back with opaqueCullMask and coverCullMask.
    //
    // A side goes into the cover mask when the neighbor beyond it turns a
    // complete face back this way, and into the opaque mask when that same
    // face is opaque as well. The opaque mask is therefore always a subset
    // of the cover mask, which is what makes the two rules compose: an
    // opaque face hides any face, a merely solid one hides only a
    // see-through placeholder face that has nothing to show anyway.
    //
    // Both are read off the ONE side the neighbor turns this way, not off
    // the neighbor as a whole. A bottom slab is opaque downwards and open
    // upwards, and gets to hide the top face of the block beneath it without
    // claiming anything about the block above.
    //
    // Built once per block rather than asked one face at a time: a block has
    // six neighbors however many faces it has, and every face of a full cube
    // would otherwise re-derive the same six answers.
    //
    // A neighbor outside the bounds reads as 0 - nothing there is known to be
    // solid, so nothing is culled against it. That leaves the outer shell of
    // a structure drawn in full even where it is buried in terrain, which is
    // the conservative direction: a missed cull costs a particle, a wrong one
    // punches a hole in the model.
    occlusionMaskAt(location) {
        let opaqueMask = 0;
        let coverMask = 0;
        for (let direction = 0; direction < CULL_OFFSETS.length; direction++) {
            const offset = CULL_OFFSETS[direction];
            const index = this.#indexOfCoords(
                location.x + offset[0], location.y + offset[1], location.z + offset[2],
            );
            if (index === -1)
                continue;
            const flags = this.#cellFlags[index];
            const side = direction ^ OPPOSITE;
            if (!((flags >> side) & 1))
                continue;
            coverMask |= 1 << direction;
            if ((flags >> (side + OPAQUE_SHIFT)) & 1)
                opaqueMask |= 1 << direction;
        }
        return coverMask | (opaqueMask << OPAQUE_SHIFT);
    }

    countByLevel() {
        const counts = new Uint32Array(LEVEL_COUNT);
        for (let index = 0; index < this.#levels.length; index++)
            counts[this.#levels[index]]++;
        return counts;
    }

    #indexOf(location) {
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
