import { BuilderOptions } from "./BuilderOptions";

export class Builder {
    constructor(playerId) {
        this.playerId = playerId;
    }

    isOptionEnabled(optionId) {
        return BuilderOptions.isEnabled(optionId, this.playerId);
    }

    setOption(optionId, value) {
        return BuilderOptions.setValue(optionId, this.playerId, value);
    }
}