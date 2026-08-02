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
const SIDE_MASK = 0b111111;
const OPAQUE_SHIFT = 6;

// What one cell of the grid records: the six sides sealed by something
// opaque, and the six where the preview draws a translucent MARKER - an
// incorrect block's overlay, or the placeholder cube standing in for a block
// the pipeline could not resolve. Judged per block state rather than per
// block id, so a slab, a stair or a closed door offers the sides it really
// does seal (see BlockModelLookup.getSideMasks).
//
// The two are independent, not nested. A stone block is opaque on all six
// sides and a marker on none; an overlay is the reverse. Deliberately NOT
// "the sides this shape covers", which is what this used to be: a pane of
// glass covers its whole side and hides nothing at all, and reading cover as
// grounds for a cull is what made an incorrect block embedded in real glass
// lose the very overlay marking it wrong.
export function packCellFlags(sideMasks) {
    return sideMasks & ((SIDE_MASK << OPAQUE_SHIFT) | SIDE_MASK);
}

// The two halves of what occlusionMaskAt returns, packed the same way round
// as everywhere else: sides facing a neighbor that draws a marker of its own,
// and sides facing an opaque one.
export function markerCullMask(masks) {
    return masks & SIDE_MASK;
}

export function opaqueCullMask(masks) {
    return (masks >> OPAQUE_SHIFT) & SIDE_MASK;
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
        // seals opaquely, and the sides where it draws a translucent marker
        // (see packCellFlags). Kept beside the levels rather than folded into
        // them because it isn't a level - a cell's shape is what it is
        // regardless of whether the block there matches - and the verifier
        // already knows both by the time it has looked the cell up once.
        // Uint16 rather than Uint8 because a cell carries two six-bit masks.
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

    setCellFlags(location, flags) {
        const index = this.indexOf(location);
        if (index === -1)
            return;
        this.#cellFlags[index] = flags;
    }

    // Both cull masks for the block at `location`, packed into one number -
    // read them back with opaqueCullMask and markerCullMask.
    //
    // An opaque side hides anything laid against it. A marker side hides only
    // another marker face, because two translucent markers meeting is the one
    // case where the wall between them is noise rather than information -
    // neither has a texture to show, and both say the same thing about the
    // cell. Anything else showing through stays drawn, which is what keeps an
    // incorrect block visible through the real glass it is embedded in.
    //
    // The two are read independently: a neighbor can be one, the other, both
    // in different directions, or neither.
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
        let markerMask = 0;
        for (let direction = 0; direction < CULL_OFFSETS.length; direction++) {
            const offset = CULL_OFFSETS[direction];
            const index = this.#indexOfCoords(
                location.x + offset[0], location.y + offset[1], location.z + offset[2],
            );
            if (index === -1)
                continue;
            const flags = this.#cellFlags[index];
            const side = direction ^ OPPOSITE;
            if ((flags >> side) & 1)
                markerMask |= 1 << direction;
            if ((flags >> (side + OPAQUE_SHIFT)) & 1)
                opaqueMask |= 1 << direction;
        }
        return markerMask | (opaqueMask << OPAQUE_SHIFT);
    }

    countByLevel() {
        const counts = new Uint32Array(LEVEL_COUNT);
        for (let index = 0; index < this.#levels.length; index++)
            counts[this.#levels[index]]++;
        return counts;
    }

    // Public because the debug box store keys its persistent handles by the
    // same index. The render cursor's own traversal order is a different one,
    // so it cannot be reused for that.
    //
    // Returns -1 outside the grid.
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
