import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { Vector } from "../../lib/Vector";

export class BlockVerificationLevelRender {
    opacity = 0.2;
    lifetimeSeconds = 0;

    constructor(dimensionLocation, verificationLevel, lifetimeSeconds = 5) {
        this.dimension = dimensionLocation.dimension;
        this.location = Vector.from(dimensionLocation.location);
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.renderBlock();
    }

    renderBlock() {
        for (const particleLocation of this.getParticleLocations()) {
            const color = this.getRGBAMolang();
            if (!color)
                return;
            color.setFloat("lifetime", this.lifetimeSeconds);
            try {
                this.dimension.spawnParticle(particleLocation.particleType, particleLocation.location, color);
            } catch {
                /* pass */
            }
        }
    }

    getParticleLocations() {
        const bottomFace = new Vector(0.5, 0, 0.5);
        const topFace = new Vector(0.5, 1, 0.5);
        const leftFace = new Vector(1, 0.5, 0.5);
        const rightFace = new Vector(0, 0.5, 0.5);
        const frontFace = new Vector(0.5, 0.5, 1);
        const backFace = new Vector(0.5, 0.5, 0);
        return [
            { particleType: "construct:blockoverlay_xz", location: this.location.add(topFace) },
            { particleType: "construct:blockoverlay_xz", location: this.location.add(bottomFace) },
            { particleType: "construct:blockoverlay_yz", location: this.location.add(leftFace) },
            { particleType: "construct:blockoverlay_yz", location: this.location.add(rightFace) },
            { particleType: "construct:blockoverlay_xy", location: this.location.add(frontFace) },
            { particleType: "construct:blockoverlay_xy", location: this.location.add(backFace) }
        ];
    }

    getRGBAMolang() {
        const rgb = this.verificationLevelToRGB();
        if (!rgb) return;
        rgb.alpha = this.opacity;
        const molang = new MolangVariableMap();
        molang.setColorRGBA("face_color", rgb);
        return molang;
    }

    verificationLevelToRGB() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return { red: 1, green: 0, blue: 0};
            case BlockVerificationLevel.TypeMatch:
                return { red: 1, green: 1, blue: 0};
            case BlockVerificationLevel.Missing:
                return { red: 0, green: 0, blue: 1};
            default:
                return void 0;
        }
    }
}