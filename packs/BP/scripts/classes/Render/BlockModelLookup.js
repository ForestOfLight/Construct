import { blockFaceTypes, blockModels } from "../../blockModels";

let blockIdIndex;

function buildIndex() {
    blockIdIndex = new Map();
    for (const key of Object.keys(blockModels)) {
        const bracketStart = key.indexOf("[");
        const blockId = key.slice(0, bracketStart);
        const propsStr = key.slice(bracketStart + 1, -1);
        const properties = new Map();
        if (propsStr) {
            for (const pair of propsStr.split(",")) {
                const [propKey, propValue] = pair.split("=");
                properties.set(propKey, propValue);
            }
        }
        if (!blockIdIndex.has(blockId))
            blockIdIndex.set(blockId, []);
        blockIdIndex.get(blockId).push({ key, properties });
    }
}

export class BlockModelLookup {
    static getFaces(permutation) {
        const exactKey = BlockModelLookup.#permutationKey(permutation);
        const refs = blockModels[exactKey] ?? BlockModelLookup.#findPartialMatch(permutation);
        return (refs ?? []).map((index) => blockFaceTypes[index]);
    }

    static #findPartialMatch(permutation) {
        if (!blockIdIndex)
            buildIndex();
        const candidates = blockIdIndex.get(permutation.type.id);
        if (!candidates)
            return undefined;
        const states = permutation.getAllStates();
        const stateStrings = new Map();
        for (const key of Object.keys(states))
            stateStrings.set(key, String(BlockModelLookup.#stateValue(states[key])));

        let best;
        for (const candidate of candidates) {
            let allMatch = true;
            for (const [propKey, propValue] of candidate.properties) {
                if (stateStrings.get(propKey) !== propValue) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch && (!best || candidate.properties.size > best.properties.size))
                best = candidate;
        }
        return best ? blockModels[best.key] : undefined;
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
