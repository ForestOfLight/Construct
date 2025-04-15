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
            return this.air();
        if (this.isMissing(worldPermutation, structPermutation))
            return this.missing();
        if (this.isExactMatch(worldPermutation, structPermutation))
            return this.matchingPermutations();
        if (this.isTypeMatch(worldPermutation, structPermutation))
            return this.matchingTypes();
        return this.matchingNone();
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

    air() {
        return BlockVerificationLevel.isAir;
    }

    missing() {
        return BlockVerificationLevel.Missing;
    }

    matchingPermutations() {
        return BlockVerificationLevel.TypeAndStateMatch;
    }

    matchingTypes() {
        return BlockVerificationLevel.TypeMatch;
    }

    matchingNone() {
        return BlockVerificationLevel.NoMatch;
    }
}