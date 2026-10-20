import { ObservableBoolean } from "@minecraft/server-ui";
import { BuilderOptions } from "./BuilderOptions";
import { world } from "@minecraft/server";

const DP_NAMESPACE = "builderOptions";

export class BuilderOption {
    identifier;
    order;
    displayName;
    description;
    howToUse;
    lockReason;
    #isLocked;
    #onEnable;
    #onDisable;

    constructor({ identifier, order = 0, displayName, description, howToUse, lock = void 0, onEnableCallback = () => {}, onDisableCallback = () => {} }) {
        this.identifier = identifier;
        this.order = order;
        this.displayName = displayName;
        this.description = description;
        this.howToUse = howToUse;
        this.#isLocked = lock?.isLocked ?? (() => false);
        this.lockReason = lock?.reason;
        this.#onEnable = onEnableCallback;
        this.#onDisable = onDisableCallback;
        BuilderOptions.add(this);
    }

    dynamicPropertyKey(playerId) {
        return `${DP_NAMESPACE}:${playerId}:${this.identifier}`;
    }

    isLocked(playerId) {
        return this.#isLocked(playerId);
    }

    isEnabled(playerId) {
        if (this.isLocked(playerId))
            return false;
        return world.getDynamicProperty(this.dynamicPropertyKey(playerId)) === true;
    }

    getValue(playerId) {
        return this.isEnabled(playerId);
    }

    setValue(playerId, value) {
        if (this.isLocked(playerId))
            return void 0;
        if (this.isEnabled(playerId) !== value) {
            this.save(playerId, value);
            if (value)
                this.#onEnable(playerId);
            else
                this.#onDisable(playerId);
            return value;
        }
        this.save(playerId, value);
        return void 0;
    }

    getValueNames() {
        return ['true', 'false'];
    }

    parseValue(input) {
        if (input === 'true')
            return true;
        if (input === 'false')
            return false;
        return void 0;
    }

    formatValue(value) {
        return { text: String(value) };
    }

    save(playerId, value) {
        world.setDynamicProperty(this.dynamicPropertyKey(playerId), value);
    }

    addControlTo(form, player) {
        const enabled = new ObservableBoolean(this.isEnabled(player.id), { clientWritable: true });
        form.toggle(this.displayName, enabled, this.controlOptions(player.id));
        enabled.subscribe((value) => player.sendMessage(this.applyFormValue(player.id, value)));
    }

    controlOptions(playerId) {
        if (this.isLocked(playerId))
            return { description: this.lockReason, disabled: true };
        return { description: this.description };
    }

    applyFormValue(playerId, formValue) {
        const changedToValue = this.setValue(playerId, formValue);
        if (changedToValue === void 0)
            return void 0;
        if (changedToValue) {
            return { rawtext: [
                { text: `§a` },
                this.displayName,
                { translate: 'construct.option.enabled' },
                { text: `§7 ` },
                this.howToUse
            ]};
        }
        return { rawtext: [
            { text: `§c` },
            this.displayName,
            { translate: 'construct.option.disabled' }
        ]};
    }
}
