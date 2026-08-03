import { Vector } from "../../lib/Vector.js";

// The six sides of a block, in the order the baked face table indexes them (see _CULL_DIRECTIONS in tools/bake_block_models/main.py).
// A baked face's cull value is a subscript into this, so reordering it alone would cull against the wrong side of the block.
export class Side {
    static Down = 0;
    static Up = 1;
    static North = 2;
    static South = 3;
    static West = 4;
    static East = 5;

    static COUNT = 6;

    static OFFSETS = Object.freeze([
        Vector.down,
        Vector.up,
        Vector.north,
        Vector.south,
        Vector.west,
        Vector.east
    ]);

    // The order above is laid out in opposite pairs, so flipping the low bit
    // turns a side into the one facing back at it.
    static opposite(side) {
        return side ^ 1;
    }
}
