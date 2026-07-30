import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";
import { BlockModelLookup } from "../BlockModelLookup";

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
        for (const face of BlockModelLookup.getFaces(this.targetPermutation)) {
            this.#renderFace(face, rgb, material);
        }
    }

    #renderFace(face, rgb, material) {
        const from = new Vector(face.from[0] / 16, face.from[1] / 16, face.from[2] / 16);
        const to = new Vector(face.to[0] / 16, face.to[1] / 16, face.to[2] / 16);
        const center = from.add(to).multiply(0.5);
        const size = { x: Math.abs(to.x - from.x), y: Math.abs(to.y - from.y), z: Math.abs(to.z - from.z) };
        const [width, height] = this.#faceDimensions(face.axis, size);
        if (width === 0 || height === 0)
            return;

        const molang = new MolangVariableMap();
        molang.setFloat("lifetime", this.lifetimeSeconds);
        molang.setFloat("width", width);
        molang.setFloat("height", height);
        molang.setFloat("u", face.uv.x);
        molang.setFloat("v", face.uv.y);
        molang.setFloat("uv_w", face.uv.w);
        molang.setFloat("uv_h", face.uv.h);
        molang.setColorRGBA("face_color", rgb);

        const particleType = `construct:block_face_${face.axis}_${material}`;
        try {
            this.dimension.spawnParticle(particleType, this.location.add(center), molang);
        } catch {
            /* pass */
        }
    }

    #faceDimensions(axis, size) {
        if (axis === "xz")
            return [size.x, size.z];
        if (axis === "xy")
            return [size.x, size.y];
        return [size.y, size.z]; // yz
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
}
