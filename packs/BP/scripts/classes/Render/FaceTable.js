import { blockFaceData, blockMissingFaces } from "../../blockModels";

// Where each field sits in a face's row of blockFaceData. The same order
// flatten_face_types writes in - see FACE_ROW_FIELDS in
// tools/bake_block_models/main.py, which is the other half of this
// definition and has to change with it.
const FACE_CULL = 0;
const FACE_FACING = 1;
const FACE_CENTER = 4;
const FACE_WIDTH = 7;
const FACE_HEIGHT = 8;
const FACE_ROLL = 9;
const FACE_TINTINDEX = 10;
const FACE_UV = 11;
const FACE_ROW_WIDTH = 15;

// What the baked table writes where a face has no cull direction, because a
// row is bare numbers and has no way to leave a slot out. Faces expose it
// the way they always have, as the field being absent.
const NO_CULL = -1;

const faceCount = blockFaceData.length / FACE_ROW_WIDTH;

// One slot per face, left as a hole until something asks for that face.
//
// The table describes every state of every block in the game - ~34,000
// faces - and a build draws a few hundred of them. Written out as
// descriptors they cost an object, a nested uv object and two arrays each,
// all of it allocated while the module parsed and held for the session
// whether or not anything ever drew them. Built on demand, only the faces a
// build actually uses exist, and the rest stay four numbers apiece in one
// flat array.
const materialized = new Array(faceCount);

const missingFaces = new Set(blockMissingFaces);

// The face at `index` in the baked table, as the descriptor the renderer
// reads: `center`, `facing`, `width`, `height`, `roll`, `tintindex`, `uv`,
// and `cull` only when a neighbor can hide it.
//
// Shared, and treated as frozen by everything that reads one - the same
// descriptor is handed to every block that draws that face, so writing
// through it would corrupt the table for the rest of the session.
export function faceAt(index) {
    const cached = materialized[index];
    if (cached !== void 0)
        return cached;
    const at = index * FACE_ROW_WIDTH;
    const face = {
        center: [
            blockFaceData[at + FACE_CENTER],
            blockFaceData[at + FACE_CENTER + 1],
            blockFaceData[at + FACE_CENTER + 2],
        ],
        width: blockFaceData[at + FACE_WIDTH],
        height: blockFaceData[at + FACE_HEIGHT],
        facing: [
            blockFaceData[at + FACE_FACING],
            blockFaceData[at + FACE_FACING + 1],
            blockFaceData[at + FACE_FACING + 2],
        ],
        roll: blockFaceData[at + FACE_ROLL],
        tintindex: blockFaceData[at + FACE_TINTINDEX],
        uv: {
            x: blockFaceData[at + FACE_UV],
            y: blockFaceData[at + FACE_UV + 1],
            w: blockFaceData[at + FACE_UV + 2],
            h: blockFaceData[at + FACE_UV + 3],
        },
    };
    const cull = blockFaceData[at + FACE_CULL];
    if (cull !== NO_CULL)
        face.cull = cull;
    if (missingFaces.has(index))
        face.missing = true;
    materialized[index] = face;
    return face;
}
