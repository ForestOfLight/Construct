import { BuilderOptions } from "./BuilderOptions";
import { world } from "@minecraft/server";

export class BuilderOption {
    identifier;
    displayName;
    description;
    howToUse;
    #onEnable;
    #onDisable;
    #DP_NAMESPACE = "builderOptions";

    constructor({ identifier, displayName, description, howToUse, onEnableCallback = () => {}, onDisableCallback = () => {} }) {
        this.identifier = identifier;
        this.displayName = displayName;
        this.description = description;
        this.howToUse = howToUse;
        this.#onEnable = onEnableCallback;
        this.#onDisable = onDisableCallback;
        BuilderOptions.add(this);
    }

    isEnabled(playerId) {
        return world.getDynamicProperty(`${this.#DP_NAMESPACE}:${playerId}:${this.identifier}`) === true;
    }
    
    setValue(playerId, value) {
        if (value)
            this.#onEnable(playerId);
        else
            this.#onDisable(playerId);
        if (this.isEnabled(playerId) !== value) {
            this.save(playerId, value);
            return value;
        }
        this.save(playerId, value);
        return void 0;
    }

    save(playerId, value) {
        world.setDynamicProperty(`${this.#DP_NAMESPACE}:${playerId}:${this.identifier}`, value);
    }
}