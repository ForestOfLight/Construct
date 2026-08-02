import { MolangVariableMap } from "@minecraft/server";
import { DEBUG_CONFIG } from "../../../consts";

const BLOCK_CENTER = 0.5;
const PIXELS_PER_BLOCK = 16;

// One face of one block, spawned as a directional billboard particle.
//
// Every scratch object is owned by the spawner and overwritten in place:
// spawnParticle reads the map and the location before it returns, and every
// write into the map is a call across the native boundary. The face's ten
// varying values are packed into four vec3s for the same reason - a whole
// vector costs the same as a scalar there. The spare slot in `uv` is unused.
export class FaceParticleSpawner {
    #molang = new MolangVariableMap();
    #location = { x: 0, y: 0, z: 0 };
    #normal = { x: 0, y: 0, z: 0 };
    #size = { x: 0, y: 0, z: 0 };
    #uv = { x: 0, y: 0, z: 0 };
    #uvSize = { x: 0, y: 0, z: 0 };

    #dimension;
    #origin;
    #color;

    startBlock(dimension, origin, lifetimeSeconds) {
        this.#dimension = dimension;
        this.#origin = origin;
        this.#color = void 0;
        this.#molang.setFloat("lifetime", lifetimeSeconds);
    }

    spawnFace(face, color, material, scale) {
        this.#setColor(color);
        this.#setGeometry(face, scale);
        this.#setUv(face);
        try {
            this.#dimension.spawnParticle(`construct:block_face_${material}`, this.#location, this.#molang);
        } catch {
            /* pass */
        }
    }

    // Compared by identity, so a run of same-colored faces - the overwhelmingly
    // common case - doesn't re-send it. Styles are module constants, so their
    // colors are stable references.
    #setColor(color) {
        if (color === this.#color)
            return;
        this.#molang.setColorRGBA("face_color", color);
        this.#color = color;
    }

    #setGeometry(face, scale) {
        // Each face's offset from the block's center is scaled outward or
        // inward so the whole model grows or shrinks uniformly.
        this.#location.x = this.#origin.x + BLOCK_CENTER + (face.center[0] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;
        this.#location.y = this.#origin.y + BLOCK_CENTER + (face.center[1] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;
        this.#location.z = this.#origin.z + BLOCK_CENTER + (face.center[2] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;

        // Already the direction to point the billboard, not the face's outward
        // normal - the bake reverses a face pointing straight up or down
        // because direction_z renders those backwards otherwise. Doing it here
        // instead, as "negate y", drew every diagonal face a quarter turn out
        // of its own plane.
        this.#normal.x = face.facing[0];
        this.#normal.y = face.facing[1];
        this.#normal.z = face.facing[2];

        this.#size.x = (face.width / PIXELS_PER_BLOCK) * 0.5 * scale;
        this.#size.y = (face.height / PIXELS_PER_BLOCK) * 0.5 * scale;
        // A direction billboard takes only a facing direction, so the engine
        // picks the quad's up vector itself. The bake works out how far that
        // leaves each face from where Java draws it (see _derive_roll in
        // filters/fetch_block_models/main.py); this spins it the rest of the way.
        this.#size.z = face.roll;

        this.#molang.setVector3("normal", this.#normal);
        this.#molang.setVector3("size", this.#size);
    }

    // Debug mode pins only the uv origin: each face keeps its own width and
    // height, so nothing about which part of a texture a face uses can be
    // judged while it is on. It must not write back into `face`, which is a
    // shared descriptor (see FaceTable).
    #setUv(face) {
        this.#uv.x = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.u : face.uv.x;
        this.#uv.y = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.v : face.uv.y;
        this.#uvSize.x = face.uv.w;
        this.#uvSize.y = face.uv.h;
        this.#molang.setVector3("uv", this.#uv);
        this.#molang.setVector3("uv_size", this.#uvSize);
    }
}
