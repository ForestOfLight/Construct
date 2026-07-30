import { blockFaceTypes, blockModels } from "../../blockModels";

export class BlockModelLookup {
    static getFaces(permutation) {
        const refs = blockModels[BlockModelLookup.#permutationKey(permutation)] ?? [];
        return refs.map((index) => blockFaceTypes[index]);
    }

    static #permutationKey(permutation) {
        const states = permutation.getAllStates();
        const stateStr = Object.keys(states)
            .sort()
            .map((key) => `${key}=${BlockModelLookup.#stateValue(states[key])}`)
            .join(",");
        return `${permutation.type.id}[${stateStr}]`;
    }

    static #stateValue(value) {
        if (typeof value === "boolean")
            return value ? 1 : 0;
        return value;
    }
}
