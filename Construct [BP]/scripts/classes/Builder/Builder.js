import { BuilderOptions } from "./BuilderOptions";
import { Builders } from "./Builders";

export class Builder {
    constructor(playerId) {
        this.playerId = playerId;
        this.options = new BuilderOptions(playerId);
        Builders.add(this);
    }

    getOptionIds() {
        return Object.keys(this.options.options).sort((a, b) => a.localeCompare(b));
    }

    getOption(id) {
        return this.options.get(id);
    }

    setOption(id, value) {
        return this.options.setValue(id, value);
    }
}