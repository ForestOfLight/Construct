import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";

export class BlockPreviewVerificationLevelParticleRender {
    lifetimeSeconds = 0;

    constructor(dimensionLocation, verificationLevel, lifetimeSeconds = 5) {
        this.dimension = dimensionLocation.dimension;
        this.location = Vector.from(dimensionLocation.location);
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.#renderBlock();
    }

    #renderBlock() {
        const sizeScalar = this.#verificationLevelToSizeScalar();
        const particle = this.#getBlockParticle();
        const color = this.#getRGBAMolang();
        if (!color)
            return;
        color.setFloat("lifetime", this.lifetimeSeconds);
        // color.setFloat("width", 0.5*sizeScalar);
        // color.setFloat("height", 0.5*sizeScalar);
        color.setFloat("size", 0.5*sizeScalar);
        try {
            this.dimension.spawnParticle(particle.particleType, particle.location, color);
        } catch {
            /* pass */
        }
    }

    #getBlockParticle() {
        const center = new Vector(0.5, 0.5, 0.5);
        return { particleType: this.#verificationLevelToParticleType(), location: this.location.add(center) };
    }

    #getRGBAMolang() {
        const rgb = this.#verificationLevelToRGB();
        if (!rgb) return;
        const molang = new MolangVariableMap();
        molang.setColorRGBA("face_color", rgb);
        return molang;
    }

    #verificationLevelToParticleType() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return "construct:blockoverlay_controller_blend";
            case BlockVerificationLevel.TypeMatch:
                return "construct:blockoverlay_controller_blend";
            case BlockVerificationLevel.Missing:
                return "construct:blockoverlay_controller";
            default:
                return void 0;
        }
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