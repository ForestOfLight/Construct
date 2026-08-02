import { BuilderOption } from "./BuilderOption";
import { world } from "@minecraft/server";

// A per-player option that picks one of several named values instead of being
// on or off. It shows up in the builder menu as a dropdown and stores the
// chosen value itself, not an index, so reordering the choices later cannot
// silently change what every player already picked.
export class BuilderChoiceOption extends BuilderOption {
    choices;
    choiceLabels;
    defaultValue;

    constructor({ identifier, displayName, description, choices, choiceLabels, defaultValue, onChangeCallback = () => {} }) {
        super({ identifier, displayName, description, howToUse: description });
        this.choices = choices;
        this.choiceLabels = choiceLabels;
        this.defaultValue = defaultValue;
        this.onChange = onChangeCallback;
    }

    // Falls back to the default for a player who has never touched the option
    // and for a stored value that is no longer one of the choices.
    getValue(playerId) {
        const stored = world.getDynamicProperty(this.dynamicPropertyKey(playerId));
        return this.choices.includes(stored) ? stored : this.defaultValue;
    }

    // The base class treats a stored value as a boolean; here anything but one
    // of the choices is meaningless, so this is the only sensible reading.
    isEnabled(playerId) {
        return this.getValue(playerId) !== this.defaultValue;
    }

    setValue(playerId, value) {
        if (!this.choices.includes(value))
            return void 0;
        const previous = this.getValue(playerId);
        this.save(playerId, value);
        if (previous === value)
            return void 0;
        this.onChange(playerId, value);
        return value;
    }

    getLabel(value) {
        return this.choiceLabels[this.choices.indexOf(value)];
    }

    addControlTo(form, playerId) {
        form.dropdown(this.displayName, this.choiceLabels, {
            defaultValueIndex: Math.max(this.choices.indexOf(this.getValue(playerId)), 0),
            tooltip: this.description
        });
    }

    applyFormValue(playerId, formValue) {
        const changedToValue = this.setValue(playerId, this.choices[formValue]);
        if (changedToValue === void 0)
            return void 0;
        return { rawtext: [
            { text: `§a` },
            this.displayName,
            { translate: 'construct.option.setto' },
            this.getLabel(changedToValue),
            { text: `§a.` }
        ]};
    }
}
