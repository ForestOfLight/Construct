import { blockKeySpecs, blockModels } from "../../blockModels";
import { faceAt } from "./FaceTable";
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
//
// `covers` says the face fills that whole side of the block, so a neighbor
// pressed against it has nothing showing there. Deliberately without the
// `opaque` a baked face would carry beside it: these cubes are drawn
// see-through, so they hide another placeholder's faces but never a real
// block's.
export const PLAIN_CUBE_FACES = [
    { center: [8, 16, 8], width: 16, height: 16, facing: [0, -1, 0], roll: 180, tintindex: -1, uv: whiteUvRect, cull: 1, covers: true },
    { center: [8, 0, 8], width: 16, height: 16, facing: [0, 1, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 0, covers: true },
    { center: [8, 8, 0], width: 16, height: 16, facing: [0, 0, -1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 2, covers: true },
    { center: [8, 8, 16], width: 16, height: 16, facing: [0, 0, 1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 3, covers: true },
    { center: [16, 8, 8], width: 16, height: 16, facing: [1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 5, covers: true },
    { center: [0, 8, 8], width: 16, height: 16, facing: [-1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 4, covers: true },
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
// separately (see Structure.getBlock) - so no blockModels entry
// for a stair or a fence can carry it, and there is nothing for the pipeline
// to bake. It is always a full source block, hence depth 0.
//
// Written the way blockModels is keyed: shape 0 of water's one property
// shape, then that shape's values. liquid_depth is the one property that
// picks between water's models, so it survives the key reduction
// build_key_specs does and this is still a real key.
const WATERLOGGED_WATER_STATE = "minecraft:water[0|0]";

let waterFaces;

// Everything derived from a block that doesn't depend on where it stands,
// worked out once per distinct block state instead of once per block per
// render pass. Structure interns its palette entries (see Structure.#intern),
// so the same stair state anywhere in a build is the same object and hits the
// same entry; a WeakMap means a structure that goes away takes its entries
// with it.
//
// Resolving used to run per block per pass: two calls across the native
// boundary for the id and the states, a state key built by string
// concatenation, a hash lookup, and a fresh array from mapping the refs. The
// verifier now needs a block's shape as well as the renderer, so doing that
// twice per block was not an option.
const resolvedByBlock = new WeakMap();

// Where the opaque half of the packed cover masks starts. Both halves are
// six bits, one per entry of CULL_OFFSETS, and they ride home in one number
// rather than an object allocated per block state resolved.
const OPAQUE_SHIFT = 6;

let overlaySideMasks;

export class BlockModelLookup {
    // `block` here and below is a structure's palette entry (see
    // Structure.#intern). A bare BlockPermutation still works - both readers
    // below fall back to the API - just slower.
    static getFaces(block) {
        return BlockModelLookup.#resolve(block).faces;
    }

    // What the block offers its neighbors to hide behind, as two six-bit masks
    // packed into one number - the sides it draws a translucent MARKER on, and
    // the sides it seals OPAQUELY, the latter OPAQUE_SHIFT up. Hand it straight
    // to packCellFlags.
    //
    // The two are independent. Stone is opaque on all six sides and a marker
    // on none. The placeholder cube standing in for a block the pipeline could
    // not resolve is the reverse. Glass is neither: it covers its whole side
    // and hides nothing, which is precisely the case a "covers" mask could not
    // express.
    //
    // Judged per block state, which is the whole point: a bottom slab seals
    // the block below it completely even though the id "slab" says nothing,
    // because a top slab is the same id and seals the other way.
    //
    // Counts only the block's own shape. A waterlogged block's water fills
    // the cube too, but it is a separate layer the model knows nothing about,
    // and leaving it out only ever costs a cull.
    static getSideMasks(block) {
        return BlockModelLookup.#resolve(block).sideMasks;
    }

    // The same, for a cell whose preview is the plain translucent cube rather
    // than a model: an incorrect block of either kind, which draws the overlay
    // over whatever is really standing there.
    //
    // Derived from UNKNOWN_CUBE_FACES rather than written out, so it can't
    // drift from the shape it describes: a full-size marker on all six sides,
    // opaque on none. That is the same thing the overlay is, which is why the
    // placeholder cube's faces stand in for it here.
    //
    // Deliberately NOT the structure block's own masks, even for a TypeMatch
    // where the id matches. TypeMatch means the state differs, and a state can
    // change the shape outright - a structure calling for a top slab against a
    // world holding a bottom slab seals opposite sides of the cell. Trusting
    // the model there would cull a neighbor's face against a side nothing
    // covers. The overlay is the one thing we know is drawn.
    static getOverlaySideMasks() {
        if (overlaySideMasks === void 0)
            overlaySideMasks = BlockModelLookup.#sideMasksOf(UNKNOWN_CUBE_FACES);
        return overlaySideMasks;
    }

    static #resolve(block) {
        const cached = resolvedByBlock.get(block);
        if (cached !== void 0)
            return cached;
        const faces = BlockModelLookup.#lookupFaces(block);
        const resolved = { faces, sideMasks: BlockModelLookup.#sideMasksOf(faces) };
        resolvedByBlock.set(block, resolved);
        return resolved;
    }

    static #lookupFaces(block) {
        // A palette entry carries both of these already; reading them back
        // beats `type.id` and `getAllStates()`, which are calls across the
        // native boundary.
        const blockId = block.typeId ?? block.type.id;
        const spec = blockKeySpecs[blockId];
        // No spec at all means the block id is absent from the Bedrock<->Java
        // mapping the pipeline was built from, so there is no model to find.
        if (spec === void 0)
            return UNKNOWN_CUBE_FACES;
        const states = block.states ?? block.getAllStates();
        const refs = BlockModelLookup.#lookup(blockId, spec, states);
        if (!refs)
            return UNKNOWN_CUBE_FACES;
        return refs.map(faceAt);
    }

    // Every fact this needs is baked onto the face (see mark_side_cover in
    // tools/bake_block_models/main.py), so this is a bit-or over the faces
    // rather than a geometry test - the bake already knows the face's size
    // and, from the atlas, whether its texture has anything see-through in
    // it, which nothing in the game can see.
    //
    // A side counts as a marker when the face filling it is one the pipeline
    // could not resolve, which is what gets drawn as the translucent
    // placeholder. The bake keeps `missing` and `opaque` mutually exclusive
    // for exactly this reason - a placeholder is drawn see-through however
    // solid the white swatch behind it happens to be - so the two masks never
    // claim the same side.
    static #sideMasksOf(faces) {
        let marker = 0;
        let opaque = 0;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            if (!face.covers)
                continue;
            if (face.missing)
                marker |= 1 << face.cull;
            else if (face.opaque)
                opaque |= 1 << face.cull;
        }
        return marker | (opaque << OPAQUE_SHIFT);
    }

    // The water filling a waterlogged block, as its own set of faces to draw
    // inside the block's own. Empty if the generated data has no water model
    // at all: nothing drawn understates the block, where the missing-block
    // cube every other lookup falls back to would wrap it in a blue box and
    // hide the shape that did resolve.
    static getWaterloggedFaces() {
        if (!waterFaces) {
            const refs = blockModels[WATERLOGGED_WATER_STATE] ?? [];
            waterFaces = refs.map(faceAt);
        }
        return waterFaces;
    }

    static isWater(block) {
        return WATER_BLOCK_IDS.has(block.typeId ?? block.type.id);
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
            const key = BlockModelLookup.#stateKey(blockId, shapes[i], i, states);
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
    // reads "undefined" in a slot and can never hit.
    //
    // The key writes the shape's values without their names, since the shape
    // already names them in this order (see _format_state_key in
    // tools/bake_block_models/main.py). `shapeIndex` goes in because two of a
    // hanging sign's shapes are the same length, so the values alone would
    // not say which of them was read.
    static #stateKey(blockId, shape, shapeIndex, states) {
        let key = `${blockId}[${shapeIndex}|`;
        for (let i = 0; i < shape.length; i++) {
            const value = states[shape[i]];
            if (value === void 0)
                return void 0;
            if (i > 0)
                key += ",";
            key += BlockModelLookup.#stateValue(value);
        }
        return `${key}]`;
    }

    static #stateValue(value) {
        if (typeof value === "boolean")
            return value ? 1 : 0;
        return value;
    }
}
