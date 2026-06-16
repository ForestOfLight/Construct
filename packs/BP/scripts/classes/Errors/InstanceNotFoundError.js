import { CommandResponseError } from "./CommandResponseError";

export class InstanceNotFoundError extends CommandResponseError {
    instanceName;

    constructor(instanceName) {
        super(`§cInstance "${instanceName}" not found.`);
        this.name = 'InstanceNotFoundError';
        this.instanceName = instanceName;
    }

    getRawMessage() {
        return { translate: 'construct.error.instanceNotFound', with: [this.instanceName] };
    }
}