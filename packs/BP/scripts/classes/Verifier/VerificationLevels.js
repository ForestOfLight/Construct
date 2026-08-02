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

export class VerificationLevels {
    #min;
    #sizeX;
    #sizeY;
    #sizeZ;
    #levels;
    #occluders;

    constructor(bounds) {
        this.#min = { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z };
        this.#sizeX = Math.max(bounds.max.x - bounds.min.x, 0);
        this.#sizeY = Math.max(bounds.max.y - bounds.min.y, 0);
        this.#sizeZ = Math.max(bounds.max.z - bounds.min.z, 0);
        this.#levels = new Uint8Array(this.#sizeX * this.#sizeY * this.#sizeZ);
        // Which cells hold something that fills its whole cube opaquely, so a
        // face pressed flat against one has nothing of it left to see. Kept
        // beside the levels rather than folded into them because it isn't a
        // level: a cell is opaque or not independently of whether the block
        // there matches, and the verifier already knows both by the time it
        // has looked the cell up once.
        this.#occluders = new Uint8Array(this.#levels.length);
    }

    matchesBounds(bounds) {
        return this.#min.x === bounds.min.x && this.#min.y === bounds.min.y && this.#min.z === bounds.min.z
            && this.#sizeX === bounds.max.x - bounds.min.x
            && this.#sizeY === bounds.max.y - bounds.min.y
            && this.#sizeZ === bounds.max.z - bounds.min.z;
    }

    clear() {
        this.#levels.fill(BlockVerificationLevel.Unknown);
        this.#occluders.fill(0);
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

    setOccluder(location, isOccluder) {
        const index = this.#indexOf(location);
        if (index === -1)
            return;
        this.#occluders[index] = isOccluder ? 1 : 0;
    }

    // A bit per entry of CULL_OFFSETS, set where that neighbor of `location`
    // hides whatever is drawn against it. Built once per block rather than
    // asked one face at a time: a block has six neighbors however many faces
    // it has, and every face of a full cube would otherwise re-derive the
    // same six answers.
    //
    // A neighbor outside the bounds reads as 0 - nothing there is known to be
    // solid, so nothing is culled against it. That leaves the outer shell of
    // a structure drawn in full even where it is buried in terrain, which is
    // the conservative direction: a missed cull costs a particle, a wrong one
    // punches a hole in the model.
    occlusionMaskAt(location) {
        let mask = 0;
        for (let direction = 0; direction < CULL_OFFSETS.length; direction++) {
            const offset = CULL_OFFSETS[direction];
            const index = this.#indexOfCoords(
                location.x + offset[0], location.y + offset[1], location.z + offset[2],
            );
            if (index !== -1 && this.#occluders[index] === 1)
                mask |= 1 << direction;
        }
        return mask;
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
