import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { CellShape } from "./CellShape";

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
        return this.#compare(worldBlock, this.#instance.getBlock(location));
    }

    #compare(worldBlock, structureBlock) {
        if (!structureBlock)
            return BlockVerificationLevel.Air;
        if (structureBlock.typeId === "minecraft:air")
            return worldBlock.isAir ? BlockVerificationLevel.Air : BlockVerificationLevel.NoMatch;
        if (worldBlock.isAir)
            return BlockVerificationLevel.Missing;
        if (worldBlock.typeId !== structureBlock.typeId)
            return BlockVerificationLevel.NoMatch;
        if (worldBlock.isWaterlogged !== structureBlock.isWaterlogged)
            return BlockVerificationLevel.TypeMatch;
        if (!structureBlock.hasStates)
            return BlockVerificationLevel.Match;
        if (worldBlock.permutation.matches(structureBlock.typeId, structureBlock.states))
            return BlockVerificationLevel.Match;
        return BlockVerificationLevel.TypeMatch;
    }
}
