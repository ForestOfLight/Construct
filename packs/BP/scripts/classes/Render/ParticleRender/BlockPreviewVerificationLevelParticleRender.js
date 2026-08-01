import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";
import { BlockModelLookup, PLAIN_CUBE_FACES } from "../BlockModelLookup";
import { DEBUG_CONFIG } from "../../../consts";

const BLOCK_CENTER = new Vector(0.5, 0.5, 0.5);

// How a face the pipeline couldn't resolve is drawn: a see-through blue quad
// rather than the block's own preview color. Solid white read as a real
// block with a blank texture, which hid broken model/texture data instead of
// advertising it; a translucent blue cube is unmistakable, and being
// see-through also keeps it from hiding whatever is behind it.
const MISSING_FACE_RGBA = { red: 0, green: 0, blue: 1, alpha: 0.2 };
const MISSING_FACE_MATERIAL = "blend";

// Water is the one block whose texture is authored see-through: Java draws it
// on the translucent layer and block/water_still carries an alpha of 180/255,
// which the atlas keeps. The preview's usual material discards that - it
// alpha-tests rather than blending, so every partly-transparent texel came
// out fully solid and water read as a flat blue cube. Blending is what lets
// the texture's own alpha through, so the quad ends up as see-through as Java
// draws it without us naming a second opacity here that could disagree with
// the texture.
const WATER_MATERIAL = "blend";

export class BlockPreviewVerificationLevelParticleRender {
    lifetimeSeconds = 0;

    constructor(dimensionLocation, targetPermutation, verificationLevel, lifetimeSeconds = 5) {
        this.dimension = dimensionLocation.dimension;
        this.location = dimensionLocation.location;
        this.targetPermutation = targetPermutation;
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.#renderBlock();
    }

    #renderBlock() {
        const rgb = this.#verificationLevelToRGB();
        if (!rgb || !this.targetPermutation)
            return;
        const sizeScalar = this.#verificationLevelToSizeScalar();
        for (const { faces, material } of this.#getFaceLayers()) {
            for (const face of faces) {
                try {
                    this.#renderFace(face, rgb, material, sizeScalar);
                } catch (error) {
                    console.warn(`Failed to render face for block ${this.targetPermutation.type.id} at location ${JSON.stringify(this.location)} with verification level ${this.verificationLevel}:`, error, error.stack);
                }
            }
        }
    }

    // The sets of faces making up this block, each with the material its own
    // textures need. Usually just one - the block's shape - but a waterlogged
    // block is two: the block, and the water standing in it.
    //
    // Only Missing needs the target block's actual shape (nothing else is
    // rendering there); NoMatch/TypeMatch overlay onto a real, already-visible
    // block, so a plain cube is enough and skips the model lookup entirely.
    // That also means those levels never show the water: the real block is
    // there in the world with its own water already drawn around it.
    #getFaceLayers() {
        const material = this.#verificationLevelToMaterial();
        if (this.verificationLevel !== BlockVerificationLevel.Missing)
            return [{ faces: PLAIN_CUBE_FACES, material }];
        const layers = [{
            faces: BlockModelLookup.getFaces(this.targetPermutation),
            material: BlockModelLookup.isWater(this.targetPermutation) ? WATER_MATERIAL : material,
        }];
        // Bedrock keeps a waterlogged block's water outside the permutation,
        // so no model the pipeline bakes can include it; the block's own
        // faces are only ever the stair/fence/whatever standing in it.
        if (this.targetPermutation.isWaterlogged)
            layers.push({ faces: BlockModelLookup.getWaterloggedFaces(), material: WATER_MATERIAL });
        return layers;
    }

    #renderFace(face, rgb, material, sizeScalar) {
        if (face.missing) {
            material = MISSING_FACE_MATERIAL;
            rgb = MISSING_FACE_RGBA;
        }
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
        // Debug mode aims every face at one fixed spot in the atlas so shape
        // problems can be read without texture variety in the way. Note it
        // pins only the origin: each face keeps its own uv width/height, so
        // faces still sample different-sized crops from that spot and
        // nothing about which part of a texture a face uses can be judged
        // while this is on.
        //
        // It must not assign back into `face`. Face descriptors are shared
        // and deduplicated across every block that uses them (see
        // blockFaceTypes), so writing through would corrupt the generated
        // table for the rest of the session - including after debug mode is
        // switched back off.
        const uv = DEBUG_CONFIG.enable
            ? { ...face.uv, x: DEBUG_CONFIG.render_all_textures_as.u, y: DEBUG_CONFIG.render_all_textures_as.v }
            : face.uv;

        // Already the direction to point the billboard, not the face's
        // outward normal: the pipeline reverses a face pointing straight up
        // or down, because direction_z renders those backwards otherwise
        // (confirmed against the old controller-based vertical_face_blend
        // particle, the established reference implementation, which sent -1
        // for the top face and +1 for the bottom face).
        //
        // This used to be done here, as "negate the normal's y". That is the
        // same thing only for faces pointing along an axis, and it drew every
        // diagonal face - levers, lecterns, tripwire hooks - a quarter turn
        // out of its own plane. It belongs with the roll, which has to be
        // measured about this very direction, so both now come ready to use.
        molang.setFloat("nx", face.facing[0]);
        molang.setFloat("ny", face.facing[1]);
        molang.setFloat("nz", face.facing[2]);
        // A direction billboard only takes a facing direction, so the engine
        // picks the quad's up vector itself and the texture lands at whatever
        // roll that produces - world-up for a side face (already right), but a
        // fixed south-reading orientation for every top and bottom face. The
        // pipeline works out how far each face is from where Java draws it
        // (see _derive_roll in filters/fetch_block_models/main.py); this spins
        // it the rest of the way.
        molang.setFloat("roll", face.roll);
        molang.setFloat("u", uv.x);
        molang.setFloat("v", uv.y);
        molang.setFloat("uv_w", uv.w);
        molang.setFloat("uv_h", uv.h);
        molang.setColorRGBA("face_color", rgb);

        const particleType = `construct:block_face_${material}`;
        const finalLocation = { x: this.location.x + center.x, y: this.location.y + center.y, z: this.location.z + center.z };
        try {
            this.dimension.spawnParticle(particleType, finalLocation, molang);
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
