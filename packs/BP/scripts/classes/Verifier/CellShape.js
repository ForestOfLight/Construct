import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { blockModelResolver } from "../Render/model/BlockModelResolver";
import { CellFlags } from "./CellFlags";

// Decides what a verified cell offers its neighbors to cull against, which
// depends on what will actually be standing in it.
//
// Only Missing and Match let the structure's own block speak for the cell - one
// draws that block as the preview, the other already has the identical block
// placed. Reading the shape there is what keeps this cheap: the palette entry
// is interned and its shape resolved once per distinct block state.
//
// An incorrect block of either kind answers with the overlay instead, because
// that plain cube is the only thing we know is drawn there. Everything else -
// air, skipped, unknown - offers nothing, and its neighbors keep every face.
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
                // With the preview switched off a missing block is a small
                // marker floating clear of its cell's sides, so it covers
                // nothing - the block it stands for is not drawn and must not
                // hide a neighbor's faces behind a shape that isn't there.
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
