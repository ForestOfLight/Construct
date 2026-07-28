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
        this.location = Vector.from(dimensionLocation.location);
        this.verificationLevel = verificationLevel;
        this.lifetimeSeconds = lifetimeSeconds;
        this.#renderBlock();
    }

    #renderBlock() {
        const dimensionLocation = { x: this.location.x, y: this.location.y, z: this.location.z, dimension: this.dimension };
        const debugBox = new DebugBox(dimensionLocation);
        debugBox.scale = this.#verificationLevelToSizeScalar();
        debugBox.color = this.#verificationLevelToRGB();
        debugBox.timeLeft = this.lifetimeSeconds;
        debugDrawer.addShape(debugBox);
    }

    #verificationLevelToRGB() {
        switch (this.verificationLevel) {
            case BlockVerificationLevel.NoMatch:
                return { red: 1, green: 0, blue: 0, alpha: 1.0 };
            case BlockVerificationLevel.TypeMatch:
                return { red: 1, green: 1, blue: 0, alpha: 1.0 };
            case BlockVerificationLevel.Missing:
                return { red: 0, green: 0, blue: 1, alpha: 1.0 };
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