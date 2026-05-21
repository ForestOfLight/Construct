import { CommandResponseError } from "./CommandResponseError";

export class InstanceExistsError extends CommandResponseError {
    instanceName;

    constructor(instanceName) {
        super(`An instance with the name "${instanceName}" already exists.`);
        this.name = 'InstanceExistsError';
        this.instanceName = instanceName;
    }

    getRawMessage() {
        return { translate: 'construct.error.instanceExists', with: [this.instanceName] };
    }
}