import { whiteUvRect } from "../../../blockAtlas";

export class CubeFaceLibrary {
    static createPlainCubeFaces() {
        return [
            { center: [8, 16, 8], width: 16, height: 16, facing: [0, -1, 0], roll: 180, tintindex: -1, uv: whiteUvRect, cull: 1, covers: true },
            { center: [8, 0, 8], width: 16, height: 16, facing: [0, 1, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 0, covers: true },
            { center: [8, 8, 0], width: 16, height: 16, facing: [0, 0, -1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 2, covers: true },
            { center: [8, 8, 16], width: 16, height: 16, facing: [0, 0, 1], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 3, covers: true },
            { center: [16, 8, 8], width: 16, height: 16, facing: [1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 5, covers: true },
            { center: [0, 8, 8], width: 16, height: 16, facing: [-1, 0, 0], roll: 0, tintindex: -1, uv: whiteUvRect, cull: 4, covers: true }
        ];
    }

    static createUnknownCubeFaces(baseFaces) {
        return baseFaces.map((face) => ({ ...face, missing: true }));
    }

    static createPlainUnknownCubeFaces() {
        const plainFaces = CubeFaceLibrary.createPlainCubeFaces();
        return CubeFaceLibrary.createUnknownCubeFaces(plainFaces);
    }
}
