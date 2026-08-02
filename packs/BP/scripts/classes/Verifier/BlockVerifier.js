import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";

const AIR = "minecraft:air";

export class BlockVerifier {
    constructor(block, instance) {
        this.block = block;
        this.instance = instance;
        this.blockLocationInStructure = instance.toStructureCoords({ x: block.x, y: block.y, z: block.z });
    }

    verify() {
        const structPermutation = this.instance.getBlockPermutation(this.blockLocationInStructure);
        return this.evaluate(this.block, structPermutation);
    }

    evaluate(worldBlock, structPermutation) {
        if (!structPermutation)
            return BlockVerificationLevel.Air;
        if (structPermutation.typeId === AIR)
            return worldBlock.isAir ? BlockVerificationLevel.Air : BlockVerificationLevel.NoMatch;
        if (worldBlock.isAir)
            return BlockVerificationLevel.Missing;
        if (worldBlock.typeId !== structPermutation.typeId)
            return BlockVerificationLevel.NoMatch;
        if (worldBlock.isWaterlogged !== structPermutation.isWaterlogged)
            return BlockVerificationLevel.TypeMatch;
        if (!structPermutation.hasStates)
            return BlockVerificationLevel.Match;
        return worldBlock.permutation.matches(structPermutation.typeId, structPermutation.states)
            ? BlockVerificationLevel.Match
            : BlockVerificationLevel.TypeMatch;
    }
}
