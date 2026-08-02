import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockComparator } from "./BlockComparator";
import { CellShape } from "./CellShape";

// Verifies a single cell of a structure: how the world block there compares to
// the one the structure wants, and the shape that answer gives its neighbors.
//
// Throws whatever the dimension throws for an unreadable chunk. Callers decide
// what an unreadable cell means to them.
export class CellVerifier {
    #instance;
    #shape;

    constructor(instance, showsBlockPreview) {
        this.#instance = instance;
        this.#shape = new CellShape(instance, showsBlockPreview);
    }

    verify(location) {
        const verificationLevel = this.#levelAt(location);
        return {
            verificationLevel,
            flags: this.#shape.flagsFor(location, verificationLevel)
        };
    }

    #levelAt(location) {
        const globalLocation = this.#instance.toGlobalCoords(location);
        const worldBlock = this.#instance.getDimension()?.getBlock(globalLocation);
        if (!worldBlock)
            return BlockVerificationLevel.Skipped;
        return BlockComparator.compare(worldBlock, this.#instance.getBlock(location));
    }
}
