import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";

export class BlockVerifier {
    constructor(block, instance) {
        this.block = block;
        this.instance = instance;
        this.blockLocationInStructure = instance.toStructureCoords({ x: block.x, y: block.y, z: block.z });
    }

    verify() {
        const structBlock = this.instance.getBlock(this.blockLocationInStructure);
        return this.evaluate(this.block, structBlock);
    }

    evaluate(worldBlock, structBlock) {
        if (!structBlock)
            return BlockVerificationLevel.Air;
        if (structBlock.typeId === "minecraft:air")
            return worldBlock.isAir ? BlockVerificationLevel.Air : BlockVerificationLevel.NoMatch;
        if (worldBlock.isAir)
            return BlockVerificationLevel.Missing;
        if (worldBlock.typeId !== structBlock.typeId)
            return BlockVerificationLevel.NoMatch;
        if (worldBlock.isWaterlogged !== structBlock.isWaterlogged)
            return BlockVerificationLevel.TypeMatch;
        if (!structBlock.hasStates)
            return BlockVerificationLevel.Match;
        if (worldBlock.permutation.matches(structBlock.typeId, structBlock.states))
            return BlockVerificationLevel.Match;
        return BlockVerificationLevel.TypeMatch;
    }
}
