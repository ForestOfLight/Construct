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

// What one cell of the grid records: the six sides its block covers
// completely, plus whether that block is opaque as well as solid.
const COVER_MASK = 0b111111;
const OPAQUE_BIT = 1 << 6;

// Where occlusionMaskAt puts the second of the two masks it returns. Both are
// six bits, so they ride home in one number rather than an object allocated
// per block drawn.
const COVER_CULL_SHIFT = 6;

export function packCellFlags(coverMask, isOpaque) {
    return (coverMask & COVER_MASK) | (isOpaque ? OPAQUE_BIT : 0);
}

// The two halves of what occlusionMaskAt returns: sides hidden by an opaque
// neighbor, which hides anything, and sides hidden by a merely solid one,
// which only hides a see-through placeholder face.
export function opaqueCullMask(masks) {
    return masks & COVER_MASK;
}

export function coverCullMask(masks) {
    return (masks >> COVER_CULL_SHIFT) & COVER_MASK;
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
        // covers completely, plus whether that cover is opaque (see
        // packCellFlags). Kept beside the levels rather than folded into them
        // because it isn't a level - a cell's shape is what it is regardless
        // of whether the block there matches - and the verifier already knows
        // both by the time it has looked the cell up once.
        this.#cellFlags = new Uint8Array(this.#levels.length);
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
    // complete face back this way, and into the opaque mask when that
    // neighbor is opaque as well. The opaque mask is therefore always a
    // subset of the cover mask, which is what makes the two rules compose:
    // an opaque neighbor hides any face, a merely solid one hides only a
    // see-through placeholder face that has nothing to show anyway.
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
            if (!((flags >> (direction ^ OPPOSITE)) & 1))
                continue;
            coverMask |= 1 << direction;
            if (flags & OPAQUE_BIT)
                opaqueMask |= 1 << direction;
        }
        return opaqueMask | (coverMask << COVER_CULL_SHIFT);
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
