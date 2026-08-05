import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { drawExpiringDebugBox } from "../Render/preview/ExpiringDebugBox";

export class SilentSweepObserver {
    onCellVerified() {}
}

export class DebugBoxSweepObserver {
    #instance;
    #lifetimeSeconds;

    constructor(instance, lifetimeSeconds) {
        this.#instance = instance;
        this.#lifetimeSeconds = lifetimeSeconds;
    }

    onCellVerified(location, verificationLevel) {
        if (verificationLevel === BlockVerificationLevel.Air)
            return;
        drawExpiringDebugBox(
            this.#instance.getDimension(),
            this.#instance.toGlobalCoords(location),
            verificationLevel,
            this.#lifetimeSeconds
        );
    }
}
