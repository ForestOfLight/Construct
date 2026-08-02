import { FaceTable } from "./FaceTable";
import { CubeFaceLibrary } from "./CubeFaceLibrary";
import { BlockModelKeyResolver } from "./BlockModelKeyResolver";
import { packSideMasks } from "../../Verifier/VerificationLevels";

class BlockModelResolver {
    #waterBlockIds = new Set(["minecraft:water", "minecraft:flowing_water"]);
    #waterloggedWaterState = "minecraft:water[0|0]";

    constructor({ keyResolver, faceReader, unknownFaces, sideMaskPacker }) {
        this.keyResolver = keyResolver;
        this.faceReader = faceReader;
        this.unknownFaces = unknownFaces;
        this.sideMaskPacker = sideMaskPacker;
        this.resolvedByBlock = new WeakMap();
        this.waterloggedFacesCache = void 0;
        this.overlaySideMasksCache = void 0;
    }

    facesOf(block) {
        return this.resolve(block).faces;
    }

    sideMasksOf(block) {
        return this.resolve(block).sideMasks;
    }

    overlaySideMasks() {
        if (this.overlaySideMasksCache === void 0)
            this.overlaySideMasksCache = this.computeSideMasks(this.unknownFaces);
        return this.overlaySideMasksCache;
    }

    waterloggedFaces() {
        if (this.waterloggedFacesCache === void 0) {
            const faceRefs = this.keyResolver.faceRefsForKey(this.#waterloggedWaterState) ?? [];
            this.waterloggedFacesCache = faceRefs.map(this.faceReader);
        }
        return this.waterloggedFacesCache;
    }

    isWater(block) {
        return this.#waterBlockIds.has(this.blockIdOf(block));
    }

    resolve(block) {
        const cached = this.resolvedByBlock.get(block);
        if (cached !== void 0)
            return cached;

        const faces = this.lookupFaces(block);
        const resolved = {
            faces,
            sideMasks: this.computeSideMasks(faces)
        };

        this.resolvedByBlock.set(block, resolved);
        return resolved;
    }

    lookupFaces(block) {
        const blockId = this.blockIdOf(block);
        const states = block.states ?? block.getAllStates();
        const faceReferences = this.keyResolver.lookupFaceRefs(blockId, states);
        if (faceReferences === void 0)
            return this.unknownFaces;
        return faceReferences.map(this.faceReader);
    }

    computeSideMasks(faces) {
        let markerMask = 0;
        let opaqueMask = 0;

        for (const face of faces) {
            if (!face.covers)
                continue;
            if (face.missing)
                markerMask |= 1 << face.cull;
            else if (face.opaque)
                opaqueMask |= 1 << face.cull;
        }

        return this.sideMaskPacker(markerMask, opaqueMask);
    }

    blockIdOf(block) {
        return block.typeId ?? block.type.id;
    }
}

export const blockModelResolver = new BlockModelResolver({
    keyResolver: new BlockModelKeyResolver(),
    faceReader: FaceTable.faceAt,
    unknownFaces: CubeFaceLibrary.createPlainUnknownCubeFaces(),
    sideMaskPacker: packSideMasks
});
