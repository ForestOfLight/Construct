import { world } from "@minecraft/server";
import { BuilderOption } from "./BuilderOption";

export class BuilderOptions {
    playerId = void 0;
    options = {};

    constructor(playerId) {
        this.playerId = playerId;
        this.loadOptions();
    }

    loadOptions() {
        const optionDPs = world.getDynamicPropertyIds().filter((id) => id.startsWith(`builderOptions:${this.playerId}:`));
        for (const optionDP of optionDPs)
            new BuilderOption(JSON.parse(world.getDynamicProperty(optionDP)));
    }

    add(builderOption) {
        this.options[builderOption.identifer] = builderOption;
    }

    get(id) {
        return this.options[id];
    }

    getValue(id) {
        return this.options[id].getValue();
    }

    setValue(id, value) {
        return this.options[id].setValue(value);
    }
}