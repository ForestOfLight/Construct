export class AdminOptions {
    static options = {};

    static add(adminOption) {
        this.options[adminOption.identifier] = adminOption;
    }

    static get(optionId) {
        return this.options[optionId];
    }

    static getOptionIds() {
        return Object.keys(this.options).sort((a, b) => this.options[a].order - this.options[b].order);
    }

    static isEnabled(optionId) {
        return this.options[optionId].isEnabled();
    }

    static getValue(optionId) {
        return this.options[optionId].getValue();
    }

    static setValue(optionId, value) {
        return this.options[optionId].setValue(value);
    }
}
