import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";
import { BlockModelLookup, WHITE_CUBE_FACES } from "../BlockModelLookup";
import { DEBUG_CONFIG } from "../../../consts";

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
            try {
                this.#renderFace(face, rgb, material, sizeScalar);
            } catch (error) {
                console.warn(`Failed to render face for block ${this.targetPermutation.type.id} at location ${JSON.stringify(this.location)} with verification level ${this.verificationLevel}:`, error, error.stack);
            }
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
        if (face.isMissing)
            material = "blend";
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
        // direction_z billboards render up/down-normal faces backwards
        // unless the y component is negated - confirmed against
        // packs/RP/particles/cube_blend/vertical_face_blend.json, the
        // established (and working) reference implementation, which sends
        // -1 for the top face and +1 for the bottom face. Horizontal-normal
        // faces don't need this (see lateral_face_blend.json, which sends
        // the raw outward vector unchanged).
        if (DEBUG_CONFIG.enable) {
            face.uv.x = DEBUG_CONFIG.render_all_textures_as.u;
            face.uv.y = DEBUG_CONFIG.render_all_textures_as.v;
        }
        molang.setFloat("nx", face.normal[0]);
        molang.setFloat("ny", -face.normal[1]);
        molang.setFloat("nz", face.normal[2]);
        // A direction billboard only takes a facing direction, so the engine
        // picks the quad's up vector itself and the texture lands at whatever
        // roll that produces - world-up for a side face (already right), but a
        // fixed south-reading orientation for every top and bottom face. The
        // pipeline works out how far each face is from where Java draws it
        // (see _derive_roll in filters/fetch_block_models/main.py); this spins
        // it the rest of the way.
        molang.setFloat("roll", face.roll);
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
