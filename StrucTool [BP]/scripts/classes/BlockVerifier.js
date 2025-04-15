import { BlockVerificationLevel } from "./BlockVerificationLevel";

export class BlockVerifier {
    constructor(block, instance) {
        this.block = block;
        this.instance = instance;
        this.blockLocationInStructure = instance.toStructureCoords(block.location);
    }

    verify() {
        const structPermutation = this.instance.getBlock(this.blockLocationInStructure);
        return this.evaluatePermutations(this.block.permutation, structPermutation);
    }

    evaluatePermutations(worldPermutation, structPermutation) {
        if (this.isCorrectlyAir(worldPermutation, structPermutation))
            return BlockVerificationLevel.Air;
        if (this.isMissing(worldPermutation, structPermutation))
            return BlockVerificationLevel.Missing;
        if (this.isExactMatch(worldPermutation, structPermutation))
            return BlockVerificationLevel.Match;
        if (this.isTypeMatch(worldPermutation, structPermutation))
            return BlockVerificationLevel.TypeMatch;
        return BlockVerificationLevel.NoMatch;
    }

    isCorrectlyAir(worldPermutation, structPermutation) {
        return worldPermutation.type.id === "minecraft:air" && structPermutation.type.id === "minecraft:air";
    }

    isMissing(worldPermutation, structPermutation) {
        return worldPermutation.type.id === "minecraft:air" && structPermutation.type.id !== "minecraft:air";
    }

    isTypeMatch(worldPermuation, structurePermuation) {
        return worldPermuation.type.id === structurePermuation.type.id;
    }

    isExactMatch(worldPermuation, structurePermuation) {
        return worldPermuation.matches(structurePermuation.type.id, structurePermuation.getAllStates());
    }
}