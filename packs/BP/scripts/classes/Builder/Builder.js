import { BuilderOptions } from "./BuilderOptions";

export class Builder {
    playerId;
    materialInstanceName = void 0;
    flexibleInstanceMovement = void 0;

    constructor(playerId) {
        this.playerId = playerId;
    }

    isOptionEnabled(optionId) {
        return BuilderOptions.isEnabled(optionId, this.playerId);
    }

    setOption(optionId, value) {
        return BuilderOptions.setValue(optionId, this.playerId, value);
    }

    isFlexibleInstanceMoving() {
        return this.flexibleInstanceMovement !== void 0;
    }
}