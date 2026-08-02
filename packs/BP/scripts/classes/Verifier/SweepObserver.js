import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { drawExpiringDebugBox } from "../Render/preview/ExpiringDebugBox";

// What a sweep does with each cell beyond recording it. The continuous sweep
// draws nothing itself - the preview renderer reads the finished grid on its
// own schedule - so this exists for the one-shot sweep behind the statistics
// form, which has no renderer to hand off to.
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
