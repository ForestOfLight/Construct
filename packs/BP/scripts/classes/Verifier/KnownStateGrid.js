import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel.js";
import { VerificationGrid } from "./VerificationGrid.js";

export class KnownStateGrid {
    #grid;
    #anchor;
    #version = 0;

    get version() {
        return this.#version;
    }

    syncAnchor(anchor, bounds) {
        if (this.#grid?.matchesBounds(bounds) && this.#isSameAnchor(anchor))
            return;
        this.#anchor = {
            dimensionId: anchor.dimensionId,
            worldLocation: { x: anchor.worldLocation.x, y: anchor.worldLocation.y, z: anchor.worldLocation.z },
            structureId: anchor.structureId
        };
        this.#grid = new VerificationGrid(bounds);
        this.#version++;
    }

    setLevel(location, verificationLevel) {
        if (!this.#grid || !KnownStateGrid.#isObservation(verificationLevel))
            return;
        if (this.#grid.indexOf(location) === -1 || this.#grid.get(location) === verificationLevel)
            return;
        this.#grid.setLevel(location, verificationLevel);
        this.#version++;
    }

    get(location) {
        if (!this.#grid)
            return BlockVerificationLevel.Unknown;
        return this.#grid.get(location);
    }

    static #isObservation(verificationLevel) {
        return verificationLevel !== BlockVerificationLevel.Skipped
            && verificationLevel !== BlockVerificationLevel.Unknown;
    }

    #isSameAnchor(anchor) {
        const current = this.#anchor;
        return current.dimensionId === anchor.dimensionId
            && current.structureId === anchor.structureId
            && current.worldLocation.x === anchor.worldLocation.x
            && current.worldLocation.y === anchor.worldLocation.y
            && current.worldLocation.z === anchor.worldLocation.z;
    }
}
