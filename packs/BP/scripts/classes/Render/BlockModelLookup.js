import { blockFaceTypes, blockKeySpecs, blockModels, blockOpaqueCubes } from "../../blockModels";
import { whiteUvRect } from "../../blockAtlas";

// A plain full cube, used to outline a block that is already visible in the
// world. Nothing is wrong with these faces - they're a deliberate shape, so
// they carry no `missing` flag and are drawn in the verification level's own
// color.
// `facing` is the direction the billboard is pointed, which for the top and
// bottom faces is the reverse of the way the face actually looks - see
// _facing in filters/fetch_block_models/main.py, which is what generates the
// same field for every real block's faces.
//
// `cull` is the neighbor that hides each face, indexed the same way the baked
// table indexes it (see CULL_OFFSETS in ../Verifier/VerificationLevels.js).
// It follows the face's real outward normal, not `facing` - the top face is
// pointed downward here and still culled by the block above.
export const PLAIN_CUBE_FACES = [
    { center: [8, 16, 8], width: 16, height: 16, facing: [0, -1, 0], roll: 180, tintindex: -1, uv: whiteUvRect, cull: 1 },
    { center: [8, 0, 8], width: 16, height: 16, facing: [0, 1, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 0 },
    { center: [8, 8, 0], width: 16, height: 16, facing: [0, 0, -1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 2 },
    { center: [8, 8, 16], width: 16, height: 16, facing: [0, 0, 1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 3 },
    { center: [16, 8, 8], width: 16, height: 16, facing: [1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 5 },
    { center: [0, 8, 8], width: 16, height: 16, facing: [-1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 4 },
];

// Mirrors filters/fetch_block_models/main.py's WHITE_CUBE_FACES: used when a
// permutation has no entry in blockModels at all (e.g. a block id absent
// from the Bedrock<->Java mapping data the pipeline was built from). The
// pipeline's own fallback marks its faces the same way, so both routes to
// "we have no model for this" render identically.
export const UNKNOWN_CUBE_FACES = PLAIN_CUBE_FACES.map((face) => ({ ...face, missing: true }));

// Bedrock's water isn't one block id but two: a source block and the
// `flowing_water` it spreads as. Both are the same translucent liquid, and
// both are drawn from the same still-water texture here.
const WATER_BLOCK_IDS = new Set(["minecraft:water", "minecraft:flowing_water"]);

// The state a waterlogged block's water is drawn as. Bedrock doesn't keep
// waterlogging in the block's permutation the way Java keeps a `waterlogged`
// property - the water is a second liquid layer the structure reports
// separately (see Structure.getBlockPermutation) - so no blockModels entry
// for a stair or a fence can carry it, and there is nothing for the pipeline
// to bake. It is always a full source block, hence depth 0.
//
// Written the way blockModels is keyed - liquid_depth is the one property
// that picks between water's models, so it survives the key reduction
// build_key_specs does and this is still a real key.
const WATERLOGGED_WATER_STATE = "minecraft:water[liquid_depth=0]";

let waterFaces;
let opaqueCubeIds;

export class BlockModelLookup {
    // Whether a block of this type fills its whole cube with nothing
    // see-through, and so hides any face pressed flat against it. The baked
    // list only holds ids every one of whose states qualifies (see
    // build_opaque_cube_ids in tools/bake_block_models/main.py), which is
    // what lets this be a type-id lookup rather than a model lookup - it is
    // asked once per neighbor of every block drawn.
    static isOpaqueCube(blockTypeId) {
        if (!opaqueCubeIds)
            opaqueCubeIds = new Set(blockOpaqueCubes);
        return opaqueCubeIds.has(blockTypeId);
    }

    static getFaces(permutation) {
        const blockId = permutation.type.id;
        const spec = blockKeySpecs[blockId];
        // No spec at all means the block id is absent from the Bedrock<->Java
        // mapping the pipeline was built from, so there is no model to find.
        if (spec === void 0)
            return UNKNOWN_CUBE_FACES;
        const refs = BlockModelLookup.#lookup(blockId, spec, permutation.getAllStates());
        if (!refs)
            return UNKNOWN_CUBE_FACES;
        return refs.map((index) => blockFaceTypes[index]);
    }

    // The water filling a waterlogged block, as its own set of faces to draw
    // inside the block's own. Empty if the generated data has no water model
    // at all: nothing drawn understates the block, where the missing-block
    // cube every other lookup falls back to would wrap it in a blue box and
    // hide the shape that did resolve.
    static getWaterloggedFaces() {
        if (!waterFaces) {
            const refs = blockModels[WATERLOGGED_WATER_STATE] ?? [];
            waterFaces = refs.map((index) => blockFaceTypes[index]);
        }
        return waterFaces;
    }

    static isWater(permutation) {
        return WATER_BLOCK_IDS.has(permutation.type.id);
    }

    // blockModels is keyed on only the properties that actually choose between
    // a block's models, and the block's spec names those properties in the
    // order the key writes them (see build_key_specs in
    // tools/bake_block_models/main.py). So the states Bedrock reports that the
    // generated data has no opinion on - minecraft:stone's vestigial
    // stone_type, a leaf block's update_bit - are never read, and the lookup
    // is one hash hit rather than a scan for the most specific entry whose
    // properties happen to be a subset of the live ones.
    //
    // A spec holds a LIST of shapes, tried most specific first, because a
    // block can read different states depending on what it is doing: a
    // hanging sign attached to a block underneath is oriented by
    // ground_sign_direction, and one hanging off the side of one by
    // facing_direction. Every other block has exactly one shape, so this
    // loop runs once and stops.
    static #lookup(blockId, spec, states) {
        const shapes = spec.props;
        for (let i = 0; i < shapes.length; i++) {
            const key = BlockModelLookup.#stateKey(blockId, shapes[i], states);
            if (key === void 0)
                continue;
            const refs = blockModels[key];
            if (refs !== void 0)
                return refs;
        }
        return void 0;
    }

    // Undefined when the permutation doesn't carry every property the shape
    // names - that shape describes a block in some other configuration, so
    // the caller moves on to the next one rather than building a key that
    // reads "ground_sign_direction=undefined" and can never hit.
    static #stateKey(blockId, shape, states) {
        let key = `${blockId}[`;
        for (let i = 0; i < shape.length; i++) {
            const name = shape[i];
            const value = states[name];
            if (value === void 0)
                return void 0;
            if (i > 0)
                key += ",";
            key += `${name}=${BlockModelLookup.#stateValue(value)}`;
        }
        return `${key}]`;
    }

    static #stateValue(value) {
        if (typeof value === "boolean")
            return value ? 1 : 0;
        return value;
    }
}
