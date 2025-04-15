import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "./BlockVerificationLevel";
import { Vector } from "../lib/Vector";

export class BlockVerificationLevelRender {
    opacity = 0.5;

    constructor(dimension, globalLocation, verificationLevel) {
        this.dimension = dimension;
        this.location = new Vector(globalLocation.x, globalLocation.y, globalLocation.z);
        this.verificationLevel = verificationLevel;
        this.renderBlock();
    }

    renderBlock() {
        for (const [key, value] of Object.entries(this.getParticleLocations())) {
            this.dimension.spawnParticle(key, value, this.getRGBAMolang());
        }
    }

    getParticleLocations() {
        const bottomFace = new Vector(0, 0, 0);
        const topFace = new Vector(0, 1, 0);
        const leftFace = new Vector(0.5, 0.5, 0);
        const rightFace = new Vector(-0.5, 0.5, 0);
        const frontFace = new Vector(0, 0.5, 0.5);
        const backFace = new Vector(0, 0.5, -0.5);
        return {
            "structool:blockerlay_xz": this.location.add(topFace),
            "structool:blockerlay_xz": this.location.add(bottomFace),
            "structool:blockerlay_yz": this.location.add(leftFace),
            "structool:blockerlay_yz": this.location.add(rightFace),
            "structool:blockerlay_xy": this.location.add(frontFace),
            "structool:blockerlay_xy": this.location.add(backFace),
        }
    }

    getRGBAMolang() {
        const rgb = this.verificationLevelToRGB();
        if (!rgb) return;
        rgb.alpha = this.opacity;
        return new MolangVariableMap().setColorRGBA("minecraft:particle_appearance_tinting", rgb);
    }

    verificationLevelToRGB() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return [1, 0, 0];
            case BlockVerificationLevel.TypeMatch:
                return [1, 1, 0];
            case BlockVerificationLevel.Match:
                return [0, 1, 0];
            case BlockVerificationLevel.Missing:
                return [0, 0, 1];
            default:
                return void 0;
        }
    }
}