import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { blockModelResolver } from "../Render/model/BlockModelResolver";
import { CellFlags } from "./CellFlags";

export class CellShape {
    #instance;
    #showsBlockPreview;

    constructor(instance, showsBlockPreview) {
        this.#instance = instance;
        this.#showsBlockPreview = showsBlockPreview;
    }

    flagsFor(location, verificationLevel) {
        switch (verificationLevel) {
            case BlockVerificationLevel.NoMatch:
            case BlockVerificationLevel.TypeMatch:
                return blockModelResolver.overlaySideMasks();
            case BlockVerificationLevel.Match:
                return this.#structureBlockFlags(location);
            case BlockVerificationLevel.Missing:
                return this.#showsBlockPreview ? this.#structureBlockFlags(location) : CellFlags.NONE;
            default:
                return CellFlags.NONE;
        }
    }

    #structureBlockFlags(location) {
        const structureBlock = this.#instance.getBlock(location);
        if (structureBlock === void 0)
            return CellFlags.NONE;
        return blockModelResolver.sideMasksOf(structureBlock);
    }
}
