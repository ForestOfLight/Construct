import { MolangVariableMap } from "@minecraft/server";
import { DEBUG_CONFIG } from "../../../consts";
import { MaterialType } from "../VerificationStyle";

const BLOCK_CENTER = 0.5;
const PIXELS_PER_BLOCK = 16;

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
        this.#setColor(color, material);
        this.#setGeometry(face, scale);
        this.#setUv(face);
        try {
            this.#dimension.spawnParticle(`construct:block_face_${material}`, this.#location, this.#molang);
        } catch {
            /* pass */
        }
    }

    #setColor(color, material) {
        if (color === this.#color)
            return;
        if (material === MaterialType.OPAQUE)
            this.#molang.setColorRGB("face_color", color);
        else
            this.#molang.setColorRGBA("face_color", color);
        this.#color = color;
    }

    #setGeometry(face, scale) {
        this.#location.x = this.#origin.x + BLOCK_CENTER + (face.center[0] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;
        this.#location.y = this.#origin.y + BLOCK_CENTER + (face.center[1] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;
        this.#location.z = this.#origin.z + BLOCK_CENTER + (face.center[2] / PIXELS_PER_BLOCK - BLOCK_CENTER) * scale;

        this.#normal.x = face.facing[0];
        this.#normal.y = face.facing[1];
        this.#normal.z = face.facing[2];

        this.#size.x = (face.width / PIXELS_PER_BLOCK) * 0.5 * scale;
        this.#size.y = (face.height / PIXELS_PER_BLOCK) * 0.5 * scale;
        this.#size.z = face.roll;

        this.#molang.setVector3("normal", this.#normal);
        this.#molang.setVector3("size", this.#size);
    }

    #setUv(face) {
        this.#uv.x = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.u : face.uv.x;
        this.#uv.y = DEBUG_CONFIG.enable ? DEBUG_CONFIG.render_all_textures_as.v : face.uv.y;
        this.#uvSize.x = face.uv.w;
        this.#uvSize.y = face.uv.h;
        this.#molang.setVector3("uv", this.#uv);
        this.#molang.setVector3("uv_size", this.#uvSize);
    }
}
