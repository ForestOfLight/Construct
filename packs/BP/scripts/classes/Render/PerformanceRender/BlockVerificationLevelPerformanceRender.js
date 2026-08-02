import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { getVerificationLevelColor, getVerificationLevelScale } from "./VerificationLevelStyle";

// A single fire-and-forget box that expires on its own.
//
// The continuously-rendered overlay does NOT use this - it holds persistent
// boxes through DebugBoxStore and mutates them in place. This is for one-shot
// renders with a definite end, which today means the statistics form.
export class BlockVerificationLevelPerformanceRender {
    dimension;
    location;
    verificationLevel;
    lifetimeSeconds = 0;

    constructor(dimensionLocation, verificationLevel, lifetimeSeconds = 5) {
        this.dimension = dimensionLocation.dimension;
        this.location = dimensionLocation.location;
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.#renderBlock();
    }

    #renderBlock() {
        const dimensionLocation = this.#toRenderLocation(this.dimension, this.location);
        const color = getVerificationLevelColor(this.verificationLevel);
        if (!color)
            return;
        const debugBox = new DebugBox(dimensionLocation);
        debugBox.color = color;
        debugBox.scale = getVerificationLevelScale(this.verificationLevel);
        debugBox.timeLeft = this.lifetimeSeconds;
        debugDrawer.addShape(debugBox);
    }

    #toRenderLocation(dimension, location) {
        return { dimension, x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
    }
}
