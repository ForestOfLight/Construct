import { MolangVariableMap } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { Vector } from "../../../lib/Vector";
import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";

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
        const color = this.#getRGBByVerificationLevel();
        if (!color)
            return;
        const debugBox = new DebugBox(dimensionLocation);
        debugBox.color = color;
        debugBox.scale = this.#getSizeScalarByVerificationLevel();
        debugBox.timeLeft = this.lifetimeSeconds;
        debugDrawer.addShape(debugBox);
    }

    #toRenderLocation(dimension, location) {
        return { dimension, x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
    }

    #getRGBByVerificationLevel() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return { red: 1, green: 0, blue: 0, alpha: 1 };
            case BlockVerificationLevel.TypeMatch:
                return { red: 1, green: 1, blue: 0, alpha: 1 };
            case BlockVerificationLevel.Missing:
                return { red: 0, green: 0, blue: 1, alpha: 1 };
            default:
                return void 0;
        }
    }

    #getSizeScalarByVerificationLevel() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return 1.01;
            case BlockVerificationLevel.TypeMatch:
                return 1.01;
            case BlockVerificationLevel.Missing:
                return 1.00;
            default:
                return 1.00;
        }
    }
}