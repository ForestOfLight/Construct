import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { BlockModelLookup, PLAIN_CUBE_FACES } from "../BlockModelLookup";
import { DEBUG_CONFIG } from "../../../consts";

const BLOCK_CENTER = 0.5;

// A block that isn't there yet is drawn slightly inside its cell so a run of
// them reads as separate blocks rather than one mass, and one that's there
// but wrong is drawn slightly outside its cell so it wraps the real block
// instead of z-fighting with it.
//
// The inset is the one thing keeping neighbor culling from being exactly
// invisible. A face is culled when the neighboring cell holds something that
// fills its cube (see StructureVerifier's #isOccluder), and against a block
// already placed in the world that is exact - it really does fill it. But two
// missing blocks side by side are each drawn a twentieth of a block short of
// their shared boundary, so the faces they present to each other are not
// quite touching, and culling them opens a seam that shows at a grazing
// angle. Setting this to 1.00 makes every cull exact, at the cost of a solid
// missing region reading as one block-colored mass.
const MISSING_SIZE_SCALAR = 1.00;
const OVERLAY_SIZE_SCALAR = 1.01;

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

    constructor(dimensionLocation, targetPermutation, verificationLevel, lifetimeSeconds = 5, occlusionMask = 0) {
        this.dimension = dimensionLocation.dimension;
        this.location = dimensionLocation.location;
        this.targetPermutation = targetPermutation;
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.occlusionMask = occlusionMask;
        this.#renderBlock();
    }

    #renderBlock() {
        const rgb = this.#verificationLevelToRGB();
        if (!rgb || !this.targetPermutation)
            return;
        const sizeScalar = this.#verificationLevelToSizeScalar();

        // One set of scratch objects for the whole block. spawnParticle reads
        // the map and the location before it returns, so every face can
        // overwrite them in place instead of allocating its own - and every
        // write into the map is a call across the native boundary, so the
        // per-block constants are set once, here, rather than per face.
        const scratch = {
            molang: new MolangVariableMap(),
            location: { x: 0, y: 0, z: 0 },
            normal: { x: 0, y: 0, z: 0 },
            size: { x: 0, y: 0, z: 0 },
            uv: { x: 0, y: 0, z: 0 },
            uvSize: { x: 0, y: 0, z: 0 },
        };
        scratch.molang.setFloat("lifetime", this.lifetimeSeconds);
        scratch.molang.setColorRGBA("face_color", rgb);
        // The color in the map right now, so a run of same-colored faces - the
        // overwhelmingly common case - doesn't re-send it. Only a face the
        // pipeline couldn't resolve differs, and only until the next one that
        // resolved puts the block's own color back.
        let colorIsMissing = false;

        const occlusionMask = this.occlusionMask;

        for (const { faces, material } of this.#getFaceLayers()) {
            for (const face of faces) {
                try {
                    // A face lying flat on the block's hull is hidden outright
                    // by a neighbor that fills its own cube opaquely, so it
                    // costs a particle and draws nothing. `cull` says which
                    // neighbor that is (absent on the faces no neighbor can
                    // reach - anything inside the block, and every diagonal),
                    // and the mask says which of the six qualify.
                    if (face.cull !== void 0 && (occlusionMask >> face.cull) & 1)
                        continue;
                    const missing = face.missing === true;
                    if (missing !== colorIsMissing) {
                        scratch.molang.setColorRGBA("face_color", missing ? MISSING_FACE_RGBA : rgb);
                        colorIsMissing = missing;
                    }
                    this.#renderFace(scratch, face, missing ? MISSING_FACE_MATERIAL : material, sizeScalar);
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

    // Every value a face varies is packed into four vec3s rather than sent as
    // ten separate floats, because each write into the map is a call across
    // the native boundary and a whole structure costs the same as a scalar
    // there. The groupings are the particle's own: where the quad points, how
    // big it is and which way up, and the two halves of its atlas rectangle.
    // The spare slot in `uv` is unused - ten values don't divide into three
    // vectors, and a wasted slot is free where a fifth call would not be.
    #renderFace(scratch, face, material, sizeScalar) {
        const { molang, location, normal, size, uv, uvSize } = scratch;

        // Scale each face's offset from the block's center outward/inward by
        // sizeScalar so the whole model grows or shrinks uniformly, e.g. to
        // outline a mismatched block or inset a missing one.
        location.x = this.location.x + BLOCK_CENTER + (face.center[0] / 16 - BLOCK_CENTER) * sizeScalar;
        location.y = this.location.y + BLOCK_CENTER + (face.center[1] / 16 - BLOCK_CENTER) * sizeScalar;
        location.z = this.location.z + BLOCK_CENTER + (face.center[2] / 16 - BLOCK_CENTER) * sizeScalar;

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
        normal.x = face.facing[0];
        normal.y = face.facing[1];
        normal.z = face.facing[2];

        size.x = (face.width / 16) * 0.5 * sizeScalar;
        size.y = (face.height / 16) * 0.5 * sizeScalar;
        // A direction billboard only takes a facing direction, so the engine
        // picks the quad's up vector itself and the texture lands at whatever
        // roll that produces - world-up for a side face (already right), but a
        // fixed south-reading orientation for every top and bottom face. The
        // pipeline works out how far each face is from where Java draws it
        // (see _derive_roll in filters/fetch_block_models/main.py); this spins
        // it the rest of the way.
        size.z = face.roll;

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
        uv.x = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.u : face.uv.x;
        uv.y = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.v : face.uv.y;
        uvSize.x = face.uv.w;
        uvSize.y = face.uv.h;

        molang.setVector3("normal", normal);
        molang.setVector3("size", size);
        molang.setVector3("uv", uv);
        molang.setVector3("uv_size", uvSize);

        try {
            this.dimension.spawnParticle(`construct:block_face_${material}`, location, molang);
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
                return OVERLAY_SIZE_SCALAR;
            case BlockVerificationLevel.TypeMatch:
                return OVERLAY_SIZE_SCALAR;
            case BlockVerificationLevel.Missing:
                return MISSING_SIZE_SCALAR;
            default:
                return 1.00;
        }
    }
}
