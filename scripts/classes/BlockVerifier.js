import { BlockVerificationLevel } from "./BlockVerificationLevel";

export class BlockVerifier {
    constructor(block, structure) {
        this.block = block;
        this.blockLocationInStructure = structure.toStructureCoords(block.location);
        this.structure = structure;
    }

    verify() {
        const worldPermutation = this.block.permutation;
        const structPermutation = this.structure.getBlock(this.blockLocationInStructure);
        return this.evaluatePermutations(worldPermutation, structPermutation);
    }

    evaluatePermutations(worldPermutation, structPermutation) {
        if (this.isMissing(worldPermutation, structPermutation))
            return this.missing();
        if (this.isExactMatch(worldPermutation, structPermutation))
            return this.matchingPermutations();
        if (this.isTypeMatch(worldPermutation, structPermutation))
            return this.matchingTypes();
        return this.matchingNone();
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

    missing() {
        return BlockVerificationLevel.Missing;
    }

    matchingPermutations() {
        console.warn(`Block ${this.block.typeId} matches structure block ${structPermutation.typeId}`);
        return BlockVerificationLevel.TypeAndStateMatch;
    }

    matchingTypes() {
        console.warn(`Block ${this.block.typeId} matches structure block ${structPermutation.typeId}`);
        return BlockVerificationLevel.TypeMatch;
    }

    matchingNone() {
        console.warn(`Block ${this.block.typeId} does not match structure block ${structPermutation.typeId}`);
        return BlockVerificationLevel.NoMatch;
    }
}