const SIDE_MASK = 0b111111;
const OPAQUE_SHIFT = 6;

// What one cell offers its neighbors to hide their faces behind, as two
// six-bit masks packed into one number: the sides it seals opaquely, and the
// sides where it draws a translucent marker.
//
// The two are independent, not nested. Stone is opaque on all six sides and a
// marker on none; an incorrect block's overlay is the reverse.
//
// Deliberately NOT "the sides this shape covers": a pane of glass covers its
// whole side and hides nothing at all, and reading cover as grounds for a cull
// is what made an incorrect block embedded in real glass lose the very overlay
// marking it wrong.
export class CellFlags {
    static NONE = 0;

    static pack(markerMask, opaqueMask) {
        return (markerMask & SIDE_MASK) | ((opaqueMask & SIDE_MASK) << OPAQUE_SHIFT);
    }

    static markerMask(packed) {
        return packed & SIDE_MASK;
    }

    static opaqueMask(packed) {
        return (packed >> OPAQUE_SHIFT) & SIDE_MASK;
    }

    static hasMarker(packed, side) {
        return ((packed >> side) & 1) === 1;
    }

    static hasOpaque(packed, side) {
        return ((packed >> (side + OPAQUE_SHIFT)) & 1) === 1;
    }
}
