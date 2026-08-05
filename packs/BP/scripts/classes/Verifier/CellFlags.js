export class CellFlags {
    static #sideMask = 0b111111;
    static #opaqueShift = 6;
    static NONE = 0;

    static pack(markerMask, opaqueMask) {
        return (markerMask & CellFlags.#sideMask) | ((opaqueMask & CellFlags.#sideMask) << CellFlags.#opaqueShift);
    }

    static markerMask(packed) {
        return packed & CellFlags.#sideMask;
    }

    static opaqueMask(packed) {
        return (packed >> CellFlags.#opaqueShift) & CellFlags.#sideMask;
    }

    static hasMarker(packed, side) {
        return ((packed >> side) & 1) === 1;
    }

    static hasOpaque(packed, side) {
        return ((packed >> (side + CellFlags.#opaqueShift)) & 1) === 1;
    }
}
