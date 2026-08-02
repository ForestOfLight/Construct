import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel.js";

const AIR = "minecraft:air";

// Grades one block in the world against the block the structure wants there.
export class BlockComparator {
    static compare(worldBlock, structureBlock) {
        if (!structureBlock)
            return BlockVerificationLevel.Air;
        if (structureBlock.typeId === AIR)
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
