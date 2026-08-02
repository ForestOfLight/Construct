import { BuilderOptions } from "./BuilderOptions";
import { world } from "@minecraft/server";

const DP_NAMESPACE = "builderOptions";

// A per-player on/off option. The form control and the chat line that
// announces a change both live here rather than in BuilderForm, so an option
// with a different shape - see BuilderChoiceOption - can present itself
// differently without the form learning about it.
export class BuilderOption {
    identifier;
    displayName;
    description;
    howToUse;
    #onEnable;
    #onDisable;

    constructor({ identifier, displayName, description, howToUse, onEnableCallback = () => {}, onDisableCallback = () => {} }) {
        this.identifier = identifier;
        this.displayName = displayName;
        this.description = description;
        this.howToUse = howToUse;
        this.#onEnable = onEnableCallback;
        this.#onDisable = onDisableCallback;
        BuilderOptions.add(this);
    }

    dynamicPropertyKey(playerId) {
        return `${DP_NAMESPACE}:${playerId}:${this.identifier}`;
    }

    isEnabled(playerId) {
        return world.getDynamicProperty(this.dynamicPropertyKey(playerId)) === true;
    }

    // The shape-agnostic reader, for callers that hold an option id rather
    // than a particular option. For an on/off option the value is the toggle.
    getValue(playerId) {
        return this.isEnabled(playerId);
    }

    setValue(playerId, value) {
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

    save(playerId, value) {
        world.setDynamicProperty(this.dynamicPropertyKey(playerId), value);
    }

    addControlTo(form, playerId) {
        form.toggle(this.displayName, { defaultValue: this.isEnabled(playerId), tooltip: this.description });
    }

    // Returns the message to announce this change with, or nothing when the
    // value the player submitted is the one they already had.
    applyFormValue(playerId, formValue) {
        const changedToValue = this.setValue(playerId, formValue);
        if (changedToValue === void 0)
            return void 0;
        if (changedToValue)
            return { rawtext: [
                { text: `§a` },
                this.displayName,
                { translate: 'construct.option.enabled' },
                { text: `§7 ` },
                this.howToUse
            ]};
        return { rawtext: [
            { text: `§c` },
            this.displayName,
            { translate: 'construct.option.disabled' }
        ]};
    }
}
