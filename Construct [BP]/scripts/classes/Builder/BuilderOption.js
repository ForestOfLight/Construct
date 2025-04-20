import { BuilderOptions } from "./BuilderOptions";
import { Option } from "../Option";

export class BuilderOption extends Option {
    playerId;
    identifier;
    displayName;
    description;
    value;
    #onEnable;
    #onDisable;
    #DP_NAMESPACE = "builderOptions";

    constructor({ player, identifier, displayName, description, howToUse, onEnableCallback = () => {}, onDisableCallback = () => {} }) {
        this.playerId = player.id;
        this.identifier = identifier;
        this.displayName = displayName;
        this.description = description;
        this.howToUse = howToUse;
        this.#onEnable = onEnableCallback;
        this.#onDisable = onDisableCallback;
        BuilderOptions.add(this);
    }

    save() {
        this.saveToDP(this.#DP_NAMESPACE, `${this.playerId}:${this.identifier}`, this);
    }

    load() {
        this.loadFromDP(this.#DP_NAMESPACE, `${this.playerId}:${this.identifier}`);
        this.value = this.value ?? false;
    }

    clear() {
        this.clearDP(this.#DP_NAMESPACE, `${this.playerId}:${this.identifier}`);
    }

    getValue() {
        return this.value;
    }
    
    setValue(value) {
        if (value)
            this.#onEnable();
        else
            this.#onDisable();
        if (this.value !== value) {
            this.value = value;
            return value;
        }
        return void 0;
    }
}