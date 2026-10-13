import { BlockPermutation, BlockTypes, ItemStack } from "@minecraft/server";
import { applyConversionPatterns } from "../../utils";
import { bannedToValidBlockPatterns, resetToBlockStates, blockIdToItemStackPatterns } from "../../options/easyPlaceConversions";

export class StructureBlockConverter {
    static sanitizeToPermutation(structureBlock) {
        const permutation = StructureBlockConverter.fromBannedBlockToValidPermutation(structureBlock);
        return StructureBlockConverter.toDefaultState(permutation);
    }

    static sanitizeToPlaceableItemStacks(structureBlock) {
        const permutation = StructureBlockConverter.sanitizeToPermutation(structureBlock);
        return StructureBlockConverter.toPlaceableItemStacks(permutation);
    }

    static fromBannedBlockToValidPermutation(structureBlock) {
        const validBlockId = applyConversionPatterns(structureBlock.typeId, bannedToValidBlockPatterns, BlockTypes)?.[0];
        if (validBlockId)
            return BlockPermutation.resolve(validBlockId, structureBlock.states);
        if (structureBlock.typeId === "minecraft:bubble_column" && structureBlock.isWaterlogged)
            return BlockPermutation.resolve('minecraft:water');
        return structureBlock.permutation;
    }

    static toDefaultState(permutation) {
        const newStates = {};
        for (const [stateKey, stateValue] of Object.entries(permutation.getAllStates())) {
            if (resetToBlockStates[stateKey] !== void 0 && stateValue !== resetToBlockStates[stateKey])
                newStates[stateKey] = resetToBlockStates[stateKey];
            else
                newStates[stateKey] = stateValue;
        }
        return BlockPermutation.resolve(permutation.type.id, newStates);
    }

    static toPlaceableItemStacks(permutation) {
        const newItemIds = applyConversionPatterns(permutation.type.id, blockIdToItemStackPatterns);
        if (newItemIds)
            return newItemIds.map((itemId) => new ItemStack(itemId));
        const itemStack = permutation.getItemStack();
        return itemStack ? [itemStack] : [];
    }
}