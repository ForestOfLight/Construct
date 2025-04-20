export class BuilderOptions {
    static options = {};

    static add(builderOption) {
        this.options[builderOption.identifier] = builderOption;
    }

    static get(optionId) {
        return this.options[optionId];
    }

    static getOptionIds() {
        return Object.keys(this.options).sort((a, b) => a - b);
    }

    static isEnabled(optionId, playerId) {
        return this.options[optionId].isEnabled(playerId);
    }

    static setValue(optionId, playerId, value) {
        return this.options[optionId].setValue(playerId, value);
    }
}