import { blockFaceTypes, blockModels } from "../../blockModels";
import { whiteUvRect } from "../../blockAtlas";

// Mirrors filters/fetch_block_models/main.py's WHITE_CUBE_FACES: used when a
// permutation has no entry in blockModels at all (e.g. a block id absent
// from the Bedrock<->Java mapping data the pipeline was built from).
export const WHITE_CUBE_FACES = [
    { isMissing: true, center: [8, 16, 8], width: 16, height: 16, normal: [0, 1, 0], roll: 180, tintindex: -1, uv: whiteUvRect },
    { isMissing: true, center: [8, 0, 8], width: 16, height: 16, normal: [0, -1, 0], roll: 0, tintindex: -1, uv: whiteUvRect },
    { isMissing: true, center: [8, 8, 0], width: 16, height: 16, normal: [0, 0, -1], roll: 0, tintindex: -1, uv: whiteUvRect },
    { isMissing: true, center: [8, 8, 16], width: 16, height: 16, normal: [0, 0, 1], roll: 0, tintindex: -1, uv: whiteUvRect },
    { isMissing: true, center: [16, 8, 8], width: 16, height: 16, normal: [1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect },
    { isMissing: true, center: [0, 8, 8], width: 16, height: 16, normal: [-1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect },
];

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
            blockIdIndex.set(blockId, { entries: [], valuesSeen: new Map() });
        const block = blockIdIndex.get(blockId);
        block.entries.push({ key, properties });
        for (const [propKey, propValue] of properties) {
            if (!block.valuesSeen.has(propKey))
                block.valuesSeen.set(propKey, new Set());
            block.valuesSeen.get(propKey).add(propValue);
        }
    }
    // A property the generated data only ever gives one value for can't pick
    // between entries, so it can't be worth matching on. That happens
    // wherever Bedrock carries a state Java has no equivalent for: Java's
    // plain pumpkin has no facing at all, so blocksB2J maps exactly one of
    // Bedrock's four cardinal_direction values and the model is the same for
    // all of them anyway. Requiring such a property to match by value would
    // reject the only entry there is (see #findPartialMatch).
    for (const block of blockIdIndex.values()) {
        block.discriminating = new Set();
        for (const [propKey, values] of block.valuesSeen) {
            if (values.size > 1)
                block.discriminating.add(propKey);
        }
    }
}

export class BlockModelLookup {
    static getFaces(permutation) {
        const exactKey = BlockModelLookup.#permutationKey(permutation);
        const refs = blockModels[exactKey] ?? BlockModelLookup.#findPartialMatch(permutation);
        if (!refs)
            return WHITE_CUBE_FACES;
        return refs.map((index) => blockFaceTypes[index]);
    }

    // Falls back to the most-specific blockModels entry whose properties are a subset of the
    // live permutation's states, for blocks where the generated data omits properties Bedrock
    // still reports (e.g. minecraft:stone's vestigial stone_type). Properties the data can't
    // discriminate on are ignored rather than required to match, so a state Bedrock has and
    // Java doesn't can't reject the only entry there is (see buildIndex). Ties broken
    // alphabetically by key for determinism.
    static #findPartialMatch(permutation) {
        if (!blockIdIndex)
            buildIndex();
        const block = blockIdIndex.get(permutation.type.id);
        if (!block)
            return undefined;
        const states = permutation.getAllStates();
        const stateStrings = new Map();
        for (const key of Object.keys(states))
            stateStrings.set(key, String(BlockModelLookup.#stateValue(states[key])));

        let best;
        for (const candidate of block.entries) {
            let allMatch = true;
            for (const [propKey, propValue] of candidate.properties) {
                if (block.discriminating.has(propKey) && stateStrings.get(propKey) !== propValue) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch && (!best || candidate.properties.size > best.properties.size ||
                (candidate.properties.size === best.properties.size && candidate.key < best.key)))
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
