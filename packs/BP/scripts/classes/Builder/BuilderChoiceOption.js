import { BuilderOption } from "./BuilderOption";
import { world } from "@minecraft/server";

export class BuilderChoiceOption extends BuilderOption {
    choices;
    choiceLabels;
    choiceNames;
    defaultValue;

    constructor({ identifier, displayName, description, choices, choiceLabels, choiceNames = choices, defaultValue, onChangeCallback = () => {} }) {
        super({ identifier, displayName, description, howToUse: description });
        this.choices = choices;
        this.choiceLabels = choiceLabels;
        this.choiceNames = choiceNames;
        this.defaultValue = defaultValue;
        this.onChange = onChangeCallback;
    }

    getChoices() {
        return typeof this.choices === 'function' ? this.choices() : this.choices;
    }

    getChoiceLabels() {
        return typeof this.choiceLabels === 'function' ? this.choiceLabels() : this.choiceLabels;
    }

    getValueNames() {
        return typeof this.choiceNames === 'function' ? this.choiceNames() : this.choiceNames;
    }

    parseValue(input) {
        const index = this.getValueNames().indexOf(input);
        return index === -1 ? void 0 : this.getChoices()[index];
    }

    formatValue(value) {
        return this.getLabel(value);
    }

    getValue(playerId) {
        const stored = world.getDynamicProperty(this.dynamicPropertyKey(playerId));
        return this.getChoices().includes(stored) ? stored : this.defaultValue;
    }

    isEnabled(playerId) {
        return this.getValue(playerId) !== this.defaultValue;
    }

    setValue(playerId, value) {
        if (!this.getChoices().includes(value))
            return void 0;
        const previous = this.getValue(playerId);
        this.save(playerId, value);
        if (previous === value)
            return void 0;
        this.onChange(playerId, value);
        return value;
    }

    getLabel(value) {
        return this.getChoiceLabels()[this.getChoices().indexOf(value)];
    }

    addControlTo(form, playerId) {
        form.dropdown(this.displayName, this.getChoiceLabels(), {
            defaultValueIndex: Math.max(this.getChoices().indexOf(this.getValue(playerId)), 0),
            tooltip: this.description
        });
    }

    applyFormValue(playerId, formValue) {
        const changedToValue = this.setValue(playerId, this.getChoices()[formValue]);
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
