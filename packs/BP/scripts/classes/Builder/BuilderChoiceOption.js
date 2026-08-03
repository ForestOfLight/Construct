import { BuilderOption } from "./BuilderOption";
import { world } from "@minecraft/server";

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

    getValue(playerId) {
        const stored = world.getDynamicProperty(this.dynamicPropertyKey(playerId));
        return this.choices.includes(stored) ? stored : this.defaultValue;
    }

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
