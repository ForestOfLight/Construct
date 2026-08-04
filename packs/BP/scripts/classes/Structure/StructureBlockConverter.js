import { BlockPermutation } from "@minecraft/server";
import { bannedToValidBlockMap, resetToBlockStates, blockIdToItemStackMap } from "../../options/easyPlaceConversions";

export class StructureBlockConverter {
    static sanitizeToPermutation(structureBlock) {
        const permutation = StructureBlockConverter.fromBannedBlockToValidPermutation(structureBlock);
        return StructureBlockConverter.toDefaultState(permutation);
    }

    static sanitizeToPlaceableItemStack(structureBlock) {
        const permutation = StructureBlockConverter.sanitizeToPermutation(structureBlock);
        return StructureBlockConverter.toPlaceableItemStack(permutation);
    }

    static fromBannedBlockToValidPermutation(structureBlock) {
        const blockId = structureBlock.typeId.replace('minecraft:', '');
        if (Object.keys(bannedToValidBlockMap).includes(blockId))
            return BlockPermutation.resolve(bannedToValidBlockMap[blockId], structureBlock.states);
        if (blockId === "bubble_column" && structureBlock.isWaterlogged)
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

    static toPlaceableItemStack(permutation) {
        const blockId = permutation.type.id.replace('minecraft:', '');
        const newItemId = blockIdToItemStackMap[blockId];
        return newItemId ? new ItemStack(newItemId) : permutation.getItemStack();
    }
}