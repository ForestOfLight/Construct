import { blockFaceData, blockMissingFaces } from "../../../blockModels";

export class FaceTable {
    static FACE_CULL = 0;
    static FACE_FACING = 1;
    static FACE_CENTER = 4;
    static FACE_WIDTH = 7;
    static FACE_HEIGHT = 8;
    static FACE_ROLL = 9;
    static FACE_TINTINDEX = 10;
    static FACE_UV = 11;
    static FACE_ROW_WIDTH = 15;

    static NO_CULL = -1;

    // The cull column carries two extra bits above the direction: whether the face spans its whole side of the block, and whether it does so opaquely.
    static FACE_CULL_MASK = 0b111;
    static FACE_COVERS_SIDE = 0b1000;
    static FACE_OPAQUE_SIDE = 0b10000;

    static #faceCount = blockFaceData.length / FaceTable.FACE_ROW_WIDTH;
    static #missingFaces = new Set(blockMissingFaces);
    static #materialized = new Array(FaceTable.#faceCount);

    static faceAt(index) {
        const cachedFace = FaceTable.#materialized[index];
        if (cachedFace !== void 0)
            return cachedFace;

        const face = FaceTable.readFaceRow(index * FaceTable.FACE_ROW_WIDTH);
        if (FaceTable.#missingFaces.has(index))
            face.missing = true;

        FaceTable.#materialized[index] = face;
        return face;
    }

    static readFaceRow(offset) {
        const face = {
            center: [
                blockFaceData[offset + FaceTable.FACE_CENTER],
                blockFaceData[offset + FaceTable.FACE_CENTER + 1],
                blockFaceData[offset + FaceTable.FACE_CENTER + 2]
            ],
            width: blockFaceData[offset + FaceTable.FACE_WIDTH],
            height: blockFaceData[offset + FaceTable.FACE_HEIGHT],
            facing: [
                blockFaceData[offset + FaceTable.FACE_FACING],
                blockFaceData[offset + FaceTable.FACE_FACING + 1],
                blockFaceData[offset + FaceTable.FACE_FACING + 2]
            ],
            roll: blockFaceData[offset + FaceTable.FACE_ROLL],
            tintindex: blockFaceData[offset + FaceTable.FACE_TINTINDEX],
            uv: {
                x: blockFaceData[offset + FaceTable.FACE_UV],
                y: blockFaceData[offset + FaceTable.FACE_UV + 1],
                w: blockFaceData[offset + FaceTable.FACE_UV + 2],
                h: blockFaceData[offset + FaceTable.FACE_UV + 3]
            }
        };

        FaceTable.applyCullFlags(face, blockFaceData[offset + FaceTable.FACE_CULL]);
        return face;
    }

    static applyCullFlags(face, cullData) {
        if (cullData === FaceTable.NO_CULL)
            return;

        face.cull = cullData & FaceTable.FACE_CULL_MASK;
        if (cullData & FaceTable.FACE_COVERS_SIDE)
            face.covers = true;
        if (cullData & FaceTable.FACE_OPAQUE_SIDE)
            face.opaque = true;
    }
}
