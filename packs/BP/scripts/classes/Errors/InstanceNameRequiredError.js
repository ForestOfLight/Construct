import { CommandResponseError } from "./CommandResponseError";

export class InstanceNameRequiredError extends CommandResponseError {
    constructor(message = 'An instance name is required when not running as a player.') {
        super(message);
        this.name = 'InstanceNameRequiredError';
    }

    getRawMessage() {
        return { translate: 'construct.error.instanceNameRequired' };
    }
}
