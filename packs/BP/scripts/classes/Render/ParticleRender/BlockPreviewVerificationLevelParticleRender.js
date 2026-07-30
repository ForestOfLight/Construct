import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";
import { BlockModelLookup, WHITE_CUBE_FACES } from "../BlockModelLookup";

const BLOCK_CENTER = new Vector(0.5, 0.5, 0.5);

export class BlockPreviewVerificationLevelParticleRender {
    lifetimeSeconds = 0;

    constructor(dimensionLocation, targetPermutation, verificationLevel, lifetimeSeconds = 5) {
        this.dimension = dimensionLocation.dimension;
        this.location = Vector.from(dimensionLocation.location);
        this.targetPermutation = targetPermutation;
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.#renderBlock();
    }

    #renderBlock() {
        const rgb = this.#verificationLevelToRGB();
        if (!rgb || !this.targetPermutation)
            return;
        const material = this.#verificationLevelToMaterial();
        const sizeScalar = this.#verificationLevelToSizeScalar();
        for (const face of this.#getFaces()) {
            this.#renderFace(face, rgb, material, sizeScalar);
        }
    }

    // Only Missing needs the target block's actual shape (nothing else is
    // rendering there); NoMatch/TypeMatch overlay onto a real, already-visible
    // block, so a plain cube is enough and skips the model lookup entirely.
    #getFaces() {
        if (this.verificationLevel !== BlockVerificationLevel.Missing)
            return WHITE_CUBE_FACES;
        return BlockModelLookup.getFaces(this.targetPermutation);
    }

    #renderFace(face, rgb, material, sizeScalar) {
        if (face.width === 0 || face.height === 0)
            return;
        const faceCenter = new Vector(face.center[0] / 16, face.center[1] / 16, face.center[2] / 16);
        // Scale each face's offset from the block's center outward/inward by
        // sizeScalar so the whole model grows or shrinks uniformly, e.g. to
        // outline a mismatched block or inset a missing one.
        const center = BLOCK_CENTER.add(faceCenter.subtract(BLOCK_CENTER).multiply(sizeScalar));

        const molang = new MolangVariableMap();
        molang.setFloat("lifetime", this.lifetimeSeconds);
        molang.setFloat("width", (face.width / 16) * 0.5 * sizeScalar);
        molang.setFloat("height", (face.height / 16) * 0.5 * sizeScalar);
        // Bedrock's direction_z billboard mode inverts orientation for
        // near-vertical custom_direction vectors (a degenerate-basis quirk
        // when the direction is close to world up/down); negating y
        // compensates so up/down faces render facing the right way.
        molang.setFloat("nx", face.normal[0]);
        molang.setFloat("ny", -face.normal[1]);
        molang.setFloat("nz", face.normal[2]);
        molang.setFloat("u", face.uv.x);
        molang.setFloat("v", face.uv.y);
        molang.setFloat("uv_w", face.uv.w);
        molang.setFloat("uv_h", face.uv.h);
        molang.setColorRGBA("face_color", rgb);

        const particleType = `construct:block_face_${material}`;
        try {
            this.dimension.spawnParticle(particleType, this.location.add(center), molang);
        } catch {
            /* pass */
        }
    }

    #verificationLevelToMaterial() {
        return this.verificationLevel === BlockVerificationLevel.Missing ? "opaque" : "blend";
    }

    #verificationLevelToRGB() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return { red: 1, green: 0, blue: 0, alpha: 0.2 };
            case BlockVerificationLevel.TypeMatch:
                return { red: 1, green: 1, blue: 0, alpha: 0.2 };
            case BlockVerificationLevel.Missing:
                return { red: 0.5, green: 0.5, blue: 1, alpha: 1 };
            default:
                return void 0;
        }
    }

    #verificationLevelToSizeScalar() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return 1.01;
            case BlockVerificationLevel.TypeMatch:
                return 1.01;
            case BlockVerificationLevel.Missing:
                return 0.90;
            default:
                return 1.00;
        }
    }
}
