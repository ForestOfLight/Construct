import { ObservableNumber } from "@minecraft/server-ui";
import { BuilderOption } from "./BuilderOption";
import { world } from "@minecraft/server";

export class BuilderChoiceOption extends BuilderOption {
    choices;
    choiceLabels;
    defaultValue;

    constructor({ identifier, order, displayName, description, choices, choiceLabels, defaultValue, lock = void 0, onChangeCallback = () => {} }) {
        super({ identifier, order, displayName, description, howToUse: description, lock });
        this.choices = choices;
        this.choiceLabels = choiceLabels;
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
        return this.getChoices();
    }

    parseValue(input) {
        return this.getChoices().includes(input) ? input : void 0;
    }

    formatValue(value) {
        return this.getLabel(value);
    }

    getValue(playerId) {
        if (this.isLocked(playerId))
            return this.defaultValue;
        const stored = world.getDynamicProperty(this.dynamicPropertyKey(playerId));
        return this.getChoices().includes(stored) ? stored : this.defaultValue;
    }

    isEnabled(playerId) {
        return this.getValue(playerId) !== this.defaultValue;
    }

    setValue(playerId, value) {
        if (this.isLocked(playerId) || !this.getChoices().includes(value))
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

    addControlTo(form, player) {
        const currChoiceIndex = Math.max(this.getChoices().indexOf(this.getValue(player.id)), 0);
        const choice = new ObservableNumber(currChoiceIndex, { clientWritable: true });
        const choices = this.getChoiceLabels().map((label, index) => ({ label, value: index }));
        form.dropdown(this.displayName, choice, choices, this.controlOptions(player.id));
        choice.subscribe((value) => player.sendMessage(this.applyFormValue(player.id, value)));
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
