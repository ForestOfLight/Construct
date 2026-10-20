import { ObservableBoolean } from "@minecraft/server-ui";
import { AdminOptions } from "./AdminOptions";
import { world } from "@minecraft/server";

const DP_NAMESPACE = "adminOptions";

export class AdminOption {
    identifier;
    order;
    displayName;
    description;
    defaultValue;
    #onEnable;
    #onDisable;

    constructor({ identifier, order = 0, displayName, description, defaultValue = false, onEnableCallback = () => {}, onDisableCallback = () => {} }) {
        this.identifier = identifier;
        this.order = order;
        this.displayName = displayName;
        this.description = description;
        this.defaultValue = defaultValue;
        this.#onEnable = onEnableCallback;
        this.#onDisable = onDisableCallback;
        AdminOptions.add(this);
    }

    dynamicPropertyKey() {
        return `${DP_NAMESPACE}:${this.identifier}`;
    }

    isEnabled() {
        const stored = world.getDynamicProperty(this.dynamicPropertyKey());
        return typeof stored === 'boolean' ? stored : this.defaultValue;
    }

    getValue() {
        return this.isEnabled();
    }

    setValue(value) {
        if (this.isEnabled() !== value) {
            this.save(value);
            if (value)
                this.#onEnable();
            else
                this.#onDisable();
            return value;
        }
        this.save(value);
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

    save(value) {
        world.setDynamicProperty(this.dynamicPropertyKey(), value);
    }

    addControlTo(form, player) {
        const enabled = new ObservableBoolean(this.isEnabled(), { clientWritable: true });
        form.toggle(this.displayName, enabled, { description: this.description });
        enabled.subscribe((value) => this.sendFormFeedback(player, this.applyFormValue(value)));
    }

    sendFormFeedback(player, message) {
        if (message)
            player.sendMessage(message);
    }

    applyFormValue(formValue) {
        const changedToValue = this.setValue(formValue);
        if (changedToValue === void 0)
            return void 0;
        if (changedToValue) {
            return { rawtext: [
                { text: `§a` },
                this.displayName,
                { translate: 'construct.option.enabled' }
            ]};
        }
        return { rawtext: [
            { text: `§c` },
            this.displayName,
            { translate: 'construct.option.disabled' }
        ]};
    }
}
