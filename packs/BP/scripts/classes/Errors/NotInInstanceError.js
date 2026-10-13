import { CommandResponseError } from "./CommandResponseError";

export class NotInInstanceError extends CommandResponseError {
    constructor(message = 'Not standing in an instance.') {
        super(message);
        this.name = 'NotInInstanceError';
    }

    getRawMessage() {
        return { translate: 'construct.error.notInInstance' };
    }
}
