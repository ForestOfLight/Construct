import { ObservableNumber } from "@minecraft/server-ui";
import { AdminOption } from "./AdminOption";
import { world } from "@minecraft/server";

export class AdminChoiceOption extends AdminOption {
    choices;
    choiceLabels;

    constructor({ identifier, order, displayName, description, choices, choiceLabels, defaultValue, onChangeCallback = () => {} }) {
        super({ identifier, order, displayName, description, defaultValue });
        this.choices = choices;
        this.choiceLabels = choiceLabels;
        this.onChange = onChangeCallback;
    }

    getChoices() {
        return typeof this.choices === 'function' ? this.choices() : this.choices;
    }

    getChoiceLabels() {
        return typeof this.choiceLabels === 'function' ? this.choiceLabels() : this.choiceLabels;
    }

    getValueNames() {
        return this.getChoices();
    }

    parseValue(input) {
        return this.getChoices().includes(input) ? input : void 0;
    }

    formatValue(value) {
        return this.getLabel(value);
    }

    getValue() {
        const stored = world.getDynamicProperty(this.dynamicPropertyKey());
        return this.getChoices().includes(stored) ? stored : this.defaultValue;
    }

    isEnabled() {
        return this.getValue() !== this.defaultValue;
    }

    setValue(value) {
        if (!this.getChoices().includes(value))
            return void 0;
        const previous = this.getValue();
        this.save(value);
        if (previous === value)
            return void 0;
        this.onChange(value);
        return value;
    }

    getLabel(value) {
        return this.getChoiceLabels()[this.getChoices().indexOf(value)];
    }

    addControlTo(form, player) {
        const currChoiceIndex = Math.max(this.getChoices().indexOf(this.getValue()), 0);
        const choice = new ObservableNumber(currChoiceIndex, { clientWritable: true });
        const choices = this.getChoiceLabels().map((label, index) => ({ label, value: index }));
        form.dropdown(this.displayName, choice, choices, { description: this.description });
        choice.subscribe((value) => this.sendFormFeedback(player, this.applyFormValue(value)));
    }

    applyFormValue(formValue) {
        const changedToValue = this.setValue(this.getChoices()[formValue]);
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
